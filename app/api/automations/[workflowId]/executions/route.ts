import { authenticatedAutomation } from '@/lib/automations/api-auth'
import type { Json } from '@/lib/automations/runtime/types'

function isJson(value: unknown): value is Json {
  if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) return true
  if (Array.isArray(value)) return value.every(isJson)
  return typeof value === 'object' && Object.values(value).every(isJson)
}

export async function POST(request: Request, { params }: { params: { workflowId: string } }) {
  const auth = await authenticatedAutomation()
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  let body: { input?: unknown; idempotencyKey?: string }
  try { body = await request.json() } catch { return Response.json({ error: 'JSON inválido' }, { status: 400 }) }
  const key = body.idempotencyKey ?? request.headers.get('idempotency-key')
  if (!key || key.length > 200) return Response.json({ error: 'Idempotency-Key obrigatório' }, { status: 400 })
  if (body.input !== undefined && !isJson(body.input)) return Response.json({ error: 'Input deve ser JSON válido' }, { status: 400 })
  const { data, error } = await auth.client.rpc('enqueue_automation_run', { p_workflow_id: params.workflowId, p_requested_by: auth.user.id, p_input: body.input ?? {}, p_idempotency_key: key })
  if (error) return Response.json({ error: error.message }, { status: error.code === 'P0002' ? 404 : 400 })
  return Response.json({ executionId: data }, { status: 202 })
}
