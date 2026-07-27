import { createHash, randomBytes } from 'node:crypto'

export const MAX_WEBHOOK_BYTES = 256 * 1024
export const TEST_SESSION_TTL_MS = 5 * 60 * 1000

export function createWebhookToken() {
  return randomBytes(32).toString('base64url')
}

export function hashWebhookToken(token: string) {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

export async function readJsonWebhook(request: Request, maxBytes = MAX_WEBHOOK_BYTES) {
  const contentType = request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase()
  if (contentType !== 'application/json') {
    throw new WebhookRequestError(415, 'Content-Type deve ser application/json')
  }

  const declaredLength = Number(request.headers.get('content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new WebhookRequestError(413, 'Payload excede o limite permitido')
  }

  const reader = request.body?.getReader()
  if (!reader) return null

  const chunks: Uint8Array[] = []
  let total = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > maxBytes) {
      await reader.cancel()
      throw new WebhookRequestError(413, 'Payload excede o limite permitido')
    }
    chunks.push(value)
  }

  try {
    const body = Buffer.concat(chunks).toString('utf8')
    return body.length ? JSON.parse(body) : null
  } catch {
    throw new WebhookRequestError(400, 'JSON inválido')
  }
}

export class WebhookRequestError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

const SECRET_KEY = /authorization|cookie|password|passwd|secret|token|api[-_]?key|credential/i

export function sanitizeExecutionValue(value: unknown, depth = 0): unknown {
  if (depth > 8) return '[TRUNCATED]'
  if (typeof value === 'string') return value.length > 4_000 ? `${value.slice(0, 4_000)}…` : value
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => sanitizeExecutionValue(item, depth + 1))
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 100)
        .map(([key, item]) => [key, SECRET_KEY.test(key) ? '[REDACTED]' : sanitizeExecutionValue(item, depth + 1)])
    )
  }
  return value
}

export function webhookRateLimitKey(request: Request, scope: string) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0].trim()
  const ip = forwarded || request.headers.get('x-real-ip') || 'unknown'
  return createHash('sha256').update(`${scope}:${ip}`).digest('hex')
}
