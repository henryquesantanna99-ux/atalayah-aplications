import { createHash } from 'node:crypto'
import { getNodeHandler } from './registry'
import { redact } from './redact'
import { validateSchema } from './schema'
import type { EdgeDefinition, Json, NodeDefinition, NodeResult, RuntimeStore, WorkflowDefinition } from './types'
import { resolveVariables } from './variables'

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
const keyOf = (runId: string, node: NodeDefinition, input: Json) => createHash('sha256').update(`${runId}:${node.id}:${node.version}:${node.idempotencyKey ?? JSON.stringify(input)}`).digest('hex')

function validateGraph(graph: WorkflowDefinition) {
  const ids = new Set(graph.nodes.map(node => node.id))
  if (ids.size !== graph.nodes.length) throw new Error('IDs de nós duplicados')
  for (const edge of graph.edges) if (!ids.has(edge.from) || !ids.has(edge.to)) throw new Error(`Aresta ${edge.id} inválida`)
  const incoming = new Map<string, number>()
  graph.edges.forEach(edge => incoming.set(edge.to, (incoming.get(edge.to) ?? 0) + 1))
  for (const node of graph.nodes) if ((incoming.get(node.id) ?? 0) > 1 && node.type !== 'merge') throw new Error(`Nó ${node.id} com múltiplas entradas deve ser merge`)
}

async function withTimeout<T>(timeoutMs: number, operation: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(new Error('Node timeout')), timeoutMs)
  try { return await Promise.race([operation(controller.signal), new Promise<never>((_, reject) => controller.signal.addEventListener('abort', () => reject(controller.signal.reason), { once: true }))]) }
  finally { clearTimeout(timer) }
}

export class AutomationRuntime {
  constructor(private readonly store: RuntimeStore) {}

  async execute(runId: string): Promise<void> {
    const run = await this.store.loadRun(runId) // Store must return the immutable published-version snapshot.
    validateGraph(run.definition)
    await this.store.startRun(runId)
    const completed = await this.store.completedNodes(runId)
    const outputs: Record<string, NodeResult> = { ...completed }
    const incoming = new Map<string, EdgeDefinition[]>()
    const outgoing = new Map<string, EdgeDefinition[]>()
    run.definition.edges.forEach(edge => { incoming.set(edge.to, [...(incoming.get(edge.to) ?? []), edge]); outgoing.set(edge.from, [...(outgoing.get(edge.from) ?? []), edge]) })
    const arrived = new Map<string, Set<string>>()
    const queued = new Set<string>()
    let stopped = false
    const nodes = new Map(run.definition.nodes.map(node => [node.id, node]))
    const ready: NodeDefinition[] = run.definition.nodes.filter(node => !incoming.has(node.id))
    ready.forEach(node => queued.add(node.id))
    const limit = Math.max(1, Math.min(run.definition.concurrency ?? 4, 32))

    const schedule = (edge: EdgeDefinition) => {
      const target = nodes.get(edge.to)!
      const received = arrived.get(target.id) ?? new Set<string>(); received.add(edge.id); arrived.set(target.id, received)
      const required = incoming.get(target.id)?.length ?? 0
      const canRun = target.type !== 'merge' || target.merge?.mode === 'any' || received.size === required
      if (canRun && !queued.has(target.id) && !outputs[target.id]) { queued.add(target.id); ready.push(target) }
    }
    // Rebuild routing state from durable checkpoints before doing new work.
    for (const [nodeId, result] of Object.entries(outputs)) {
      for (const edge of outgoing.get(nodeId) ?? []) if ((result.ports ?? ['default']).includes(edge.fromPort)) schedule(edge)
    }
    const executeNode = async (node: NodeDefinition) => {
      const parentEdges = incoming.get(node.id) ?? []
      const parentValues = parentEdges.filter(edge => outputs[edge.from]).map(edge => outputs[edge.from].output)
      const rawInput: Json = parentValues.length === 0 ? run.input : parentValues.length === 1 ? parentValues[0] : parentValues
      const input = resolveVariables((node.config.input ?? rawInput) as Json, { input: run.input, nodes: Object.fromEntries(Object.entries(outputs).map(([id, result]) => [id, result.output])) })
      validateSchema(node.inputSchema, input)
      const handler = getNodeHandler(node.type, node.version)
      if (!handler) throw new Error(`Handler ausente: ${node.type}@${node.version}`)
      if (handler.kind === 'effect' && !node.idempotencyKey) throw new Error(`Nó de efeito ${node.id} exige idempotencyKey explícita`)
      const idempotencyKey = keyOf(runId, node, input)
      const retry = node.retry ?? { maxAttempts: 1, initialDelayMs: 0 }
      let lastError: unknown
      for (let attempt = 1; attempt <= Math.max(1, retry.maxAttempts); attempt++) {
        const record = await this.store.beginAttempt({ runId, node, attempt, idempotencyKey, input: redact(input) })
        if (record.completed?.status === 'succeeded' && record.completed.output !== undefined) return { output: record.completed.output, ports: record.completed.ports ?? ['default'] } as NodeResult
        try {
          const result = await withTimeout(node.timeoutMs ?? 30_000, signal => handler.execute(input, node.config, { runId, nodeId: node.id, attempt, signal, idempotencyKey }))
          validateSchema(node.outputSchema, result.output)
          // Output is a protected checkpoint required for exact resume; only event/error log payloads are redacted.
          await this.store.finishAttempt(record.id, { status: 'succeeded', output: result.output, ports: result.ports })
          return result
        } catch (error) {
          lastError = error
          await this.store.finishAttempt(record.id, { status: 'failed', error: redact({ message: error instanceof Error ? error.message : String(error) }) })
          if (attempt < retry.maxAttempts) await sleep(Math.min((retry.initialDelayMs || 100) * Math.pow(retry.multiplier ?? 2, attempt - 1), retry.maxDelayMs ?? 30_000))
        }
      }
      throw lastError
    }

    try {
      while (ready.length && !stopped) {
        const batch = ready.splice(0, limit)
        await Promise.all(batch.map(async node => {
          if (outputs[node.id]) return
          try {
            const result = await executeNode(node); outputs[node.id] = result
            await this.store.emit(runId, 'node.completed', { nodeId: node.id, ports: result.ports ?? ['default'] })
            for (const edge of outgoing.get(node.id) ?? []) if ((result.ports ?? ['default']).includes(edge.fromPort)) schedule(edge)
          } catch (error) {
            await this.store.emit(runId, 'node.failed', { nodeId: node.id, message: error instanceof Error ? error.message : String(error) })
            if (node.errorPolicy !== 'continue') stopped = true
          }
        }))
      }
      if (stopped) throw new Error('Execução interrompida por erro de nó')
      await this.store.finishRun(runId, 'succeeded', Object.fromEntries(Object.entries(outputs).map(([key, value]) => [key, value.output])))
    } catch (error) { await this.store.finishRun(runId, 'failed'); throw error }
  }
}
