import { authenticatedAutomation, authorizeRun } from '@/lib/automations/api-auth'

export async function GET(request: Request, { params }: { params: { runId: string } }) {
  const auth = await authenticatedAutomation(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!await authorizeRun(auth.client, auth.user.id, params.runId)) return Response.json({ error: 'Not found' }, { status: 404 })
  const { data, error } = await auth.client.from('automation_runs').select('id,status,created_at,started_at,finished_at,output').eq('id', params.runId).single()
  return error ? Response.json({ error: error.message }, { status: 500 }) : Response.json(data)
}
