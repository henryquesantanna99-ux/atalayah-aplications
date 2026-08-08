export const SENTINELA_ROLES = ['participant', 'mentor', 'journey_admin'] as const
export const SENTINELA_GRANTS = ['manage_rehearsals'] as const

export type SentinelaRole = (typeof SENTINELA_ROLES)[number]
export type SentinelaGrant = (typeof SENTINELA_GRANTS)[number]

export interface SentinelaAuthority {
  role: SentinelaRole
  grants: readonly string[]
}

/** Mirrors the Sentinela RLS write matrix without coupling it to profiles.role. */
export function canManageRehearsals(authority: SentinelaAuthority): boolean {
  return authority.role === 'journey_admin' || authority.grants.includes('manage_rehearsals')
}
