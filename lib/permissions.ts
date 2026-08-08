/** Roles for the main AtalaYah application only. Sentinela roles are memberships. */
export type PersistedRole = 'admin' | 'editor' | 'integrante'

/** Main-app authorization is persisted in profiles.role; e-mail is never an authority. */
export function canEdit(role: string | null | undefined): boolean {
  return role === 'admin' || role === 'editor'
}
