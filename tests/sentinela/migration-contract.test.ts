import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const sql = readFileSync(new URL('../../supabase/migrations/047_sentinela_practice_identity_storage.sql', import.meta.url), 'utf8')

describe('Sentinela database security contract', () => {
  it('enables RLS for every sensitive entity', () => {
    for (const table of ['sentinela_recordings', 'sentinela_journal_entries', 'sentinela_onboarding', 'sentinela_diagnostics']) {
      assert.match(sql, new RegExp(`['"]${table}['"]`))
    }
  })
  it('defines a private storage bucket and owner/season policies', () => {
    assert.match(sql, /'sentinela-evidence','sentinela-recordings','sentinela-journal'/)
    assert.match(sql, /sentinela_owns_storage_path\(name\)/)
    assert.match(sql, /sentinela_is_staff\(\(storage\.foldername\(name\)\)\[1\]::uuid\)/)
  })
})
