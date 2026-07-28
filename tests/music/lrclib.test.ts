import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createLyricsExcerpt, lyricsResultKey, MAX_LYRICS_ATTEMPTS, normalizeSongTerm, selectBestLyrics } from '../../lib/music/lrclib.ts'

describe('LRCLIB confirmation rules', () => {
  const results = [
    { id: 1, trackName: 'Outra canção', artistName: 'Outro', plainLyrics: 'letra errada' },
    { id: 2, trackName: 'Graça', artistName: 'Banda Vida', plainLyrics: 'linha um\nlinha dois\nlinha três\nlinha quatro\nlinha cinco\nlinha seis' },
  ]

  it('selects the closest textual match and skips rejected checkpoints', () => {
    assert.equal(selectBestLyrics(results, { trackName: 'Graça (Ao Vivo)', artistName: 'Banda Vida' })?.id, 2)
    assert.equal(selectBestLyrics(results, { trackName: 'Graça', artistName: 'Banda Vida' }, [lyricsResultKey(results[1])])?.id, 1)
  })

  it('normalizes edition noise and enforces the three-attempt contract', () => {
    assert.equal(normalizeSongTerm('Graça (Ao Vivo) feat. Alguém'), 'graca')
    assert.equal(MAX_LYRICS_ATTEMPTS, 3)
  })

  it('returns only a truncated excerpt', () => {
    const full = results[1].plainLyrics
    const excerpt = createLyricsExcerpt(full, 4, 300)
    assert.equal(excerpt, 'linha um\nlinha dois\nlinha três\nlinha quatro…')
    assert.notEqual(excerpt, full)
  })
})
