import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import type { Provider, TokenSet } from './types.ts'

type OAuthProvider = Exclude<Provider, 'ycloud' | 'ai' | 'http'>
type OAuthConfig = { authorizeUrl: string; tokenUrl: string; scopes: string[]; pkce: boolean }

export const OAUTH_PROVIDERS: Record<OAuthProvider, OAuthConfig> = {
  instagram: {
    authorizeUrl: 'https://www.instagram.com/oauth/authorize',
    tokenUrl: 'https://api.instagram.com/oauth/access_token',
    scopes: ['instagram_business_basic', 'instagram_business_manage_messages'],
    pkce: false,
  },
  'google-calendar': {
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['https://www.googleapis.com/auth/calendar.events'],
    pkce: true,
  },
}

type StatePayload = { organizationId: string; actorId: string; provider: OAuthProvider; nonce: string; expiresAt: number }

export function createOAuthStart(input: Omit<StatePayload, 'nonce' | 'expiresAt'> & {
  clientId: string; redirectUri: string; stateSecret: string; ttlSeconds?: number
}) {
  const config = OAUTH_PROVIDERS[input.provider]
  const verifier = config.pkce ? base64url(randomBytes(32)) : undefined
  const payload: StatePayload = { organizationId: input.organizationId, actorId: input.actorId, provider: input.provider, nonce: base64url(randomBytes(18)), expiresAt: Date.now() + (input.ttlSeconds ?? 600) * 1000 }
  const state = signState(payload, input.stateSecret)
  const url = new URL(config.authorizeUrl)
  url.searchParams.set('client_id', input.clientId)
  url.searchParams.set('redirect_uri', input.redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', config.scopes.join(' '))
  url.searchParams.set('state', state)
  if (verifier) {
    url.searchParams.set('code_challenge', base64url(createHash('sha256').update(verifier).digest()))
    url.searchParams.set('code_challenge_method', 'S256')
  }
  if (input.provider === 'google-calendar') url.searchParams.set('access_type', 'offline')
  return { authorizationUrl: url.toString(), state, pkceVerifier: verifier, nonce: payload.nonce }
}

export function verifyOAuthState(state: string, secret: string, expected: { organizationId: string; actorId: string; provider: OAuthProvider }) {
  const [encoded, signature] = state.split('.')
  if (!encoded || !signature) throw new Error('State OAuth inválido.')
  const expectedSignature = createHmac('sha256', secret).update(encoded).digest()
  const received = Buffer.from(signature, 'base64url')
  if (received.length !== expectedSignature.length || !timingSafeEqual(received, expectedSignature)) throw new Error('Assinatura do state OAuth inválida.')
  const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString()) as StatePayload
  if (payload.expiresAt < Date.now()) throw new Error('State OAuth expirado.')
  if (payload.organizationId !== expected.organizationId || payload.actorId !== expected.actorId || payload.provider !== expected.provider) {
    throw new Error('State OAuth não pertence a este usuário e organização.')
  }
  return payload
}

export async function exchangeOAuthCode(provider: OAuthProvider, input: { code: string; clientId: string; clientSecret: string; redirectUri: string; pkceVerifier?: string }, fetcher = fetch): Promise<TokenSet> {
  const config = OAUTH_PROVIDERS[provider]
  if (config.pkce && !input.pkceVerifier) throw new Error('PKCE verifier obrigatório.')
  const body = new URLSearchParams({ grant_type: 'authorization_code', code: input.code, client_id: input.clientId, client_secret: input.clientSecret, redirect_uri: input.redirectUri })
  if (input.pkceVerifier) body.set('code_verifier', input.pkceVerifier)
  return tokenRequest(config.tokenUrl, body, fetcher)
}

export async function refreshOAuthToken(provider: OAuthProvider, input: { refreshToken: string; clientId: string; clientSecret: string }, fetcher = fetch): Promise<TokenSet> {
  if (provider === 'instagram') {
    const url = new URL('https://graph.instagram.com/refresh_access_token')
    url.searchParams.set('grant_type', 'ig_refresh_token')
    url.searchParams.set('access_token', input.refreshToken)
    const response = await fetcher(url, { method: 'GET' })
    const json = await response.json() as Record<string, unknown>
    if (!response.ok || typeof json.access_token !== 'string') throw new Error('O Instagram recusou a renovação do token OAuth.')
    return { accessToken: json.access_token, refreshToken: json.access_token, expiresAt: typeof json.expires_in === 'number' ? new Date(Date.now() + json.expires_in * 1000).toISOString() : undefined }
  }
  const body = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: input.refreshToken, client_id: input.clientId, client_secret: input.clientSecret })
  const token = await tokenRequest(OAUTH_PROVIDERS[provider].tokenUrl, body, fetcher)
  return { ...token, refreshToken: token.refreshToken ?? input.refreshToken }
}

export function tokenNeedsRefresh(token: TokenSet, skewSeconds = 60) {
  return !!token.expiresAt && new Date(token.expiresAt).getTime() <= Date.now() + skewSeconds * 1000
}

async function tokenRequest(url: string, body: URLSearchParams, fetcher: typeof fetch): Promise<TokenSet> {
  const response = await fetcher(url, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body })
  const json = await response.json() as Record<string, unknown>
  if (!response.ok || typeof json.access_token !== 'string') throw new Error('O provedor recusou a troca/renovação do token OAuth.')
  return { accessToken: json.access_token, refreshToken: typeof json.refresh_token === 'string' ? json.refresh_token : undefined, expiresAt: typeof json.expires_in === 'number' ? new Date(Date.now() + json.expires_in * 1000).toISOString() : undefined, scope: typeof json.scope === 'string' ? json.scope : undefined }
}

function signState(payload: StatePayload, secret: string) {
  if (secret.length < 32) throw new Error('O segredo de state OAuth deve ter pelo menos 32 caracteres.')
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${encoded}.${createHmac('sha256', secret).update(encoded).digest('base64url')}`
}

function base64url(value: Buffer) { return value.toString('base64url') }
