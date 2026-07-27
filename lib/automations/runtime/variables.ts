import type { Json } from './types'

// Deliberately supports paths only: no eval, Function, operators or property calls.
const TOKEN = /^\$\{(input|nodes)(?:\.([A-Za-z0-9_-]+))?(?:\.([A-Za-z0-9_.-]+))?\}$/

export function resolveVariables(value: Json, scope: { input: Json; nodes: Record<string, Json> }): Json {
  if (typeof value === 'string') {
    const match = TOKEN.exec(value)
    if (!match) return value
    let current: Json | undefined = match[1] === 'input' ? scope.input : scope.nodes[match[2] ?? '']
    const path = match[1] === 'input' ? [match[2], match[3]] : [match[3]]
    for (const part of path.filter(Boolean).flatMap(item => item!.split('.'))) {
      if (!current || Array.isArray(current) || typeof current !== 'object' || !(part in current)) return null
      current = current[part]
    }
    return current ?? null
  }
  if (Array.isArray(value)) return value.map(item => resolveVariables(item, scope))
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolveVariables(v, scope)]))
  return value
}
