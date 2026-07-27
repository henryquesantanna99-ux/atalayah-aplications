import { createHash } from 'node:crypto'
import { safeHttpRequest } from './http.ts'
import { UnsupportedOperationError, type IdempotentRequest, type TokenSet } from './types.ts'

export interface IdempotencyStore {
  get(key: string): Promise<unknown | null>
  put(key: string, value: unknown): Promise<void>
}

async function once<T>(store: IdempotencyStore, namespace: string, key: string, operation: () => Promise<T>) {
  if (!key || key.length > 255) throw new Error('Idempotency key obrigatória e limitada a 255 caracteres.')
  const scoped = `${namespace}:${key}`
  const existing = await store.get(scoped)
  if (existing !== null) return existing as T
  const result = await operation()
  await store.put(scoped, result)
  return result
}

async function providerJson(url: string, init: RequestInit) {
  const response = await safeHttpRequest(url, init)
  const data = JSON.parse(response.body.toString('utf8')) as Record<string, unknown>
  if (response.status < 200 || response.status >= 300) throw new Error(`API do provedor respondeu com status ${response.status}.`)
  return data
}

export class YCloudWhatsAppAdapter {
  constructor(private apiKey: string, private from: string, private idempotency: IdempotencyStore) {}
  sendText(input: IdempotentRequest & { to: string; text: string }) {
    return once(this.idempotency, 'ycloud.message', input.idempotencyKey, () => providerJson('https://api.ycloud.com/v2/whatsapp/messages/sendDirectly', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': this.apiKey },
      body: JSON.stringify({ from: this.from, to: input.to, type: 'text', externalId: input.idempotencyKey, category: 'utility', useDirectSend: true, text: { body: input.text } }),
    }))
  }
  editMessage() { throw new UnsupportedOperationError('ycloud', 'editar mensagem enviada', 'Envie uma nova mensagem de correção.') }
}

export class InstagramAdapter {
  constructor(private token: TokenSet, private accountId: string, private idempotency: IdempotencyStore) {}
  sendMessage(input: IdempotentRequest & { recipientId: string; text: string }) {
    return once(this.idempotency, 'instagram.message', input.idempotencyKey, () => providerJson(`https://graph.instagram.com/v23.0/${encodeURIComponent(this.accountId)}/messages`, {
      method: 'POST', headers: { authorization: `Bearer ${this.token.accessToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ recipient: { id: input.recipientId }, message: { text: input.text } }),
    }))
  }
  sendToPhone() { throw new UnsupportedOperationError('instagram', 'enviar mensagem por número de telefone', 'Selecione um usuário que já iniciou uma conversa no Instagram.') }
  readPrivateProfile() { throw new UnsupportedOperationError('instagram', 'ler perfil privado', 'A API oficial respeita as permissões e a privacidade da conta.') }
}

export class GoogleCalendarAdapter {
  constructor(private token: TokenSet, private idempotency: IdempotencyStore) {}
  createEvent(input: IdempotentRequest & { calendarId?: string; event: Record<string, unknown> }) {
    return once(this.idempotency, 'calendar.event', input.idempotencyKey, () => {
      const eventId = deterministicGoogleEventId(input.idempotencyKey)
      return providerJson(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(input.calendarId ?? 'primary')}/events`, {
        method: 'POST', headers: { authorization: `Bearer ${this.token.accessToken}`, 'content-type': 'application/json' }, body: JSON.stringify({ ...input.event, id: eventId }),
      })
    })
  }
}

export class AIAdapter {
  constructor(private apiKey: string, private model: string) {}
  generate(input: { prompt: string; maxOutputTokens?: number }) {
    if (input.prompt.length > 100_000) throw new Error('Prompt excede 100.000 caracteres.')
    return providerJson('https://api.openai.com/v1/responses', {
      method: 'POST', headers: { authorization: `Bearer ${this.apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model: this.model, input: input.prompt, max_output_tokens: Math.min(input.maxOutputTokens ?? 1024, 4096) }),
    })
  }
}

export class HttpAdapter {
  request(url: string, init?: RequestInit) { return safeHttpRequest(url, init) }
}

export function createCardIdempotently<T>(store: IdempotencyStore, key: string, create: () => Promise<T>) {
  return once(store, 'crm.card', key, create)
}

function deterministicGoogleEventId(key: string) {
  // Calendar IDs aceitam a-h e 0-9; sha256 em hexadecimal atende e é estável.
  return createHash('sha256').update(key).digest('hex')
}
