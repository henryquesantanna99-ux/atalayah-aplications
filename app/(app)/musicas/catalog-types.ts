import type { Json, TeamMastery } from '@/types/database'

export interface CatalogStem {
  id: string
  stem_type: string
  original_file_name: string | null
}

export interface CatalogSong {
  id: string
  songId: string
  variationId: string | null
  title: string
  artist: string | null
  version: string | null
  youtubeUrl: string | null
  youtubeVideoId: string | null
  youtubeThumbnail: string | null
  youtubeDuration: string | null
  bpm: number | null
  albumName: string | null
  lyricsPlain: string | null
  lyricsSynced: string | null
  metadataSource: string | null
  metadataPayload: Json
  teamMastery: TeamMastery
  stems: CatalogStem[]
}
