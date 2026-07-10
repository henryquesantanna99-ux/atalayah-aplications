'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { canEdit } from '@/lib/permissions'
import { generateText } from 'ai'
import { openai } from '@/lib/openai'
import { findBestLyrics } from '@/lib/music/lrclib'
import { searchSoundchartsSong } from '@/lib/music/soundcharts'
import { classifySuggestionExpression, summarizeCollectivePatterns } from '@/lib/spiritual-intelligence/daily-analysis'

type AdminResponse<T = unknown> = { success: boolean; message: string; data?: T }
type SpiritualSummaryRow = { id: string; run_id: string; analysis_date: string; quantification: Record<string, unknown>; segmentation: unknown[]; associations: unknown[]; evolution: Record<string, unknown>; discernment: string[]; recommendations: string[]; charts_payload: Record<string, unknown>; created_at: string }

type WorshipSuggestionRow = {
  id: string
  created_at: string
  name: string
  tribe: string
  phone: string | null
  song_title: string
  artist: string | null
  youtube_link: string | null
  suggested_category: string | null
  worship_type: string | null
  reason: string | null
  spiritual_area: string | null
  spiritual_area_other: string | null
  spiritual_experience_note: string | null
  next_step: string | null
  next_step_other: string | null
  status: string
  lyrics_plain?: string | null
  metadata_payload?: Record<string, unknown> | null
}

type WorshipSuggestionRow = {
  id: string
  created_at: string
  name: string
  tribe: string
  phone: string | null
  song_title: string
  artist: string | null
  youtube_link: string | null
  suggested_category: string | null
  worship_type: string | null
  reason: string | null
  spiritual_area: string | null
  spiritual_area_other: string | null
  spiritual_experience_note: string | null
  next_step: string | null
  next_step_other: string | null
  status: string
  lyrics_plain?: string | null
  metadata_payload?: Record<string, unknown> | null
}

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

  return { supabase, user }
}

