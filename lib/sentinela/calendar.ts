const DAY_MS = 86_400_000

export type SeasonState = 'upcoming' | 'active' | 'completed'
export type SeasonPhase = { name: string; startsAt: string | Date; endsAt: string | Date }

function timestamp(value: string | Date): number {
  const result = new Date(value).getTime()
  if (Number.isNaN(result)) throw new TypeError('Invalid date')
  return result
}

export function seasonState(now: string | Date, startsAt: string | Date, endsAt: string | Date): SeasonState {
  const current = timestamp(now)
  if (current < timestamp(startsAt)) return 'upcoming'
  if (current > timestamp(endsAt)) return 'completed'
  return 'active'
}

export function seasonWeek(now: string | Date, startsAt: string | Date): number {
  return Math.max(0, Math.floor((timestamp(now) - timestamp(startsAt)) / (7 * DAY_MS)) + 1)
}

export function countdown(now: string | Date, target: string | Date): number {
  return Math.max(0, Math.ceil((timestamp(target) - timestamp(now)) / DAY_MS))
}

export function currentPhase(now: string | Date, phases: SeasonPhase[]): SeasonPhase | null {
  const current = timestamp(now)
  return phases.find((phase) => current >= timestamp(phase.startsAt) && current <= timestamp(phase.endsAt)) ?? null
}
