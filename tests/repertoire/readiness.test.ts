import assert from 'node:assert/strict'
import test from 'node:test'
import {
  calculateBandRotation,
  calculateIP,
  calculateReadiness,
  calculateRecency,
  classifyPreparation,
  findPreviousOccurrence,
} from '../../lib/repertoire/readiness.ts'

const selected = { repertoireId: 'current', eventId: 'event-current', date: '2026-07-01', songId: 'song-1', songTitle: 'Song' }
const occurrence = (repertoireId: string, date: string, songId: string | null = 'song-1', songTitle = 'Song') => ({ repertoireId, eventId: `event-${repertoireId}`, date, songId, songTitle })

test('preparation bands include every exact boundary', () => {
  assert.deepEqual([90, 100].map(classifyPreparation).map((x) => x.level), ['ready', 'ready'])
  assert.deepEqual([70, 89.999].map(classifyPreparation).map((x) => x.level), ['light_review', 'light_review'])
  assert.deepEqual([40, 69.999].map(classifyPreparation).map((x) => x.level), ['individual_process', 'individual_process'])
  assert.equal(classifyPreparation(39.999).level, 'full_process')
})

test('a song without a prior performance is never performed', () => {
  assert.deepEqual(calculateRecency(selected, []), { band: 'never', days: null, score: 0, previous: null })
})

test('same-day occurrences are not previous performances', () => {
  assert.equal(calculateRecency(selected, [occurrence('same-day', '2026-07-01')]).band, 'never')
})

test('finds the nearest prior repertoire even when input is out of order', () => {
  const history = [occurrence('old', '2025-01-01'), occurrence('future', '2027-01-01'), occurrence('nearest', '2026-06-15')]
  assert.equal(findPreviousOccurrence(selected, history)?.repertoireId, 'nearest')
  assert.equal(calculateRecency(selected, history).band, 'under_30_days')
})

test('recency boundaries are 30, 90 and 180 days', () => {
  assert.equal(calculateRecency(selected, [occurrence('29', '2026-06-02')]).band, 'under_30_days')
  assert.equal(calculateRecency(selected, [occurrence('30', '2026-06-01')]).band, 'one_to_three_months')
  assert.equal(calculateRecency(selected, [occurrence('90', '2026-04-02')]).band, 'three_to_six_months')
  assert.equal(calculateRecency(selected, [occurrence('180', '2026-01-02')]).band, 'over_six_months')
})

test('song_id prevents a historical title-only false match', () => {
  assert.equal(findPreviousOccurrence(selected, [occurrence('title-only', '2026-06-20', null, 'Song')]), null)
})

test('empty team has no rotation and a stable finite score', () => {
  assert.deepEqual(calculateBandRotation([], []), { newMemberCount: 0, newMemberIds: [], consideredMemberIds: [], rate: 0, continuityScore: 100 })
})

test('sound crew is excluded while new musical and vocal people are returned', () => {
  const rotation = calculateBandRotation([
    { profileId: 'old', role: 'Guitarra' }, { profileId: 'new-vocal', role: 'Vocal' },
    { profileId: 'new-key', role: 'Teclado' }, { profileId: 'sound', role: 'Técnico de som' },
  ], [{ profileId: 'old', role: 'Guitarra' }, { profileId: 'sound', role: 'Som' }])
  assert.deepEqual(rotation.newMemberIds, ['new-vocal', 'new-key'])
  assert.equal(rotation.newMemberCount, 2)
  assert.equal(rotation.consideredMemberIds.includes('sound'), false)
})

test('indices are normalized at both extremes', () => {
  assert.equal(calculateIP({ mastery: 0, recency: 0, rotation: 0, complexity: 100, changes: 100, strategic: 0 }), 0)
  assert.equal(calculateIP({ mastery: 100, recency: 100, rotation: 100, complexity: 0, changes: 0, strategic: 100 }), 100)
  assert.equal(calculateIP({ mastery: 999, recency: 999, rotation: 999, complexity: -1, changes: -1, strategic: 999 }), 100)
})

test('manual stages survive later recalculation', () => {
  const result = calculateReadiness({ mastery: 100, recency: 100, rotation: 100, complexity: 0, changes: 0, strategic: 100 }, { current: 'individual_study', manuallyMoved: true })
  assert.equal(result.suggestedStage, 'ready')
  assert.equal(result.stage, 'individual_study')
})
