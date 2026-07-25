import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { calculateAnalysis } from '../../lib/repertoire-analysis.ts'

describe('calculateAnalysis', () => {
  it('recalculates priority and preparation level from manual indicators', () => {
    const result = calculateAnalysis({ recency: 8, mastery: 2, rotation: 1, complexity: 9, changes: 8, strategicWeight: 10 })
    assert.deepEqual(result, { ici: 8.6, ico: 2.9, ip: 8.4, preparationLevel: 'Crítica' })
  })

  it('clamps inputs to the supported zero-to-ten scale', () => {
    const result = calculateAnalysis({ recency: 20, mastery: 20, rotation: 20, complexity: -1, changes: -2, strategicWeight: -3 })
    assert.deepEqual(result, { ici: 0, ico: 10, ip: 0, preparationLevel: 'Preparada' })
  })
})
