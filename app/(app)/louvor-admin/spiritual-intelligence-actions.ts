'use server'

import { generateText } from 'ai'
import { revalidatePath } from 'next/cache'
import { findBestLyrics } from '@/lib/music/lrclib'
import { openai } from '@/lib/openai'
import { searchSoundchartsSong } from '@/lib/music/soundcharts'
import { classifySuggestionExpression, summarizeCollectivePatterns, type SpiritualSummary } from '@/lib/spiritual-intelligence/daily-analysis'
import { getLatestMinistryProfile, requireWorshipAdmin, type AdminResponse, type WorshipSuggestionRow } from './shared'

async function enrichSuggestionIfNeeded(supabase: Awaited<ReturnType<typeof requireWorshipAdmin>>['supabase'], suggestion: WorshipSuggestionRow) {
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
    const { error } = await supabase.from('worship_song_suggestions' as never).update(patch as never).eq('id', suggestion.id)
    if (error) throw error
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
      faixaEtaria: suggestion.age_range,
      ministerio: suggestion.ministry,
      regiao: suggestion.region,
      tempoConversao: suggestion.conversion_time,
      tempoParticipacao: suggestion.participation_time,
    },
  }))

  const prompt = `Responda apenas em JSON válido no formato {"classifications":[]}. Classifique cada indicação como expressão espiritual coletiva, sem diagnosticar pessoas e sem inferir necessidades apenas pela letra. Para cada item, retorne: suggestionId, songTitle, themes, needs, emotions, nextSteps, convictions, evidence, segments. Use somente padrões descritivos e linguagem de apoio ao discernimento pastoral. Dados: ${JSON.stringify(compactInput)}`

  try {
    const result = await generateText({ model: openai(process.env.OPENAI_ANALYSIS_MODEL || 'gpt-4o-mini'), prompt })
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
    const endDate = new Date(start)
    endDate.setUTCDate(endDate.getUTCDate() + 1)

    const { data, error } = await supabase.from('worship_song_suggestions' as never).select('*').gte('created_at', start).lt('created_at', endDate.toISOString()).order('created_at', { ascending: true })
    if (error) throw error

    const suggestions = (data ?? []) as unknown as WorshipSuggestionRow[]
    if (suggestions.length === 0) return { success: false, message: 'Nenhuma indicação encontrada para este dia.' }

    const ministryProfile = await getLatestMinistryProfile(supabase)
    const enriched = await Promise.all(suggestions.map((suggestion) => enrichSuggestionIfNeeded(supabase, suggestion)))
    const classifications = await buildAiCollectiveClassifications(enriched)
    const { data: previousSummaries, error: previousSummariesError } = await supabase.from('spiritual_intelligence_daily_summaries' as never).select('quantification').lt('analysis_date', dateKey).order('analysis_date', { ascending: false }).limit(8)
    if (previousSummariesError) throw previousSummariesError

    const previousQuantifications = ((previousSummaries ?? []) as unknown as Array<{ quantification: SpiritualSummary['quantification'] }>).map((item) => item.quantification)
    const summary = summarizeCollectivePatterns(classifications, previousQuantifications)
    const modelUsed = process.env.OPENAI_API_KEY ? process.env.OPENAI_ANALYSIS_MODEL || 'gpt-4o-mini' : 'collective-heuristic'
    const { data: run, error: runError } = await supabase.from('spiritual_intelligence_runs' as never).insert({ analysis_date: dateKey, status: 'completed', suggestions_count: suggestions.length, ministry_profile_id: ministryProfile?.id || null, model_used: modelUsed, created_by: user.id, completed_at: new Date().toISOString() } as never).select('id').single()
    if (runError) throw runError

    const runId = (run as unknown as { id: string }).id
    const { error: classificationError } = await supabase.from('spiritual_intelligence_classifications' as never).insert(classifications.map((item) => ({ run_id: runId, suggestion_id: item.suggestionId, classification: item, evidence: item.evidence, model_used: modelUsed })) as never)
    if (classificationError) throw classificationError

    const { error: summaryError } = await supabase.from('spiritual_intelligence_daily_summaries' as never).insert({
      run_id: runId,
      analysis_date: dateKey,
      quantification: summary.quantification,
      segmentation: summary.segmentation,
      associations: summary.associations,
      evolution: summary.evolution,
      discernment: summary.discernment,
      recommendations: summary.recommendations,
      charts_payload: { ...summary.quantification, segments: summary.segmentation, associations: summary.associations },
    } as never)
    if (summaryError) throw summaryError

    const { error: statusError } = await supabase.from('worship_song_suggestions' as never).update({ status: 'Analisada coletivamente' } as never).gte('created_at', start).lt('created_at', endDate.toISOString())
    if (statusError) throw statusError

    revalidatePath('/louvor-admin')
    return { success: true, message: `Análise coletiva de ${suggestions.length} indicação${suggestions.length === 1 ? '' : 'ões'} gerada para ${dateKey}.` }
  } catch (error) {
    console.error('gerarAnaliseEspiritualDoDia', error)
    return { success: false, message: 'Não foi possível gerar a análise coletiva do dia.' }
  }
}
