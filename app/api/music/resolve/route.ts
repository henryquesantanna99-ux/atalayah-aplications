import { createClient } from '@/lib/supabase/server'
import { findBestLyrics } from '@/lib/music/lrclib'
import { searchYouTubeMusic } from '@/lib/music/youtube'
import { createMusicResolveHandler } from '@/lib/music/resolve'

export const POST = createMusicResolveHandler({
  createClient,
  searchYouTube: searchYouTubeMusic,
  findLyrics: findBestLyrics,
})
