import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { asRecord, persistYCloudEvent } from '@/lib/ycloud/events'

export async function POST(request: NextRequest) {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await auth.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await request.json().catch(() => ({})) as { id?: string }
  if (!id) return NextResponse.json({ error: 'Event id is required' }, { status: 400 })
  const admin = createAdminClient()
  const { data: event } = await admin.from('ycloud_webhook_events').select('id,payload,attempts').eq('id', id).single()
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  try {
    const result = await persistYCloudEvent(admin, asRecord(event.payload))
    await admin.from('ycloud_webhook_events').update({ status: 'processed', processed_at: new Date().toISOString(), attempts: event.attempts + 1, last_error: null }).eq('id', id)
    return NextResponse.json({ reprocessed: true, result })
  } catch (error) {
    await admin.from('ycloud_webhook_events').update({ status: 'failed', attempts: event.attempts + 1, last_error: error instanceof Error ? error.message : 'Unknown error' }).eq('id', id)
    return NextResponse.json({ error: 'Reprocessing failed' }, { status: 500 })
  }
}
