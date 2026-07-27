import type { Json, NodeHandler } from './types'

function getPath(input: Json, path: string): Json | undefined {
  let value: Json | undefined = input
  for (const part of path.split('.').filter(Boolean)) {
    if (!value || Array.isArray(value) || typeof value !== 'object') return undefined
    value = value[part]
  }
  return value
}

const handlers = new Map<string, NodeHandler>()
handlers.set('noop', { kind: 'pure', async execute(input) { return { output: input, ports: ['default'] } } })
handlers.set('if', { kind: 'pure', async execute(input, config) {
  const actual = getPath(input, String(config.path ?? ''))
  const matches = JSON.stringify(actual) === JSON.stringify(config.equals)
  return { output: input, ports: [matches ? 'true' : 'false'] }
} })
handlers.set('switch', { kind: 'pure', async execute(input, config) {
  const actual = getPath(input, String(config.path ?? ''))
  const cases = (config.cases && typeof config.cases === 'object' && !Array.isArray(config.cases) ? config.cases : {}) as Record<string, Json>
  const port = Object.entries(cases).find(([, expected]) => JSON.stringify(expected) === JSON.stringify(actual))?.[0] ?? 'default'
  return { output: input, ports: [port] }
} })
handlers.set('merge', { kind: 'pure', async execute(input) { return { output: input, ports: ['default'] } } })

export function registerNodeHandler(type: string, version: number, handler: NodeHandler): void { handlers.set(`${type}@${version}`, handler) }
export function getNodeHandler(type: string, version: number): NodeHandler | undefined { return handlers.get(`${type}@${version}`) ?? handlers.get(type) }
