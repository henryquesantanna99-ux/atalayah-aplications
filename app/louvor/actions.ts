'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

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


const YOUTUBE_RE = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i
const VOTABLE_STATUSES = ['Aprovada', 'Em teste', 'Repertório oficial']

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, '')
}

function isYoutubeUrl(url: string) {
  return YOUTUBE_RE.test(url.trim())
}

export async function salvarIndicacao(payload: {
  nome: string
  tribo: string
  telefone: string
  musica: string
  artista: string
  youtubeLink: string
  categoriaSugerida: string
  tipoLouvor?: string | null
  motivo?: string | null
}): Promise<JsonResponse> {
  try {
    const required = [payload.nome, payload.telefone, payload.musica, payload.youtubeLink, payload.categoriaSugerida]
    if (required.some((value) => !value?.trim())) {
      return { success: false, message: 'Preencha nome, telefone, música, link do YouTube e categoria.' }
    }
    if (!isYoutubeUrl(payload.youtubeLink)) {
      return { success: false, message: 'Informe um link válido do YouTube.' }
    }

    const supabase = await createClient()
    const telefone = normalizePhone(payload.telefone)
    const musica = payload.musica.trim()
    const artista = payload.artista.trim()
    const youtubeLink = payload.youtubeLink.trim()

    const { data: duplicate, error: duplicateError } = await supabase
      .from('worship_song_suggestions' as never)
      .select('id')
      .or(`youtube_link.eq.${youtubeLink},and(song_title.ilike.${musica},artist.ilike.${artista || '%'})`)
      .limit(1)
      .maybeSingle()

    if (duplicateError) throw duplicateError
    if (duplicate) {
      return { success: false, message: 'Essa música já foi indicada. Obrigado por reforçar essa sugestão!' }
    }

    const { data, error } = await supabase
      .from('worship_song_suggestions' as never)
      .insert({
        name: payload.nome.trim(),
        tribe: payload.tribo.trim(),
        phone: telefone,
        song_title: musica,
        artist: artista || null,
        youtube_link: youtubeLink,
        suggested_category: payload.categoriaSugerida,
        worship_type: payload.tipoLouvor || null,
        reason: payload.motivo?.trim() || null,
        status: 'Sugerida',
      } as never)
      .select('id')
      .single()

    if (error) throw error
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
