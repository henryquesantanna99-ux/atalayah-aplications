import 'server-only'

import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const getSentinelaContext = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sentinela/entrar')

  const { data: membership } = await supabase.from('sentinela_memberships')
    .select('id, season_id, user_id, role, status')
    .eq('user_id', user.id).eq('status', 'active').order('joined_at', { ascending: false }).limit(1).maybeSingle()
  if (!membership) redirect('/sentinela/onboarding?reason=membership')

  const { data: season } = await supabase.from('sentinela_seasons').select('*').eq('id', membership.season_id).single()
  if (!season) redirect('/sentinela/onboarding?reason=season')
  return { supabase, user, membership, season }
})

export async function getOverviewData() {
  const context = await getSentinelaContext()
  const { supabase, membership, season } = context
  const [phases, weeks, milestones, missions, rehearsals, lessons, progress, feedback] = await Promise.all([
    supabase.from('sentinela_phases').select('*').eq('season_id', season.id).order('position'),
    supabase.from('sentinela_weeks').select('*').eq('season_id', season.id).order('week_number'),
    supabase.from('sentinela_milestones').select('*').eq('season_id', season.id).order('position'),
    supabase.from('sentinela_missions').select('*').eq('season_id', season.id).eq('status', 'published').order('due_at').limit(1),
    supabase.from('sentinela_rehearsals').select('*').eq('season_id', season.id).eq('status', 'scheduled').gte('starts_at', new Date().toISOString()).order('starts_at').limit(1),
    supabase.from('sentinela_academy_lessons').select('*').eq('season_id', season.id).eq('status', 'published').order('position').limit(1),
    supabase.from('sentinela_competency_progress').select('milestone_id, official_level_id').eq('membership_id', membership.id),
    supabase.from('sentinela_checkpoint_feedback').select('body, created_at').eq('season_id', season.id).eq('visibility', 'participant').order('created_at', { ascending: false }).limit(1),
  ])
  return { ...context, phases: phases.data ?? [], weeks: weeks.data ?? [], milestones: milestones.data ?? [], mission: missions.data?.[0], rehearsal: rehearsals.data?.[0], lesson: lessons.data?.[0], progress: progress.data ?? [], feedback: feedback.data?.[0] }
}

export async function getAcademyData() {
  const context = await getSentinelaContext(); const { supabase, season, membership } = context
  const [modules, lessons, progress, notes] = await Promise.all([
    supabase.from('sentinela_academy_modules').select('*').eq('season_id', season.id).eq('status', 'published').order('position'),
    supabase.from('sentinela_academy_lessons').select('*').eq('season_id', season.id).eq('status', 'published').order('position'),
    supabase.from('sentinela_education_progress').select('*').eq('membership_id', membership.id),
    supabase.from('sentinela_lesson_notes').select('*').eq('membership_id', membership.id),
  ])
  return { ...context, modules: modules.data ?? [], lessons: lessons.data ?? [], progress: progress.data ?? [], notes: notes.data ?? [] }
}
