import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createLyricsExcerpt, findBestLyrics, normalizeSongTerm } from '@/lib/music/lrclib'
import { searchYouTubeMusic } from '@/lib/music/youtube'

type SongRow = {
  id: string
  title: string
  artist: string | null
  youtube_url: string | null
  youtube_video_id: string | null
  youtube_thumbnail: string | null
  youtube_duration: string | null
  lyrics_plain: string | null
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const body = await request.json().catch(() => null) as { title?: string; artist?: string } | null
  const title = body?.title?.trim() ?? ''
  const artist = body?.artist?.trim() ?? ''
  const normalizedTitle = normalizeSongTerm(title)
  const normalizedArtist = normalizeSongTerm(artist)
  if (!normalizedTitle) return NextResponse.json({ error: 'Informe o título da música.' }, { status: 400 })

  const { data, error } = await supabase
    .from('songs')
    .select('id, title, artist, youtube_url, youtube_video_id, youtube_thumbnail, youtube_duration, lyrics_plain')
    .limit(200)
  if (error) return NextResponse.json({ error: 'Não foi possível consultar o catálogo.' }, { status: 500 })

  const catalog = ((data ?? []) as SongRow[]).filter((song) => {
    const titleMatches = normalizeSongTerm(song.title) === normalizedTitle
    const artistMatches = !normalizedArtist || normalizeSongTerm(song.artist ?? '') === normalizedArtist
    return titleMatches && artistMatches
  })

  if (catalog.length) {
    return NextResponse.json({ results: catalog.map((song) => ({
      source: 'catalog' as const,
      songId: song.id,
      title: song.title,
      artist: song.artist ?? '',
      thumbnail: song.youtube_thumbnail,
      url: song.youtube_url,
      videoId: song.youtube_video_id,
      duration: song.youtube_duration,
      lyricsExcerpt: song.lyrics_plain ? createLyricsExcerpt(song.lyrics_plain) : null,
    })) })
  }

  try {
    const videos = await searchYouTubeMusic([title, artist].filter(Boolean).join(' '))
    const results = await Promise.all(videos.map(async (video) => {
      const lyrics = await findBestLyrics({ trackName: video.title, artistName: video.artist }).catch(() => null)
      return {
        source: 'youtube' as const,
        songId: null,
        title: video.title,
        artist: video.artist,
        thumbnail: video.thumbnail,
        url: video.url,
        videoId: video.videoId,
        duration: video.duration,
        lyricsExcerpt: lyrics?.plainLyrics ? createLyricsExcerpt(lyrics.plainLyrics) : null,
        lyricsPlain: lyrics?.plainLyrics ?? null,
        lyricsSynced: lyrics?.syncedLyrics ?? null,
        albumName: lyrics?.albumName ?? null,
        lrclibId: lyrics?.id ?? null,
      }
    }))
    return NextResponse.json({ results })
  } catch (cause) {
    return NextResponse.json({ error: cause instanceof Error ? cause.message : 'Não foi possível buscar músicas.' }, { status: 502 })
  }
}
