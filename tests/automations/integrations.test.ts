import assert from 'node:assert/strict'
import test from 'node:test'
import { CredentialVault } from '../../lib/automations/integrations/credentials.ts'
import { assertSafeUrl, isForbiddenIp } from '../../lib/automations/integrations/http.ts'
import { createOAuthStart, verifyOAuthState } from '../../lib/automations/integrations/oauth.ts'
import { maskSensitive } from '../../lib/automations/integrations/privacy.ts'
import { verifyMetaWebhook } from '../../lib/automations/integrations/webhooks.ts'
import { createHmac, randomBytes } from 'node:crypto'
import type { AuditEvent, CredentialRecord } from '../../lib/automations/integrations/types.ts'

test('OAuth state is signed, tenant-bound and Google uses PKCE with minimum event scope', () => {
  const secret = 'a-very-long-state-secret-with-32-chars'
  const start = createOAuthStart({ provider: 'google-calendar', organizationId: 'org-a', actorId: 'user-a', clientId: 'client', redirectUri: 'https://app.example/callback', stateSecret: secret })
  const url = new URL(start.authorizationUrl)
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256')
  assert.equal(url.searchParams.get('scope'), 'https://www.googleapis.com/auth/calendar.events')
  assert.ok(start.pkceVerifier)
  assert.equal(verifyOAuthState(start.state, secret, { provider: 'google-calendar', organizationId: 'org-a', actorId: 'user-a' }).actorId, 'user-a')
  assert.throws(() => verifyOAuthState(start.state, secret, { provider: 'google-calendar', organizationId: 'org-b', actorId: 'user-a' }), /não pertence/)
})

test('credential vault encrypts secrets and refuses cross-tenant reads', async () => {
  let saved: CredentialRecord | null = null; let savedCiphertext = ''; const events: AuditEvent[] = []
  const repository = {
    async insert(record: Omit<CredentialRecord, 'id'>) { savedCiphertext = record.ciphertext; saved = { ...record, id: 'credential-1' }; return saved },
    async findById() { return saved }, async update() {},
  }
  const vault = new CredentialVault(repository, { async write(event) { events.push(event) } }, { currentVersion: 1, keys: { 1: randomBytes(32) } })
  const owner = { organizationId: 'org-a', actorId: 'user-a' }
  const id = await vault.create(owner, 'ai', { apiKey: 'super-secret' })
  assert.equal(id, 'credential-1'); assert.ok(!savedCiphertext.includes('super-secret'))
  assert.deepEqual(await vault.read(owner, id, 'ai'), { apiKey: 'super-secret' })
  await assert.rejects(vault.read({ organizationId: 'org-b', actorId: 'admin-b' }, id), /não encontrada/)
  assert.deepEqual(events.map((event) => event.action), ['credential.created', 'credential.used'])
})

test('SSRF filter rejects private, loopback, link-local and metadata destinations', async () => {
  for (const address of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '192.168.1.1', '169.254.169.254', '::1', 'fd00::1', 'fe80::1']) assert.equal(isForbiddenIp(address), true)
  assert.equal(isForbiddenIp('8.8.8.8'), false)
  await assert.rejects(assertSafeUrl('http://metadata.google.internal/computeMetadata/v1/'), /metadata/)
  await assert.rejects(assertSafeUrl('https://attacker.example', async () => ['10.0.0.4']), /privado/)
  await assert.doesNotReject(assertSafeUrl('https://example.com', async () => ['93.184.216.34']))
})

test('webhook signature is checked with HMAC and logs are redacted', () => {
  const body = '{"event":"message"}'; const secret = 'webhook-secret'
  const signature = `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`
  assert.equal(verifyMetaWebhook(body, signature, secret), true)
  assert.equal(verifyMetaWebhook(`${body}x`, signature, secret), false)
  assert.deepEqual(maskSensitive({ phone: '+55 11 99999-1234', note: 'contato person@example.com', content: 'private chat' }), { phone: '[REDACTED]', note: 'contato p***@example.com', content: '[REDACTED]' })
})
