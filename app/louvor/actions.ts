'use server'

import { createHash } from 'crypto'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { findBestLyrics } from '@/lib/music/lrclib'
import { searchSoundchartsSong } from '@/lib/music/soundcharts'

type JsonResponse<T = unknown> = { success: boolean; message: string; data?: T }

type VotableSong = {
  id: string
  song_title: string
  artist: string | null
  youtube_link: string | null
  category: string | null
  status: string | null
  theme: string | null
  worship_type: string | null
  votes?: number
  average_rating?: number | null
}


const VOTABLE_STATUSES = ['Aprovada', 'Em teste', 'Repertório oficial']

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, '')
}

function normalizeText(value: string) {
  return value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ')
}

function createStableHash(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

function createMemberKey(name: string, phone: string) {
  return createStableHash(`${normalizePhone(phone)}:${normalizeText(name)}`)
}

function createSongKey(title: string, artist: string) {
  return createStableHash(`${normalizeText(title)}:${normalizeText(artist)}`)
}


async function enrichNewSuggestion(supabase: Awaited<ReturnType<typeof createClient>>, suggestionId: string, payload: {
  musica: string
  artista?: string | null
  youtube_video_id?: string | null
  youtube_title?: string | null
  youtube_channel?: string | null
  youtube_thumbnail?: string | null
  youtube_duration?: string | null
  youtube_url?: string | null
}) {
  try {
    const [lyrics, soundcharts] = await Promise.all([
      findBestLyrics({ trackName: payload.musica, artistName: payload.artista }).catch((error) => {
        console.warn('LRCLIB public enrichment failed', error)
        return null
      }),
      searchSoundchartsSong({ title: payload.musica, artist: payload.artista }).catch((error) => {
        console.warn('Soundcharts public enrichment failed', error)
        return null
      }),
    ])

    const metadataPayload = {
      youtube: {
        video_id: payload.youtube_video_id ?? null,
        title: payload.youtube_title ?? payload.musica,
        channel: payload.youtube_channel ?? payload.artista ?? null,
        thumbnail: payload.youtube_thumbnail ?? null,
        duration: payload.youtube_duration ?? null,
        url: payload.youtube_url ?? null,
      },
      soundcharts,
      enriched_at: new Date().toISOString(),
      trigger: 'public_suggestion_submit',
    }

    const { error } = await supabase
      .from('worship_song_suggestions' as never)
      .update({
        lyrics_plain: lyrics?.plainLyrics ?? null,
        lyrics_synced: lyrics?.syncedLyrics ?? null,
        lyrics_source: lyrics ? 'lrclib' : null,
        lyrics_confidence: lyrics ? 0.75 : null,
        lyrics_fetched_at: lyrics ? new Date().toISOString() : null,
        metadata_source: soundcharts ? 'soundcharts' : 'youtube',
        metadata_payload: metadataPayload,
        metadata_fetched_at: new Date().toISOString(),
        status: 'Em análise',
      } as never)
      .eq('id', suggestionId)

    if (error && !isMissingSuggestionColumnError(error)) throw error
  } catch (error) {
    console.warn('Não foi possível enriquecer a indicação automaticamente.', error)
  }
}

function sevenDaysAgoISOString() {
  const date = new Date()
  date.setDate(date.getDate() - 7)
  return date.toISOString()
}

function isMissingSuggestionColumnError(error: unknown) {
  if (!error || typeof error !== 'object') return false
  const details = [
    'message' in error ? String(error.message) : '',
    'details' in error ? String(error.details) : '',
    'hint' in error ? String(error.hint) : '',
    'code' in error ? String(error.code) : '',
  ].join(' ')

  return details.includes('PGRST204')
    || details.includes('Could not find')
    || details.includes('schema cache')
    || details.includes('spiritual_area')
    || details.includes('next_step')
    || details.includes('member_key')
    || details.includes('song_key')
    || details.includes('youtube_video_id')
    || details.includes('age_range')
    || details.includes('lyrics_plain')
    || details.includes('metadata_payload')
}


export async function salvarIndicacao(payload: {
  nome: string
  tribo: string
  telefone: string
  musica: string
  artista: string
  categoriaSugerida: string
  tipoLouvor?: string | null
  motivo?: string | null
  spiritual_area: string
  spiritual_area_other?: string | null
  spiritual_experience_note?: string | null
  next_step: string
  next_step_other?: string | null
  faixaEtaria?: string | null
  ministerio?: string | null
  youtube_video_id?: string | null
  youtube_title?: string | null
  youtube_channel?: string | null
  youtube_thumbnail?: string | null
  youtube_duration?: string | null
  youtube_url?: string | null
}): Promise<JsonResponse> {
  try {
    const required = [payload.nome, payload.tribo, payload.telefone, payload.musica]
    if (required.some((value) => !value?.trim())) {
      return { success: false, message: 'Preencha nome completo, tribo, telefone e música.' }
    }
    const supabase = await createClient()
    const telefone = normalizePhone(payload.telefone)
    const musica = payload.musica.trim()
    const artista = payload.artista.trim()
    const memberKey = createMemberKey(payload.nome, telefone)
    const songKey = createSongKey(musica, artista)

    const { data: duplicate, error: duplicateError } = await supabase
      .from('worship_song_suggestions' as never)
      .select('id, created_at')
      .eq('member_key', memberKey)
      .eq('song_key', songKey)
      .gte('created_at', sevenDaysAgoISOString())
      .limit(1)
      .maybeSingle()

    if (duplicateError && !isMissingSuggestionColumnError(duplicateError)) throw duplicateError
    if (duplicateError && isMissingSuggestionColumnError(duplicateError)) {
      console.warn('worship_song_suggestions is missing member_key/song_key columns; duplicate window could not be checked.', duplicateError)
    }
    if (duplicate) {
      return { success: false, message: 'Você já indicou essa música nos últimos 7 dias. Tente indicar novamente após esse período.' }
    }

    const legacySuggestion = {
      name: payload.nome.trim(),
      tribe: payload.tribo.trim(),
      phone: telefone,
      song_title: musica,
      artist: artista || null,
      youtube_link: '',
      suggested_category: payload.categoriaSugerida || 'Não sei informar',
      worship_type: payload.tipoLouvor || null,
      reason: payload.motivo?.trim() || null,
      status: 'Sugerida',
    }

    const baseSuggestion = {
      ...legacySuggestion,
      member_key: memberKey,
      song_key: songKey,
      age_range: payload.faixaEtaria || null,
      ministry: payload.ministerio?.trim() || null,
      youtube_video_id: payload.youtube_video_id || null,
      youtube_title: payload.youtube_title?.trim() || null,
      youtube_channel: payload.youtube_channel?.trim() || null,
      youtube_thumbnail: payload.youtube_thumbnail || null,
      youtube_duration: payload.youtube_duration || null,
      youtube_url: payload.youtube_url || null,
    }

    const fullSuggestion = {
      ...baseSuggestion,
      spiritual_area: payload.spiritual_area || null,
      spiritual_area_other: payload.spiritual_area === 'Outro' ? payload.spiritual_area_other?.trim() || null : null,
      spiritual_experience_note: payload.spiritual_experience_note?.trim() || null,
      next_step: payload.next_step || null,
      next_step_other: payload.next_step === 'Outro' ? payload.next_step_other?.trim() || null : null,
    }

    let { data, error } = await supabase
      .from('worship_song_suggestions' as never)
      .insert(fullSuggestion as never)
      .select('id')
      .single()

    if (error && isMissingSuggestionColumnError(error)) {
      console.warn('worship_song_suggestions is missing newer columns; saving legacy suggestion only.', error)
      const fallback = await supabase
        .from('worship_song_suggestions' as never)
        .insert(legacySuggestion as never)
        .select('id')
        .single()

      data = fallback.data
      error = fallback.error
    }

    if (error) throw error

    const suggestionId = (data as { id?: string } | null)?.id
    if (suggestionId) {
      await enrichNewSuggestion(supabase, suggestionId, payload)
    }

    revalidatePath('/louvor')
    return { success: true, message: 'Sua indicação foi enviada com sucesso. O ministério irá avaliar com carinho.', data }
  } catch (error) {
    console.error('salvarIndicacao', error)
    return { success: false, message: 'Não foi possível enviar sua indicação agora. Tente novamente em instantes.' }
  }
}

export async function salvarVoto(payload: {
  musicaId: string
  musica: string
  nome: string
  telefone: string
  tribo: string
  conheceMusica: string
  ajudaACantar: string
  nota: number
  userAgent?: string
}): Promise<JsonResponse> {
  try {
    if (!payload.musicaId || !payload.nome?.trim() || !payload.telefone?.trim()) {
      return { success: false, message: 'Preencha nome e telefone para registrar seu voto.' }
    }

    const supabase = await createClient()
    const telefone = normalizePhone(payload.telefone)
    const duplicate = await verificarVotoDuplicado(telefone, payload.musicaId)
    if (duplicate.success && duplicate.data) {
      return { success: false, message: 'Você já votou nessa música.' }
    }

    const { error } = await supabase.from('worship_song_votes' as never).insert({
      song_id: payload.musicaId,
      song_title: payload.musica,
      name: payload.nome.trim(),
      phone: telefone,
      tribe: payload.tribo.trim() || null,
      knows_song: payload.conheceMusica,
      helps_singing: payload.ajudaACantar,
      rating: payload.nota,
      user_agent: payload.userAgent || null,
    } as never)

    if (error) throw error
    revalidatePath('/louvor')
    return { success: true, message: 'Seu voto foi registrado. Obrigado por ajudar o ministério a ouvir a igreja.' }
  } catch (error) {
    console.error('salvarVoto', error)
    return { success: false, message: 'Não foi possível registrar seu voto agora. Tente novamente em instantes.' }
  }
}

export async function verificarVotoDuplicado(telefone: string, musicaId: string): Promise<JsonResponse<boolean>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('worship_song_votes' as never)
    .select('id')
    .eq('phone', normalizePhone(telefone))
    .eq('song_id', musicaId)
    .limit(1)
    .maybeSingle()

  if (error) return { success: false, message: 'Erro ao verificar voto duplicado.', data: false }
  return { success: true, message: data ? 'Voto já encontrado.' : 'Voto liberado.', data: Boolean(data) }
}

export async function getMusicasParaVotacao(): Promise<VotableSong[]> {
  const supabase = await createClient()
  const { data: managedSongs } = await supabase
    .from('worship_songs' as never)
    .select('*')
    .in('status', VOTABLE_STATUSES)
    .eq('open_for_voting', true)
    .order('category')
    .order('song_title')

  return (managedSongs ?? []) as unknown as VotableSong[]
}
