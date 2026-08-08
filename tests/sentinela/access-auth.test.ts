import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { canAccessScope, canAccessSeason, canManageSentinela } from '../../lib/sentinela/access.ts'
import { authRedirect } from '../../lib/sentinela/auth.ts'

describe('main/Sentinela isolation', () => {
  it('requires explicit account scope and season membership', () => {
    assert.equal(canAccessScope('main', ['sentinela']), false)
    assert.equal(canAccessScope('sentinela', ['main']), false)
    assert.equal(canAccessSeason('winter', ['summer'], 'participant'), false)
    assert.equal(canAccessSeason('winter', ['winter'], 'participant'), true)
    assert.equal(canAccessSeason('winter', [], 'admin'), true)
  })

  it('protects administration by persisted season role', () => {
    assert.equal(canManageSentinela('participant'), false)
    assert.equal(canManageSentinela('mentor'), false)
    assert.equal(canManageSentinela('coordinator'), true)
    assert.equal(canManageSentinela('admin'), true)
  })
})

describe('authentication lifecycle redirects', () => {
  const active = { onboardingCompleted: true, status: 'active' as const }
  it('covers signup, login, logout and email confirmation', () => {
    assert.equal(authRedirect({ event: 'signup' }), '/confirmar-email')
    assert.equal(authRedirect({ event: 'login', profile: active }), '/sentinela')
    assert.equal(authRedirect({ event: 'logout' }), '/login')
    assert.equal(authRedirect({ event: 'email-confirmation', profile: null }), '/sentinela/onboarding')
  })
  it('covers recovery, reset, onboarding and safe next redirects', () => {
    assert.equal(authRedirect({ event: 'recovery' }), '/redefinir-senha')
    assert.equal(authRedirect({ event: 'password-reset' }), '/login?message=password_updated')
    assert.equal(authRedirect({ event: 'login', profile: active, next: '/sentinela/diario' }), '/sentinela/diario')
    assert.equal(authRedirect({ event: 'login', profile: active, next: 'https://evil.example' }), '/sentinela')
    assert.equal(authRedirect({ event: 'login', profile: active, next: '//evil.example' }), '/sentinela')
  })
})
