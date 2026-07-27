import type { Json } from './types'

const SECRET = /authorization|cookie|token|secret|password|api[-_]?key|set-cookie/i
const PII = /email|phone|cpf|cnpj|address|full_name|birth/i
export function redact(value: Json, seen = new WeakSet<object>()): Json {
  if (!value || typeof value !== 'object') return value
  if (seen.has(value)) return '[circular]'
  seen.add(value)
  if (Array.isArray(value)) return value.map(item => redact(item, seen))
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, SECRET.test(key) ? '[REDACTED]' : PII.test(key) ? '[PII]' : redact(item, seen)]))
}
