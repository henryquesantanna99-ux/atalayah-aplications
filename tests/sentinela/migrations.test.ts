import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const foundation = readFileSync(
  new URL('../../supabase/migrations/045_sentinela_program_foundation.sql', import.meta.url),
  'utf8',
)
const academy = readFileSync(
  new URL('../../supabase/migrations/046_sentinela_academy_checkpoints.sql', import.meta.url),
  'utf8',
)
const practice = readFileSync(
  new URL('../../supabase/migrations/047_sentinela_practice_identity_storage.sql', import.meta.url),
  'utf8',
)
const correction = readFileSync(
  new URL('../../supabase/migrations/049_sentinela_schema_correction.sql', import.meta.url),
  'utf8',
)
const databaseTypes = readFileSync(
  new URL('../../types/database.ts', import.meta.url),
  'utf8',
)
const dayDetailModal = readFileSync(
  new URL('../../app/(app)/agenda/day-detail-modal.tsx', import.meta.url),
  'utf8',
)

test('Sentinela migrations create their dependencies in incremental order', () => {
  assert.match(foundation, /create table public\.sentinela_seasons\s*\(/i)
  assert.match(foundation, /create table public\.sentinela_memberships\s*\(/i)
  assert.match(academy, /references public\.sentinela_seasons\(id\)/i)
  assert.match(practice, /references public\.sentinela_seasons\(id\)/i)
})

test('level visibility follows the milestone and never assumes a level status column', () => {
  const publishedStatusLoop = foundation.match(
    /foreach t in array array\[([^\]]+)] loop\s*\n execute format\('create policy "members read %1\$s"[^;]+status <> ''draft''/,
  )

  assert.ok(publishedStatusLoop, 'published-content policy loop must be present')
  assert.doesNotMatch(publishedStatusLoop[1], /sentinela_levels/)
  assert.match(
    foundation,
    /create policy "members read sentinela_levels"[\s\S]+milestone\.status <> 'draft'/,
  )
})

test('Sentinela tables are composed once into the generated database types', () => {
  assert.equal(
    databaseTypes.match(/^\s*sentinela_seasons:/gm)?.length,
    1,
    'sentinela_seasons must have a single type declaration',
  )
  assert.match(databaseTypes, /Tables:\s*\{[\s\S]*}\s*&\s*SentinelaTables/)
  assert.equal(databaseTypes.match(/^\s*sentinela_onboarding:/gm)?.length, 1)
})

test('Sentinela has one canonical rehearsal and journey onboarding schema', () => {
  const migrations = [foundation, academy, practice, correction].join('\n')
  assert.equal(migrations.match(/create table public\.sentinela_rehearsals\s*\(/gi)?.length, 1)
  assert.equal(migrations.match(/create table public\.sentinela_onboarding\s*\(/gi)?.length, 1)
  assert.match(practice, /starts_at timestamptz not null/)
  assert.doesNotMatch(practice, /scheduled_at|private_notes|created_by/)
})

test('database relationships type agenda joins without assertion casts', () => {
  assert.match(databaseTypes, /foreignKeyName: 'event_members_profile_id_fkey'/)
  assert.match(databaseTypes, /foreignKeyName: 'event_members_schedule_function_id_fkey'/)
  assert.doesNotMatch(dayDetailModal, /membersResult\.data[^\n]+\sas\s/)
})
