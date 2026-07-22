import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  classifySuggestionExpression,
  summarizeCollectivePatterns,
  type SpiritualClassification,
  type SpiritualSummary,
} from '../../lib/spiritual-intelligence/daily-analysis.ts'

function classification(overrides: Partial<SpiritualClassification> = {}): SpiritualClassification {
  return {
    suggestionId: 'suggestion-1',
    songTitle: 'Canção de teste',
    themes: ['esperança'],
    needs: ['direção espiritual'],
    emotions: ['consolo'],
    nextSteps: ['Orar mais'],
    convictions: [],
    evidence: [],
    segments: { tribo: 'Jovens', faixaEtaria: '18 a 25 anos', ministerio: 'Louvor' },
    ...overrides,
  }
}

describe('classifySuggestionExpression', () => {
  it('does not infer needs or emotions from lyrics alone', () => {
    const result = classifySuggestionExpression({
      id: 'lyrics-only',
      song_title: 'Caminho de fé',
      lyrics_plain: 'Preciso de direção, cura e consolo para o meu coração',
    })

    assert.deepEqual(result.needs, ['contexto do membro não informado'])
    assert.deepEqual(result.emotions, ['contexto do membro não informado'])
    assert.ok(result.themes.length > 0)
  })

  it('uses member responses for needs, emotions and next steps', () => {
    const result = classifySuggestionExpression({
      id: 'member-context',
      song_title: 'Esperança',
      reason: 'Preciso de direção para uma decisão e encontrei paz',
      spiritual_area: 'Confiança em Deus',
      spiritual_experience_note: 'Senti consolo de Deus',
      next_step: 'Conversar com alguém da liderança',
    })

    assert.ok(result.needs.includes('direção espiritual'))
    assert.ok(result.emotions.includes('esperança'))
    assert.deepEqual(result.nextSteps, ['Conversar com alguém da liderança'])
  })

  it('preserves only self-declared segmentation values', () => {
    const result = classifySuggestionExpression({
      id: 'segments',
      song_title: 'Canção',
      reason: 'Quero servir',
      tribe: 'Famílias',
      age_range: '26 a 35 anos',
      ministry: 'Recepção',
      region: 'Centro',
      conversion_time: '1 a 3 anos',
      participation_time: '6 meses a 2 anos',
    })

    assert.deepEqual(result.segments, {
      tribo: 'Famílias',
      faixaEtaria: '26 a 35 anos',
      ministerio: 'Recepção',
      regiao: 'Centro',
      tempoConversao: '1 a 3 anos',
      tempoParticipacao: '6 meses a 2 anos',
    })
  })
})

describe('summarizeCollectivePatterns', () => {
  it('quantifies collective patterns and associations', () => {
    const summary = summarizeCollectivePatterns([
      classification(),
      classification({ suggestionId: 'suggestion-2', themes: ['esperança', 'santidade'], emotions: ['consolo'] }),
    ])

    assert.deepEqual(summary.quantification.themes[0], { label: 'esperança', count: 2, percentage: 100 })
    assert.equal(summary.associations.find((item) => item.source === 'esperança' && item.target === 'consolo')?.count, 2)
    assert.ok(summary.segmentation.some((item) => item.segment === 'tribo' && item.value === 'Jovens' && item.total === 2))
  })

  it('calculates growing, declining and emerging trends against the latest summary', () => {
    const previous: SpiritualSummary['quantification'] = {
      themes: [{ label: 'esperança', count: 1, percentage: 50 }, { label: 'santidade', count: 1, percentage: 50 }],
      needs: [{ label: 'direção espiritual', count: 2, percentage: 100 }],
      emotions: [{ label: 'consolo', count: 1, percentage: 50 }],
      nextSteps: [{ label: 'Orar mais', count: 2, percentage: 100 }],
    }

    const summary = summarizeCollectivePatterns([
      classification(),
      classification({ suggestionId: 'suggestion-2', themes: ['esperança', 'missão'], emotions: ['gratidão'] }),
    ], [previous])

    assert.ok(summary.evolution.growing.some((item) => item.category === 'themes' && item.label === 'esperança' && item.delta === 50))
    assert.ok(summary.evolution.declining.some((item) => item.category === 'themes' && item.label === 'santidade' && item.delta === -50))
    assert.ok(summary.evolution.emerging.some((item) => item.category === 'themes' && item.label === 'missão' && item.current === 50))
    assert.equal(summary.evolution.comparedDays, 1)
  })
})
