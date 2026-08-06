import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateYCloudWebhook } from '@/lib/automations/integrations/webhooks'
import { asRecord, eventFingerprint, persistYCloudEvent, type JsonRecord } from '@/lib/ycloud/events'

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
  try { payload = asRecord(JSON.parse(rawBody)) } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }
  const supabase = createAdminClient()
  const fingerprint = eventFingerprint(payload)
  const queued = await supabase.from('ycloud_webhook_events').upsert({
    fingerprint, payload, status: 'pending', attempts: 0, received_at: new Date().toISOString(),
  }, { onConflict: 'fingerprint', ignoreDuplicates: true }).select('id,status').maybeSingle()
  if (queued.error && queued.error.code !== 'PGRST116') return NextResponse.json({ error: 'Webhook event not queued' }, { status: 500 })
  if (!queued.data) return NextResponse.json({ received: true, duplicate: true })

  try {
    const result = await persistYCloudEvent(supabase, payload)
    await supabase.from('ycloud_webhook_events').update({ status: 'processed', processed_at: new Date().toISOString(), attempts: 1, last_error: null }).eq('id', queued.data.id)
    return NextResponse.json({ received: true, processed: result.kind })
  } catch (error) {
    await supabase.from('ycloud_webhook_events').update({ status: 'failed', attempts: 1, last_error: error instanceof Error ? error.message : 'Unknown error' }).eq('id', queued.data.id)
    // Event is durable; a 202 avoids an uncontrolled provider retry storm.
    return NextResponse.json({ received: true, queued: true }, { status: 202 })
  }
}
