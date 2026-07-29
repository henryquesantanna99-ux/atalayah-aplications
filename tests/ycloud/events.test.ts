import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { eventFingerprint, normalizeYCloudEvent } from '../../lib/ycloud/events.ts'

describe('YCloud event normalization', () => {
  const previousFrom = process.env.YCLOUD_WHATSAPP_FROM
  before(() => { process.env.YCLOUD_WHATSAPP_FROM = '+5511999999999' })
  after(() => { process.env.YCLOUD_WHATSAPP_FROM = previousFrom })

  it('normalizes a webhook envelope and a history item identically', () => {
    const raw = { id: 'wamid.stable', from: '+5511888888888', to: '+5511999999999', timestamp: 1_700_000_000, type: 'text', text: { body: 'Olá' } }
    const webhook = normalizeYCloudEvent({ type: 'whatsapp.inbound_message.received', whatsappInboundMessage: raw })
    const history = normalizeYCloudEvent(raw)
    const { eventName: webhookEvent, ...normalizedWebhook } = webhook
    const { eventName: historyEvent, ...normalizedHistory } = history
    assert.equal(webhookEvent, 'whatsapp.inbound_message.received')
    assert.equal(historyEvent, 'text')
    assert.deepEqual(normalizedWebhook, normalizedHistory)
    assert.equal(history.messageId, 'wamid.stable')
    assert.equal(history.phone, '+5511888888888')
  })

  it('recognizes outbound coexistence messages by the business number', () => {
    const result = normalizeYCloudEvent({ id: 'out-1', from: '+5511999999999', to: '+5511777777777', body: 'Resposta' })
    assert.equal(result.direction, 'outbound')
    assert.equal(result.phone, '+5511777777777')
  })

  it('creates a deterministic fingerprint for webhook deduplication', () => {
    const payload = { id: 'same', nested: { value: 1 } }
    assert.equal(eventFingerprint(payload), eventFingerprint(payload))
    assert.notEqual(eventFingerprint(payload), eventFingerprint({ ...payload, id: 'other' }))
  })
})
