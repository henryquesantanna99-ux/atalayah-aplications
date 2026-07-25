/** Pure repertoire-readiness rules. Keep this module free of database/browser APIs. */

export const READINESS_WEIGHTS = Object.freeze({
  /** Familiarity of the musicians with the selected arrangement. */
  mastery: 0.3,
  /** Benefit of having played the song recently. */
  recency: 0.2,
  /** Continuity of the musical/vocal team since the last performance. */
  rotation: 0.15,
  /** Technical feasibility (the inverse of complexity). */
  complexity: 0.15,
  /** Stability of the arrangement (the inverse of requested changes). */
  changes: 0.1,
  /** Pastoral/strategic reason for prioritising the song. */
  strategic: 0.1,
} as const)

export type RecencyBand = 'under_30_days' | 'one_to_three_months' | 'three_to_six_months' | 'over_six_months' | 'never'
export type PreparationLevel = 'ready' | 'light_review' | 'individual_process' | 'full_process'
export type PreparationStage = 'ready' | 'collective_review' | 'individual_study' | 'technical_analysis'

export interface RepertoireOccurrence {
  repertoireId: string
  eventId: string
  date: string | Date
  songId: string | null
  songTitle?: string | null
}

export interface EventMemberSnapshot {
  profileId: string
  role: string | null
}

export interface ReadinessInputs {
  mastery: number
  recency: number
  rotation: number
  complexity: number
  changes: number
  strategic: number
}

const DAY_MS = 86_400_000
const RECENCY_SCORES: Record<RecencyBand, number> = {
  under_30_days: 100,
  one_to_three_months: 80,
  three_to_six_months: 60,
  over_six_months: 30,
  never: 0,
}

function dateOnly(value: string | Date): number {
  if (value instanceof Date) return Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match) throw new Error(`Invalid repertoire date: ${value}`)
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

function sameSong(selected: Pick<RepertoireOccurrence, 'songId' | 'songTitle'>, candidate: RepertoireOccurrence): boolean {
  // Once either record has a durable identity, never infer identity from a title.
  if (selected.songId || candidate.songId) return Boolean(selected.songId && candidate.songId && selected.songId === candidate.songId)
  return Boolean(selected.songTitle && candidate.songTitle && selected.songTitle.trim().toLocaleLowerCase() === candidate.songTitle.trim().toLocaleLowerCase())
}

export function findPreviousOccurrence(selected: RepertoireOccurrence, occurrences: readonly RepertoireOccurrence[]): RepertoireOccurrence | null {
  const selectedDate = dateOnly(selected.date)
  return occurrences
    .filter((item) => item.repertoireId !== selected.repertoireId && dateOnly(item.date) < selectedDate && sameSong(selected, item))
    .sort((a, b) => dateOnly(b.date) - dateOnly(a.date))[0] ?? null
}

export function calculateRecency(selected: RepertoireOccurrence, occurrences: readonly RepertoireOccurrence[]) {
  const previous = findPreviousOccurrence(selected, occurrences)
  if (!previous) return { band: 'never' as const, days: null, score: RECENCY_SCORES.never, previous: null }
  const days = Math.floor((dateOnly(selected.date) - dateOnly(previous.date)) / DAY_MS)
  const band: RecencyBand = days < 30 ? 'under_30_days' : days < 90 ? 'one_to_three_months' : days < 180 ? 'three_to_six_months' : 'over_six_months'
  return { band, days, score: RECENCY_SCORES[band], previous }
}

const SOUND_ROLE_PATTERN = /(^|\b)(som|audio|áudio|sound|pa|técnic[oa] de som|tecnic[oa] de som)(\b|$)/i
export function isMusicalOrVocalRole(role: string | null): boolean {
  return Boolean(role?.trim()) && !SOUND_ROLE_PATTERN.test(role!.trim())
}

export function calculateBandRotation(current: readonly EventMemberSnapshot[], previous: readonly EventMemberSnapshot[]) {
  const currentIds = Array.from(new Set(current.filter((member) => isMusicalOrVocalRole(member.role)).map((member) => member.profileId)))
  const previousIds = new Set(previous.filter((member) => isMusicalOrVocalRole(member.role)).map((member) => member.profileId))
  const newMemberIds = currentIds.filter((id) => !previousIds.has(id))
  const rate = currentIds.length === 0 ? 0 : newMemberIds.length / currentIds.length
  return { newMemberCount: newMemberIds.length, newMemberIds, consideredMemberIds: currentIds, rate, continuityScore: Math.round((1 - rate) * 100) }
}

const clamp = (value: number) => Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0))
const rounded = (value: number) => Math.round(value * 100) / 100

export function calculateICI(input: Pick<ReadinessInputs, 'mastery' | 'recency' | 'rotation'>): number {
  const total = READINESS_WEIGHTS.mastery + READINESS_WEIGHTS.recency + READINESS_WEIGHTS.rotation
  return rounded((clamp(input.mastery) * READINESS_WEIGHTS.mastery + clamp(input.recency) * READINESS_WEIGHTS.recency + clamp(input.rotation) * READINESS_WEIGHTS.rotation) / total)
}

export function calculateICO(input: Pick<ReadinessInputs, 'complexity' | 'changes'>): number {
  const total = READINESS_WEIGHTS.complexity + READINESS_WEIGHTS.changes
  return rounded(((100 - clamp(input.complexity)) * READINESS_WEIGHTS.complexity + (100 - clamp(input.changes)) * READINESS_WEIGHTS.changes) / total)
}

export function calculateIP(input: ReadinessInputs): number {
  return rounded(clamp(
    clamp(input.mastery) * READINESS_WEIGHTS.mastery +
    clamp(input.recency) * READINESS_WEIGHTS.recency +
    clamp(input.rotation) * READINESS_WEIGHTS.rotation +
    (100 - clamp(input.complexity)) * READINESS_WEIGHTS.complexity +
    (100 - clamp(input.changes)) * READINESS_WEIGHTS.changes +
    clamp(input.strategic) * READINESS_WEIGHTS.strategic,
  ))
}

export function classifyPreparation(ip: number): { level: PreparationLevel; suggestedStage: PreparationStage } {
  const score = clamp(ip)
  if (score >= 90) return { level: 'ready', suggestedStage: 'ready' }
  if (score >= 70) return { level: 'light_review', suggestedStage: 'collective_review' }
  if (score >= 40) return { level: 'individual_process', suggestedStage: 'individual_study' }
  return { level: 'full_process', suggestedStage: 'technical_analysis' }
}

/** Applies a suggestion only on creation; a manually moved stage always wins on recalculation. */
export function resolveStage(suggested: PreparationStage, current: PreparationStage | null, manuallyMoved: boolean): PreparationStage {
  return manuallyMoved && current ? current : current ?? suggested
}

export function calculateReadiness(input: ReadinessInputs, stage?: { current: PreparationStage | null; manuallyMoved: boolean }) {
  const normalizedInputs: ReadinessInputs = Object.fromEntries(Object.entries(input).map(([key, value]) => [key, clamp(value)])) as unknown as ReadinessInputs
  const ici = calculateICI(normalizedInputs)
  const ico = calculateICO(normalizedInputs)
  const ip = calculateIP(normalizedInputs)
  const classification = classifyPreparation(ip)
  return { inputs: normalizedInputs, ici, ico, ip, ...classification, stage: resolveStage(classification.suggestedStage, stage?.current ?? null, stage?.manuallyMoved ?? false) }
}
