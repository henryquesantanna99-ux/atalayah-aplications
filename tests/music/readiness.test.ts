import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { calculateSongReadiness, summarizeSongChanges } from '../../lib/music/readiness.ts'

describe('calculateSongReadiness', () => {
  it('marks an unchanged song as ready', () => {
    assert.deepEqual(calculateSongReadiness({ playsLikeLastTime: true, changes: { newMember: true } }), {
      readinessIndex: 100,
      suggestedStage: 'Pronta',
      changeCount: 0,
    })
  })

  it('weighs the amount and type of changes', () => {
    const result = calculateSongReadiness({ playsLikeLastTime: false, changes: { newArrangement: true, newMember: true }, changeNotes: 'Rever final' })
    assert.deepEqual(result, { readinessIndex: 57, suggestedStage: 'Definição', changeCount: 3 })
    assert.equal(summarizeSongChanges({ playsLikeLastTime: false, changes: { newArrangement: true, newMember: true }, changeNotes: 'Rever final' }), 'Novo arranjo, Novo integrante, Observação')
  })
})
