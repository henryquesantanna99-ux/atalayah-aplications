const BLOCKED_KEYS = new Set(['__proto__', 'prototype', 'constructor'])

export function resolvePath(context: unknown, path: string): unknown {
  const keys = path.split('.').filter(Boolean)
  if (keys.some((key) => BLOCKED_KEYS.has(key))) throw new Error('Unsafe variable path')
  let value = context
  for (const key of keys) {
    if (value === null || typeof value !== 'object' || !Object.prototype.hasOwnProperty.call(value, key)) return undefined
    value = (value as Record<string, unknown>)[key]
  }
  return value
}

export function resolveTemplate(template: string, context: unknown): unknown {
  const exact = template.match(/^\{\{\s*([\w.]+)\s*\}\}$/)
  if (exact) return resolvePath(context, exact[1])
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path) => {
    const value = resolvePath(context, path)
    return value == null ? '' : String(value)
  })
}

export type Condition =
  | { op: 'eq'; left: unknown; right: unknown }
  | { op: 'and' | 'or'; conditions: Condition[] }
  | { op: 'not'; condition: Condition }

export function evaluate(condition: Condition): boolean {
  if (condition.op === 'eq') {
    if (typeof condition.left !== typeof condition.right) return false
    return Object.is(condition.left, condition.right)
  }
  if (condition.op === 'not') return !evaluate(condition.condition)
  return condition.op === 'and'
    ? condition.conditions.every(evaluate)
    : condition.conditions.some(evaluate)
}

export function switchCase(value: unknown, cases: Array<{ value: unknown; next: string }>, fallback: string) {
  return cases.find((entry) => typeof entry.value === typeof value && Object.is(entry.value, value))?.next ?? fallback
}
