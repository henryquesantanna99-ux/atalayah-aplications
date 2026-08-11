'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { canEdit } from '@/lib/permissions'
import type { Json } from '@/types/database'

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
  if (!user) throw new Error('Você precisa entrar para editar a agenda.')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (!canEdit(profile?.role)) throw new Error('Você não possui permissão para criar repertórios')
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
    youtubeVideoId: string | null
    youtubeUrl: string | null
    youtubeThumbnail: string | null
    youtubeDuration: string | null
    lyricsPlain: string | null
    lyricsSynced: string | null
    albumName: string | null
    bpm: number | null
    metadataSource: string | null
    metadataPayload: Json
    addToGeneralCatalog: boolean
  }[]
}) {
  const validSongs = input.songs.filter((song) => song.songTitle.trim())
  const { supabase } = await requireEditor()
  const { error } = await supabase.rpc('save_event_scale', {
    p_event_id: input.eventId,
    p_event: input.event,
    p_members: input.members,
    p_songs: validSongs,
  } as never)
  if (error) {
    const safeMessage = error.message.match(/Você não possui permissão para criar repertórios|Uma ou mais funções da escala são inválidas ou inativas\.|Não foi possível cadastrar a música [^\n]+/)?.[0]
    throw new Error(safeMessage ?? 'Não foi possível salvar a escala. Tente novamente.')
  }

  revalidatePath('/agenda')
  revalidatePath('/dashboard')
  revalidatePath('/musicas')
  revalidatePath('/comunhao')
}
