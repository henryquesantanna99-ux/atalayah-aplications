export type AccountScope = 'main' | 'sentinela'
export type SeasonRole = 'participant' | 'mentor' | 'coordinator' | 'admin'

export function canAccessScope(requested: AccountScope, memberships: readonly AccountScope[]): boolean {
  return memberships.includes(requested)
}

export function canManageSentinela(role: SeasonRole | null): boolean {
  return role === 'coordinator' || role === 'admin'
}

export function canAccessSeason(requestedSeasonId: string, memberSeasonIds: readonly string[], role: SeasonRole | null): boolean {
  return role === 'admin' || memberSeasonIds.includes(requestedSeasonId)
}
