import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { participatesInRotation } from '../../lib/schedule-functions.ts'

describe('participatesInRotation', () => {
  it('includes band and vocal categories', () => {
    assert.equal(participatesInRotation('band'), true)
    assert.equal(participatesInRotation('vocal'), true)
  })

  it('explicitly excludes sound and conservatively excludes unknown legacy values', () => {
    assert.equal(participatesInRotation('sound'), false)
    assert.equal(participatesInRotation('other'), false)
    assert.equal(participatesInRotation(null), false)
    assert.equal(participatesInRotation(undefined), false)
  })
})
