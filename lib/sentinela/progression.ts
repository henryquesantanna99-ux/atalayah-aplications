export type Progress = { educationalXp: number; milestoneLevel: number }
export type CheckpointRequirement = { key: string; required: boolean }

export function awardEducationalXp(progress: Progress, amount: number): Progress {
  if (!Number.isFinite(amount) || amount < 0) throw new RangeError('XP must be non-negative')
  return { ...progress, educationalXp: progress.educationalXp + amount }
}

export function checkpointComplete(requirements: readonly CheckpointRequirement[], completedKeys: ReadonlySet<string>): boolean {
  return requirements.filter((item) => item.required).every((item) => completedKeys.has(item.key))
}

export function applyCompetencyAssessment(
  current: number,
  assessment: { score: number; assessorRole: 'participant' | 'mentor' | 'coordinator' | 'admin' },
): number {
  if (!['mentor', 'coordinator', 'admin'].includes(assessment.assessorRole)) return current
  return Math.max(0, Math.min(100, assessment.score))
}
