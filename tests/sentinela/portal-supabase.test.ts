import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

const root = new URL('../../', import.meta.url)
const source = (path: string) => readFileSync(new URL(path, root), 'utf8')

test('season and squad portal data comes from season-scoped Supabase queries', () => {
  const season = source('app/sentinela/_lib/season.ts')
  assert.doesNotMatch(season, /export const currentSeason|Squad Horizonte|Pratique a presença/)
  for (const table of ['sentinela_milestones', 'sentinela_missions', 'sentinela_rehearsals', 'sentinela_squad_members']) {
    assert.match(season, new RegExp(`from\\('${table}'\\)`))
  }
  assert.match(season, /\.eq\('season_id', season\.id\)/)
})

test('participant persistence covers every private learning workflow', () => {
  const actions = source('app/sentinela/actions.ts')
  for (const action of ['saveJournalEntry', 'saveLessonProgress', 'saveLessonNote', 'submitEvidence', 'submitCheckpoint', 'reviewCheckpoint', 'saveAvatar', 'saveDiagnostic', 'saveOnboarding', 'saveSelfAssessment']) {
    assert.match(actions, new RegExp(`export async function ${action}\\b`), action)
  }
  for (const table of ['sentinela_journal_entries', 'sentinela_education_progress', 'sentinela_lesson_notes', 'sentinela_evidence', 'sentinela_checkpoint_progress', 'sentinela_checkpoint_feedback', 'sentinela_avatars', 'sentinela_diagnostics', 'sentinela_onboarding', 'sentinela_competency_progress']) {
    assert.match(actions, new RegExp(`from\\('${table}'\\)`), table)
  }
})

test('administration exposes all season operations requested by the product', () => {
  for (const route of ['temporada', 'pessoas', 'squads', 'conteudo', 'missoes', 'ensaios', 'avaliacoes', 'analytics']) {
    assert.equal(existsSync(new URL(`app/sentinela/(portal)/admin/${route}/page.tsx`, root)), true, route)
  }
})

test('RLS migration protects onboarding, competency, evidence and cross-season data', () => {
  const program = source('supabase/migrations/045_sentinela_program_foundation.sql')
  const checkpoints = source('supabase/migrations/046_sentinela_academy_checkpoints.sql')
  const privateData = source('supabase/migrations/047_sentinela_practice_identity_storage.sql')
  assert.match(program, /sentinela_has_membership\(season_id/)
  assert.match(program, /staff manages competency/)
  assert.match(privateData, /'sentinela_journal_entries','sentinela_onboarding','sentinela_diagnostics'/)
  assert.match(checkpoints, /'sentinela_evidence','sentinela_checkpoint_feedback'/)
  assert.match(privateData, /sentinela_owns_storage_path/)
})