export async function listarAdministracaoLouvor() {
  const { supabase } = await requireWorshipAdmin()

  const [suggestions, votingSongs, catalog, repertoireSuggestions, upcomingEvents, spiritualSummaries] = await Promise.all([
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
  ])

  return {
    suggestions: suggestions.data ?? [],
    votingSongs: votingSongs.data ?? [],
    repertoireSuggestions: repertoireSuggestions.data ?? [],
    upcomingEvents: upcomingEvents.data ?? [],
    spiritualSummaries: (spiritualSummaries.data ?? []) as unknown as SpiritualSummaryRow[],
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


function normalizeSetlistMoment(value?: string | null) {
  return ['Prévia', 'Adoração', 'Palavra', 'Celebração'].includes(value ?? '')
    ? (value as 'Prévia' | 'Adoração' | 'Palavra' | 'Celebração')
    : null
}

async function getLatestMinistryProfile(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase
    .from('ministry_profiles' as never)
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data as { id?: string; theological_vision?: string | null; current_emphasis?: string | null; current_season?: string | null; musical_culture?: Record<string, unknown> | null; pastoral_notes?: string | null } | null
}

function buildFallbackThematicAnalysis(suggestion: WorshipSuggestionRow, ministryProfile: Awaited<ReturnType<typeof getLatestMinistryProfile>>) {
  const themes = [suggestion.spiritual_area, suggestion.suggested_category, ministryProfile?.current_emphasis]
    .filter(Boolean)
    .map((item) => String(item))
  const nextStep = suggestion.next_step_other || suggestion.next_step || 'Discernir com a liderança'

  return {
    classification: {
      temas: themes,
      emocoes: suggestion.spiritual_experience_note ? ['sensibilidade espiritual'] : ['não informado'],
      necessidades: [nextStep],
      proximo_passo: nextStep,
      estagio_espiritual: ministryProfile?.current_season || 'A discernir',
      intencao: suggestion.reason || 'Indicação congregacional para avaliação ministerial',
    },
    quantification: {
      peso_pastoral: suggestion.spiritual_area ? 0.7 : 0.4,
      peso_congregacional: suggestion.reason ? 0.7 : 0.5,
      observacao: 'Pontuação inicial heurística até a análise por IA estar configurada.',
    },
    segmentation: {
      tribo: suggestion.tribe,
      indicador: suggestion.name,
    },
    relationships: {
      temas_relacionados: themes,
      perfis: [suggestion.tribe].filter(Boolean),
    },
    evolution: {
      recorte: 'Análise pontual da indicação atual; evolução depende de histórico acumulado.',
    },
    interpretation: `A indicação aponta para ${themes.join(', ') || 'um tema ainda a discernir'} e deve ser lida à luz da ênfase atual do ministério.`,
    planning: {
      repertorio: 'Avaliar se a música reforça a estação pastoral atual.',
      ensino: 'Conectar o tema com Palavra, discipulado e oração.',
      acoes_pastorais: ['Validar coerência teológica', 'Verificar cantabilidade congregacional'],
    },
  }
}

function buildFallbackMusicalAnalysis(suggestion: WorshipSuggestionRow) {
  const hasReference = Boolean(suggestion.youtube_link || suggestion.artist)
  return {
    difficulty_score: hasReference ? 3 : 2,
    difficulty_label: hasReference ? 'médio' : 'baixo a validar',
    vocal_analysis: { observacao: 'Validar tonalidade, extensão vocal e condução congregacional no ensaio.' },
    band_analysis: { observacao: 'Validar complexidade rítmica, harmônica e dinâmica com a equipe.' },
    congregational_analysis: { singability: suggestion.worship_type === 'Profético' ? 'avaliar repetição e clareza' : 'potencialmente congregacional' },
    risks: ['Tonalidade ainda não validada', 'Arranjo deve ser adaptado ao nível técnico da equipe'],
    recommendations: ['Testar em ensaio', 'Definir tom congregacional', 'Simplificar arranjo se necessário'],
  }
}

async function buildAiThematicAnalysis(suggestion: WorshipSuggestionRow, ministryProfile: Awaited<ReturnType<typeof getLatestMinistryProfile>>) {
  if (!process.env.OPENAI_API_KEY) return buildFallbackThematicAnalysis(suggestion, ministryProfile)

  const prompt = `Responda apenas em JSON válido. Analise a indicação de louvor seguindo as etapas: classificação, quantificação, segmentação, relacionamento, evolução, interpretação e planejamento.
Contexto ministerial: ${JSON.stringify(ministryProfile ?? {})}
Indicação: ${JSON.stringify(suggestion)}
Use chaves: classification, quantification, segmentation, relationships, evolution, interpretation, planning.`

  try {
    const result = await generateText({
      model: openai(process.env.OPENAI_ANALYSIS_MODEL || 'gpt-4o-mini'),
      prompt,
    })
    return JSON.parse(result.text)
  } catch (error) {
    console.error('buildAiThematicAnalysis fallback', error)
    return buildFallbackThematicAnalysis(suggestion, ministryProfile)
  }
}

export async function gerarAnaliseIndicacao(id: string): Promise<AdminResponse> {
  try {
    const { supabase } = await requireWorshipAdmin()
    const { data: suggestion, error: suggestionError } = await supabase
      .from('worship_song_suggestions' as never)
      .select('*')
      .eq('id', id)
      .single()

    if (suggestionError) throw suggestionError

    const ministryProfile = await getLatestMinistryProfile(supabase)
    const thematic = await buildAiThematicAnalysis(suggestion as unknown as WorshipSuggestionRow, ministryProfile)
    const musical = buildFallbackMusicalAnalysis(suggestion as unknown as WorshipSuggestionRow)

    const [{ error: thematicError }, { error: musicalError }] = await Promise.all([
      supabase.from('song_thematic_analyses' as never).insert({
        suggestion_id: id,
        ministry_profile_id: ministryProfile?.id || null,
        classification: thematic.classification ?? {},
        quantification: thematic.quantification ?? {},
        segmentation: thematic.segmentation ?? {},
        relationships: thematic.relationships ?? {},
        evolution: thematic.evolution ?? {},
        interpretation: thematic.interpretation ?? null,
        planning: thematic.planning ?? {},
        model_used: process.env.OPENAI_API_KEY ? process.env.OPENAI_ANALYSIS_MODEL || 'gpt-4o-mini' : 'fallback-heuristic',
      } as never),
      supabase.from('song_musical_analyses' as never).insert({
        suggestion_id: id,
        ministry_profile_id: ministryProfile?.id || null,
        difficulty_score: musical.difficulty_score,
        difficulty_label: musical.difficulty_label,
        vocal_analysis: musical.vocal_analysis,
        band_analysis: musical.band_analysis,
        congregational_analysis: musical.congregational_analysis,
        risks: musical.risks,
        recommendations: musical.recommendations,
        model_used: 'fallback-heuristic',
      } as never),
    ])

    if (thematicError) throw thematicError
    if (musicalError) throw musicalError

    await supabase.from('worship_song_suggestions' as never).update({ status: 'Analisada' } as never).eq('id', id)

    revalidatePath('/louvor-admin')
    return { success: true, message: 'Análise temática e musical gerada.' }
  } catch (error) {
    console.error('gerarAnaliseIndicacao', error)
    return { success: false, message: 'Não foi possível gerar a análise da indicação.' }
  }
}


async function enrichSuggestionIfNeeded(supabase: Awaited<ReturnType<typeof createClient>>, suggestion: WorshipSuggestionRow) {
  if (suggestion.lyrics_plain && suggestion.metadata_payload) return suggestion

  const [lyrics, soundcharts] = await Promise.all([
    suggestion.lyrics_plain ? Promise.resolve(null) : findBestLyrics({ trackName: suggestion.song_title, artistName: suggestion.artist }).catch((error) => {
      console.warn('LRCLIB daily analysis enrichment failed', error)
      return null
    }),
    suggestion.metadata_payload ? Promise.resolve(null) : searchSoundchartsSong({ title: suggestion.song_title, artist: suggestion.artist }).catch((error) => {
      console.warn('Soundcharts daily analysis enrichment failed', error)
      return null
    }),
  ])

  const patch: Record<string, unknown> = {}
  if (lyrics) {
    patch.lyrics_plain = lyrics.plainLyrics ?? null
    patch.lyrics_synced = lyrics.syncedLyrics ?? null
    patch.lyrics_source = 'lrclib'
    patch.lyrics_confidence = 0.75
    patch.lyrics_fetched_at = new Date().toISOString()
  }
  if (soundcharts) {
    patch.metadata_source = 'soundcharts'
    patch.metadata_payload = { soundcharts, enriched_at: new Date().toISOString() }
    patch.metadata_fetched_at = new Date().toISOString()
  }

  if (Object.keys(patch).length > 0) {
    await supabase.from('worship_song_suggestions' as never).update(patch as never).eq('id', suggestion.id)
  }

  return { ...suggestion, ...patch } as WorshipSuggestionRow
}


async function buildAiCollectiveClassifications(suggestions: WorshipSuggestionRow[]) {
  const fallback = suggestions.map(classifySuggestionExpression)
  if (!process.env.OPENAI_API_KEY) return fallback

  const compactInput = suggestions.map((suggestion) => ({
    id: suggestion.id,
    musica: suggestion.song_title,
    artista: suggestion.artist,
    letra: suggestion.lyrics_plain?.slice(0, 2500) ?? null,
    motivo: suggestion.reason,
    area_trabalhada: suggestion.spiritual_area,
    experiencia: suggestion.spiritual_experience_note,
    proximo_passo: suggestion.next_step_other || suggestion.next_step,
    segmentos: {
      tribo: suggestion.tribe,
      faixaEtaria: (suggestion as WorshipSuggestionRow & { age_range?: string | null }).age_range,
      ministerio: (suggestion as WorshipSuggestionRow & { ministry?: string | null }).ministry,
    },
  }))

  const prompt = `Responda apenas em JSON válido no formato {"classifications":[]}. Classifique cada indicação como expressão espiritual coletiva, sem diagnosticar pessoas e sem inferir necessidades apenas pela letra. Para cada item, retorne: suggestionId, songTitle, themes, needs, emotions, nextSteps, convictions, evidence, segments. Use somente padrões descritivos e linguagem de apoio ao discernimento pastoral. Dados: ${JSON.stringify(compactInput)}`

  try {
    const result = await generateText({
      model: openai(process.env.OPENAI_ANALYSIS_MODEL || 'gpt-4o-mini'),
      prompt,
    })
    const parsed = JSON.parse(result.text) as { classifications?: Array<Record<string, unknown>> }
    if (!Array.isArray(parsed.classifications) || parsed.classifications.length === 0) return fallback
    return fallback.map((item) => {
      const aiItem = parsed.classifications?.find((classification) => classification.suggestionId === item.suggestionId)
      if (!aiItem) return item
      return {
        ...item,
        themes: Array.isArray(aiItem.themes) ? aiItem.themes.map(String).slice(0, 6) : item.themes,
        needs: Array.isArray(aiItem.needs) ? aiItem.needs.map(String).slice(0, 6) : item.needs,
        emotions: Array.isArray(aiItem.emotions) ? aiItem.emotions.map(String).slice(0, 6) : item.emotions,
        nextSteps: Array.isArray(aiItem.nextSteps) ? aiItem.nextSteps.map(String).slice(0, 6) : item.nextSteps,
        convictions: Array.isArray(aiItem.convictions) ? aiItem.convictions.map(String).slice(0, 6) : item.convictions,
        evidence: Array.isArray(aiItem.evidence) ? aiItem.evidence.map(String).slice(0, 6) : item.evidence,
      }
    })
  } catch (error) {
    console.error('buildAiCollectiveClassifications fallback', error)
    return fallback
  }
}

export async function gerarAnaliseEspiritualDoDia(dateKey: string): Promise<AdminResponse> {
  try {
    const { supabase, user } = await requireWorshipAdmin()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return { success: false, message: 'Selecione uma data válida para análise.' }

    const start = `${dateKey}T00:00:00.000Z`
    const endDate = new Date(`${dateKey}T00:00:00.000Z`)
    endDate.setUTCDate(endDate.getUTCDate() + 1)

    const { data, error } = await supabase
      .from('worship_song_suggestions' as never)
      .select('*')
      .gte('created_at', start)
      .lt('created_at', endDate.toISOString())
      .order('created_at', { ascending: true })

    if (error) throw error
    const suggestions = (data ?? []) as unknown as WorshipSuggestionRow[]
    if (suggestions.length === 0) return { success: false, message: 'Nenhuma indicação encontrada para este dia.' }

    const ministryProfile = await getLatestMinistryProfile(supabase)
    const enriched = await Promise.all(suggestions.map((suggestion) => enrichSuggestionIfNeeded(supabase, suggestion)))
    const classifications = await buildAiCollectiveClassifications(enriched)

    const { count: previousCount } = await supabase
      .from('spiritual_intelligence_daily_summaries' as never)
      .select('id', { count: 'exact', head: true })
      .lt('analysis_date', dateKey)

    const summary = summarizeCollectivePatterns(classifications, previousCount ?? 0)
    const modelUsed = process.env.OPENAI_API_KEY ? process.env.OPENAI_ANALYSIS_MODEL || 'gpt-4o-mini' : 'collective-heuristic'

    const { data: run, error: runError } = await supabase
      .from('spiritual_intelligence_runs' as never)
      .insert({
        analysis_date: dateKey,
        status: 'completed',
        suggestions_count: suggestions.length,
        ministry_profile_id: ministryProfile?.id || null,
        model_used: modelUsed,
        created_by: user.id,
        completed_at: new Date().toISOString(),
      } as never)
      .select('id')
      .single()

    if (runError) throw runError
    const runId = (run as unknown as { id: string }).id

    const { error: classificationError } = await supabase
      .from('spiritual_intelligence_classifications' as never)
      .insert(classifications.map((item) => ({
        run_id: runId,
        suggestion_id: item.suggestionId,
        classification: item,
        evidence: item.evidence,
        model_used: modelUsed,
      })) as never)

    if (classificationError) throw classificationError

    const chartsPayload = {
      themes: summary.quantification.themes,
      needs: summary.quantification.needs,
      emotions: summary.quantification.emotions,
      nextSteps: summary.quantification.nextSteps,
      segments: summary.segmentation,
      associations: summary.associations,
    }

    const { error: summaryError } = await supabase
      .from('spiritual_intelligence_daily_summaries' as never)
      .insert({
        run_id: runId,
        analysis_date: dateKey,
        quantification: summary.quantification,
        segmentation: summary.segmentation,
        associations: summary.associations,
        evolution: summary.evolution,
        discernment: summary.discernment,
        recommendations: summary.recommendations,
        charts_payload: chartsPayload,
      } as never)

    if (summaryError) throw summaryError

    await supabase
      .from('worship_song_suggestions' as never)
      .update({ status: 'Analisada coletivamente' } as never)
      .gte('created_at', start)
      .lt('created_at', endDate.toISOString())

    revalidatePath('/louvor-admin')
    return { success: true, message: `Análise coletiva de ${suggestions.length} indicação${suggestions.length === 1 ? '' : 'ões'} gerada para ${dateKey}.` }
  } catch (error) {
    console.error('gerarAnaliseEspiritualDoDia', error)
    return { success: false, message: 'Não foi possível gerar a análise coletiva do dia.' }
  }
}

export async function criarSugestaoRepertorio(): Promise<AdminResponse> {
  try {
    const { supabase } = await requireWorshipAdmin()
    const ministryProfile = await getLatestMinistryProfile(supabase)
    const { data: suggestions, error } = await supabase
      .from('worship_song_suggestions' as never)
      .select('*')
      .in('status', ['Analisada coletivamente', 'Analisada', 'Aprovada', 'Em teste', 'Repertório oficial'])
      .order('created_at', { ascending: false })
      .limit(8)

    if (error) throw error

    const selected = ((suggestions ?? []) as unknown as WorshipSuggestionRow[]).slice(0, 5)
    if (selected.length === 0) return { success: false, message: 'Nenhuma indicação analisada disponível para sugerir repertório.' }

    const suggestedSetlist = selected.map((suggestion, index) => ({
      position: index + 1,
      moment: normalizeSetlistMoment(suggestion.suggested_category) || (index === 0 ? 'Prévia' : index === selected.length - 1 ? 'Adoração' : 'Celebração'),
      suggestion_id: suggestion.id,
      title: suggestion.song_title,
      artist: suggestion.artist,
      youtube_url: suggestion.youtube_link,
      reason: `Conecta ${suggestion.spiritual_area || 'a percepção congregacional'} com ${suggestion.next_step || 'o próximo passo pastoral'}.`,
    }))

    const { error: insertError } = await supabase.from('repertoire_suggestions' as never).insert({
      ministry_profile_id: ministryProfile?.id || null,
      title: `Sugestão de repertório — ${new Date().toLocaleDateString('pt-BR')}`,
      pastoral_direction: ministryProfile?.current_emphasis || 'Discernir direção pastoral a partir das indicações analisadas.',
      suggested_setlist: suggestedSetlist,
      status: 'draft',
    } as never)

    if (insertError) throw insertError

    revalidatePath('/louvor-admin')
    return { success: true, message: 'Sugestão de repertório criada.' }
  } catch (error) {
    console.error('criarSugestaoRepertorio', error)
    return { success: false, message: 'Não foi possível criar sugestão de repertório.' }
  }
}


export async function enriquecerIndicacao(id: string): Promise<AdminResponse> {
  try {
    const { supabase } = await requireWorshipAdmin()
    const { data: suggestion, error: suggestionError } = await supabase
      .from('worship_song_suggestions' as never)
      .select('*')
      .eq('id', id)
      .single()

    if (suggestionError) throw suggestionError
    const item = suggestion as unknown as WorshipSuggestionRow & { youtube_url?: string | null; youtube_video_id?: string | null; youtube_title?: string | null; youtube_channel?: string | null; youtube_thumbnail?: string | null; youtube_duration?: string | null }

    const [lyrics, soundcharts] = await Promise.all([
      findBestLyrics({ trackName: item.song_title, artistName: item.artist }).catch((error) => {
        console.warn('LRCLIB enrichment failed', error)
        return null
      }),
      searchSoundchartsSong({ title: item.song_title, artist: item.artist }).catch((error) => {
        console.warn('Soundcharts enrichment failed', error)
        return null
      }),
    ])

    const metadataPayload = {
      youtube: {
        video_id: item.youtube_video_id ?? null,
        title: item.youtube_title ?? null,
        channel: item.youtube_channel ?? item.artist ?? null,
        thumbnail: item.youtube_thumbnail ?? null,
        duration: item.youtube_duration ?? null,
        url: item.youtube_url ?? item.youtube_link ?? null,
      },
      soundcharts,
      enriched_at: new Date().toISOString(),
    }

    const { error: updateError } = await supabase
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
      .eq('id', id)

    if (updateError) throw updateError

    revalidatePath('/louvor-admin')
    return { success: true, message: lyrics ? 'Indicação enriquecida com letra e metadados.' : 'Indicação enriquecida com metadados disponíveis.' }
  } catch (error) {
    console.error('enriquecerIndicacao', error)
    return { success: false, message: 'Não foi possível enriquecer a indicação.' }
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
