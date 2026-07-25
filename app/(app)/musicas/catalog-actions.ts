'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { canEdit } from '@/lib/permissions'
import type { Json, TeamMastery } from '@/types/database'
import { calculateRepertoireReadiness, TEAM_MASTERY_OPTIONS } from './catalog-team-mastery'

function assertTeamMastery(value: string): asserts value is TeamMastery {
  if (!(TEAM_MASTERY_OPTIONS as readonly string[]).includes(value)) {
    throw new Error('Nível de domínio da equipe inválido.')
  }
}

export interface CatalogSongInput {
  title: string
  artist: string | null
  keyNote: string | null
  moment: string | null
  soloistId: string | null
  version: string | null
  youtubeUrl: string | null
  youtubeVideoId: string | null
  youtubeThumbnail: string | null
  youtubeDuration: string | null
  bpm: number | null
  lyricsPlain: string | null
  lyricsSynced: string | null
  albumName: string | null
  metadataSource: string | null
  metadataPayload: Json
  teamMastery: TeamMastery
}

async function requireEditor() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (!canEdit(user.email) && profile?.role !== 'admin') throw new Error('Forbidden')
  return { supabase, user }
}

export async function addCatalogSong(input: CatalogSongInput) {
  assertTeamMastery(input.teamMastery)
  const { supabase, user } = await requireEditor()

  // Upsert the base song record (by title + artist)
  const { data: existingSong } = await supabase
    .from('songs')
    .select('id')
    .ilike('title', input.title.trim())
    .maybeSingle()

  let songId: string

  if (existingSong?.id) {
    songId = existingSong.id
    const { error: updateError } = await supabase.from('songs').update({
      title: input.title.trim(), artist: input.artist, youtube_url: input.youtubeUrl,
      youtube_video_id: input.youtubeVideoId, youtube_thumbnail: input.youtubeThumbnail,
      youtube_duration: input.youtubeDuration, default_key: input.keyNote, bpm: input.bpm,
      lyrics_plain: input.lyricsPlain, lyrics_synced: input.lyricsSynced, album_name: input.albumName,
      metadata_source: input.metadataSource, metadata_payload: input.metadataPayload,
      metadata_fetched_at: input.metadataSource ? new Date().toISOString() : null, team_mastery: input.teamMastery,
    }).eq('id', songId)
    if (updateError) throw new Error(updateError.message)
  } else {
    const { data: newSong, error: songError } = await supabase
      .from('songs')
      .insert({
        title: input.title.trim(),
        artist: input.artist || null,
        youtube_url: input.youtubeUrl || null,
        default_key: input.keyNote || null,
        youtube_video_id: input.youtubeVideoId,
        youtube_thumbnail: input.youtubeThumbnail,
        youtube_duration: input.youtubeDuration,
        bpm: input.bpm,
        lyrics_plain: input.lyricsPlain,
        lyrics_synced: input.lyricsSynced,
        album_name: input.albumName,
        metadata_source: input.metadataSource,
        metadata_payload: input.metadataPayload,
        metadata_fetched_at: input.metadataSource ? new Date().toISOString() : null,
        created_by: user.id,
        team_mastery: input.teamMastery,
      })
      .select('id')
      .single()

    if (songError) throw new Error(songError.message)
    songId = newSong.id
  }

  // Insert a new song_variation entry
  const { data: variation, error: varError } = await supabase.from('song_variations').insert({
    song_id: songId,
    artist: input.artist || null,
    key_note: input.keyNote || null,
    moment: (input.moment as 'Prévia' | 'Adoração' | 'Palavra' | 'Celebração' | null) || null,
    soloist_id: input.soloistId || null,
    version: input.version || null,
    youtube_url: input.youtubeUrl || null,
    created_by: user.id,
  }).select('id').single()

  if (varError) throw new Error(varError.message)

  revalidatePath('/musicas')

  return { songId, variationId: variation.id }
}

