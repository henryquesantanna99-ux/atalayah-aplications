import { createHash } from 'node:crypto'
import { normalizeWhatsAppPhone } from './phone.ts'

export type JsonRecord = Record<string, unknown>

export function asRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {}
}

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

/** Canonical normalization used by both webhooks and history imports. */
export function normalizeYCloudEvent(payload: JsonRecord) {
  const eventName = text(payload.type) ?? text(payload.event) ?? ''
  const raw = asRecord(payload.whatsappInboundMessage ?? payload.whatsappMessage ?? payload.message ?? payload.data ?? payload)
  const directionValue = `${eventName} ${text(raw.direction) ?? ''}`.toLowerCase()
  const businessPhone = normalizeWhatsAppPhone(process.env.YCLOUD_WHATSAPP_FROM)
  const from = normalizeWhatsAppPhone(raw.from)
  const to = normalizeWhatsAppPhone(raw.to)
  const direction: 'inbound' | 'outbound' = directionValue.includes('outbound') || directionValue.includes('sent') || (!!businessPhone && from === businessPhone) ? 'outbound' : 'inbound'
  const timestamp = Number(raw.timestamp ?? raw.createTime ?? raw.createdAt ?? payload.timestamp)
  const sentAt = Number.isFinite(timestamp)
    ? new Date(timestamp < 10_000_000_000 ? timestamp * 1000 : timestamp).toISOString()
    : text(raw.createTime) ?? text(raw.createdAt) ?? new Date().toISOString()
  const bodyValue = asRecord(raw.text).body ?? raw.text ?? raw.body ?? raw.caption ?? asRecord(raw.image).caption ?? asRecord(raw.video).caption
  const messageId = text(raw.id) ?? text(raw.messageId) ?? text(raw.externalId) ?? text(payload.id)

  return {
    eventName, messageId, direction, phone: direction === 'inbound' ? from : to,
    name: text(raw.customerName) ?? text(raw.profileName) ?? text(asRecord(raw.profile).name) ?? text(payload.customerName),
    body: text(bodyValue), messageType: text(raw.type) ?? 'text',
    status: text(raw.status) ?? text(payload.status), sentAt,
    statusOnly: directionValue.includes('status') || directionValue.includes('updated'),
  }
}

export function eventFingerprint(payload: JsonRecord) {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex')
}

// Deliberately structural: this can be unit tested without a live Supabase project.
export async function persistYCloudEvent(supabase: any, payload: JsonRecord) {
  const event = normalizeYCloudEvent(payload)
  if (event.statusOnly && event.messageId) {
    const { error } = await supabase.from('crm_messages').update({ status: event.status, payload }).eq('ycloud_id', event.messageId)
    if (error) throw new Error(`Message status not saved: ${error.message}`)
    return { kind: 'status' as const, messageId: event.messageId }
  }
  if (!event.phone || !event.messageId) throw new Error('Missing contact phone or message id')

  const { data: found, error: findError } = await supabase.from('crm_contacts').select('id,name').eq('phone', event.phone).maybeSingle()
  if (findError) throw new Error(`Contact lookup failed: ${findError.message}`)
  let contact = found
  if (!contact) {
    const result = await supabase.from('crm_contacts').insert({ phone: event.phone, name: event.name }).select('id,name').single()
    if (result.error || !result.data) throw new Error(`Contact not saved: ${result.error?.message ?? 'unknown error'}`)
    contact = result.data
  } else if (event.name && event.name !== contact.name) {
    const { error } = await supabase.from('crm_contacts').update({ name: event.name }).eq('id', contact.id)
    if (error) throw new Error(`Contact name not updated: ${error.message}`)
  }
  const { error } = await supabase.from('crm_messages').upsert({
    ycloud_id: event.messageId, contact_id: contact.id, direction: event.direction,
    body: event.body, message_type: event.messageType, status: event.status,
    payload, sent_at: event.sentAt,
  }, { onConflict: 'ycloud_id' })
  if (error) throw new Error(`Message not saved: ${error.message}`)
  return { kind: 'message' as const, messageId: event.messageId }
}
