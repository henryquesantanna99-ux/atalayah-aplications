export const MUSICAL_DIMENSIONS = ['melodic', 'harmonic', 'rhythmic', 'technical', 'structural', 'interpretative', 'collective'] as const

export type MusicalDimension = (typeof MUSICAL_DIMENSIONS)[number]
export type MusicalScores = Record<MusicalDimension, number>

/**
 * ICI (0–100) = mean of the seven intrinsic scores, projected from 1–3.
 * ICO (0–100) = 60% ICI + 40% team fit. Team fit compares each demand with
 * the applicable team's capability (both projected to 0–100).
 */
export function normalizeThreePointScore(value: number) {
  return Math.round(((value - 1) / 2) * 100)
}

export function calculateICI(scores: MusicalScores) {
  const mean = MUSICAL_DIMENSIONS.reduce((total, key) => total + scores[key], 0) / MUSICAL_DIMENSIONS.length
  return normalizeThreePointScore(mean)
}

export function calculateTeamFit(scores: MusicalScores, teamCapability: Partial<MusicalScores>) {
  const fits = MUSICAL_DIMENSIONS.map((key) => {
    const capability = teamCapability[key] ?? 2
    return Math.max(0, Math.min(100, 100 - Math.max(0, scores[key] - capability) * 50))
  })
  return Math.round(fits.reduce((total, fit) => total + fit, 0) / fits.length)
}

export function calculateICO(scores: MusicalScores, teamCapability: Partial<MusicalScores>) {
  return Math.round(calculateICI(scores) * 0.6 + calculateTeamFit(scores, teamCapability) * 0.4)
}

export function isValidMusicalScores(value: unknown): value is MusicalScores {
  if (!value || typeof value !== 'object') return false
  return MUSICAL_DIMENSIONS.every((key) => Number.isInteger((value as Record<string, unknown>)[key]) && Number((value as Record<string, unknown>)[key]) >= 1 && Number((value as Record<string, unknown>)[key]) <= 3)
}
