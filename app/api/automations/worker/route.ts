import { timingSafeEqual } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import type { AutomationClient } from '@/lib/automations/database'
import { AutomationRuntime } from '@/lib/automations/runtime/executor'
import { SupabaseAutomationQueue } from '@/lib/automations/runtime/queue'
import { SupabaseRuntimeStore } from '@/lib/automations/runtime/supabase-store'

function validWorker(request: Request) {
  const configured = process.env.AUTOMATIONS_WORKER_SECRET
  const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!configured || !supplied || configured.length !== supplied.length) return false
  return timingSafeEqual(Buffer.from(configured), Buffer.from(supplied))
}

export async function POST(request: Request) {
  if (!validWorker(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const client = createAdminClient() as unknown as AutomationClient
  const queue = new SupabaseAutomationQueue(client)
  const job = await queue.claim(crypto.randomUUID())
  if (!job) return new Response(null, { status: 204 })
  try {
    await new AutomationRuntime(new SupabaseRuntimeStore(client)).execute(job.runId)
    await queue.ack(job.receipt)
    return Response.json({ executionId: job.runId, status: 'processed' })
  } catch (error) {
    await queue.retry(job.receipt, 30, error instanceof Error ? error.message : String(error))
    return Response.json({ executionId: job.runId, status: 'retry_scheduled' }, { status: 503 })
  }
}
