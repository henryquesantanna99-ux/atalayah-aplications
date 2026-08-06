import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const migration = readFileSync('supabase/migrations/041_transactional_event_scale.sql', 'utf8')
const action = readFileSync('app/(app)/agenda/actions.ts', 'utf8')

test('existing songs and new songs are resolved in the same ordered loop', () => {
  assert.match(migration, /FOR v_song IN SELECT value FROM jsonb_array_elements\(p_songs\) LOOP/)
  assert.match(migration, /IF v_song_id IS NULL THEN[\s\S]*SELECT id INTO v_song_id FROM songs/)
  assert.match(migration, /IF v_song_id IS NULL THEN[\s\S]*INSERT INTO songs/)
  assert.match(migration, /setlist_songs[\s\S]*v_song_id, v_index/)
  assert.match(migration, /repertoire_items[\s\S]*v_song_id, v_index/)
})

test('mixed lists preserve their original indices for both destinations', () => {
  assert.match(migration, /v_index integer := 0/)
  assert.equal((migration.match(/v_index := v_index \+ 1/g) ?? []).length, 1)
})

test('equivalence includes normalized artist and therefore separates equal titles by artist', () => {
  assert.match(migration, /v_normal_title := translate\(lower/)
  assert.match(migration, /v_normal_artist := translate\(lower/)
  assert.match(migration, /title[\s\S]*= v_normal_title[\s\S]*artist[\s\S]*= v_normal_artist/)
})

test('intermediate failures roll back the single RPC transaction and hide internals', () => {
  assert.match(migration, /SECURITY DEFINER/)
  assert.match(migration, /EXCEPTION[\s\S]*Não foi possível salvar a escala/)
  assert.match(action, /supabase\.rpc\('save_event_scale'/)
  const createScaleBody = action.slice(action.indexOf('export async function createScale'))
  assert.doesNotMatch(createScaleBody, /throw new Error\(error\.message\)/)
})

test('an active editor is authorized without requiring the admin role', () => {
  assert.match(migration, /status = 'active' AND role IN \('admin', 'editor'\)/)
  assert.match(migration, /NOT public\.current_user_can_edit\(\)/)
  assert.match(migration, /Você não possui permissão para criar repertórios/)
})
