'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { canEdit } from '@/lib/permissions'
import { generateText } from 'ai'
import { openai } from '@/lib/openai'

type AdminResponse<T = unknown> = { success: boolean; message: string; data?: T }

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

  return { supabase }
}

export async function listarAdministracaoLouvor() {
  const { supabase } = await requireWorshipAdmin()

  const [suggestions, votingSongs, catalog, repertoireSuggestions] = await Promise.all([
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
  ])

  return {
    suggestions: suggestions.data ?? [],
    votingSongs: votingSongs.data ?? [],
    repertoireSuggestions: repertoireSuggestions.data ?? [],
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

export async function criarSugestaoRepertorio(): Promise<AdminResponse> {
  try {
    const { supabase } = await requireWorshipAdmin()
    const ministryProfile = await getLatestMinistryProfile(supabase)
    const { data: suggestions, error } = await supabase
      .from('worship_song_suggestions' as never)
      .select('*')
      .in('status', ['Analisada', 'Aprovada', 'Em teste', 'Repertório oficial'])
      .order('created_at', { ascending: false })
      .limit(8)

    if (error) throw error

    const selected = ((suggestions ?? []) as unknown as WorshipSuggestionRow[]).slice(0, 5)
    if (selected.length === 0) return { success: false, message: 'Nenhuma indicação analisada disponível para sugerir repertório.' }

    const suggestedSetlist = selected.map((suggestion, index) => ({
      position: index + 1,
      moment: suggestion.suggested_category || (index === 0 ? 'Prévia' : index === selected.length - 1 ? 'Adoração' : 'Celebração'),
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
