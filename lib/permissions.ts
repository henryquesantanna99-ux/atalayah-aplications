export type PersistedRole = 'admin' | 'editor' | 'integrante'

/** Authorization is persisted in profiles.role; e-mail is never an authority. */
export function canEdit(role: string | null | undefined): boolean {
  return role === 'admin' || role === 'editor'
}
