export type AuthProfile = { onboardingCompleted: boolean; status: 'pending' | 'active' | 'inactive' }

export function safeRedirect(candidate: string | null | undefined, fallback = '/sentinela'): string {
  return candidate?.startsWith('/') && !candidate.startsWith('//') ? candidate : fallback
}

export function authRedirect(input: {
  event: 'signup' | 'login' | 'logout' | 'email-confirmation' | 'recovery' | 'password-reset'
  profile?: AuthProfile | null
  next?: string | null
}): string {
  if (input.event === 'logout') return '/login'
  if (input.event === 'signup') return '/confirmar-email'
  if (input.event === 'recovery') return '/redefinir-senha'
  if (input.event === 'password-reset') return '/login?message=password_updated'
  if (!input.profile || !input.profile.onboardingCompleted) return '/sentinela/onboarding'
  if (input.profile.status === 'inactive') return '/login?error=account_inactive'
  if (input.profile.status === 'pending') return '/sentinela/onboarding?status=pending'
  return safeRedirect(input.next)
}
