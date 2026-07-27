import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { executeWebhookWorkflow } from '@/lib/automations/executor'
import { readJsonWebhook, WebhookRequestError, webhookRateLimitKey } from '@/lib/automations/webhooks'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: { workflowId: string } }) {
  // Database types are regenerated after the accompanying migration is applied.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any
  const bucket = webhookRateLimitKey(request, `production:${params.workflowId}`)
  const { data: allowed } = await db.rpc('consume_automation_webhook_rate_limit', {
    p_bucket: bucket, p_limit: 60, p_window_seconds: 60,
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

  const { data: workflow } = await db.from('automation_workflows')
    .select('id,owner_id,published_definition,is_active')
    .eq('id', params.workflowId).eq('is_active', true).maybeSingle()
  if (!workflow?.published_definition) {
    return NextResponse.json({ error: 'Workflow de produção não encontrado ou inativo' }, { status: 404 })
  }

  const { data: execution, error } = await db.from('automation_executions').insert({
    workflow_id: workflow.id,
    user_id: workflow.owner_id,
    mode: 'production',
    definition_snapshot: workflow.published_definition,
    trigger_input: payload,
  }).select('id').single()
  if (error) return NextResponse.json({ error: 'Falha ao criar execução' }, { status: 500 })

  const result = await executeWebhookWorkflow({
    executionId: execution.id, definition: workflow.published_definition, payload,
  })
  return NextResponse.json({ accepted: true, executionId: execution.id }, {
    status: result.state === 'completed' ? 202 : 500,
  })
}
