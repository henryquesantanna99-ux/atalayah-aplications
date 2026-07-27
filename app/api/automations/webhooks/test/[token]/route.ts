import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { executeWebhookWorkflow } from '@/lib/automations/executor'
import { hashWebhookToken, readJsonWebhook, WebhookRequestError, webhookRateLimitKey } from '@/lib/automations/webhooks'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: { token: string } }) {
  // Database types are regenerated after the accompanying migration is applied.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any
  const tokenHash = hashWebhookToken(params.token)
  const bucket = webhookRateLimitKey(request, `test:${tokenHash}`)
  const { data: allowed } = await db.rpc('consume_automation_webhook_rate_limit', {
    p_bucket: bucket, p_limit: 20, p_window_seconds: 60,
  })
  if (!allowed) return NextResponse.json({ error: 'Muitas requisições' }, { status: 429 })

  let payload: unknown
  try {
    payload = await readJsonWebhook(request)
  } catch (error) {
    if (error instanceof WebhookRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    throw error
  }

  const { data: claimed, error: claimError } = await db.rpc('claim_automation_webhook_test_session', {
    p_token_hash: tokenHash,
  })
  const session = claimed?.[0]
  if (claimError) return NextResponse.json({ error: 'Falha ao reivindicar sessão' }, { status: 500 })
  if (!session) {
    return NextResponse.json({ error: 'Sessão expirada, já utilizada ou inválida' }, { status: 409 })
  }

  // The workflow comes exclusively from the claimed database row, never from payload.
  const { data: workflow } = await db.from('automation_workflows')
    .select('id,draft_definition').eq('id', session.workflow_id).single()
  if (!workflow) {
    await db.from('automation_webhook_test_sessions').update({ state: 'failed' }).eq('id', session.session_id)
    return NextResponse.json({ error: 'Workflow não encontrado' }, { status: 404 })
  }

  const { data: execution, error: executionError } = await db.from('automation_executions').insert({
    workflow_id: workflow.id,
    user_id: session.user_id,
    test_session_id: session.session_id,
    mode: 'test',
    definition_snapshot: workflow.draft_definition,
    trigger_input: payload,
  }).select('id').single()
  if (executionError) {
    await db.from('automation_webhook_test_sessions').update({ state: 'failed' }).eq('id', session.session_id)
    return NextResponse.json({ error: 'Falha ao criar execução' }, { status: 500 })
  }

  await db.from('automation_webhook_test_sessions').update({ execution_id: execution.id }).eq('id', session.session_id)
  const result = await executeWebhookWorkflow({
    executionId: execution.id, definition: workflow.draft_definition, payload,
  })
  await db.from('automation_webhook_test_sessions').update({
    state: result.state, updated_at: new Date().toISOString(),
  }).eq('id', session.session_id)

  return NextResponse.json({ accepted: true, executionId: execution.id }, {
    status: result.state === 'completed' ? 202 : 500,
    headers: { 'Cache-Control': 'no-store' },
  })
}
