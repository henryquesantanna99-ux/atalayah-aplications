export const CHANGE_TYPES = [
  'newKey',
  'newArrangement',
  'newIntro',
  'newVocalDivision',
  'newMember',
] as const

export type ChangeType = (typeof CHANGE_TYPES)[number]

export interface SongReadinessInput {
  playsLikeLastTime: boolean
  changes: Partial<Record<ChangeType, boolean>>
  changeNotes?: string | null
}

const CHANGE_WEIGHTS: Record<ChangeType, number> = {
  newKey: 8,
  newArrangement: 18,
  newIntro: 10,
  newVocalDivision: 14,
  newMember: 20,
}

/** Calculates the readiness index (IP) and the suggested first preparation stage. */
export function calculateSongReadiness(input: SongReadinessInput) {
  if (input.playsLikeLastTime) {
    return { readinessIndex: 100, suggestedStage: 'Pronta', changeCount: 0 }
  }

  const selected = CHANGE_TYPES.filter((type) => input.changes[type])
  const notesPenalty = input.changeNotes?.trim() ? 5 : 0
  const readinessIndex = Math.max(
    0,
    100 - selected.reduce((total, type) => total + CHANGE_WEIGHTS[type], 0) - notesPenalty
  )

  const suggestedStage = selected.includes('newArrangement') || selected.includes('newMember')
    ? 'Definição'
    : selected.includes('newVocalDivision')
      ? 'Ensaio vocal'
      : selected.length > 0 || notesPenalty > 0
        ? 'Revisão'
        : 'Confirmação'

  return { readinessIndex, suggestedStage, changeCount: selected.length + (notesPenalty ? 1 : 0) }
}

export const CHANGE_LABELS: Record<ChangeType, string> = {
  newKey: 'Novo tom',
  newArrangement: 'Novo arranjo',
  newIntro: 'Nova introdução',
  newVocalDivision: 'Nova divisão vocal',
  newMember: 'Novo integrante',
}

export function summarizeSongChanges(input: SongReadinessInput) {
  if (input.playsLikeLastTime) return 'Igual à última vez'
  const labels = CHANGE_TYPES.filter((type) => input.changes[type]).map((type) => CHANGE_LABELS[type])
  if (input.changeNotes?.trim()) labels.push('Observação')
  return labels.length > 0 ? labels.join(', ') : 'Sem mudança especificada'
}
