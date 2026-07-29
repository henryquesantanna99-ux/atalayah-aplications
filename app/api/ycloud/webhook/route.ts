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
  const fingerprint = eventFingerprint(payload)
  const queued = await (supabase.from('ycloud_webhook_events' as never).upsert({
    fingerprint, payload, status: 'pending', attempts: 0, received_at: new Date().toISOString(),
  } as never, { onConflict: 'fingerprint', ignoreDuplicates: true }).select('id,status').single() as any)
  if (queued.error && queued.error.code !== 'PGRST116') return NextResponse.json({ error: 'Webhook event not queued' }, { status: 500 })
  if (!queued.data) return NextResponse.json({ received: true, duplicate: true })

  try {
    const result = await persistYCloudEvent(supabase, payload)
    await (supabase.from('ycloud_webhook_events' as never).update({ status: 'processed', processed_at: new Date().toISOString(), attempts: 1, last_error: null } as never).eq('id', queued.data.id) as any)
    return NextResponse.json({ received: true, processed: result.kind })
  } catch (error) {
    await (supabase.from('ycloud_webhook_events' as never).update({ status: 'failed', attempts: 1, last_error: error instanceof Error ? error.message : 'Unknown error' } as never).eq('id', queued.data.id) as any)
    // Event is durable; a 202 avoids an uncontrolled provider retry storm.
    return NextResponse.json({ received: true, queued: true }, { status: 202 })
  }
}
