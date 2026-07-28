import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { MAX_LYRICS_ATTEMPTS } from '@/lib/music/lrclib'

type Session = { id: string; attempt: number; rejected_results: string[]; candidate_id: string | null; candidate_lyrics: string | null }

export async function POST(request: Request) {
  try {
    const { sessionId, confirmed } = await request.json() as { sessionId?: string; confirmed?: boolean }
    if (!sessionId || typeof confirmed !== 'boolean') return NextResponse.json({ error: 'Decisão inválida.' }, { status: 400 })
    const db = createAdminClient()
    const { data, error } = await db.from('lyrics_confirmation_sessions' as never).select('*').eq('id', sessionId).gt('expires_at', new Date().toISOString()).single()
    if (error || !data) return NextResponse.json({ error: 'A confirmação expirou. Busque novamente.' }, { status: 410 })
    const session = data as unknown as Session
    if (confirmed) {
      if (!session.candidate_lyrics) return NextResponse.json({ error: 'Não há letra para confirmar.' }, { status: 409 })
      await db.from('lyrics_confirmation_sessions' as never).update({ status: 'confirmed', updated_at: new Date().toISOString() } as never).eq('id', sessionId)
      return NextResponse.json({ sessionId, confirmed: true })
    }
    const rejected = Array.from(new Set([...(session.rejected_results ?? []), session.candidate_id].filter(Boolean)))
    const exhausted = session.attempt >= MAX_LYRICS_ATTEMPTS
    await db.from('lyrics_confirmation_sessions' as never).update({ rejected_results: rejected, candidate_id: null, candidate_lyrics: null, status: exhausted ? 'not_confirmed' : 'pending', updated_at: new Date().toISOString() } as never).eq('id', sessionId)
    return NextResponse.json({ sessionId, confirmed: false, exhausted, attempt: session.attempt })
  } catch (error) {
    console.error('lyrics decision route', error)
    return NextResponse.json({ error: 'Não foi possível registrar sua decisão.' }, { status: 500 })
  }
}
