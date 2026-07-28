'use server'

import { revalidatePath } from 'next/cache'
import { getLatestMinistryProfile, requireWorshipAdmin, type AdminResponse, type WorshipSuggestionRow } from './shared'

type SpiritualSummaryRow = { id: string; run_id: string; analysis_date: string; quantification: Record<string, unknown>; segmentation: unknown[]; associations: unknown[]; correlations: unknown[]; interpretation: unknown[]; actions: unknown[]; ministry_context: Record<string, unknown>; evolution: Record<string, unknown>; discernment: string[]; recommendations: string[]; charts_payload: Record<string, unknown>; created_at: string }

type CatalogRow = {
  id: string
  song_id: string
  artist: string | null
  moment: string | null
  youtube_url: string | null
  songs: { title: string | null; artist: string | null; youtube_url: string | null } | null
}

export async function listarAdministracaoLouvor() {
  const { supabase } = await requireWorshipAdmin()

  const [suggestions, votingSongs, catalog, repertoireSuggestions, upcomingEvents, spiritualSummaries, musicalAnalyses] = await Promise.all([
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
      .select('id, song_id, artist, moment, youtube_url, songs(id, title, artist, youtube_url)')
      .order('created_at', { ascending: false }),
    supabase
      .from('repertoire_suggestions' as never)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('events')
      .select('id, title, date')
      .eq('type', 'culto')
      .gte('date', new Date().toISOString().slice(0, 10))
      .order('date', { ascending: true })
      .limit(12),
    supabase
      .from('spiritual_intelligence_daily_summaries' as never)
      .select('*')
      .order('analysis_date', { ascending: false })
      .limit(20),
    supabase
      .from('song_musical_analyses' as never)
      .select('id, song_id, version, status, scores, ici_score, ico_score, created_at, reviewed_at')
      .not('song_id', 'is', null)
      .order('created_at', { ascending: false }),
  ])

  return {
    suggestions: suggestions.data ?? [],
    votingSongs: votingSongs.data ?? [],
    repertoireSuggestions: repertoireSuggestions.data ?? [],
    upcomingEvents: upcomingEvents.data ?? [],
    spiritualSummaries: (spiritualSummaries.data ?? []) as unknown as SpiritualSummaryRow[],
    musicalAnalyses: musicalAnalyses.data ?? [],
    catalog: ((catalog.data ?? []) as unknown as CatalogRow[]).map((item) => ({
      id: item.id,
      songId: item.song_id,
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


function normalizeSetlistMoment(value?: string | null) {
  return ['Prévia', 'Adoração', 'Palavra', 'Celebração'].includes(value ?? '')
    ? (value as 'Prévia' | 'Adoração' | 'Palavra' | 'Celebração')
    : null
}

type RepertoireSourceSummary = {
  id: string
  run_id: string
  analysis_date: string
  quantification: { themes?: Array<{ label: string; percentage: number }> }
  recommendations: string[]
}

type RepertoireClassification = {
  suggestion_id: string
  classification: { themes?: string[] }
}

export async function criarSugestaoRepertorio(summaryId: string): Promise<AdminResponse> {
  try {
    const { supabase, user } = await requireWorshipAdmin()
    if (!summaryId) return { success: false, message: 'Selecione uma análise coletiva para orientar o repertório.' }

    const ministryProfile = await getLatestMinistryProfile(supabase)
    const { data: summaryData, error: summaryError } = await supabase
      .from('spiritual_intelligence_daily_summaries' as never)
      .select('id, run_id, analysis_date, quantification, recommendations')
      .eq('id', summaryId)
      .single()

    if (summaryError) throw summaryError
    const summary = summaryData as unknown as RepertoireSourceSummary
    const start = `${summary.analysis_date}T00:00:00.000Z`
    const endDate = new Date(start)
    endDate.setUTCDate(endDate.getUTCDate() + 1)

    const [{ data: suggestions, error: suggestionsError }, { data: classifications, error: classificationsError }] = await Promise.all([
      supabase
      .from('worship_song_suggestions' as never)
      .select('*')
      .gte('created_at', start)
      .lt('created_at', endDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(20),
      supabase
        .from('spiritual_intelligence_classifications' as never)
        .select('suggestion_id, classification')
        .eq('run_id', summary.run_id),
    ])

    if (suggestionsError) throw suggestionsError
    if (classificationsError) throw classificationsError

    const topThemes = (summary.quantification?.themes ?? []).slice(0, 5).map((item) => item.label)
    const classificationBySuggestion = new Map(
      ((classifications ?? []) as unknown as RepertoireClassification[]).map((item) => [item.suggestion_id, item.classification]),
    )
    const selected = ((suggestions ?? []) as unknown as WorshipSuggestionRow[])
      .map((suggestion) => {
        const themes = classificationBySuggestion.get(suggestion.id)?.themes ?? []
        const score = themes.filter((theme) => topThemes.includes(theme)).length
        return { suggestion, themes, score }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)

    if (selected.length === 0) return { success: false, message: 'Nenhuma indicação analisada disponível para sugerir repertório.' }

    const suggestedSetlist = selected.map(({ suggestion, themes }, index) => ({
      position: index + 1,
      moment: normalizeSetlistMoment(suggestion.suggested_category) || (index === 0 ? 'Prévia' : index === selected.length - 1 ? 'Adoração' : 'Celebração'),
      suggestion_id: suggestion.id,
      title: suggestion.song_title,
      artist: suggestion.artist,
      youtube_url: suggestion.youtube_link,
      reason: themes.length > 0 ? `Relacionada aos temas coletivos: ${themes.slice(0, 3).join(', ')}.` : 'Candidata recebida na mesma coleta coletiva; requer validação da liderança.',
    }))

    const { error: insertError } = await supabase.from('repertoire_suggestions' as never).insert({
      ministry_profile_id: ministryProfile?.id || null,
      title: `Sugestão de repertório — ${new Date(`${summary.analysis_date}T00:00:00`).toLocaleDateString('pt-BR')}`,
      pastoral_direction: [ministryProfile?.current_emphasis, topThemes.length > 0 ? `Temas coletivos observados: ${topThemes.join(', ')}.` : null, summary.recommendations?.[0]].filter(Boolean).join(' '),
      source_analysis_ids: [summary.id],
      suggested_setlist: suggestedSetlist,
      status: 'draft',
      created_by: user.id,
    } as never)

    if (insertError) throw insertError

    revalidatePath('/louvor-admin')
    return { success: true, message: `Rascunho criado a partir da análise coletiva de ${summary.analysis_date}.` }
  } catch (error) {
    console.error('criarSugestaoRepertorio', error)
    return { success: false, message: 'Não foi possível criar sugestão de repertório.' }
  }
}


export async function adicionarIndicacaoAoRepertorio(id: string): Promise<AdminResponse> {
  try {
    const { supabase, user } = await requireWorshipAdmin()
    const { data: suggestion, error: suggestionError } = await supabase
      .from('worship_song_suggestions' as never)
      .select('*')
      .eq('id', id)
      .single()

    if (suggestionError) throw suggestionError
    const item = suggestion as unknown as WorshipSuggestionRow & { youtube_url?: string | null }
    const title = item.song_title?.trim()
    if (!title) return { success: false, message: 'A indicação não possui nome da música.' }

    const { data: existingSong, error: existingError } = await supabase
      .from('songs')
      .select('id')
      .ilike('title', title)
      .maybeSingle()

    if (existingError) throw existingError

    let songId = existingSong?.id as string | undefined
    const youtubeUrl = item.youtube_url || item.youtube_link || null

    if (!songId) {
      const { data: createdSong, error: songError } = await supabase
        .from('songs')
        .insert({
          title,
          artist: item.artist || null,
          youtube_url: youtubeUrl,
          created_by: user.id,
        })
        .select('id')
        .single()

      if (songError) throw songError
      songId = createdSong.id
    }

    const { error: variationError } = await supabase.from('song_variations').insert({
      song_id: songId,
      artist: item.artist || null,
      moment: normalizeSetlistMoment(item.suggested_category),
      youtube_url: youtubeUrl,
      created_by: user.id,
    })

    if (variationError) throw variationError

    await supabase.from('worship_song_suggestions' as never).update({ status: 'Repertório oficial' } as never).eq('id', id)

    revalidatePath('/musicas')
    revalidatePath('/louvor-admin')
    return { success: true, message: 'Música adicionada ao repertório geral.' }
  } catch (error) {
    console.error('adicionarIndicacaoAoRepertorio', error)
    return { success: false, message: 'Não foi possível adicionar a música ao repertório geral.' }
  }
}

function nextSundayISO() {
  const date = new Date()
  const day = date.getDay()
  const daysUntilSunday = day === 0 ? 7 : 7 - day
  date.setDate(date.getDate() + daysUntilSunday)
  return date.toISOString().slice(0, 10)
}

export async function adicionarSugestaoRepertorioNaProximaEscala(id: string, selectedEventId?: string | null, setlistOverride?: Array<{ title?: string; artist?: string | null; moment?: string | null; youtube_url?: string | null }>): Promise<AdminResponse> {
  try {
    const { supabase, user } = await requireWorshipAdmin()
    const { data: repertoire, error: repertoireError } = await supabase
      .from('repertoire_suggestions' as never)
      .select('*')
      .eq('id', id)
      .single()

    if (repertoireError) throw repertoireError

    const item = repertoire as unknown as {
      title: string
      suggested_setlist: Array<{ title?: string; artist?: string | null; moment?: string | null; youtube_url?: string | null }>
    }
    const sourceSetlist = setlistOverride?.length ? setlistOverride : item.suggested_setlist
    const songs = (sourceSetlist ?? []).filter((song) => song.title?.trim())
    if (songs.length === 0) return { success: false, message: 'A sugestão não possui músicas para enviar à escala.' }

    const today = new Date().toISOString().slice(0, 10)
    const eventQuery = supabase
      .from('events')
      .select('id, title, date')

    const { data: targetEvent, error: eventLookupError } = selectedEventId
      ? await eventQuery.eq('id', selectedEventId).single()
      : await eventQuery
          .eq('type', 'culto')
          .gte('date', today)
          .order('date', { ascending: true })
          .limit(1)
          .maybeSingle()

    if (eventLookupError) throw eventLookupError

    let eventId = targetEvent?.id
    let eventTitle = targetEvent?.title ?? 'Culto sugerido pelo repertório'
    let eventDate = targetEvent?.date ?? nextSundayISO()

    if (!eventId) {
      const { data: createdEvent, error: createEventError } = await supabase
        .from('events')
        .insert({
          title: eventTitle,
          type: 'culto',
          date: eventDate,
          notes: `Criado a partir da sugestão de repertório: ${item.title}`,
          created_by: user.id,
        })
        .select('id, title, date')
        .single()

      if (createEventError) throw createEventError
      eventId = createdEvent.id
      eventTitle = createdEvent.title
      eventDate = createdEvent.date
    }

    const { error: setlistError } = await supabase.from('setlist_songs').insert(
      songs.map((song, index) => ({
        event_id: eventId,
        order_index: index,
        song_title: song.title!.trim(),
        artist: song.artist ?? null,
        moment: normalizeSetlistMoment(song.moment),
        reference_link: song.youtube_url ?? null,
      }))
    )

    if (setlistError) throw setlistError

    await supabase.from('repertoire_suggestions' as never).update({ status: 'scheduled' } as never).eq('id', id)

    revalidatePath('/agenda')
    revalidatePath('/louvor-admin')
    return { success: true, message: `Repertório adicionado à escala ${eventTitle} (${eventDate}).` }
  } catch (error) {
    console.error('adicionarSugestaoRepertorioNaProximaEscala', error)
    return { success: false, message: 'Não foi possível adicionar o repertório à próxima escala.' }
  }
}
