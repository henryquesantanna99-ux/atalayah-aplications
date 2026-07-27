import { createAdminClient } from '@/lib/supabase/admin'
import { sanitizeExecutionValue } from './webhooks'

type WorkflowNode = { id: string; type?: string; disabled?: boolean; data?: Record<string, unknown> }
type WorkflowDefinition = { nodes?: WorkflowNode[]; edges?: unknown[] }

/**
 * Runs an immutable definition snapshot and emits each transition to the database.
 * Action implementations are intentionally allow-listed: unknown/disabled nodes are
 * skipped rather than being reported as successful.
 */
export async function executeWebhookWorkflow(options: {
  executionId: string
  definition: WorkflowDefinition
  payload: unknown
}) {
  // Database types are regenerated after the accompanying migration is applied.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any
  let current: unknown = options.payload

  try {
    for (const node of options.definition.nodes ?? []) {
      if (node.disabled) {
        await db.from('automation_node_executions').insert({
          execution_id: options.executionId,
          node_id: node.id,
          state: 'skipped',
          sanitized_input: sanitizeExecutionValue(current),
          started_at: new Date().toISOString(),
          finished_at: new Date().toISOString(),
        })
        continue
      }

      const startedAt = new Date().toISOString()
      const { data: event, error: eventError } = await db.from('automation_node_executions').insert({
        execution_id: options.executionId,
        node_id: node.id,
        state: 'running',
        sanitized_input: sanitizeExecutionValue(current),
        started_at: startedAt,
      }).select('id').single()
      if (eventError) throw eventError

      try {
        if (node.type === 'webhook' || node.type === 'trigger') {
          current = options.payload
        } else if (node.type === 'set') {
          current = { ...(typeof current === 'object' && current ? current : {}), ...(node.data?.values as object ?? {}) }
        } else {
          await db.from('automation_node_executions').update({
            state: 'skipped', finished_at: new Date().toISOString(),
          }).eq('id', event.id)
          continue
        }

        await db.from('automation_node_executions').update({
          state: 'completed',
          sanitized_output: sanitizeExecutionValue(current),
          finished_at: new Date().toISOString(),
        }).eq('id', event.id)
      } catch (error) {
        await db.from('automation_node_executions').update({
          state: 'failed',
          error: error instanceof Error ? error.message : 'Falha desconhecida',
          finished_at: new Date().toISOString(),
        }).eq('id', event.id)
        throw error
      }
    }

    await db.from('automation_executions').update({
      state: 'completed', finished_at: new Date().toISOString(),
    }).eq('id', options.executionId)
    return { state: 'completed' as const, output: current }
  } catch (error) {
    await db.from('automation_executions').update({
      state: 'failed',
      error: error instanceof Error ? error.message : 'Falha desconhecida',
      finished_at: new Date().toISOString(),
    }).eq('id', options.executionId)
    return { state: 'failed' as const, error }
  }
}
