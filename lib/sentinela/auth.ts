export const SENTINELA_LOGIN = '/sentinela/login'
export const SENTINELA_ONBOARDING = '/sentinela/onboarding'

export function sentinelaReturnUrl(origin: string, flow: 'signup' | 'recovery') {
  const url = new URL('/sentinela/auth/callback', origin)
  if (flow === 'recovery') url.searchParams.set('next', '/sentinela/redefinir-senha')
  return url.toString()
}

export function safeSentinelaNext(value: string | null) {
  if (!value || !value.startsWith('/sentinela/') || value.startsWith('//')) return SENTINELA_ONBOARDING
  return value
}

export function publicAuthMessage(kind: 'signup' | 'login' | 'recovery') {
  if (kind === 'signup') return 'Se for possível criar a conta, você receberá as próximas instruções por e-mail.'
  if (kind === 'recovery') return 'Se houver uma conta para este e-mail, enviaremos as instruções de recuperação.'
  return 'Não foi possível entrar. Confira os dados e tente novamente.'
}

type AuthProfile = { onboardingCompleted: boolean; status: 'active' | 'pending' | 'inactive' }
export function authRedirect(input: { event: 'signup' | 'login' | 'logout' | 'email-confirmation' | 'recovery' | 'password-reset'; profile?: AuthProfile | null; next?: string | null }) {
  if (input.event === 'signup') return '/confirmar-email'
  if (input.event === 'logout') return '/login'
  if (input.event === 'recovery') return '/redefinir-senha'
  if (input.event === 'password-reset') return '/login?message=password_updated'
  if (input.event === 'email-confirmation' || !input.profile?.onboardingCompleted) return SENTINELA_ONBOARDING
  return safeSentinelaNext(input.next ?? null) === SENTINELA_ONBOARDING ? '/sentinela' : safeSentinelaNext(input.next ?? null)
}
