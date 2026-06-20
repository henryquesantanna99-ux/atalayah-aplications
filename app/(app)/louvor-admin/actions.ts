'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { canEdit } from '@/lib/permissions'

type AdminResponse<T = unknown> = { success: boolean; message: string; data?: T }

type CatalogRow = {
  id: string
  artist: string | null
  moment: string | null
  youtube_url: string | null
  songs: { title: string | null; artist: string | null; youtube_url: string | null } | null
}

async function requireWorshipAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, email')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin' && !canEdit(profile?.email ?? user.email)) {
    throw new Error('Forbidden')
  }

  return { supabase }
}

export async function listarAdministracaoLouvor() {
  const { supabase } = await requireWorshipAdmin()

  const [suggestions, votingSongs, catalog] = await Promise.all([
    supabase
      .from('worship_song_suggestions' as never)
      .select('*')
      .order('created_at', { ascending: false }),
    supabase
      .from('worship_songs' as never)
      .select('*')
      .order('category')
      .order('song_title'),
    supabase
      .from('song_variations')
      .select('id, artist, moment, youtube_url, songs(id, title, artist, youtube_url)')
      .order('created_at', { ascending: false }),
  ])

  return {
    suggestions: suggestions.data ?? [],
    votingSongs: votingSongs.data ?? [],
    catalog: ((catalog.data ?? []) as unknown as CatalogRow[]).map((item) => ({
      id: item.id,
      title: item.songs?.title ?? 'Música sem título',
      artist: item.artist ?? item.songs?.artist ?? null,
      youtubeLink: item.youtube_url ?? item.songs?.youtube_url ?? null,
      moment: item.moment === 'Palavra' ? 'Palavra' : item.moment,
    })),
  }
}

export async function enviarMusicaParaVotacao(input: {
  catalogVariationId?: string
  songTitle: string
  artist?: string | null
  youtubeLink?: string | null
  category: string
  worshipType: string
  theme?: string | null
}): Promise<AdminResponse> {
  try {
    const { supabase } = await requireWorshipAdmin()
    if (!input.songTitle?.trim() || !input.category || !input.worshipType) {
      return { success: false, message: 'Informe música, momento do culto e tipo de louvor.' }
    }

    const { error } = await supabase.from('worship_songs' as never).insert({
      catalog_variation_id: input.catalogVariationId || null,
      song_title: input.songTitle.trim(),
      artist: input.artist?.trim() || null,
      youtube_link: input.youtubeLink?.trim() || null,
      category: input.category,
      status: 'Aprovada',
      theme: input.theme?.trim() || null,
      worship_type: input.worshipType,
      open_for_voting: true,
    } as never)

    if (error) throw error
    revalidatePath('/louvor')
    revalidatePath('/louvor-admin')
    return { success: true, message: 'Música enviada para votação.' }
  } catch (error) {
    console.error('enviarMusicaParaVotacao', error)
    return { success: false, message: 'Não foi possível enviar a música para votação.' }
  }
}

export async function atualizarMusicaVotacao(id: string, input: {
  category: string
  status: string
  worshipType: string
  openForVoting: boolean
}): Promise<AdminResponse> {
  try {
    const { supabase } = await requireWorshipAdmin()
    const { error } = await supabase
      .from('worship_songs' as never)
      .update({
        category: input.category,
        status: input.status,
        worship_type: input.worshipType,
        open_for_voting: input.openForVoting,
        updated_at: new Date().toISOString(),
      } as never)
      .eq('id', id)

    if (error) throw error
    revalidatePath('/louvor')
    revalidatePath('/louvor-admin')
    return { success: true, message: 'Configuração de votação atualizada.' }
  } catch (error) {
    console.error('atualizarMusicaVotacao', error)
    return { success: false, message: 'Não foi possível atualizar a música.' }
  }
}

export async function atualizarStatusIndicacao(id: string, status: string): Promise<AdminResponse> {
  try {
    const { supabase } = await requireWorshipAdmin()
    const { error } = await supabase
      .from('worship_song_suggestions' as never)
      .update({ status } as never)
      .eq('id', id)

    if (error) throw error
    revalidatePath('/louvor-admin')
    return { success: true, message: 'Status da indicação atualizado.' }
  } catch (error) {
    console.error('atualizarStatusIndicacao', error)
    return { success: false, message: 'Não foi possível atualizar a indicação.' }
  }
}
