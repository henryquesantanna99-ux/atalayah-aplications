'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { Json } from '@/types/database'
import { getSentinelaContext } from './_lib/data'
import { requireRehearsalManager } from '@/lib/sentinela/authorization'

const text = (data: FormData, key: string, required = true) => {
  const value = String(data.get(key) ?? '').trim()
  if (required && !value) throw new Error(`Campo obrigatório: ${key}`)
  return value
}

export type RehearsalInput = {
  seasonId: string
  title: string
  scheduledAt: string
  privateNotes?: string | null
}

function validateRehearsalInput(input: RehearsalInput) {
  const title = input.title.trim()
  if (!title || !Number.isFinite(Date.parse(input.scheduledAt))) {
    throw new Error('Dados do ensaio inválidos.')
  }

  return {
    title,
    starts_at: input.scheduledAt,
    notes: input.privateNotes?.trim() || null,
  }
}

export async function saveJournalEntry(data: FormData) {
  const { supabase, membership, season } = await getSentinelaContext()
  const { error } = await supabase.from('sentinela_journal_entries').insert({ season_id: season.id, membership_id: membership.id, title: text(data, 'title', false) || null, body: text(data, 'body') })
  if (error) throw new Error(error.message)
  revalidatePath('/sentinela/diario')
}

export async function saveAvatar(configuration: Json, isPublic = false) {
  const { supabase, membership, season } = await getSentinelaContext()
  const { error } = await supabase.from('sentinela_avatars').upsert({ season_id: season.id, membership_id: membership.id, configuration, is_public: isPublic }, { onConflict: 'membership_id' })
  if (error) throw new Error(error.message)
  revalidatePath('/sentinela/perfil')
}

export async function saveOnboarding(payload: { answers: Json; avatar: Json; completed: boolean }) {
  const { supabase, membership, season } = await getSentinelaContext()
  const status = payload.completed ? 'completed' : 'in_progress'
  const completed_at = payload.completed ? new Date().toISOString() : null
  const [onboarding, avatar] = await Promise.all([
    supabase.from('sentinela_onboarding').upsert({ season_id: season.id, membership_id: membership.id, answers: payload.answers, status, completed_at }, { onConflict: 'membership_id' }),
    supabase.from('sentinela_avatars').upsert({ season_id: season.id, membership_id: membership.id, configuration: payload.avatar, is_public: false }, { onConflict: 'membership_id' }),
  ])
  if (onboarding.error || avatar.error) throw new Error(onboarding.error?.message ?? avatar.error?.message)
  if (payload.completed) redirect('/sentinela/overview')
  revalidatePath('/sentinela/onboarding')
}

export async function saveLessonProgress(data: FormData) {
  const { supabase, membership, season } = await getSentinelaContext()
  const lessonId = text(data, 'lessonId'); const percent = Math.max(0, Math.min(100, Number(data.get('progress')) || 0))
  const { error } = await supabase.from('sentinela_education_progress').upsert({ season_id: season.id, membership_id: membership.id, lesson_id: lessonId, progress_percent: percent, status: percent === 100 ? 'completed' : percent ? 'in_progress' : 'not_started', started_at: percent ? new Date().toISOString() : null, completed_at: percent === 100 ? new Date().toISOString() : null }, { onConflict: 'membership_id,lesson_id' })
  if (error) throw new Error(error.message)
  revalidatePath('/sentinela/academia')
}

export async function saveLessonNote(data: FormData) {
  const { supabase, membership, season } = await getSentinelaContext()
  const lessonId = text(data, 'lessonId'); const body = text(data, 'body')
  const existing = await supabase.from('sentinela_lesson_notes').select('id').eq('membership_id', membership.id).eq('lesson_id', lessonId).maybeSingle()
  const result = existing.data ? await supabase.from('sentinela_lesson_notes').update({ body }).eq('id', existing.data.id) : await supabase.from('sentinela_lesson_notes').insert({ season_id: season.id, membership_id: membership.id, lesson_id: lessonId, body })
  if (result.error) throw new Error(result.error.message)
  revalidatePath('/sentinela/academia')
}

