import assert from 'node:assert/strict'
import test from 'node:test'
import { getMusicCompleteness } from '../../lib/music/completeness.ts'

test('catalog completeness reports every required information group', () => {
  const result = getMusicCompleteness({ metadataPayload: {}, stems: [] })
  for (const label of ['letra', 'URL do YouTube', 'ID do YouTube', 'thumbnail do YouTube', 'artista', 'álbum', 'duração', 'BPM', 'fonte dos metadados', 'payload de metadados', 'stems']) {
    assert.ok(result.missing.includes(label), label)
  }
  assert.equal(result.complete, false)
})

test('either lyrics format satisfies the lyrics requirement', () => {
  const result = getMusicCompleteness({
    artist: 'Artista', youtubeUrl: 'https://youtu.be/id', youtubeVideoId: 'id', youtubeThumbnail: 'https://img/id.jpg',
    youtubeDuration: '3:00', bpm: 120, albumName: 'Álbum', lyricsSynced: '[00:01] Letra', metadataSource: 'manual',
    metadataPayload: { provider: 'manual' }, stems: [{}],
  })
  assert.deepEqual(result, { complete: true, missing: [] })
})
