import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { canManageRehearsals } from '../../lib/sentinela/permissions.ts'

const migration = readFileSync('supabase/migrations/043_sentinela_season_authorization.sql', 'utf8')

test('mentor permissions are explicit and do not imply administration', () => {
  assert.equal(canManageRehearsals({ role: 'mentor', grants: [] }), false)
  assert.equal(canManageRehearsals({ role: 'mentor', grants: ['manage_rehearsals'] }), true)
  assert.equal(canManageRehearsals({ role: 'journey_admin', grants: [] }), true)
})

test('Sentinela roles live on season memberships, never profiles', () => {
  assert.match(migration, /sentinela_memberships[\s\S]*role TEXT NOT NULL/)
  assert.doesNotMatch(migration, /ALTER TABLE (public\.)?profiles[\s\S]*(participant|mentor|journey_admin)/)
})

test('RLS scopes private reads and writes to the target season membership', () => {
  assert.match(migration, /has_sentinela_membership\(season_id\)/)
  assert.match(migration, /can_manage_sentinela_rehearsals\(season_id\)/)
  assert.match(migration, /season_id = target_season AND user_id = auth\.uid\(\)/)
})

test('a mentor grant in season A grants nothing in season B', () => {
  const memberships = [{ userId: 'mentor', seasonId: 'A', role: 'mentor' as const, grants: ['manage_rehearsals'] }]
  const authorityFor = (seasonId: string) => memberships.find((item) => item.userId === 'mentor' && item.seasonId === seasonId)

  assert.equal(canManageRehearsals(authorityFor('A')!), true)
  assert.equal(authorityFor('B'), undefined)
  assert.match(migration, /WHERE season_id = target_season/)
})
