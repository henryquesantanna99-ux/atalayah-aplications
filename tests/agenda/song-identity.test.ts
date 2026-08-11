import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const migration = readFileSync('supabase/migrations/050_normalized_song_identity.sql', 'utf8')
const action = readFileSync('app/(app)/agenda/actions.ts', 'utf8')
const form = readFileSync('app/(app)/agenda/event-form-modal.tsx', 'utf8')

function normalize(value: string) {
  const source = 'áàâãäåéèêëíìîïóòôõöúùûüçñýÿ'
  const target = 'aaaaaaeeeeiiiiooooouuuucnyy'
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
    .replace(/[áàâãäåéèêëíìîïóòôõöúùûüçñýÿ]/g, (letter) => target[source.indexOf(letter)])
}

test('identity normalization ignores case, accents and repeated surrounding whitespace', () => {
  assert.equal(normalize('  Águas   Purificadoras '), normalize('aguas purificadoras'))
  assert.equal(normalize(' JOÃO   GILBERTO '), normalize('joao gilberto'))
})

test('artist remains part of identity', () => {
  const identity = (title: string, artist: string) => `${normalize(title)}::${normalize(artist)}`
  assert.notEqual(identity('Santo', 'Aline Barros'), identity(' santo ', 'Fernandinho'))
})

test('migration uses a reusable immutable function and generated identity columns', () => {
  assert.match(migration, /FUNCTION public\.normalize_song_identity_part\(value text\)/)
  assert.match(migration, /IMMUTABLE/)
  assert.match(migration, /normalized_title text GENERATED ALWAYS/)
  assert.match(migration, /normalized_artist text GENERATED ALWAYS/)
})

test('unique index and ON CONFLICT serialize concurrent inserts by identity', () => {
  assert.match(migration, /CREATE UNIQUE INDEX songs_normalized_identity_unique[\s\S]*normalized_title, normalized_artist/)
  assert.match(migration, /ON CONFLICT \(normalized_title, normalized_artist\) DO UPDATE/)
  assert.doesNotMatch(migration, /SELECT id INTO v_song_id FROM songs/)
})

test('partial metadata only fills missing catalog values and resolved id always reaches setlist', () => {
  assert.match(migration, /youtube_url = coalesce\(nullif\(btrim\(songs\.youtube_url\), ''\), EXCLUDED\.youtube_url\)/)
  assert.match(migration, /metadata_payload = coalesce\(EXCLUDED\.metadata_payload[\s\S]*\|\| coalesce\(songs\.metadata_payload/)
  assert.match(migration, /RETURNING id INTO v_song_id/)
  assert.match(migration, /setlist_songs[\s\S]*v_song_id, v_index/)
})

for (const field of ['youtubeVideoId', 'youtubeUrl', 'youtubeThumbnail', 'youtubeDuration', 'lyricsPlain', 'lyricsSynced', 'albumName', 'bpm', 'metadataSource', 'metadataPayload']) {
  test(`${field} is represented in the server contract and form payload`, () => {
    assert.match(action, new RegExp(`${field}:`))
    assert.match(form.slice(form.indexOf('await createScale')), new RegExp(`${field}:`))
  })
}
