'use server'

import { revalidatePath } from 'next/cache'
import { calculateICI, calculateICO, isValidMusicalScores, type MusicalScores } from '@/lib/worship-musical-analysis'
import { getLatestMinistryProfile, requireWorshipAdmin, type AdminResponse } from './shared'

function levelToThree(value: number | null | undefined) {
  return Math.max(1, Math.min(3, Math.round(1 + ((value ?? 3) - 1) / 2)))
}

async function applicableTeamProfile(supabase: Awaited<ReturnType<typeof requireWorshipAdmin>>['supabase'], ministryProfileId?: string) {
  if (!ministryProfileId) return {}
  const { data, error } = await supabase.from('ministry_member_skill_profiles' as never)
    .select('technical_level, harmonic_level, rhythmic_level')
    .eq('ministry_profile_id', ministryProfileId)
  if (error) throw error
  const rows = (data ?? []) as unknown as Array<{ technical_level: number | null; harmonic_level: number | null; rhythmic_level: number | null }>
  const average = (key: keyof (typeof rows)[number]) => rows.length ? rows.reduce((sum, row) => sum + (row[key] ?? 3), 0) / rows.length : 3
  const technical = levelToThree(average('technical_level'))
  return {
    melodic: technical,
    harmonic: levelToThree(average('harmonic_level')),
    rhythmic: levelToThree(average('rhythmic_level')),
    technical,
    structural: technical,
    interpretative: technical,
    collective: technical,
  }
}

async function recalculateAffectedRepertoires(supabase: Awaited<ReturnType<typeof requireWorshipAdmin>>['supabase'], songId: string, analysisId: string, ici: number, ico: number) {
  const { data, error } = await supabase.from('setlist_songs').select('event_id').eq('song_id', songId)
  if (error) throw error
  const rows = Array.from(new Set((data ?? []).map((row) => row.event_id).filter(Boolean))).map((eventId) => ({
    event_id: eventId,
    song_id: songId,
    musical_analysis_id: analysisId,
    ici_score: ici,
    ico_score: ico,
    calculated_at: new Date().toISOString(),
  }))
  if (rows.length) {
    const { error: readinessError } = await supabase.from('repertoire_readiness_analyses' as never).upsert(rows as never, { onConflict: 'event_id,song_id' })
    if (readinessError) throw readinessError
  }
}

export async function salvarAnaliseTecnica(input: { songId: string; scores: MusicalScores }): Promise<AdminResponse<{ ici: number; ico: number }>> {
  try {
    const { supabase, user } = await requireWorshipAdmin()
    if (!input.songId || !isValidMusicalScores(input.scores)) return { success: false, message: 'Selecione uma música e informe notas inteiras de 1 a 3.' }
    const [{ data: song }, ministryProfile] = await Promise.all([
      supabase.from('songs').select('id').eq('id', input.songId).maybeSingle(),
      getLatestMinistryProfile(supabase),
    ])
    if (!song) return { success: false, message: 'A música selecionada não existe no catálogo canônico.' }
    const teamSnapshot = await applicableTeamProfile(supabase, ministryProfile?.id)
    const ici = calculateICI(input.scores)
    const ico = calculateICO(input.scores, teamSnapshot)
    const { data: previous, error: previousError } = await supabase.from('song_musical_analyses' as never)
      .select('id, version').eq('song_id', input.songId).order('version', { ascending: false }).limit(1).maybeSingle()
    if (previousError) throw previousError
    const previousRow = previous as unknown as { id: string; version: number } | null
    const { data: created, error } = await supabase.from('song_musical_analyses' as never).insert({
      song_id: input.songId,
      ministry_profile_id: ministryProfile?.id ?? null,
      version: (previousRow?.version ?? 0) + 1,
      status: 'draft', scores: input.scores, ici_score: ici, ico_score: ico,
      team_profile_snapshot: teamSnapshot, supersedes_id: previousRow?.id ?? null, created_by: user.id,
    } as never).select('id').single()
    if (error) throw error
    await recalculateAffectedRepertoires(supabase, input.songId, (created as { id: string }).id, ici, ico)
    revalidatePath('/louvor-admin')
    return { success: true, message: `Análise v${(previousRow?.version ?? 0) + 1} salva e prontidão recalculada.`, data: { ici, ico } }
  } catch (error) {
    console.error('salvarAnaliseTecnica', error)
    return { success: false, message: 'Não foi possível salvar a análise técnica.' }
  }
}

export async function revisarAnaliseTecnica(analysisId: string): Promise<AdminResponse> {
  try {
    const { supabase, user } = await requireWorshipAdmin()
    if (!analysisId) return { success: false, message: 'Selecione uma versão para revisar.' }
    const { data, error } = await supabase.from('song_musical_analyses' as never).update({ status: 'reviewed', reviewed_by: user.id, reviewed_at: new Date().toISOString() } as never)
      .eq('id', analysisId).eq('status', 'draft').select('id').maybeSingle()
    if (error) throw error
    if (!data) return { success: false, message: 'A análise não existe ou já foi revisada.' }
    revalidatePath('/louvor-admin')
    return { success: true, message: 'Versão revisada e preservada no histórico.' }
  } catch (error) {
    console.error('revisarAnaliseTecnica', error)
    return { success: false, message: 'Não foi possível revisar a análise.' }
  }
}
