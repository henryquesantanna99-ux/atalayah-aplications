export const EDITOR_EMAILS = [
  'henryquesantanna99@gmail.com',
  'contatoingridcamila@gmail.com',
] as const

export function canEdit(email: string | null | undefined): boolean {
  return EDITOR_EMAILS.includes(email as (typeof EDITOR_EMAILS)[number])
}
