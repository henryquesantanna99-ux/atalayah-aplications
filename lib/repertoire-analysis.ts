export const PREPARATION_STAGES = [
  'escuta',
  'mapeamento_escrita',
  'memorizacao_tecnica',
  'ensaio_passagem',
  'pronta_ministracao',
] as const

export type PreparationStage = (typeof PREPARATION_STAGES)[number]

export interface AnalysisInputs {
  recency: number
  mastery: number
  rotation: number
  complexity: number
  changes: number
  strategicWeight: number
}

export function calculateAnalysis(input: AnalysisInputs) {
  const clamp = (value: number) => Math.min(10, Math.max(0, value))
  const recency = clamp(input.recency)
  const mastery = clamp(input.mastery)
  const rotation = clamp(input.rotation)
  const complexity = clamp(input.complexity)
  const changes = clamp(input.changes)
  const strategicWeight = clamp(input.strategicWeight)

  // ICI: intrinsic difficulty; ICO: operational familiarity; IP: preparation priority.
  const ici = round(complexity * 0.55 + changes * 0.45)
  const ico = round(mastery * 0.5 + rotation * 0.3 + recency * 0.2)
  const ip = round(clamp(ici * 0.45 + (10 - ico) * 0.35 + strategicWeight * 0.2))

  return {
    ici,
    ico,
    ip,
    preparationLevel:
      ip >= 7.5 ? 'Crítica' : ip >= 5 ? 'Prioritária' : ip >= 2.5 ? 'Acompanhar' : 'Preparada',
  }
}

function round(value: number) {
  return Math.round(value * 10) / 10
}
