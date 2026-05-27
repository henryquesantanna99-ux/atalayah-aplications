import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function requireActiveUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('status').eq('id', user.id).single()
  if (profile?.status !== 'active') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  return null
}

export async function GET(request: Request) {
  const authError = await requireActiveUser()
  if (authError) return authError

  const baseUrl = process.env.CIFRACLUB_API_URL
  if (!baseUrl) {
    return NextResponse.json({ error: 'CIFRACLUB_API_URL is not configured.' }, { status: 428 })
  }

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()

  if (!q) {
    return NextResponse.json({ error: 'Query param q is required.' }, { status: 400 })
  }

  const upstream = new URL('/search', baseUrl)
  upstream.searchParams.set('q', q)

  const response = await fetch(upstream, {
    headers: process.env.CIFRACLUB_API_TOKEN
      ? { Authorization: `Bearer ${process.env.CIFRACLUB_API_TOKEN}` }
      : undefined,
    next: { revalidate: 300 },
  })

  const data = await response.json().catch(() => null)

  if (!response.ok || !data) {
    return NextResponse.json({ error: data?.message ?? 'Erro ao buscar no Cifra Club.' }, { status: 502 })
  }

  return NextResponse.json({ results: data.results ?? data.items ?? data })
}
