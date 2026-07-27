export const CURRENT_GRAPH_SCHEMA_VERSION = 2

export type GraphNode = { id: string; type: string; config?: Record<string, unknown> }
export type GraphEdge = { from: string; to: string }
export type AutomationGraph = { schemaVersion: number; nodes: GraphNode[]; edges: GraphEdge[] }

function migrateLegacyEdge(edge: unknown): GraphEdge {
  if (!edge || typeof edge !== 'object') throw new Error('Invalid legacy edge')
  const value = edge as Record<string, unknown>
  if (typeof value.source !== 'string' || typeof value.target !== 'string') {
    throw new Error('Invalid legacy edge')
  }
  return { from: value.source, to: value.target }
}

export function migrateGraph(input: unknown): AutomationGraph {
  if (!input || typeof input !== 'object') throw new Error('Invalid graph')
  const source = structuredClone(input) as Record<string, unknown>
  const version = source.schemaVersion ?? source.version ?? 1
  if (typeof version !== 'number' || version < 1 || version > CURRENT_GRAPH_SCHEMA_VERSION) {
    throw new Error(`Unsupported graph schema version: ${String(version)}`)
  }
  const nodes = source.nodes
  const legacyEdges = source.connections
  const edges = source.edges ?? (Array.isArray(legacyEdges)
    ? legacyEdges.map(migrateLegacyEdge)
    : [])
  const graph = { schemaVersion: CURRENT_GRAPH_SCHEMA_VERSION, nodes, edges }
  validateGraph(graph)
  return graph as AutomationGraph
}

export function validateGraph(graph: unknown): asserts graph is AutomationGraph {
  if (!graph || typeof graph !== 'object') throw new Error('Invalid graph')
  const value = graph as Partial<AutomationGraph>
  if (value.schemaVersion !== CURRENT_GRAPH_SCHEMA_VERSION || !Array.isArray(value.nodes) || !Array.isArray(value.edges)) {
    throw new Error('Invalid graph schema')
  }
  const ids = new Set<string>()
  for (const node of value.nodes) {
    if (!node || typeof node.id !== 'string' || !node.id || typeof node.type !== 'string' || ids.has(node.id)) {
      throw new Error('Invalid or duplicate node')
    }
    ids.add(node.id)
  }
  const adjacency = new Map(Array.from(ids).map((id) => [id, [] as string[]]))
  for (const edge of value.edges) {
    if (!edge || !ids.has(edge.from) || !ids.has(edge.to)) throw new Error('Edge references unknown node')
    adjacency.get(edge.from)!.push(edge.to)
  }
  const visiting = new Set<string>(); const visited = new Set<string>()
  const visit = (id: string) => {
    if (visiting.has(id)) throw new Error('Invalid cycle detected')
    if (visited.has(id)) return
    visiting.add(id); adjacency.get(id)!.forEach(visit); visiting.delete(id); visited.add(id)
  }
  ids.forEach(visit)
}

export function executionPlan(graph: AutomationGraph, starts = ['start']) {
  validateGraph(graph)
  const reachable = new Set<string>(); const incoming = new Map<string, number>()
  graph.nodes.forEach(({ id }) => incoming.set(id, 0))
  graph.edges.forEach(({ to }) => incoming.set(to, incoming.get(to)! + 1))
  const queue = starts.filter((id) => incoming.has(id))
  while (queue.length) {
    const id = queue.shift()!
    if (reachable.has(id)) continue
    reachable.add(id)
    graph.edges.filter((edge) => edge.from === id).forEach((edge) => queue.push(edge.to))
  }
  const pending = new Map(incoming); const ordered: string[] = []
  const ready = Array.from(reachable).filter((id) => graph.edges.every((e) => e.to !== id || !reachable.has(e.from)))
  while (ready.length) {
    const id = ready.shift()!; ordered.push(id)
    for (const edge of graph.edges.filter((e) => e.from === id && reachable.has(e.to))) {
      pending.set(edge.to, pending.get(edge.to)! - 1)
      if (pending.get(edge.to) === 0) ready.push(edge.to)
    }
  }
  return { ordered, unreachable: graph.nodes.map((n) => n.id).filter((id) => !reachable.has(id)) }
}
