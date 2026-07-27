import type { AttemptRecord, Json, NodeDefinition, NodeResult, RunSnapshot, RuntimeStore } from './types'

export class SupabaseRuntimeStore implements RuntimeStore {
  constructor(private readonly client: any) {}
  async loadRun(runId: string): Promise<RunSnapshot> {
    const { data, error } = await this.client.from('automation_runs').select('id,status,input,workflow_version_id,automation_workflow_versions!inner(definition,published_at)').eq('id', runId).single()
    if (error || !data?.automation_workflow_versions?.published_at) throw error ?? new Error('Versão publicada não encontrada')
    return { id: data.id, status: data.status, input: data.input, workflowVersionId: data.workflow_version_id, definition: data.automation_workflow_versions.definition }
  }
  async startRun(runId: string) { const { error } = await this.client.from('automation_runs').update({ status: 'running', started_at: new Date().toISOString() }).eq('id', runId).in('status', ['queued', 'running']); if (error) throw error }
  async finishRun(runId: string, status: 'succeeded' | 'failed', output?: Json) { const { error } = await this.client.from('automation_runs').update({ status, output, finished_at: new Date().toISOString() }).eq('id', runId); if (error) throw error; await this.emit(runId, `run.${status}`, {}) }
  async beginAttempt(args: { runId: string; node: NodeDefinition; attempt: number; idempotencyKey: string; input: Json }) {
    const { data: prior } = await this.client.from('automation_node_attempts').select('id,status,output,ports,error').eq('run_id', args.runId).eq('idempotency_key', args.idempotencyKey).eq('status', 'succeeded').maybeSingle()
    if (prior) return { id: prior.id, completed: { status: prior.status, output: prior.output, ports: prior.ports, error: prior.error } as AttemptRecord }
    const { data, error } = await this.client.from('automation_node_attempts').insert({ run_id: args.runId, node_id: args.node.id, node_type: args.node.type, node_version: args.node.version, attempt: args.attempt, idempotency_key: args.idempotencyKey, input: args.input, status: 'running' }).select('id').single()
    if (error) throw error
    return { id: data.id }
  }
  async finishAttempt(id: string, result: AttemptRecord) { const { error } = await this.client.from('automation_node_attempts').update({ ...result, finished_at: new Date().toISOString() }).eq('id', id); if (error) throw error }
  async completedNodes(runId: string): Promise<Record<string, NodeResult>> {
    const { data, error } = await this.client.from('automation_node_attempts').select('node_id,output,ports').eq('run_id', runId).eq('status', 'succeeded').order('attempt', { ascending: false }); if (error) throw error
    const result: Record<string, NodeResult> = {}; for (const row of data ?? []) if (!result[row.node_id]) result[row.node_id] = { output: row.output, ports: row.ports ?? ['default'] }; return result
  }
  async emit(runId: string, type: string, payload: Json) { const { error } = await this.client.from('automation_run_events').insert({ run_id: runId, type, payload }); if (error) throw error }
}
