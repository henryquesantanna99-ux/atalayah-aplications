'use server'

import { revalidatePath } from 'next/cache'
import { requireRehearsalManager } from '@/lib/sentinela/authorization'

type RehearsalInput = {
  seasonId: string
  title: string
  scheduledAt: string
  privateNotes?: string | null
}

function validatedInput(input: RehearsalInput) {
  const title = input.title.trim()
  if (!title || !Number.isFinite(Date.parse(input.scheduledAt))) throw new Error('Dados do ensaio inválidos.')
  return { title, scheduled_at: input.scheduledAt, private_notes: input.privateNotes?.trim() || null }
}

export async function createRehearsal(input: RehearsalInput) {
  const { supabase, user, season } = await requireRehearsalManager(input.seasonId)
  const { error } = await supabase.from('sentinela_rehearsals').insert({
    ...validatedInput(input), season_id: season.id, created_by: user.id,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/sentinela')
}

export async function updateRehearsal(rehearsalId: string, input: RehearsalInput) {
  const { supabase, season } = await requireRehearsalManager(input.seasonId)
  const { data, error } = await supabase.from('sentinela_rehearsals')
    .update(validatedInput(input)).eq('id', rehearsalId).eq('season_id', season.id).select('id').maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new Error('Ensaio não encontrado nesta temporada.')
  revalidatePath('/sentinela')
}

export async function deleteRehearsal(rehearsalId: string, seasonId: string) {
  const { supabase, season } = await requireRehearsalManager(seasonId)
  const { data, error } = await supabase.from('sentinela_rehearsals')
    .delete().eq('id', rehearsalId).eq('season_id', season.id).select('id').maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new Error('Ensaio não encontrado nesta temporada.')
  revalidatePath('/sentinela')
}
