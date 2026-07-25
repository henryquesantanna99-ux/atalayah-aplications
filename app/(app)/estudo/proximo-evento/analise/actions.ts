'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { PREPARATION_STAGES, type PreparationStage } from '@/lib/repertoire-analysis'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado.')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Somente administradores podem alterar a análise.')
  return { supabase, user }
}

export async function updateManualAnalysis(input: {
  setlistSongId: string
  mastery: number
  complexity: number
  changes: number
  strategicWeight: number
}) {
  const { supabase, user } = await requireAdmin()
  const values = [input.mastery, input.complexity, input.changes, input.strategicWeight]
  if (values.some((value) => !Number.isFinite(value) || value < 0 || value > 10)) {
    throw new Error('Os valores devem estar entre 0 e 10.')
  }
  const { error } = await supabase.from('repertoire_item_analyses' as never).upsert({
    setlist_song_id: input.setlistSongId,
    mastery: input.mastery,
    complexity: input.complexity,
    changes: input.changes,
    strategic_weight: input.strategicWeight,
    updated_by: user.id,
  } as never, { onConflict: 'setlist_song_id' })
  if (error) throw new Error(error.message)
  revalidatePath('/estudo/proximo-evento/analise')
  return { success: true }
}

export async function updatePreparationStage(setlistSongId: string, stage: PreparationStage) {
  if (!PREPARATION_STAGES.includes(stage)) throw new Error('Estágio inválido.')
  const { supabase, user } = await requireAdmin()
  const { error } = await supabase.from('repertoire_item_analyses' as never).upsert({
    setlist_song_id: setlistSongId,
    preparation_stage: stage,
    updated_by: user.id,
  } as never, { onConflict: 'setlist_song_id' })
  if (error) throw new Error(error.message)
  revalidatePath('/estudo/proximo-evento/analise')
  return { success: true }
}
