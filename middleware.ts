import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase/middleware'

const PUBLIC_PAGE_ROUTES = ['/', '/louvor', '/inscricao']
const AUTH_ROUTES = [
  '/login',
  '/auth/callback',
  '/auth/error',
  '/sentinela/entrar',
  '/sentinela/criar-conta',
  '/sentinela/esqueci-senha',
  '/sentinela/redefinir-senha',
  '/sentinela/onboarding',
]

function isPublicInscricaoApi(pathname: string) {
  return /^\/api\/inscricoes\/[^/]+\/(status|pix)$/.test(pathname)
}

function isPublicAutomationWebhook(pathname: string) {
  return /^\/api\/automations\/webhooks\/(?:test\/[^/]+|[^/]+)$/.test(pathname)
}

function isPublicRoute(pathname: string) {
  return (
    PUBLIC_PAGE_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`)) ||
    AUTH_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`)) ||
    isPublicInscricaoApi(pathname) ||
    isPublicAutomationWebhook(pathname) ||
    pathname === '/api/mercado-pago/webhook'
  )
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const response = NextResponse.next({ request })
  const publicRoute = isPublicRoute(pathname)

  // Public registration/voting/webhook routes must never require an auth session.
  if (publicRoute && pathname !== '/login') {
    return response
  }

  const supabase = createMiddlewareClient(request, response)

  // Refresh session (required by @supabase/ssr)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Not authenticated → redirect to login (except public routes)
  if (!user && !publicRoute) {
    const loginPath = pathname.startsWith('/sentinela') ? '/sentinela/entrar' : '/login'
    return NextResponse.redirect(new URL(loginPath, request.url))
  }

  // Authenticated on login page → redirect to dashboard
  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Check profile status for authenticated users on protected routes
  if (user && !publicRoute) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('status, onboarding_completed')
      .eq('id', user.id)
      .single()

    // No profile yet or onboarding not done → send to onboarding
    if (!profile || !profile.onboarding_completed) {
      if (!pathname.startsWith('/onboarding')) {
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }
      return response
    }

    // Pending approval → send to onboarding/pending screen
    if (profile.status === 'pending') {
      if (!pathname.startsWith('/onboarding')) {
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }
      return response
    }

    // Inactive → back to login
    if (profile.status === 'inactive') {
      await supabase.auth.signOut()
      return NextResponse.redirect(new URL('/login?error=account_inactive', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico|css|js)$).*)',
  ],
}
