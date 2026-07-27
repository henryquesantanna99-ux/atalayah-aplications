import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createWebhookToken,
  hashWebhookToken,
  readJsonWebhook,
  sanitizeExecutionValue,
  WebhookRequestError,
} from '../../lib/automations/webhooks.ts'

test('creates opaque tokens and only deterministic hashes', () => {
  const first = createWebhookToken()
  const second = createWebhookToken()
  assert.notEqual(first, second)
  assert.ok(first.length >= 43)
  assert.match(hashWebhookToken(first), /^[a-f0-9]{64}$/)
  assert.equal(hashWebhookToken(first), hashWebhookToken(first))
})

test('rejects non-json and oversized webhook requests', async () => {
  await assert.rejects(
    readJsonWebhook(new Request('https://example.test', { method: 'POST', body: 'hello' })),
    (error: unknown) => error instanceof WebhookRequestError && error.status === 415,
  )
  await assert.rejects(
    readJsonWebhook(new Request('https://example.test', {
      method: 'POST', body: JSON.stringify({ long: 'value' }), headers: { 'content-type': 'application/json' },
    }), 4),
    (error: unknown) => error instanceof WebhookRequestError && error.status === 413,
  )
})

test('sanitizes secrets and bounds stored telemetry', () => {
  const sanitized = sanitizeExecutionValue({
    authorization: 'Bearer private',
    nested: { api_key: 'private', safe: 'visible' },
    long: 'x'.repeat(5_000),
  }) as Record<string, unknown>
  assert.equal(sanitized.authorization, '[REDACTED]')
  const nested = sanitized.nested as Record<string, unknown>
  assert.equal(nested.api_key, '[REDACTED]')
  assert.equal(nested.safe, 'visible')
  assert.ok((sanitized.long as string).length < 5_000)
})
