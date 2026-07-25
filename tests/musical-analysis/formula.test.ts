import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateICI, calculateICO, isValidMusicalScores } from '../../lib/worship-musical-analysis.ts'

test('normalizes intrinsic complexity to 0–100', () => {
  assert.equal(calculateICI({ melodic: 1, harmonic: 1, rhythmic: 1, technical: 1, structural: 1, interpretative: 1, collective: 1 }), 0)
  assert.equal(calculateICI({ melodic: 3, harmonic: 3, rhythmic: 3, technical: 3, structural: 3, interpretative: 3, collective: 3 }), 100)
})

test('combines complexity and applicable team fit', () => {
  const scores = { melodic: 3, harmonic: 3, rhythmic: 3, technical: 3, structural: 3, interpretative: 3, collective: 3 } as const
  assert.equal(calculateICO(scores, scores), 100)
  assert.equal(calculateICO(scores, { melodic: 1, harmonic: 1, rhythmic: 1, technical: 1, structural: 1, interpretative: 1, collective: 1 }), 60)
})

test('rejects incomplete and out-of-range scores', () => {
  assert.equal(isValidMusicalScores({ melodic: 4 }), false)
})
