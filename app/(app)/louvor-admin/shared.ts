import { canEdit } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'

export type AdminResponse<T = unknown> = { success: boolean; message: string; data?: T }

export type WorshipSuggestionRow = {
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
  age_range?: string | null
  ministry?: string | null
  region?: string | null
  conversion_time?: string | null
  participation_time?: string | null
}

export async function requireWorshipAdmin() {
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

export async function getLatestMinistryProfile(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase
    .from('ministry_profiles' as never)
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data as { id?: string; theological_vision?: string | null; current_emphasis?: string | null; current_season?: string | null; musical_culture?: Record<string, unknown> | null; pastoral_notes?: string | null } | null
}
