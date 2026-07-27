import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createWebhookToken, hashWebhookToken, TEST_SESSION_TTL_MS } from '@/lib/automations/webhooks'

export const runtime = 'nodejs'

export async function POST(request: Request, { params }: { params: { workflowId: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  // Database types are regenerated after the accompanying migration is applied.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any
  const { data: workflow } = await db.from('automation_workflows')
    .select('id').eq('id', params.workflowId).eq('owner_id', user.id).maybeSingle()
  if (!workflow) return NextResponse.json({ error: 'Workflow não encontrado' }, { status: 404 })

  const now = new Date().toISOString()
  await db.from('automation_webhook_test_sessions').update({
    state: 'failed', claimed_at: now, updated_at: now,
  }).eq('workflow_id', workflow.id).eq('user_id', user.id).eq('state', 'waiting')

  const token = createWebhookToken()
  const expiresAt = new Date(Date.now() + TEST_SESSION_TTL_MS).toISOString()
  const { data: session, error } = await db.from('automation_webhook_test_sessions').insert({
    token_hash: hashWebhookToken(token),
    workflow_id: workflow.id,
    user_id: user.id,
    expires_at: expiresAt,
  }).select('id').single()

  if (error) return NextResponse.json({ error: 'Não foi possível iniciar a escuta' }, { status: 500 })
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
  const origin = configuredOrigin || new URL(request.url).origin
  return NextResponse.json({
    id: session.id,
    state: 'waiting',
    expiresAt,
    url: `${origin}/api/automations/webhooks/test/${token}`,
  }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
}
