import 'server-only'

import { getSentinelaContext } from './data'

export type Milestone = { id: string; label: string; status: 'complete' | 'current' | 'locked' }

/**
 * Season data used by portal surfaces.  Keeping this query here prevents UI
 * modules from silently falling back to the old demo constants.
 */
export async function getCurrentSeason() {
  const { supabase, season, membership } = await getSentinelaContext()
  const today = new Date().toISOString().slice(0, 10)
  const [phases, weeks, milestones, progress, mission, rehearsal, content, feedback] = await Promise.all([
    supabase.from('sentinela_phases').select('*').eq('season_id', season.id).lte('starts_on', today).order('position', { ascending: false }).limit(1),
    supabase.from('sentinela_weeks').select('*').eq('season_id', season.id).order('week_number'),
    supabase.from('sentinela_milestones').select('*').eq('season_id', season.id).eq('status', 'published').order('position'),
    supabase.from('sentinela_competency_progress').select('milestone_id, official_level_id').eq('season_id', season.id).eq('membership_id', membership.id),
    supabase.from('sentinela_missions').select('*').eq('season_id', season.id).eq('status', 'published').order('due_at').limit(1),
    supabase.from('sentinela_rehearsals').select('*').eq('season_id', season.id).eq('status', 'scheduled').gte('starts_at', new Date().toISOString()).order('starts_at').limit(1),
    supabase.from('sentinela_academy_lessons').select('*').eq('season_id', season.id).eq('status', 'published').order('position').limit(1),
    supabase.from('sentinela_checkpoint_feedback').select('body, created_at, sentinela_checkpoint_progress!inner(membership_id)').eq('season_id', season.id).eq('sentinela_checkpoint_progress.membership_id', membership.id).eq('visibility', 'participant').order('created_at', { ascending: false }).limit(1),
  ])
  const completed = new Set((progress.data ?? []).filter((item) => item.official_level_id).map((item) => item.milestone_id))
  const firstIncomplete = (milestones.data ?? []).findIndex((item) => !completed.has(item.id))
  return {
    season,
    phase: phases.data?.[0],
    weeks: weeks.data ?? [],
    milestones: (milestones.data ?? []).map((item, index): Milestone => ({
      id: item.id,
      label: item.name,
      status: completed.has(item.id) ? 'complete' : index === firstIncomplete ? 'current' : 'locked',
    })),
    mission: mission.data?.[0], rehearsal: rehearsal.data?.[0], content: content.data?.[0], feedback: feedback.data?.[0],
  }
}

export async function getCurrentSquad() {
  const { supabase, season, membership } = await getSentinelaContext()
  const own = await supabase.from('sentinela_squad_members').select('squad_id').eq('season_id', season.id).eq('membership_id', membership.id).is('ends_at', null).maybeSingle()
  if (!own.data) return { squad: null, members: [] }
  const [squad, memberRows] = await Promise.all([
    supabase.from('sentinela_squads').select('*').eq('season_id', season.id).eq('id', own.data.squad_id).single(),
    supabase.from('sentinela_squad_members').select('id, membership_id, responsibility_id').eq('season_id', season.id).eq('squad_id', own.data.squad_id).is('ends_at', null),
  ])
  const membershipIds = (memberRows.data ?? []).map((item) => item.membership_id)
  const responsibilityIds = (memberRows.data ?? []).flatMap((item) => item.responsibility_id ? [item.responsibility_id] : [])
  const [memberships, responsibilities] = await Promise.all([
    membershipIds.length ? supabase.from('sentinela_memberships').select('id,user_id,role,status').eq('season_id', season.id).in('id', membershipIds) : Promise.resolve({ data: [] }),
    responsibilityIds.length ? supabase.from('sentinela_responsibilities').select('id,name').eq('season_id', season.id).in('id', responsibilityIds) : Promise.resolve({ data: [] }),
  ])
  const members = (memberRows.data ?? []).map((item) => ({
    ...item,
    membership: memberships.data?.find((record) => record.id === item.membership_id),
    responsibility: responsibilities.data?.find((record) => record.id === item.responsibility_id),
  }))
  return { squad: squad.data, members }
}
