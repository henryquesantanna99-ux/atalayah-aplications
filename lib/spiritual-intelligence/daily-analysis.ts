export type SpiritualClassification = {
  suggestionId: string
  songTitle: string
  themes: string[]
  needs: string[]
  emotions: string[]
  nextSteps: string[]
  convictions: string[]
  evidence: string[]
  segments: Record<string, string>
}

export type SpiritualSummary = {
  quantification: Record<'themes' | 'needs' | 'emotions' | 'nextSteps', MetricCount[]>
  segmentation: SegmentSummary[]
  associations: AssociationSummary[]
  evolution: { note: string; comparedDays: number }
  discernment: string[]
  recommendations: string[]
}

export type MetricCount = { label: string; count: number; percentage: number }
export type SegmentSummary = { segment: string; value: string; total: number; topThemes: MetricCount[] }
export type AssociationSummary = { source: string; target: string; count: number; description: string }

type SuggestionLike = {
  id: string
  song_title: string
  artist?: string | null
  reason?: string | null
  spiritual_area?: string | null
  spiritual_experience_note?: string | null
  next_step?: string | null
  next_step_other?: string | null
  tribe?: string | null
  age_range?: string | null
  ministry?: string | null
  lyrics_plain?: string | null
}

const themeKeywords: Array<[string, string[]]> = [
  ['dependência de Deus', ['depend', 'preciso de deus', 'necessito', 'rendição', 'entrega']],
  ['santidade', ['santidade', 'santo', 'purifica', 'consagra', 'arrepend']],
  ['esperança', ['esperança', 'confiança', 'futuro', 'promessa', 'fé']],
  ['identidade em Cristo', ['filho', 'filha', 'identidade', 'cristo em mim', 'amado']],
  ['missão e serviço', ['servir', 'missão', 'envia', 'ide', 'chamado']],
  ['cura e consolo', ['cura', 'consolo', 'restaura', 'dor', 'coração']],
  ['adoração e gratidão', ['adoração', 'gratidão', 'louvor', 'exaltar', 'bendizer']],
  ['intimidade com Deus', ['intimidade', 'presença', 'perto', 'face', 'altar']],
]

const needKeywords: Array<[string, string[]]> = [
  ['direção espiritual', ['direção', 'decisão', 'caminho', 'guia']],
  ['renovo espiritual', ['renovo', 'recomeço', 'voltar', 'restaura']],
  ['cuidado pastoral', ['ajuda', 'conversar', 'pastoral', 'liderança']],
  ['reconciliação', ['reconciliação', 'perdão', 'perdoar']],
  ['fortalecimento da fé', ['fé', 'confiança', 'perseverar']],
]

const emotionKeywords: Array<[string, string[]]> = [
  ['esperança', ['esperança', 'confiança', 'paz']],
  ['gratidão', ['gratidão', 'grato', 'obrigado']],
  ['quebrantamento', ['quebrant', 'arrepend', 'chorei', 'confronto']],
  ['consolo', ['consolo', 'acolhido', 'cura', 'descanso']],
  ['encorajamento', ['coragem', 'força', 'ânimo', 'encoraj']],
]

function normalizeText(value?: string | null) {
  return (value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).slice(0, 6)
}

function matchKeywords(text: string, catalog: Array<[string, string[]]>, fallback: string) {
  const matches = catalog.filter(([, keywords]) => keywords.some((keyword) => text.includes(normalizeText(keyword)))).map(([label]) => label)
  return unique(matches.length ? matches : [fallback])
}

export function classifySuggestionExpression(suggestion: SuggestionLike): SpiritualClassification {
  const joined = normalizeText([
    suggestion.song_title,
    suggestion.artist,
    suggestion.reason,
    suggestion.spiritual_area,
    suggestion.spiritual_experience_note,
    suggestion.next_step,
    suggestion.next_step_other,
    suggestion.lyrics_plain,
  ].filter(Boolean).join(' '))

  const nextStep = suggestion.next_step_other || suggestion.next_step || 'próximo passo não informado'

  return {
    suggestionId: suggestion.id,
    songTitle: suggestion.song_title,
    themes: matchKeywords(joined, themeKeywords, suggestion.spiritual_area || 'tema a discernir coletivamente'),
    needs: matchKeywords(joined, needKeywords, nextStep),
    emotions: matchKeywords(joined, emotionKeywords, suggestion.spiritual_experience_note || 'emoção não informada'),
    nextSteps: unique([nextStep]),
    convictions: suggestion.reason ? unique([suggestion.reason.slice(0, 120)]) : [],
    evidence: unique([suggestion.reason, suggestion.spiritual_area, suggestion.spiritual_experience_note, suggestion.next_step].filter(Boolean).map(String)),
    segments: {
      tribo: suggestion.tribe || 'Não informada',
      faixaEtaria: suggestion.age_range || 'Não informada',
      ministerio: suggestion.ministry || 'Não informado',
    },
  }
}

function countMetrics(values: string[][], total: number): MetricCount[] {
  const counts = new Map<string, number>()
  values.flat().forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1))
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count, percentage: total ? Math.round((count / total) * 100) : 0 }))
}

export function summarizeCollectivePatterns(classifications: SpiritualClassification[], comparedDays = 0): SpiritualSummary {
  const total = classifications.length
  const quantification = {
    themes: countMetrics(classifications.map((item) => item.themes), total),
    needs: countMetrics(classifications.map((item) => item.needs), total),
    emotions: countMetrics(classifications.map((item) => item.emotions), total),
    nextSteps: countMetrics(classifications.map((item) => item.nextSteps), total),
  }

  const segmentation: SegmentSummary[] = []
  ;(['tribo', 'faixaEtaria', 'ministerio'] as const).forEach((segment) => {
    const groups = new Map<string, SpiritualClassification[]>()
    classifications.forEach((item) => {
      const value = item.segments[segment] || 'Não informado'
      groups.set(value, [...(groups.get(value) ?? []), item])
    })
    groups.forEach((items, value) => {
      segmentation.push({ segment, value, total: items.length, topThemes: countMetrics(items.map((item) => item.themes), items.length).slice(0, 3) })
    })
  })

  const associationMap = new Map<string, number>()
  classifications.forEach((item) => {
    item.themes.forEach((theme) => item.emotions.forEach((emotion) => {
      const key = `${theme}|||${emotion}`
      associationMap.set(key, (associationMap.get(key) ?? 0) + 1)
    }))
  })
  const associations = Array.from(associationMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([key, count]) => {
      const [source, target] = key.split('|||')
      return { source, target, count, description: `${source} apareceu junto de ${target} em ${count} indicação${count === 1 ? '' : 'ões'}.` }
    })

  return {
    quantification,
    segmentation,
    associations,
    evolution: {
      note: comparedDays > 0 ? `Comparável com ${comparedDays} análise${comparedDays === 1 ? '' : 's'} anterior${comparedDays === 1 ? '' : 'es'}.` : 'Primeiro recorte salvo; a evolução será exibida com novas análises diárias.',
      comparedDays,
    },
    discernment: [
      'Os dados descrevem padrões coletivos e devem ser comparados com a direção espiritual da liderança.',
      'A leitura pastoral final permanece responsabilidade da liderança; o sistema apenas organiza evidências.',
    ],
    recommendations: [
      'Usar os temas mais recorrentes para orientar oração, ensino e cuidado ministerial.',
      'Avaliar repertório como uma resposta possível, sem transformar popularidade em decisão automática.',
      'Observar segmentos com recorrências relevantes para direcionar discipulado e acompanhamento coletivo.',
    ],
  }
}
