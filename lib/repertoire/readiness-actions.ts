'use server'

import { canEdit } from '@/lib/permissions'
import { calculateReadiness, type PreparationStage, type ReadinessInputs } from '@/lib/repertoire/readiness'
import { createClient } from '@/lib/supabase/server'

async function requireAuthorizedEditor() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (!canEdit(profile?.role)) throw new Error('Forbidden')
  return supabase
}

/**
 * The sole persistence entry point. Every input change is immediately followed by
 * a complete calculation and one atomic upsert, preserving the audit snapshot.
 */
export async function saveRepertoireReadiness(input: {
  setlistSongId: string
  values: ReadinessInputs
}) {
  const supabase = await requireAuthorizedEditor()
  const { data: stored, error: readError } = await supabase
    .from('repertoire_readiness' as never)
    .select('current_stage, stage_manually_moved')
    .eq('setlist_song_id', input.setlistSongId)
    .maybeSingle()
  if (readError) throw new Error(readError.message)
  const prior = stored as unknown as { current_stage: PreparationStage; stage_manually_moved: boolean } | null
  const result = calculateReadiness(input.values, {
    current: prior?.current_stage ?? null,
    manuallyMoved: prior?.stage_manually_moved ?? false,
  })
  const { error } = await supabase.from('repertoire_readiness' as never).upsert({
    setlist_song_id: input.setlistSongId,
    inputs: result.inputs,
    ici: result.ici,
    ico: result.ico,
    ip: result.ip,
    preparation_level: result.level,
    suggested_stage: result.suggestedStage,
    current_stage: result.stage,
    stage_manually_moved: prior?.stage_manually_moved ?? false,
    calculated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as never, { onConflict: 'setlist_song_id' })
  if (error) throw new Error(error.message)
  return result
}

/** Records an explicit workflow move; later readiness recalculations will not undo it. */
export async function moveRepertoireStage(setlistSongId: string, stage: PreparationStage) {
  const supabase = await requireAuthorizedEditor()
  const { error } = await supabase.from('repertoire_readiness' as never).update({
    current_stage: stage,
    stage_manually_moved: true,
    updated_at: new Date().toISOString(),
  } as never).eq('setlist_song_id', setlistSongId)
  if (error) throw new Error(error.message)
}
