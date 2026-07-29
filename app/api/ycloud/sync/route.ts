import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { syncYCloudHistory, type SyncMode } from '@/lib/ycloud/sync'

async function authorized(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && request.headers.get('authorization') === `Bearer ${cronSecret}`) return true
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return false
  const { data } = await auth.from('profiles').select('role').eq('id', user.id).single()
  return data?.role === 'admin'
}

export async function POST(request: NextRequest) {
  if (!await authorized(request)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const input = await request.json().catch(() => ({})) as { mode?: SyncMode; maxPages?: number; pageSize?: number }
  if (!['initial', 'recovery', 'reconcile'].includes(input.mode ?? '')) return NextResponse.json({ error: 'mode must be initial, recovery or reconcile' }, { status: 400 })
  try { return NextResponse.json(await syncYCloudHistory({ mode: input.mode!, maxPages: input.maxPages, pageSize: input.pageSize })) }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Sync failed' }, { status: 502 }) }
}
