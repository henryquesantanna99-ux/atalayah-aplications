/** Serializable values accepted in workflow node configuration. */
export type AutomationValue = string | number | boolean | null | AutomationValue[] | { [key: string]: AutomationValue }

export type AutomationNode = {
  id: string
  type: string
  config: Record<string, AutomationValue>
  credentialId?: string
}

export type AutomationEdge = {
  source: string
  target: string
}

export type AutomationGraph = {
  nodes: AutomationNode[]
  edges: AutomationEdge[]
}

/**
 * Validates data received by the workflow editor without using `any`. Keeping
 * the input as `unknown` forces callers to narrow untrusted JSON before use.
 */
export function parseAutomationGraph(input: unknown): AutomationGraph {
  if (!isRecord(input) || !Array.isArray(input.nodes) || !Array.isArray(input.edges)) {
    throw new Error('O workflow deve conter listas de nós e conexões.')
  }

  const nodes = input.nodes.map(parseNode)
  const edges = input.edges.map(parseEdge)
  const nodeIds = new Set(nodes.map((node) => node.id))
  if (nodeIds.size !== nodes.length) throw new Error('O workflow contém IDs de nós duplicados.')

  for (const edge of edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      throw new Error('Uma conexão aponta para um nó inexistente.')
    }
    if (edge.source === edge.target) throw new Error('Um nó não pode conectar-se diretamente a si mesmo.')
  }

  return { nodes, edges }
}

function parseNode(input: unknown): AutomationNode {
  if (!isRecord(input) || !isNonEmptyString(input.id) || !isNonEmptyString(input.type)) {
    throw new Error('Nó de automação inválido.')
  }
  if (!isRecord(input.config) || !isAutomationValue(input.config)) {
    throw new Error(`Configuração inválida no nó ${input.id}.`)
  }
  if (input.credentialId !== undefined && !isNonEmptyString(input.credentialId)) {
    throw new Error(`ID de credencial inválido no nó ${input.id}.`)
  }
  return {
    id: input.id,
    type: input.type,
    config: input.config,
    ...(input.credentialId === undefined ? {} : { credentialId: input.credentialId }),
  }
}

function parseEdge(input: unknown): AutomationEdge {
  if (!isRecord(input) || !isNonEmptyString(input.source) || !isNonEmptyString(input.target)) {
    throw new Error('Conexão de automação inválida.')
  }
  return { source: input.source, target: input.target }
}

function isAutomationValue(input: unknown): input is AutomationValue {
  if (input === null || ['string', 'number', 'boolean'].includes(typeof input)) return true
  if (Array.isArray(input)) return input.every(isAutomationValue)
  return isRecord(input) && Object.values(input).every(isAutomationValue)
}

function isRecord(input: unknown): input is Record<string, unknown> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return false
  const prototype = Object.getPrototypeOf(input) as object | null
  return prototype === Object.prototype || prototype === null
}

function isNonEmptyString(input: unknown): input is string {
  return typeof input === 'string' && input.trim().length > 0
}
