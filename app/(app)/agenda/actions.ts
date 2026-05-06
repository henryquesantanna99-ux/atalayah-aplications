'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { canEdit } from '@/lib/permissions'

type EventType = 'culto' | 'ensaio' | 'comunhao' | 'evento_externo'

interface EventInput {
  title: string
  type: EventType
  date: string
  arrival_time: string | null
  start_time: string | null
  notes: string | null
  agenda_topic?: string | null
  conductor_id?: string | null
  location?: string | null
  is_online?: boolean
  meet_link?: string | null
}

async function requireEditor() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  if (!canEdit(user.email)) throw new Error('Forbidden')
  return { supabase, user }
}

export async function createEvent(input: EventInput) {
  const { supabase, user } = await requireEditor()
  const { error } = await supabase.from('events').insert({
    ...input,
    created_by: user.id,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/agenda')
  revalidatePath('/musicas')
  revalidatePath('/comunhao')
}

export async function updateEvent(
  eventId: string,
  input: EventInput
) {
  const { supabase } = await requireEditor()
  const { error } = await supabase
    .from('events')
    .update(input)
    .eq('id', eventId)

  if (error) throw new Error(error.message)
  revalidatePath('/agenda')
  revalidatePath('/musicas')
  revalidatePath('/comunhao')
}

export async function deleteEvent(eventId: string) {
  const { supabase } = await requireEditor()
  const { error } = await supabase.from('events').delete().eq('id', eventId)

  if (error) throw new Error(error.message)
  revalidatePath('/agenda')
  revalidatePath('/musicas')
  revalidatePath('/comunhao')
}

export async function assignEventMember(input: {
  eventId: string
  profileId: string
  instrument: string | null
}) {
  const { supabase } = await requireEditor()
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
  const { supabase } = await requireEditor()
  const { error } = await supabase
    .from('event_members')
    .delete()
    .eq('id', eventMemberId)

  if (error) throw new Error(error.message)
  revalidatePath('/agenda')
}

export async function createScale(input: {
  eventId: string | null
  event: EventInput
  members: {
    profileId: string
    functionName: string
  }[]
  songs: {
    songId?: string | null
    songTitle: string
    artist?: string | null
    soloistId: string | null
    keyNote: string | null
    moment?: string | null
    version?: string | null
    referenceLink: string | null
  }[]
}) {
  const { supabase, user } = await requireEditor()

  let eventId = input.eventId

  if (!eventId) {
    const { data: createdEvent, error: eventError } = await supabase
      .from('events')
      .insert({
        ...input.event,
        created_by: user.id,
      })
      .select('id')
      .single()

    if (eventError) throw new Error(eventError.message)
    eventId = createdEvent.id
  }

  if (input.members.length > 0) {
    const { error: membersError } = await supabase
      .from('event_members')
      .upsert(
        input.members.map((member) => ({
          event_id: eventId,
          profile_id: member.profileId,
          instrument: member.functionName,
        })),
        { onConflict: 'event_id,profile_id' }
      )

    if (membersError) throw new Error(membersError.message)
  }

  const validSongs = input.songs.filter((song) => song.songTitle.trim())
  if (input.event.type === 'culto' && validSongs.length > 0) {
    const { error: songsError } = await supabase
      .from('setlist_songs')
      .insert(
        validSongs.map((song, index) => ({
          event_id: eventId,
          song_id: song.songId ?? null,
          order_index: index,
          song_title: song.songTitle.trim(),
          artist: song.artist ?? null,
          soloist_id: song.soloistId,
          key_note: song.keyNote,
          moment: (song.moment as 'Prévia' | 'Adoração' | 'Palavra' | 'Celebração' | null) ?? null,
          version: song.version ?? null,
          reference_link: song.referenceLink,
        }))
      )

    if (songsError) throw new Error(songsError.message)
  }

  revalidatePath('/agenda')
  revalidatePath('/dashboard')
  revalidatePath('/musicas')
  revalidatePath('/comunhao')
}