export async function submitCheckpoint(data: FormData) {
  const { supabase, membership, season } = await getSentinelaContext()
  const checkpointId = text(data, 'checkpointId')
  const { error } = await supabase.from('sentinela_checkpoint_progress').upsert({ season_id: season.id, membership_id: membership.id, checkpoint_id: checkpointId, status: 'submitted', validated_by: null, validated_at: null }, { onConflict: 'membership_id,checkpoint_id' })
  if (error) throw new Error(error.message)
  revalidatePath('/sentinela/jornada')
}

export async function submitEvidence(data: FormData) {
  const { supabase, membership, season } = await getSentinelaContext()
  const file = data.get('file'); const checkpointProgressId = text(data, 'checkpointProgressId')
  if (!(file instanceof File) || !file.size) throw new Error('Selecione uma evidência.')
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
  const storagePath = `${season.id}/${membership.id}/${crypto.randomUUID()}-${safeName}`
  const upload = await supabase.storage.from('sentinela-evidence').upload(storagePath, file, { contentType: file.type, upsert: false })
  if (upload.error) throw new Error(upload.error.message)
  const { error } = await supabase.from('sentinela_evidence').insert({ season_id: season.id, membership_id: membership.id, checkpoint_progress_id: checkpointProgressId, storage_path: storagePath, media_type: file.type || null, description: text(data, 'description', false) || null, status: 'submitted' })
  if (error) { await supabase.storage.from('sentinela-evidence').remove([storagePath]); throw new Error(error.message) }
  revalidatePath('/sentinela/jornada')
}

export async function reviewCheckpoint(data: FormData) {
  const { supabase, user, season, membership } = await getSentinelaContext()
  if (!['mentor', 'journey_admin'].includes(membership.role) || season.id !== text(data, 'seasonId')) throw new Error('Sem autorização nesta temporada.')
  const progressId = text(data, 'progressId'); const status = text(data, 'status') as 'validated' | 'rejected'
  if (!['validated', 'rejected'].includes(status)) throw new Error('Avaliação inválida.')
  const result = await supabase.from('sentinela_checkpoint_progress').update({ status, validated_by: status === 'validated' ? user.id : null, validated_at: status === 'validated' ? new Date().toISOString() : null }).eq('id', progressId).eq('season_id', season.id)
  if (result.error) throw new Error(result.error.message)
  const body = text(data, 'feedback', false)
  if (body) await supabase.from('sentinela_checkpoint_feedback').insert({ season_id: season.id, checkpoint_progress_id: progressId, author_membership_id: membership.id, body, visibility: 'participant' })
  revalidatePath('/sentinela/admin/avaliacoes')
}

export async function createRehearsal(input: RehearsalInput) {
  const { supabase, season } = await requireRehearsalManager(input.seasonId)
  const { error } = await supabase.from('sentinela_rehearsals').insert({
    ...validateRehearsalInput(input),
    season_id: season.id,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/sentinela/ensaios')
}

export async function updateRehearsal(rehearsalId: string, input: RehearsalInput) {
  const { supabase, season } = await requireRehearsalManager(input.seasonId)
  const { data, error } = await supabase.from('sentinela_rehearsals')
    .update(validateRehearsalInput(input))
    .eq('id', rehearsalId)
    .eq('season_id', season.id)
    .select('id')
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new Error('Ensaio não encontrado nesta temporada.')
  revalidatePath('/sentinela/ensaios')
}

export async function deleteRehearsal(rehearsalId: string, seasonId: string) {
  const { supabase, season } = await requireRehearsalManager(seasonId)
  const { data, error } = await supabase.from('sentinela_rehearsals')
    .delete()
    .eq('id', rehearsalId)
    .eq('season_id', season.id)
    .select('id')
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new Error('Ensaio não encontrado nesta temporada.')
  revalidatePath('/sentinela/ensaios')
}
