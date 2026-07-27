export type Json = null | boolean | number | string | Json[] | { [key: string]: Json }

export type ErrorPolicy = 'stop' | 'continue'
export type MergeMode = 'all' | 'any'

export interface NodeDefinition {
  id: string
  type: string
  version: number
  config: Record<string, Json>
  inputSchema?: JsonSchema
  outputSchema?: JsonSchema
  timeoutMs?: number
  retry?: { maxAttempts: number; initialDelayMs: number; multiplier?: number; maxDelayMs?: number }
  errorPolicy?: ErrorPolicy
  idempotencyKey?: string
  merge?: { mode: MergeMode }
}

export interface EdgeDefinition {
  id: string
  from: string
  fromPort: string
  to: string
  toPort?: string
}

export interface WorkflowDefinition {
  nodes: NodeDefinition[]
  edges: EdgeDefinition[]
  concurrency?: number
}

export interface JsonSchema {
  type?: 'object' | 'array' | 'string' | 'number' | 'integer' | 'boolean' | 'null'
  properties?: Record<string, JsonSchema>
  required?: string[]
  items?: JsonSchema
  enum?: Json[]
  additionalProperties?: boolean
}

export interface NodeResult { output: Json; ports?: string[] }
export interface NodeContext {
  runId: string
  nodeId: string
  attempt: number
  signal: AbortSignal
  idempotencyKey: string
}
export interface NodeHandler {
  kind: 'pure' | 'effect'
  execute(input: Json, config: Record<string, Json>, context: NodeContext): Promise<NodeResult>
}

export interface RunSnapshot {
  id: string
  workflowVersionId: string
  definition: WorkflowDefinition
  input: Json
  status: string
}

export interface AttemptRecord { status: 'succeeded' | 'failed'; output?: Json; ports?: string[]; error?: Json }

export interface RuntimeStore {
  loadRun(runId: string): Promise<RunSnapshot>
  startRun(runId: string): Promise<void>
  finishRun(runId: string, status: 'succeeded' | 'failed', output?: Json): Promise<void>
  beginAttempt(args: { runId: string; node: NodeDefinition; attempt: number; idempotencyKey: string; input: Json }): Promise<{ id: string; completed?: AttemptRecord }>
  finishAttempt(id: string, result: AttemptRecord): Promise<void>
  completedNodes(runId: string): Promise<Record<string, NodeResult>>
  emit(runId: string, type: string, payload: Json): Promise<void>
}
