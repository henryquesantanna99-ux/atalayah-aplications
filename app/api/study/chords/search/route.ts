import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function requireActiveUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { supabase, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('status')
    .eq('id', user.id)
    .single()

  if (profile?.status !== 'active') {
    return { supabase, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { supabase, error: null }
}

export async function POST(request: Request) {
  const { supabase, error } = await requireActiveUser()
  if (error) return error

  if (!process.env.CIFRACLUB_API_URL) {
    return NextResponse.json(
      { error: 'CIFRACLUB_API_URL is not configured.' },
      { status: 428 }
    )
  }

  const { songId, artist, title } = await request.json()
  if (!songId || !title) {
    return NextResponse.json({ error: 'songId and title are required' }, { status: 400 })
  }

  const artistSlug = slugify(artist || 'desconhecido')
  const songSlug = slugify(title)
  const url = new URL(`/artists/${artistSlug}/songs/${songSlug}`, process.env.CIFRACLUB_API_URL)

  const response = await fetch(url, {
    headers: process.env.CIFRACLUB_API_TOKEN
      ? { Authorization: `Bearer ${process.env.CIFRACLUB_API_TOKEN}` }
      : undefined,
  })
  const data = await response.json().catch(() => null)

  if (!response.ok || !data) {
    return NextResponse.json(
      { error: data?.message ?? 'Cifra não encontrada.' },
      { status: response.status === 404 ? 404 : 502 }
    )
  }

  const plainText =
    data.chord ??
    data.chords ??
    data.plain_text ??
    data.plainText ??
    (typeof data === 'string' ? data : null)

  const { data: chord, error: insertError } = await supabase
    .from('song_chords')
    .insert({
      song_id: songId,
      title: data.title ?? title,
      artist: data.artist ?? artist ?? null,
      source_url: data.url ?? data.cifraclub_url ?? null,
      key_note: data.key ?? data.key_note ?? null,
      content_json: data,
      plain_text: plainText,
    })
    .select('*')
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ chord })
}
