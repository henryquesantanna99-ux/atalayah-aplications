import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await auth.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { contactId, text } = await request.json()
  if (typeof contactId !== 'string' || typeof text !== 'string' || !text.trim()) {
    return NextResponse.json({ error: 'Contato e mensagem são obrigatórios' }, { status: 400 })
  }
  const apiKey = process.env.YCLOUD_API_KEY
  const from = process.env.YCLOUD_WHATSAPP_FROM
  if (!apiKey || !from) return NextResponse.json({ error: 'YCloud não configurada' }, { status: 503 })

  const admin = createAdminClient()
  const { data: contact } = await admin.from('crm_contacts' as never).select('id,phone').eq('id', contactId).single() as unknown as { data: { id: string; phone: string } | null }
  if (!contact) return NextResponse.json({ error: 'Contato não encontrado' }, { status: 404 })

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12_000)
  let response: Response
  try {
    response = await fetch('https://api.ycloud.com/v2/whatsapp/messages/sendDirectly', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey }, signal: controller.signal,
      body: JSON.stringify({ from, to: contact.phone, type: 'text', externalId: crypto.randomUUID(), category: 'utility', useDirectSend: true, text: { body: text.trim() } }),
    })
  } catch {
    clearTimeout(timeout)
    return NextResponse.json({ error: 'YCloud indisponível' }, { status: 502 })
  }
  clearTimeout(timeout)
  const provider = await response.json().catch(() => ({})) as Record<string, unknown>
  if (!response.ok) return NextResponse.json({ error: 'Falha ao enviar pela YCloud' }, { status: response.status })

  const messageId = String(provider.id ?? provider.messageId ?? crypto.randomUUID())
  const { data: message, error } = await admin.from('crm_messages' as never).upsert({
    ycloud_id: messageId, contact_id: contact.id, direction: 'outbound', body: text.trim(),
    message_type: 'text', status: String(provider.status ?? 'sent'), payload: provider, sent_at: new Date().toISOString(),
  } as never, { onConflict: 'ycloud_id' }).select('*').single() as unknown as { data: unknown; error: { message: string } | null }
  if (error) return NextResponse.json({ error: 'Mensagem enviada, mas não armazenada' }, { status: 500 })
  return NextResponse.json({ message })
}
