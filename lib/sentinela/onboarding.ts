export type OnboardingDraft = {
  step: number
  answeredCall: boolean
  servesWithInstrument: boolean
  instrument: string | null
  avatarPath: string | null
  diagnosis: Record<string, number>
}

export function resumeStep(draft: Partial<OnboardingDraft> | null): number {
  return Math.min(5, Math.max(1, draft?.step ?? 1))
}

export function validateOnboarding(draft: OnboardingDraft): string[] {
  const errors: string[] = []
  if (!draft.answeredCall) errors.push('call_answer_required')
  if (draft.servesWithInstrument && !draft.instrument?.trim()) errors.push('instrument_required')
  if (!draft.avatarPath) errors.push('avatar_required')
  if (Object.keys(draft.diagnosis).length === 0) errors.push('diagnosis_required')
  return errors
}

export function persistedProfile(draft: OnboardingDraft) {
  return { avatar_path: draft.avatarPath, diagnosis: draft.diagnosis, onboarding_step: draft.step }
}