export async function editCatalogSong(songId: string, variationId: string | null, input: CatalogSongInput) {
  assertTeamMastery(input.teamMastery)
  const { supabase } = await requireEditor()
  const { error: songError } = await supabase.from('songs').update({
    title: input.title.trim(), artist: input.artist, youtube_url: input.youtubeUrl,
    youtube_video_id: input.youtubeVideoId, youtube_thumbnail: input.youtubeThumbnail,
    youtube_duration: input.youtubeDuration, default_key: input.keyNote, bpm: input.bpm,
    lyrics_plain: input.lyricsPlain, lyrics_synced: input.lyricsSynced, album_name: input.albumName,
    metadata_source: input.metadataSource, metadata_payload: input.metadataPayload,
    metadata_fetched_at: input.metadataSource ? new Date().toISOString() : null, team_mastery: input.teamMastery,
  }).eq('id', songId)
  if (songError) throw new Error(songError.message)

  if (variationId) {
    const { error: variationError } = await supabase.from('song_variations').update({
      artist: input.artist, key_note: input.keyNote,
      moment: (input.moment as 'Prévia' | 'Adoração' | 'Palavra' | 'Celebração' | null) || null,
      soloist_id: input.soloistId, version: input.version, youtube_url: input.youtubeUrl,
    }).eq('id', variationId)
    if (variationError) throw new Error(variationError.message)
  }
  revalidatePath('/musicas')
  return { songId, variationId }
}

export async function updateTeamMastery(songId: string, teamMastery: string) {
  const { supabase } = await requireEditor()
  assertTeamMastery(teamMastery)
  const analysis = calculateRepertoireReadiness(teamMastery)

  const { error: songError } = await supabase.from('songs').update({ team_mastery: teamMastery }).eq('id', songId)
  if (songError) throw new Error(songError.message)

  const { data: current, error: readError } = await supabase
    .from('repertoire_analyses' as never)
    .select('stage, stage_manually_adjusted')
    .eq('song_id', songId)
    .maybeSingle() as unknown as { data: { stage: string; stage_manually_adjusted: boolean } | null; error: { message: string } | null }
  if (readError) throw new Error(readError.message)

  const suggestedUpdate = {
    song_id: songId,
    readiness_index: analysis.readinessIndex,
    readiness_level: analysis.readinessLevel,
    suggested_stage: analysis.suggestedStage,
    // Preserve a leader's decision; only untouched cards follow suggestions.
    ...(!current?.stage_manually_adjusted ? { stage: analysis.suggestedStage } : {}),
    updated_at: new Date().toISOString(),
  }
  const { error: analysisError } = await supabase.from('repertoire_analyses' as never).upsert(suggestedUpdate as never, { onConflict: 'song_id' })
  if (analysisError) throw new Error(analysisError.message)

  revalidatePath('/musicas')
  return { ip: analysis.readinessIndex, level: analysis.readinessLevel, suggestedStage: analysis.suggestedStage }
}

export async function deleteCatalogSong(variationId: string) {
  const { supabase } = await requireEditor()
  const { error } = await supabase
    .from('song_variations')
    .delete()
    .eq('id', variationId)

  if (error) throw new Error(error.message)
  revalidatePath('/musicas')
}

export async function updateCatalogSong(
  variationId: string,
  input: {
    artist: string | null
    keyNote: string | null
    moment: string | null
    soloistId: string | null
    version: string | null
    youtubeUrl: string | null
  }
) {
  const { supabase } = await requireEditor()
  const { error } = await supabase
    .from('song_variations')
    .update({
      artist: input.artist || null,
      key_note: input.keyNote || null,
      moment: (input.moment as 'Prévia' | 'Adoração' | 'Palavra' | 'Celebração' | null) || null,
      soloist_id: input.soloistId || null,
      version: input.version || null,
      youtube_url: input.youtubeUrl || null,
    })
    .eq('id', variationId)

  if (error) throw new Error(error.message)
  revalidatePath('/musicas')
}
