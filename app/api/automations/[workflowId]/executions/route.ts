import { authenticatedAutomation } from '@/lib/automations/api-auth'

export async function POST(request: Request, { params }: { params: { workflowId: string } }) {
  const auth = await authenticatedAutomation(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  let body: { input?: unknown; idempotencyKey?: string }
  try { body = await request.json() } catch { return Response.json({ error: 'JSON inválido' }, { status: 400 }) }
  const key = body.idempotencyKey ?? request.headers.get('idempotency-key')
  if (!key || key.length > 200) return Response.json({ error: 'Idempotency-Key obrigatório' }, { status: 400 })
  const { data, error } = await auth.client.rpc('enqueue_automation_run', { p_workflow_id: params.workflowId, p_requested_by: auth.user.id, p_input: body.input ?? {}, p_idempotency_key: key })
  if (error) return Response.json({ error: error.message }, { status: error.code === 'P0002' ? 404 : 400 })
  return Response.json({ executionId: data }, { status: 202 })
}
