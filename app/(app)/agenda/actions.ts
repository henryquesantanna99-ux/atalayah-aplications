'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { canEdit } from '@/lib/permissions'
import type { Json } from '@/types/database'
import { syncYoutubePlaylist } from '@/lib/music/youtube-playlists'

export async function reportCatalogLoadFailure(code: string) {
  const safeCode = /^[A-Za-z0-9_-]{1,64}$/.test(code) ? code : 'invalid_code'
  console.error('Falha ao carregar catálogo da agenda', { code: safeCode })
}

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
  const { data: savedEventId, error } = await supabase.rpc('save_event_scale', {
    p_event_id: input.eventId,
    p_event: input.event,
    p_members: input.members,
    p_songs: validSongs,
  } as never)
  if (error) {
    const safeMessage = error.message.match(/Você não possui permissão para criar repertórios|Uma ou mais funções da escala são inválidas ou inativas\.|Não foi possível cadastrar a música [^\n]+/)?.[0]
    throw new Error(safeMessage ?? 'Não foi possível salvar a escala. Tente novamente.')
  }

  const eventId = savedEventId as string
  let playlist: YoutubeSyncResult = { status: 'not_requested', url: null, message: 'Evento salvo com sucesso.' }
  if (input.event.type === 'culto') {
    await supabase.from('events').update({ youtube_playlist_sync_status: 'pending', youtube_playlist_last_error: null }).eq('id', eventId)
    playlist = await syncEventYoutubePlaylist(eventId)
  }

  revalidatePath('/agenda')
  revalidatePath('/dashboard')
  revalidatePath('/musicas')
  revalidatePath('/comunhao')
  return { eventId, playlist }
}

/** Copies a past event (its data, escala and setlist) into a new event on a future date. */
export async function duplicateEvent(eventId: string, newDate: string) {
  const { supabase } = await requireEditor()

  const today = new Date().toISOString().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate) || newDate < today) {
    throw new Error('Selecione uma data futura para a cópia do evento.')
  }

  const { data: sourceEvent, error: eventError } = await supabase
    .from('events')
    .select('title, type, arrival_time, start_time, notes, agenda_topic, conductor_id, location, is_online')
    .eq('id', eventId)
    .maybeSingle()
  if (eventError) throw new Error(eventError.message)
  if (!sourceEvent) throw new Error('Evento não encontrado.')

  const [{ data: memberRows, error: memberError }, { data: songRows, error: songError }] = await Promise.all([
    supabase.from('event_members').select('profile_id, schedule_function_id').eq('event_id', eventId),
    supabase
      .from('setlist_songs')
      .select('song_title, artist, key_note, moment, soloist_id, version, reference_link, order_index, songs(is_catalog_visible)')
      .eq('event_id', eventId)
      .order('order_index'),
  ])
  if (memberError) throw new Error(memberError.message)
  if (songError) throw new Error(songError.message)

  const members = (memberRows ?? [])
    .filter((row) => Boolean(row.schedule_function_id))
    .map((row) => ({ profileId: row.profile_id, scheduleFunctionId: row.schedule_function_id as string }))

  const songs = (songRows ?? []).map((row) => ({
    setlistSongId: crypto.randomUUID(),
    songId: null,
    songTitle: row.song_title,
    artist: row.artist,
    soloistId: row.soloist_id,
    keyNote: row.key_note,
    moment: row.moment,
    version: row.version,
    referenceLink: row.reference_link,
    youtubeVideoId: null,
    youtubeUrl: null,
    youtubeThumbnail: null,
    youtubeDuration: null,
    lyricsPlain: null,
    lyricsSynced: null,
    albumName: null,
    bpm: null,
    metadataSource: null,
    metadataPayload: {},
    addToGeneralCatalog: row.songs?.is_catalog_visible ?? false,
  }))

  const { eventId: newEventId } = await createScale({
    eventId: null,
    event: {
      title: sourceEvent.title,
      type: sourceEvent.type as EventType,
      date: newDate,
      arrival_time: sourceEvent.arrival_time,
      start_time: sourceEvent.start_time,
      notes: sourceEvent.notes,
      agenda_topic: sourceEvent.agenda_topic,
      conductor_id: sourceEvent.conductor_id,
      location: sourceEvent.location,
      is_online: sourceEvent.is_online ?? false,
      meet_link: null,
    },
    members,
    songs,
  })

  return { eventId: newEventId }
}

type YoutubeSyncResult = {
  status: 'not_requested' | 'pending' | 'syncing' | 'synced' | 'failed'
  url: string | null
  message: string
}

/** Authenticated, retryable reconciliation action. YouTube failures never undo the event. */
export async function syncEventYoutubePlaylist(eventId: string): Promise<YoutubeSyncResult> {
  const { supabase } = await requireEditor()
  const { data: claimed } = await supabase
    .from('events')
    .update({ youtube_playlist_sync_status: 'syncing', youtube_playlist_last_error: null })
    .eq('id', eventId)
    .in('youtube_playlist_sync_status', ['pending', 'failed'])
    .select('id, title, type, youtube_playlist_id, youtube_playlist_url')
    .maybeSingle()

  if (!claimed) {
    const { data: current } = await supabase.from('events').select('youtube_playlist_sync_status, youtube_playlist_url').eq('id', eventId).maybeSingle()
    return {
      status: current?.youtube_playlist_sync_status ?? 'failed',
      url: current?.youtube_playlist_url ?? null,
      message: current?.youtube_playlist_sync_status === 'synced' ? 'Playlist sincronizada.' : 'A sincronização já está em andamento.',
    }
  }
  if (claimed.type !== 'culto') return { status: 'not_requested', url: null, message: 'Este evento não possui setlist.' }

  try {
    const { data: songs, error: songsError } = await supabase
      .from('setlist_songs').select('reference_link').eq('event_id', eventId).order('order_index')
    if (songsError) throw songsError
    const playlist = await syncYoutubePlaylist({
      title: claimed.title,
      playlistId: claimed.youtube_playlist_id,
      songUrls: (songs ?? []).map((song) => song.reference_link),
      onPlaylistReady: async (ready) => {
        const { error } = await supabase.from('events').update({ youtube_playlist_id: ready.id, youtube_playlist_url: ready.url }).eq('id', eventId)
        if (error) throw error
      },
    })
    await supabase.from('events').update({
      youtube_playlist_id: playlist.id, youtube_playlist_url: playlist.url,
      youtube_playlist_sync_status: 'synced', youtube_playlist_last_error: null,
      youtube_playlist_synced_at: new Date().toISOString(),
    }).eq('id', eventId)
    revalidatePath('/agenda')
    return { status: 'synced', url: playlist.url, message: 'Playlist sincronizada com sucesso.' }
  } catch {
    const safeMessage = 'Não foi possível sincronizar a playlist agora. O evento foi salvo e você pode tentar novamente.'
    await supabase.from('events').update({ youtube_playlist_sync_status: 'failed', youtube_playlist_last_error: safeMessage }).eq('id', eventId)
    return { status: 'failed', url: claimed.youtube_playlist_url, message: safeMessage }
  }
}
