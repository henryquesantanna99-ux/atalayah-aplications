import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { calculateRepertoireReadiness } from '../../app/(app)/musicas/catalog-team-mastery.ts'

describe('calculateRepertoireReadiness', () => {
  it('promotes a song mastered by the full team to the official repertoire', () => {
    assert.deepEqual(calculateRepertoireReadiness('100% da equipe'), {
      readinessIndex: 100,
      readinessLevel: 'Completo',
      suggestedStage: 'Repertório oficial',
    })
  })

  it('keeps partial mastery in learning or testing', () => {
    assert.equal(calculateRepertoireReadiness('Apenas a banda').suggestedStage, 'Em teste')
    assert.equal(calculateRepertoireReadiness('Apenas os vocais').readinessIndex, 60)
    assert.equal(calculateRepertoireReadiness('Só algumas pessoas').suggestedStage, 'Aprendizado')
  })
})
