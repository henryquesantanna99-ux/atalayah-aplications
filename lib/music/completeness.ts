import type { Json } from '@/types/database'

export interface MusicCompletenessInput {
  artist?: string | null
  youtubeUrl?: string | null
  youtubeVideoId?: string | null
  youtubeThumbnail?: string | null
  youtubeDuration?: string | null
  bpm?: number | null
  albumName?: string | null
  lyricsPlain?: string | null
  lyricsSynced?: string | null
  metadataSource?: string | null
  metadataPayload?: Json | null
  stems?: readonly unknown[] | null
}

export interface MusicCompleteness {
  complete: boolean
  missing: string[]
}

/** A single definition of the information required by the music catalogue. */
export function getMusicCompleteness(song: MusicCompletenessInput): MusicCompleteness {
  const missing: string[] = []
  if (!song.lyricsPlain?.trim() && !song.lyricsSynced?.trim()) missing.push('letra')
  if (!song.youtubeUrl?.trim()) missing.push('URL do YouTube')
  if (!song.youtubeVideoId?.trim()) missing.push('ID do YouTube')
  if (!song.youtubeThumbnail?.trim()) missing.push('thumbnail do YouTube')
  if (!song.artist?.trim()) missing.push('artista')
  if (!song.albumName?.trim()) missing.push('álbum')
  if (!song.youtubeDuration?.trim()) missing.push('duração')
  if (!song.bpm) missing.push('BPM')
  if (!song.metadataSource?.trim()) missing.push('fonte dos metadados')
  if (!song.metadataPayload || (typeof song.metadataPayload === 'object' && !Array.isArray(song.metadataPayload) && Object.keys(song.metadataPayload).length === 0)) {
    missing.push('payload de metadados')
  }
  if (!song.stems?.length) missing.push('stems')

  return { complete: missing.length === 0, missing }
}
