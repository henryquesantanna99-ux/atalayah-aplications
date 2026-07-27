import { authenticatedAutomation, authorizeRun } from '@/lib/automations/api-auth'

export const dynamic = 'force-dynamic'
export async function GET(request: Request, { params }: { params: { runId: string } }) {
  const auth = await authenticatedAutomation()
  if (!auth) return new Response('Unauthorized', { status: 401 })
  if (!await authorizeRun(auth.client, auth.user.id, params.runId)) return new Response('Not found', { status: 404 })
  const after = Number(new URL(request.url).searchParams.get('after') ?? 0)
  const { data, error } = await auth.client.from('automation_run_events').select('sequence,type,payload,created_at').eq('run_id', params.runId).gt('sequence', Number.isFinite(after) ? after : 0).order('sequence').limit(500)
  if (error) return new Response(error.message, { status: 500 })
  // Short, resumable SSE response works in serverless; clients reconnect with ?after=sequence.
  const body = (data ?? []).map(event => `id: ${event.sequence}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`).join('')
  return new Response(body || ': keep-alive\n\n', { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-store', Connection: 'keep-alive' } })
}
