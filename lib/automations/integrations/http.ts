import { isIP } from 'node:net'
import { resolve4, resolve6 } from 'node:dns/promises'

export type SafeHttpLimits = {
  maxRequestBytes: number
  maxResponseBytes: number
  maxDownloadBytes: number
  maxRedirects: number
  timeoutMs: number
}

export const DEFAULT_HTTP_LIMITS: SafeHttpLimits = {
  maxRequestBytes: 1_000_000,
  maxResponseBytes: 2_000_000,
  maxDownloadBytes: 10_000_000,
  maxRedirects: 3,
  timeoutMs: 10_000,
}

const BLOCKED_HOSTS = new Set(['localhost', 'localhost.localdomain', 'metadata.google.internal', 'metadata', 'instance-data'])

export async function assertSafeUrl(rawUrl: string, resolver: typeof resolveHost = resolveHost) {
  let url: URL
  try { url = new URL(rawUrl) } catch { throw new Error('URL HTTP inválida.') }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Somente HTTP e HTTPS são permitidos.')
  if (url.username || url.password) throw new Error('Credenciais embutidas na URL não são permitidas.')
  const hostname = url.hostname.toLowerCase().replace(/\.$/, '').replace(/^\[|\]$/g, '')
  if (BLOCKED_HOSTS.has(hostname) || hostname.endsWith('.localhost') || hostname.endsWith('.internal')) throw new Error('Destino interno ou de metadata bloqueado.')
  const addresses = isIP(hostname) ? [hostname] : await resolver(hostname)
  if (!addresses.length) throw new Error('O hostname não possui endereço IP.')
  if (addresses.some(isForbiddenIp)) throw new Error('Destino privado, local, link-local ou de metadata bloqueado.')
  return url
}

export async function safeHttpRequest(rawUrl: string, init: RequestInit = {}, limits: Partial<SafeHttpLimits> = {}, fetcher = fetch) {
  const options = { ...DEFAULT_HTTP_LIMITS, ...limits }
  validateLimits(options)
  const requestBytes = bodySize(init.body)
  if (requestBytes > options.maxRequestBytes) throw new Error(`Payload excede ${options.maxRequestBytes} bytes.`)
  let url = await assertSafeUrl(rawUrl)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), options.timeoutMs)
  let redirects = 0
  try {
    while (true) {
      // Resolve novamente imediatamente antes de cada request e de cada redirect.
      url = await assertSafeUrl(url.toString())
      const response = await fetcher(url, { ...init, redirect: 'manual', signal: controller.signal })
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location')
        if (!location) throw new Error('Redirecionamento sem destino.')
        if (redirects++ >= options.maxRedirects) throw new Error('Limite de redirecionamentos excedido.')
        url = await assertSafeUrl(new URL(location, url).toString())
        continue
      }
      const contentLength = Number(response.headers.get('content-length'))
      const disposition = response.headers.get('content-disposition') ?? ''
      const isDownload = /attachment/i.test(disposition) || !isTextual(response.headers.get('content-type'))
      const maximum = isDownload ? options.maxDownloadBytes : options.maxResponseBytes
      if (Number.isFinite(contentLength) && contentLength > maximum) throw new Error(`Resposta excede ${maximum} bytes.`)
      const body = await readLimited(response.body, maximum)
      return { status: response.status, headers: response.headers, body, finalUrl: url.toString(), redirects }
    }
  } finally { clearTimeout(timer) }
}

async function resolveHost(hostname: string) {
  const [v4, v6] = await Promise.all([resolve4(hostname).catch(() => []), resolve6(hostname).catch(() => [])])
  return [...v4, ...v6]
}

export function isForbiddenIp(address: string) {
  let ip = address.toLowerCase().split('%')[0]
  if (ip.startsWith('::ffff:')) ip = ip.slice(7)
  if (isIP(ip) === 4) {
    const [a, b] = ip.split('.').map(Number)
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224
  }
  if (isIP(ip) === 6) {
    return ip === '::' || ip === '::1' || ip.startsWith('fc') || ip.startsWith('fd') || /^fe[89ab]/.test(ip) || ip.startsWith('ff') || ip === '100::' || ip.startsWith('2001:db8:')
  }
  return true
}

async function readLimited(stream: ReadableStream<Uint8Array> | null, maximum: number) {
  if (!stream) return Buffer.alloc(0)
  const reader = stream.getReader(); const chunks: Uint8Array[] = []; let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > maximum) { await reader.cancel(); throw new Error(`Resposta excede ${maximum} bytes.`) }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  return Buffer.concat(chunks)
}

function bodySize(body: RequestInit['body']) {
  if (!body) return 0
  if (typeof body === 'string') return Buffer.byteLength(body)
  if (body instanceof URLSearchParams) return Buffer.byteLength(body.toString())
  if (body instanceof ArrayBuffer) return body.byteLength
  if (ArrayBuffer.isView(body)) return body.byteLength
  if (typeof Blob !== 'undefined' && body instanceof Blob) return body.size
  throw new Error('Payload em streaming ou FormData não é permitido sem tamanho verificável.')
}

function isTextual(contentType: string | null) { return !!contentType && /^(text\/|application\/(json|xml|javascript|x-www-form-urlencoded))/i.test(contentType) }
function validateLimits(limits: SafeHttpLimits) {
  if (limits.timeoutMs < 100 || limits.timeoutMs > 60_000 || limits.maxRedirects < 0 || limits.maxRedirects > 10) throw new Error('Limites HTTP inválidos.')
  if (limits.maxRequestBytes < 1 || limits.maxResponseBytes < 1 || limits.maxDownloadBytes < 1) throw new Error('Limites de tamanho inválidos.')
}
