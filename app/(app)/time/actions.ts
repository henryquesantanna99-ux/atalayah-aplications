'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function requireAdmin() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (callerProfile?.role !== 'admin') throw new Error('Forbidden')
  return supabase
}

export async function updateMemberStatus(
  profileId: string,
  status: 'active' | 'inactive' | 'pending'
) {
  const supabase = await requireAdmin()

  const { error } = await supabase
    .from('profiles')
    .update({ status })
    .eq('id', profileId)

  if (error) throw new Error(error.message)
  revalidatePath('/time')
}

export async function updateMemberRole(
  profileId: string,
  role: 'admin' | 'integrante'
) {
  const supabase = await requireAdmin()

  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', profileId)

  if (error) throw new Error(error.message)
  revalidatePath('/time')
}

export async function updateMemberTeamData(
  profileId: string,
  input: {
    teams: string[]
    instruments: string[]
    function_role: 'lider' | 'integrante' | null
    is_active: boolean
  }
) {
  const supabase = await requireAdmin()

  const { data: existing, error: existingError } = await supabase
    .from('team_members')
    .select('id')
    .eq('profile_id', profileId)
    .order('created_at')
    .limit(1)
    .maybeSingle()

  if (existingError) throw new Error(existingError.message)

  const payload = {
    teams: input.teams,
    instruments: input.instruments,
    function_role: input.function_role,
    is_active: input.is_active,
  }

  const { error } = existing
    ? await supabase
        .from('team_members')
        .update(payload)
        .eq('id', existing.id)
    : await supabase
        .from('team_members')
        .insert({ profile_id: profileId, ...payload })

  if (error) throw new Error(error.message)
  revalidatePath('/time')
}
