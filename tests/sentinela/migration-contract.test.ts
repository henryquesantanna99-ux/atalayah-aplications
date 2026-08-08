import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const sql = readFileSync(new URL('../../supabase/migrations/042_sentinela_foundation.sql', import.meta.url), 'utf8')

describe('Sentinela database security contract', () => {
  it('enables RLS for every sensitive entity', () => {
    for (const table of ['sentinela_private_evidence', 'sentinela_journals', 'sentinela_official_progress', 'sentinela_checkpoints', 'sentinela_competency_assessments']) {
      assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, 'i'))
    }
  })
  it('defines a private storage bucket and owner/season policies', () => {
    assert.match(sql, /'sentinela-private', 'sentinela-private', false/)
    assert.match(sql, /storage\.foldername\(name\)\)\[2\] = auth\.uid\(\)::text/)
    assert.match(sql, /is_sentinela_member\(\(\(storage\.foldername\(name\)\)\[1\]\)::uuid\)/)
  })
})
