import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { persistedProfile, resumeStep, validateOnboarding } from '../../lib/sentinela/onboarding.ts'
import { applyCompetencyAssessment, awardEducationalXp, checkpointComplete } from '../../lib/sentinela/progression.ts'

describe('Sentinela onboarding', () => {
  it('resumes a saved valid step', () => {
    assert.equal(resumeStep(null), 1)
    assert.equal(resumeStep({ step: 3 }), 3)
    assert.equal(resumeStep({ step: 99 }), 5)
  })
  it('requires call response, conditional instrument, avatar and diagnosis', () => {
    const base = { step: 4, answeredCall: false, servesWithInstrument: true, instrument: null, avatarPath: null, diagnosis: {} }
    assert.deepEqual(validateOnboarding(base), ['call_answer_required', 'instrument_required', 'avatar_required', 'diagnosis_required'])
    assert.deepEqual(validateOnboarding({ ...base, answeredCall: true, servesWithInstrument: false, avatarPath: 'avatars/u/a.png', diagnosis: { service: 4 } }), [])
  })
  it('persists avatar and diagnosis in the profile payload', () => {
    const draft = { step: 5, answeredCall: true, servesWithInstrument: true, instrument: 'baixo', avatarPath: 'avatars/u/a.png', diagnosis: { service: 4 } }
    assert.deepEqual(persistedProfile(draft), { avatar_path: 'avatars/u/a.png', diagnosis: { service: 4 }, onboarding_step: 5 })
  })
})

describe('independent progression systems', () => {
  it('educational XP never changes milestone level', () => {
    assert.deepEqual(awardEducationalXp({ educationalXp: 90, milestoneLevel: 2 }, 20), { educationalXp: 110, milestoneLevel: 2 })
  })
  it('requires every configured required checkpoint item', () => {
    const requirements = [{ key: 'journal', required: true }, { key: 'evidence', required: true }, { key: 'bonus', required: false }]
    assert.equal(checkpointComplete(requirements, new Set(['journal'])), false)
    assert.equal(checkpointComplete(requirements, new Set(['journal', 'evidence'])), true)
  })
  it('only authorized assessments update competency', () => {
    assert.equal(applyCompetencyAssessment(30, { score: 90, assessorRole: 'participant' }), 30)
    assert.equal(applyCompetencyAssessment(30, { score: 90, assessorRole: 'mentor' }), 90)
    assert.equal(applyCompetencyAssessment(30, { score: 120, assessorRole: 'admin' }), 100)
  })
})
