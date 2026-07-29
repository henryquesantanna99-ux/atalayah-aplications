import { createAdminClient } from '@/lib/supabase/admin'
import { asRecord, persistYCloudEvent, type JsonRecord } from '@/lib/ycloud/events'

export type SyncMode = 'initial' | 'recovery' | 'reconcile'

function historyItems(body: JsonRecord) {
  const data = body.data
  if (Array.isArray(data)) return data
  const nested = asRecord(data)
  for (const value of [body.items, body.messages, nested.items, nested.messages]) if (Array.isArray(value)) return value
  return []
}

function nextCursor(body: JsonRecord) {
  const pagination = asRecord(body.pagination)
  const meta = asRecord(body.meta)
  return [body.nextCursor, pagination.nextCursor, meta.nextCursor].find(value => typeof value === 'string' && value) as string | undefined
}

export async function syncYCloudHistory(options: { mode: SyncMode; maxPages?: number; pageSize?: number }) {
  const apiKey = process.env.YCLOUD_API_KEY
  const historyUrl = process.env.YCLOUD_HISTORY_URL
  if (!apiKey) throw new Error('YCLOUD_API_KEY não configurada')
  if (!historyUrl) throw new Error('Histórico YCloud indisponível/não configurado: defina YCLOUD_HISTORY_URL somente se o produto contratado expuser essa API')
  const supabase = createAdminClient()
  const key = `ycloud:${process.env.YCLOUD_WHATSAPP_FROM ?? 'default'}:${options.mode}`
  const { data: checkpoint } = await (supabase.from('ycloud_sync_checkpoints' as never).select('*').eq('sync_key', key).maybeSingle() as any)
  let cursor: string | undefined = checkpoint?.cursor ?? undefined
  let since = checkpoint?.window_end ?? undefined
  if (!since && options.mode === 'initial') since = process.env.YCLOUD_INITIAL_SYNC_FROM
  if (!since && options.mode !== 'initial') since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const runStartedAt = new Date().toISOString()
  const maxPages = Math.min(Math.max(options.maxPages ?? 20, 1), 100)
  let pages = 0, imported = 0

  while (pages < maxPages) {
    const url = new URL(historyUrl)
    url.searchParams.set('limit', String(Math.min(options.pageSize ?? 100, 100)))
    if (cursor) url.searchParams.set('cursor', cursor)
    else if (since) url.searchParams.set('startTime', since)
    url.searchParams.set('endTime', runStartedAt)
    const response = await fetch(url, { headers: { 'X-API-Key': apiKey }, signal: AbortSignal.timeout(20_000), cache: 'no-store' })
    if (!response.ok) throw new Error(`YCloud history returned ${response.status}`)
    const body = asRecord(await response.json())
    const items = historyItems(body)
    for (const item of items) { await persistYCloudEvent(supabase, asRecord(item)); imported++ }
    pages++
    cursor = nextCursor(body)
    await (supabase.from('ycloud_sync_checkpoints' as never).upsert({
      sync_key: key, mode: options.mode, cursor: cursor ?? null,
      window_start: since ?? null, window_end: cursor ? checkpoint?.window_end ?? null : runStartedAt,
      last_success_at: new Date().toISOString(), last_error: null,
      metadata: { pages, imported }, updated_at: new Date().toISOString(),
    } as never, { onConflict: 'sync_key' }) as any)
    if (!cursor || items.length === 0) break
  }
  return { mode: options.mode, pages, imported, hasMore: Boolean(cursor), checkpoint: cursor ?? runStartedAt }
}
