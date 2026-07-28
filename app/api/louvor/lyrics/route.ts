import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createLyricsExcerpt, lyricsResultKey, MAX_LYRICS_ATTEMPTS, searchLyrics, selectBestLyrics } from '@/lib/music/lrclib'

type Session = { id: string; track_name: string; artist_name: string | null; attempt: number; rejected_results: string[]; candidate_id: string | null; candidate_track: string | null; candidate_artist: string | null; candidate_lyrics: string | null; status: string; expires_at: string }

function publicCandidate(session: Session) {
  return session.candidate_lyrics ? { sessionId: session.id, attempt: session.attempt, maxAttempts: MAX_LYRICS_ATTEMPTS, candidate: { id: session.candidate_id, trackName: session.candidate_track, artistName: session.candidate_artist, excerpt: createLyricsExcerpt(session.candidate_lyrics) } } : { sessionId: session.id, attempt: session.attempt, maxAttempts: MAX_LYRICS_ATTEMPTS, exhausted: true }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { sessionId?: string; trackName?: string; artistName?: string }
    const db = createAdminClient()
    let session: Session | null = null
    if (body.sessionId) {
      const { data } = await db.from('lyrics_confirmation_sessions' as never).select('*').eq('id', body.sessionId).gt('expires_at', new Date().toISOString()).maybeSingle()
      session = data as unknown as Session | null
      if (session?.candidate_lyrics && session.status === 'pending') return NextResponse.json(publicCandidate(session))
    }
    if (!session) {
      if (!body.trackName?.trim()) return NextResponse.json({ error: 'Informe o nome da música.' }, { status: 400 })
      const { data, error } = await db.from('lyrics_confirmation_sessions' as never).insert({ track_name: body.trackName.trim(), artist_name: body.artistName?.trim() || null } as never).select('*').single()
      if (error) throw error
      session = data as unknown as Session
    }
    const attempt = session.attempt + 1
    if (attempt > MAX_LYRICS_ATTEMPTS) return NextResponse.json({ ...publicCandidate({ ...session, candidate_lyrics: null }), exhausted: true })
    const input = { trackName: session.track_name, artistName: session.artist_name, attempt }
    const candidate = selectBestLyrics(await searchLyrics(input), input, session.rejected_results ?? [])
    const patch = candidate ? { attempt, candidate_id: lyricsResultKey(candidate), candidate_track: candidate.trackName ?? session.track_name, candidate_artist: candidate.artistName ?? session.artist_name, candidate_lyrics: candidate.plainLyrics, updated_at: new Date().toISOString() } : { attempt: MAX_LYRICS_ATTEMPTS, candidate_id: null, candidate_lyrics: null, status: 'not_confirmed', updated_at: new Date().toISOString() }
    const { data, error } = await db.from('lyrics_confirmation_sessions' as never).update(patch as never).eq('id', session.id).select('*').single()
    if (error) throw error
    return NextResponse.json(publicCandidate(data as unknown as Session))
  } catch (error) {
    console.error('lyrics search route', error)
    return NextResponse.json({ error: 'A busca de letra está indisponível agora. Você pode tentar novamente.' }, { status: 502 })
  }
}
