import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { runExternal, sanitizeLog, TestSessionStore } from '../../lib/automations/runtime.ts'

describe('reliable runtime', () => {
  it('retries failures and reuses a completed idempotent action on resume', async () => {
    let calls = 0; const completed = new Map<string, string>()
    const action = async () => { calls++; if (calls === 1) throw new Error('temporary'); return 'external-1' }
    assert.equal(await runExternal(action, { attempts: 2, idempotencyKey: 'run:node', completed }), 'external-1')
    assert.equal(await runExternal(action, { attempts: 2, idempotencyKey: 'run:node', completed }), 'external-1')
    assert.equal(calls, 2)
  })
  it('aborts actions at their timeout', async () => {
    await assert.rejects(runExternal(() => new Promise(() => {}), { timeoutMs: 5, idempotencyKey: 'slow' }), /timed out/)
  })
  it('starts exactly one execution for concurrent requests to the same test URL', async () => {
    const sessions = new TestSessionStore(); let calls = 0
    const execute = async () => { calls++; await new Promise((resolve) => setTimeout(resolve, 5)); return calls }
    const [a, b] = await Promise.all([sessions.executeOnce('/test/same', execute), sessions.executeOnce('/test/same', execute)])
    assert.deepEqual([a, b], [1, 1]); assert.equal(calls, 1)
  })
  it('expires and explicitly invalidates test sessions', () => {
    let now = 100; const sessions = new TestSessionStore(() => now)
    sessions.create('expires', 10); assert.equal(sessions.isValid('expires'), true)
    now = 110; assert.equal(sessions.isValid('expires'), false)
    sessions.create('revoked', 10); sessions.invalidate('revoked'); assert.equal(sessions.isValid('revoked'), false)
  })
  it('redacts nested secrets and personal data in logs', () => {
    assert.deepEqual(sanitizeLog({ accessToken: 'abc', user: { email: 'a@b.co', name: 'Ana' }, list: [{ phone: '123' }] }), {
      accessToken: '[REDACTED]', user: { email: '[REDACTED]', name: 'Ana' }, list: [{ phone: '[REDACTED]' }],
    })
  })
})
