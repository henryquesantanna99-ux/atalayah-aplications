import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { safeSentinelaNext, SENTINELA_LOGIN } from '@/lib/sentinela/auth'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  if (!code) return NextResponse.redirect(new URL(`${SENTINELA_LOGIN}?erro=link_invalido`, url.origin))
  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) return NextResponse.redirect(new URL(`${SENTINELA_LOGIN}?erro=sessao_expirada`, url.origin))
  const { error: provisionError } = await supabase.rpc('complete_sentinela_signup')
  if (provisionError) return NextResponse.redirect(new URL(`${SENTINELA_LOGIN}?erro=cadastro_pendente`, url.origin))
  return NextResponse.redirect(new URL(safeSentinelaNext(url.searchParams.get('next')), url.origin))
}
