import assert from 'node:assert/strict'
import test from 'node:test'
import { publicAuthMessage, safeSentinelaNext, sentinelaReturnUrl } from '../lib/sentinela/auth.ts'

test('confirmation enabled and disabled use the same confined callback', () => {
  assert.equal(sentinelaReturnUrl('https://app.test', 'signup'), 'https://app.test/sentinela/auth/callback')
  assert.equal(sentinelaReturnUrl('https://app.test', 'recovery'), 'https://app.test/sentinela/auth/callback?next=%2Fsentinela%2Fredefinir-senha')
})

test('callback never redirects outside the Sentinela namespace', () => {
  assert.equal(safeSentinelaNext('https://evil.test'), '/sentinela/onboarding')
  assert.equal(safeSentinelaNext('//evil.test'), '/sentinela/onboarding')
  assert.equal(safeSentinelaNext('/dashboard'), '/sentinela/onboarding')
  assert.equal(safeSentinelaNext('/sentinela/configuracao'), '/sentinela/configuracao')
})

test('existing email response does not disclose account existence', () => {
  assert.match(publicAuthMessage('signup'), /Se for possível/)
  assert.match(publicAuthMessage('recovery'), /Se houver/)
})
