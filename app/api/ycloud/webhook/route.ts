import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizeWhatsAppPhone } from '@/lib/ycloud/phone'
import { validateYCloudWebhook } from '@/lib/automations/integrations/webhooks'

type JsonRecord = Record<string, unknown>

function record(value: unknown): JsonRecord {
  return value && typeof value === 'object' ? value as JsonRecord : {}
}

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function normalizeEvent(payload: JsonRecord) {
  const eventName = text(payload.type) ?? text(payload.event) ?? ''
  const raw = record(payload.whatsappInboundMessage ?? payload.whatsappMessage ?? payload.message ?? payload.data ?? payload)
  const directionValue = `${eventName} ${text(raw.direction) ?? ''}`.toLowerCase()
  const businessPhone = normalizeWhatsAppPhone(process.env.YCLOUD_WHATSAPP_FROM)
  const from = normalizeWhatsAppPhone(raw.from)
  const to = normalizeWhatsAppPhone(raw.to)
  const direction: 'inbound' | 'outbound' = directionValue.includes('outbound') || directionValue.includes('sent') || (!!businessPhone && from === businessPhone)
    ? 'outbound'
    : 'inbound'
  const phone = direction === 'inbound' ? from : to
  const bodyValue = record(raw.text).body ?? raw.text ?? raw.body ?? raw.caption ?? record(raw.image).caption ?? record(raw.video).caption
  const timestamp = Number(raw.timestamp ?? payload.timestamp)

  return {
    eventName,
    messageId: text(raw.id) ?? text(raw.messageId) ?? text(payload.id),
    direction,
    phone,
    name: text(raw.customerName) ?? text(raw.profileName) ?? text(record(raw.profile).name) ?? text(payload.customerName),
    body: text(bodyValue),
    messageType: text(raw.type) ?? 'text',
    status: text(raw.status) ?? text(payload.status),
    sentAt: Number.isFinite(timestamp)
      ? new Date(timestamp < 10_000_000_000 ? timestamp * 1000 : timestamp).toISOString()
      : new Date().toISOString(),
    statusOnly: directionValue.includes('status') || directionValue.includes('updated'),
  }
}

export async function POST(request: NextRequest) {
  let rawBody: string
  try {
    rawBody = await request.text()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const authenticationError = validateYCloudWebhook(
    rawBody,
    request.headers.get('x-ycloud-signature'),
    process.env.YCLOUD_WEBHOOK_SECRET,
  )
  if (authenticationError) {
    return NextResponse.json({ error: authenticationError.error }, { status: authenticationError.status })
  }

  let payload: JsonRecord
  try { payload = record(JSON.parse(rawBody)) } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }
  const event = normalizeEvent(payload)
  const supabase = createAdminClient()

  if (event.statusOnly && event.messageId) {
    const { error } = await supabase.from('crm_messages' as never)
      .update({ status: event.status, payload } as never).eq('ycloud_id', event.messageId)
    if (error) return NextResponse.json({ error: 'Message status not saved' }, { status: 500 })
    return NextResponse.json({ received: true, updated: 'status' })
  }
  if (!event.phone || !event.messageId) {
    return NextResponse.json({ error: 'Missing contact phone or message id' }, { status: 400 })
  }

  const { data: existing } = await supabase.from('crm_contacts' as never)
    .select('id,name').eq('phone', event.phone).maybeSingle() as unknown as { data: { id: string; name: string | null } | null }
  let contact = existing
  if (!contact) {
    const result = await supabase.from('crm_contacts' as never)
      .insert({ phone: event.phone, name: event.name } as never).select('id,name').single() as unknown as { data: { id: string; name: string | null } | null; error: { message: string } | null }
    if (result.error || !result.data) return NextResponse.json({ error: 'Contact not saved' }, { status: 500 })
    contact = result.data
  } else if (event.name && event.name !== contact.name) {
    await supabase.from('crm_contacts' as never).update({ name: event.name } as never).eq('id', contact.id)
  }

  const { error } = await supabase.from('crm_messages' as never).upsert({
    ycloud_id: event.messageId, contact_id: contact.id, direction: event.direction,
    body: event.body, message_type: event.messageType, status: event.status,
    payload, sent_at: event.sentAt,
  } as never, { onConflict: 'ycloud_id' })
  if (error) return NextResponse.json({ error: 'Message not saved' }, { status: 500 })
  return NextResponse.json({ received: true })
}
