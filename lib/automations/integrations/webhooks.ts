import { createHmac, timingSafeEqual } from 'node:crypto'

export function verifyHmacWebhook(input: { rawBody: Buffer | string; signature: string | null; secret: string; algorithm?: 'sha256' | 'sha1'; prefix?: string }) {
  if (!input.signature || !input.secret) return false
  const algorithm = input.algorithm ?? 'sha256'
  const expected = createHmac(algorithm, input.secret).update(input.rawBody).digest('hex')
  const received = input.signature.startsWith(input.prefix ?? `${algorithm}=`) ? input.signature.slice((input.prefix ?? `${algorithm}=`).length) : input.signature
  const a = Buffer.from(expected, 'hex'); const b = Buffer.from(received, 'hex')
  return a.length === b.length && timingSafeEqual(a, b)
}

export function verifyMetaWebhook(rawBody: Buffer | string, signature: string | null, appSecret: string) {
  return verifyHmacWebhook({ rawBody, signature, secret: appSecret, algorithm: 'sha256', prefix: 'sha256=' })
}

export function verifyYCloudWebhook(rawBody: Buffer | string, signature: string | null, secret: string) {
  // YCloud API v2 sends the raw hexadecimal HMAC digest, without a `sha256=` prefix.
  return verifyHmacWebhook({ rawBody, signature, secret, algorithm: 'sha256', prefix: '' })
}

export function validateYCloudWebhook(rawBody: Buffer | string, signature: string | null, secret: string | undefined) {
  if (!secret) return { error: 'YCloud webhook secret is not configured', status: 503 as const }
  if (!verifyYCloudWebhook(rawBody, signature, secret)) return { error: 'Unauthorized', status: 401 as const }
  return null
}
