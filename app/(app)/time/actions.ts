'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function updateMemberStatus(
  profileId: string,
  status: 'active' | 'inactive' | 'pending'
) {
  const supabase = await createClient()

  // Verify caller is admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (callerProfile?.role !== 'admin') throw new Error('Forbidden')

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
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (callerProfile?.role !== 'admin') throw new Error('Forbidden')

  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', profileId)

  if (error) throw new Error(error.message)
  revalidatePath('/time')
}
