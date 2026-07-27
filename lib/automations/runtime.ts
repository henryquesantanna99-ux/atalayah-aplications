export type ExternalAction<T = unknown> = (signal: AbortSignal) => Promise<T>

export async function runExternal<T>(action: ExternalAction<T>, options: {
  attempts?: number; timeoutMs?: number; idempotencyKey: string; completed?: Map<string, T>
}): Promise<T> {
  const completed = options.completed ?? new Map<string, T>()
  if (completed.has(options.idempotencyKey)) return completed.get(options.idempotencyKey)!
  const attempts = options.attempts ?? 1
  let lastError: unknown
  for (let attempt = 0; attempt < attempts; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(new Error('Action timed out')), options.timeoutMs ?? 30_000)
    try {
      const result = await Promise.race([
        action(controller.signal),
        new Promise<never>((_, reject) => controller.signal.addEventListener('abort', () => reject(controller.signal.reason))),
      ])
      completed.set(options.idempotencyKey, result)
      return result
    } catch (error) { lastError = error } finally { clearTimeout(timer) }
  }
  throw lastError
}

export class TestSessionStore {
  private sessions = new Map<string, { expiresAt: number; valid: boolean }>()
  private executions = new Map<string, Promise<unknown>>()
  private readonly now: () => number
  constructor(now = () => Date.now()) { this.now = now }
  create(id: string, ttlMs: number) { this.sessions.set(id, { expiresAt: this.now() + ttlMs, valid: true }) }
  isValid(id: string) { const s = this.sessions.get(id); return Boolean(s?.valid && s.expiresAt > this.now()) }
  invalidate(id: string) { const s = this.sessions.get(id); if (s) s.valid = false }
  executeOnce<T>(url: string, execute: () => Promise<T>): Promise<T> {
    const current = this.executions.get(url) as Promise<T> | undefined
    if (current) return current
    const pending = execute().finally(() => this.executions.delete(url))
    this.executions.set(url, pending)
    return pending
  }
}

const SECRET_KEYS = /token|secret|password|authorization|email|phone|cpf/i
export function sanitizeLog(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeLog)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, SECRET_KEYS.test(key) ? '[REDACTED]' : sanitizeLog(item)]))
  return value
}
