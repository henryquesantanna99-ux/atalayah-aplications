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
  return verifyHmacWebhook({ rawBody, signature, secret, algorithm: 'sha256' })
}
