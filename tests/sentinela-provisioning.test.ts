import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const migration = readFileSync(new URL('../supabase/migrations/042_multi_product_sentinela_provisioning.sql', import.meta.url), 'utf8')
const signup = readFileSync(new URL('../app/sentinela/criar-conta/signup-form.tsx', import.meta.url), 'utf8')

test('provisioning is an authenticated, parameterless and idempotent transaction', () => {
  assert.match(migration, /complete_sentinela_signup\(\)/)
  assert.match(migration, /caller uuid := auth\.uid\(\)/)
  assert.doesNotMatch(migration, /complete_sentinela_signup\s*\(\s*user_id/i)
  assert.equal((migration.match(/on conflict do nothing/g) ?? []).length >= 4, true)
  assert.match(migration, /grant execute on function public\.complete_sentinela_signup\(\) to authenticated/)
})

test('forged client metadata cannot grant scope or privileged roles', () => {
  const sentinelaFunction = migration.slice(migration.indexOf('create or replace function public.complete_sentinela_signup'))
  assert.doesNotMatch(sentinelaFunction, /raw_user_meta_data/)
  for (const forbidden of ["'main'", "'admin'", "'mentor'", "'journey_admin'"]) {
    assert.doesNotMatch(sentinelaFunction, new RegExp(forbidden))
  }
  assert.doesNotMatch(signup, /user_metadata|role|scope|signInWithOAuth/)
})

test('signup supports immediate session and deferred email confirmation', () => {
  assert.match(signup, /if \(!error && data\.session\)/)
  assert.match(signup, /complete_sentinela_signup/)
  assert.match(signup, /publicAuthMessage\('signup'\)/)
  assert.match(signup, /senha não atende aos requisitos/)
})
