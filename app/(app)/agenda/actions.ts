'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type EventType = 'culto' | 'ensaio' | 'comunhao'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') throw new Error('Forbidden')
  return { supabase, user }
}

export async function createEvent(input: {
  title: string
  type: EventType
  date: string
  arrival_time: string | null
  start_time: string | null
  notes: string | null
}) {
  const { supabase, user } = await requireAdmin()
  const { error } = await supabase.from('events').insert({
    ...input,
    created_by: user.id,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/agenda')
  revalidatePath('/musicas')
}

export async function updateEvent(
  eventId: string,
  input: {
    title: string
    type: EventType
    date: string
    arrival_time: string | null
    start_time: string | null
    notes: string | null
  }
) {
  const { supabase } = await requireAdmin()
  const { error } = await supabase
    .from('events')
    .update(input)
    .eq('id', eventId)

  if (error) throw new Error(error.message)
  revalidatePath('/agenda')
  revalidatePath('/musicas')
}

export async function deleteEvent(eventId: string) {
  const { supabase } = await requireAdmin()
  const { error } = await supabase.from('events').delete().eq('id', eventId)

  if (error) throw new Error(error.message)
  revalidatePath('/agenda')
  revalidatePath('/musicas')
}

export async function assignEventMember(input: {
  eventId: string
  profileId: string
  instrument: string | null
}) {
  const { supabase } = await requireAdmin()
  const { error } = await supabase.from('event_members').upsert(
    {
      event_id: input.eventId,
      profile_id: input.profileId,
      instrument: input.instrument,
    },
    { onConflict: 'event_id,profile_id' }
  )

  if (error) throw new Error(error.message)
  revalidatePath('/agenda')
}

export async function removeEventMember(eventMemberId: string) {
  const { supabase } = await requireAdmin()
  const { error } = await supabase
    .from('event_members')
    .delete()
    .eq('id', eventMemberId)

  if (error) throw new Error(error.message)
  revalidatePath('/agenda')
}
