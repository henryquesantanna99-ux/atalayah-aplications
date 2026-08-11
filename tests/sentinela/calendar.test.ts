import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { countdown, currentPhase, seasonState, seasonWeek } from '../../lib/sentinela/calendar.ts'

describe('Sentinela season calendar', () => {
  const start = '2026-01-05T00:00:00.000Z'
  const end = '2026-03-29T23:59:59.999Z'

  it('classifies boundaries and a completed event', () => {
    assert.equal(seasonState('2026-01-04T23:59:59.999Z', start, end), 'upcoming')
    assert.equal(seasonState(start, start, end), 'active')
    assert.equal(seasonState(end, start, end), 'active')
    assert.equal(seasonState('2026-03-30T00:00:00Z', start, end), 'completed')
  })

  it('calculates week and countdown without negative values', () => {
    assert.equal(seasonWeek('2026-01-04T23:59:59Z', start), 0)
    assert.equal(seasonWeek(start, start), 1)
    assert.equal(seasonWeek('2026-01-12T00:00:00Z', start), 2)
    assert.equal(countdown('2026-01-05T12:00:00Z', '2026-01-06T00:00:00Z'), 1)
    assert.equal(countdown('2026-01-07T00:00:00Z', '2026-01-06T00:00:00Z'), 0)
  })

  it('finds inclusive phases and rejects malformed dates', () => {
    const phases = [{ name: 'fundamentos', startsAt: start, endsAt: '2026-01-31T23:59:59Z' }]
    assert.equal(currentPhase(start, phases)?.name, 'fundamentos')
    assert.equal(currentPhase('2026-02-01T00:00:00Z', phases), null)
    assert.throws(() => seasonWeek('invalid', start), TypeError)
  })
})
