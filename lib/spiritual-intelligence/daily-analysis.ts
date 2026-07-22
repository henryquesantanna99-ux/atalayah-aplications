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
  evolution: SpiritualEvolution
  discernment: string[]
  recommendations: string[]
}

export type MetricCount = { label: string; count: number; percentage: number }
export type SegmentSummary = { segment: string; value: string; total: number; topThemes: MetricCount[] }
export type AssociationSummary = { source: string; target: string; count: number; description: string }
export type SpiritualTrend = { category: keyof SpiritualSummary['quantification']; label: string; current: number; previous: number; delta: number }
export type SpiritualEvolution = { note: string; comparedDays: number; growing: SpiritualTrend[]; declining: SpiritualTrend[]; emerging: SpiritualTrend[] }

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
  const memberContext = normalizeText([
    suggestion.reason,
    suggestion.spiritual_area,
    suggestion.spiritual_experience_note,
    suggestion.next_step,
    suggestion.next_step_other,
  ].filter(Boolean).join(' '))
  const thematicContext = normalizeText([
    suggestion.song_title,
    suggestion.artist,
    suggestion.reason,
    suggestion.spiritual_area,
    suggestion.lyrics_plain,
  ].filter(Boolean).join(' '))

  const nextStep = suggestion.next_step_other || suggestion.next_step || 'próximo passo não informado'
  const hasMemberContext = Boolean(memberContext)

  return {
    suggestionId: suggestion.id,
    songTitle: suggestion.song_title,
    themes: matchKeywords(thematicContext, themeKeywords, suggestion.spiritual_area || 'tema a discernir coletivamente'),
    needs: hasMemberContext ? matchKeywords(memberContext, needKeywords, 'necessidade não explicitada nas respostas') : ['contexto do membro não informado'],
    emotions: hasMemberContext ? matchKeywords(memberContext, emotionKeywords, suggestion.spiritual_experience_note || 'emoção não informada') : ['contexto do membro não informado'],
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

function calculateEvolution(current: SpiritualSummary['quantification'], previous: SpiritualSummary['quantification'][]): SpiritualEvolution {
  const latest = previous[0]
  if (!latest) return {
    note: 'Primeiro recorte salvo; a evolução será exibida com novas análises diárias.',
    comparedDays: 0,
    growing: [],
    declining: [],
    emerging: [],
  }

  const trends: SpiritualTrend[] = []
  ;(Object.keys(current) as Array<keyof SpiritualSummary['quantification']>).forEach((category) => {
    const previousByLabel = new Map(latest[category].map((item) => [item.label, item.percentage]))
    current[category].forEach((item) => {
      const previousPercentage = previousByLabel.get(item.label) ?? 0
      trends.push({ category, label: item.label, current: item.percentage, previous: previousPercentage, delta: item.percentage - previousPercentage })
    })
    latest[category].forEach((item) => {
      if (!current[category].some((currentItem) => currentItem.label === item.label)) {
        trends.push({ category, label: item.label, current: 0, previous: item.percentage, delta: -item.percentage })
      }
    })
  })

  const byAbsoluteDelta = (a: SpiritualTrend, b: SpiritualTrend) => Math.abs(b.delta) - Math.abs(a.delta)
  return {
    note: `Variações percentuais comparadas ao recorte anterior; histórico disponível de ${previous.length} dia${previous.length === 1 ? '' : 's'}.`,
    comparedDays: previous.length,
    growing: trends.filter((item) => item.previous > 0 && item.delta > 0).sort(byAbsoluteDelta).slice(0, 8),
    declining: trends.filter((item) => item.delta < 0).sort(byAbsoluteDelta).slice(0, 8),
    emerging: trends.filter((item) => item.previous === 0 && item.current > 0).sort(byAbsoluteDelta).slice(0, 8),
  }
}

export function summarizeCollectivePatterns(classifications: SpiritualClassification[], previous: SpiritualSummary['quantification'][] = []): SpiritualSummary {
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
    evolution: calculateEvolution(quantification, previous),
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
