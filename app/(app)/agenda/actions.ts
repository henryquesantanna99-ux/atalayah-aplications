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
  scheduleFunctionId: string
}) {
  const { supabase } = await requireEditor()
  await requireActiveScheduleFunction(supabase, input.scheduleFunctionId)
  const { error } = await supabase.from('event_members').upsert(
    {
      event_id: input.eventId,
      profile_id: input.profileId,
      schedule_function_id: input.scheduleFunctionId,
      instrument: null,
    },
    { onConflict: 'event_id,profile_id' }
  )

  if (error) throw new Error(error.message)
  revalidatePath('/agenda')
}

async function requireActiveScheduleFunction(
  supabase: Awaited<ReturnType<typeof createClient>>,
  scheduleFunctionId: string
) {
  const { data, error } = await supabase
    .from('schedule_functions')
    .select('id')
    .eq('id', scheduleFunctionId)
    .eq('is_active', true)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) throw new Error('Função da escala inválida ou inativa.')
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
    scheduleFunctionId: string
  }[]
  songs: {
    setlistSongId: string
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
  } else {
    const { error: eventError } = await supabase.from('events').update(input.event).eq('id', eventId)
    if (eventError) throw new Error(eventError.message)

    const [{ error: membersDeleteError }, { error: songsDeleteError }] = await Promise.all([
      input.members.length > 0
        ? supabase.from('event_members').delete().eq('event_id', eventId).not('profile_id', 'in', `(${input.members.map((member) => member.profileId).join(',')})`)
        : supabase.from('event_members').delete().eq('event_id', eventId),
      input.songs.length > 0
        ? supabase.from('setlist_songs').delete().eq('event_id', eventId).not('id', 'in', `(${input.songs.map((song) => song.setlistSongId).join(',')})`)
        : supabase.from('setlist_songs').delete().eq('event_id', eventId),
    ])
    if (membersDeleteError) throw new Error(membersDeleteError.message)
    if (songsDeleteError) throw new Error(songsDeleteError.message)
  }

  if (input.members.length > 0) {
    const functionIds = Array.from(new Set(input.members.map((member) => member.scheduleFunctionId)))
    const { data: validFunctions, error: functionsError } = await supabase
      .from('schedule_functions')
      .select('id')
      .in('id', functionIds)
      .eq('is_active', true)
    if (functionsError) throw new Error(functionsError.message)
    if ((validFunctions ?? []).length !== functionIds.length) {
      throw new Error('Uma ou mais funções da escala são inválidas ou inativas.')
    }

    const { error: membersError } = await supabase
      .from('event_members')
      .upsert(
        input.members.map((member) => ({
          event_id: eventId,
          profile_id: member.profileId,
          schedule_function_id: member.scheduleFunctionId,
          instrument: null,
        })),
        { onConflict: 'event_id,profile_id' }
      )

    if (membersError) throw new Error(membersError.message)
  }

  const validSongs = input.songs.filter((song) => song.songTitle.trim())
  if (input.event.type === 'culto' && validSongs.length > 0) {
    const { error: songsError } = await supabase
      .from('setlist_songs')
      .upsert(
        validSongs.map((song, index) => ({
          id: song.setlistSongId,
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
        })),
        { onConflict: 'id' }
      )

    if (songsError) throw new Error(songsError.message)
  }

  revalidatePath('/agenda')
  revalidatePath('/dashboard')
  revalidatePath('/musicas')
  revalidatePath('/comunhao')
}
