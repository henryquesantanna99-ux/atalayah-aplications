import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const secret = process.env.YCLOUD_WEBHOOK_SECRET
  if (secret && request.headers.get('x-webhook-secret') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = await request.json()
  const message = payload?.whatsappInboundMessage ?? payload?.whatsappMessage ?? payload?.message ?? payload
  const phone = message?.from ?? message?.to ?? message?.customerPhone
  if (!phone) return NextResponse.json({ error: 'Missing phone number' }, { status: 400 })

  const supabase = createAdminClient()
  const { data: contact, error: contactError } = await supabase
    .from('crm_contacts' as never)
    .upsert({ phone, name: message?.customerName ?? message?.profileName ?? null } as never, { onConflict: 'phone' })
    .select('id')
    .single() as { data: { id: string } | null; error: { message: string } | null }

  if (contactError || !contact) return NextResponse.json({ error: contactError?.message ?? 'Contact not saved' }, { status: 500 })

  const direction = payload?.type?.toLowerCase().includes('inbound') || message?.from ? 'inbound' : 'outbound'
  const body = message?.text?.body ?? message?.text ?? message?.body ?? message?.caption ?? null
  const { error } = await supabase.from('crm_messages' as never).upsert({
    ycloud_id: message?.id ?? payload?.id ?? null, contact_id: contact.id, direction, body,
    message_type: message?.type ?? 'text', status: message?.status ?? null,
    payload, sent_at: message?.timestamp ? new Date(Number(message.timestamp) * 1000).toISOString() : new Date().toISOString(),
  } as never, { onConflict: 'ycloud_id', ignoreDuplicates: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ received: true })
}
