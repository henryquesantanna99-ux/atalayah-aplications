'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { canEdit } from '@/lib/permissions'
import { z } from 'zod'
import { calculateSongReadiness } from '@/lib/music/readiness'

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
    playsLikeLastTime?: boolean
    changes?: {
      newKey: boolean
      newArrangement: boolean
      newIntro: boolean
      newVocalDivision: boolean
      newMember: boolean
    }
    changeNotes?: string | null
  }[]
}) {
  const songSchema = z.object({
    setlistSongId: z.string().uuid(), songId: z.string().uuid().nullable().optional(),
    songTitle: z.string().trim().min(1).max(200), artist: z.string().max(200).nullable().optional(),
    soloistId: z.string().uuid().nullable(), keyNote: z.string().max(8).nullable(),
    moment: z.enum(['Prévia', 'Adoração', 'Palavra', 'Celebração']).nullable().optional(),
    version: z.string().max(200).nullable().optional(), referenceLink: z.string().url().nullable(),
    playsLikeLastTime: z.boolean().default(true),
    changes: z.object({ newKey: z.boolean(), newArrangement: z.boolean(), newIntro: z.boolean(), newVocalDivision: z.boolean(), newMember: z.boolean() }).default({ newKey: false, newArrangement: false, newIntro: false, newVocalDivision: false, newMember: false }),
    changeNotes: z.string().trim().max(1000).nullable().default(null),
  })
  const parsedSongs = z.array(songSchema).parse(input.songs)
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

  const validSongs = parsedSongs.filter((song) => song.songTitle.trim())
  if (input.event.type === 'culto' && validSongs.length > 0) {
    const { error: songsError } = await supabase
      .from('setlist_songs')
      .upsert(
        validSongs.map((song, index) => {
          const changes = song.playsLikeLastTime
            ? { newKey: false, newArrangement: false, newIntro: false, newVocalDivision: false, newMember: false }
            : song.changes
          const changeNotes = song.playsLikeLastTime ? null : song.changeNotes
          const readiness = calculateSongReadiness({ playsLikeLastTime: song.playsLikeLastTime, changes, changeNotes })
          return ({
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
          plays_like_last_time: song.playsLikeLastTime,
          change_new_key: changes.newKey,
          change_new_arrangement: changes.newArrangement,
          change_new_intro: changes.newIntro,
          change_new_vocal_division: changes.newVocalDivision,
          change_new_member: changes.newMember,
          change_notes: changeNotes,
          readiness_index: readiness.readinessIndex,
          suggested_stage: readiness.suggestedStage,
        })}),
        { onConflict: 'id' }
      )

    if (songsError) throw new Error(songsError.message)
  }

  if (input.event.type === 'culto') {
    // Repertoires are versioned separately from the editable legacy setlist. This
    // keeps the execution that actually happened available for historical analysis.
    const { data: latestRepertoire, error: repertoireLookupError } = await supabase
      .from('repertoires')
      .select('id, version, status')
      .eq('event_id', eventId)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (repertoireLookupError) throw new Error(repertoireLookupError.message)

    if (latestRepertoire && latestRepertoire.status !== 'archived') {
      const { error: archiveError } = await supabase
        .from('repertoires')
        .update({ status: 'archived', archived_at: new Date().toISOString() })
        .eq('id', latestRepertoire.id)
      if (archiveError) throw new Error(archiveError.message)
    }

    const eventIsPast = input.event.date < new Date().toISOString().slice(0, 10)
    const { data: repertoire, error: repertoireError } = await supabase
      .from('repertoires')
      .insert({
        event_id: eventId,
        name: input.event.title,
        event_date: input.event.date,
        status: eventIsPast ? 'consolidated' : 'draft',
        version: (latestRepertoire?.version ?? 0) + 1,
      })
      .select('id')
      .single()

    if (repertoireError) throw new Error(repertoireError.message)

    const catalogSongs = validSongs.filter(
      (song): song is typeof song & { songId: string } => Boolean(song.songId)
    )
    if (catalogSongs.length > 0) {
      const { error: repertoireItemsError } = await supabase.from('repertoire_items').insert(
        catalogSongs.map((song, index) => ({
          repertoire_id: repertoire.id,
          song_id: song.songId,
          order_index: index,
          key_note: song.keyNote,
          arrangement_changed: Boolean(song.version?.trim()),
          arrangement_notes: song.version?.trim() || null,
          liturgical_moment: song.moment as 'Prévia' | 'Adoração' | 'Palavra' | 'Celebração' | null,
        }))
      )
      if (repertoireItemsError) throw new Error(repertoireItemsError.message)
    }
  }

  revalidatePath('/agenda')
  revalidatePath('/dashboard')
  revalidatePath('/musicas')
  revalidatePath('/comunhao')
}
