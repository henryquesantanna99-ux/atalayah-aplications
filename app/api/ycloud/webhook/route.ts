import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { asRecord, eventFingerprint, persistYCloudEvent } from '@/lib/ycloud/events'

export async function POST(request: NextRequest) {
  const secret = process.env.YCLOUD_WEBHOOK_SECRET
  if (secret && request.headers.get('x-webhook-secret') !== secret) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let payload
  try { payload = asRecord(await request.json()) } catch { return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 }) }

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
