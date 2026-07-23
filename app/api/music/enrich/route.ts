import { NextRequest, NextResponse } from 'next/server'
import { findBestLyrics } from '@/lib/music/lrclib'
import { searchSoundchartsSong } from '@/lib/music/soundcharts'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as {
    title?: string
    artist?: string
    videoId?: string
    url?: string
    thumbnail?: string | null
    duration?: string | null
  } | null
  const title = body?.title?.trim()
  if (!title) return NextResponse.json({ error: 'Título obrigatório.' }, { status: 400 })

  const [lyrics, soundcharts] = await Promise.all([
    findBestLyrics({ trackName: title, artistName: body?.artist }).catch(() => null),
    searchSoundchartsSong({ title, artist: body?.artist }).catch(() => null),
  ])
  const metadata = soundcharts && typeof soundcharts === 'object' ? soundcharts as Record<string, unknown> : null
  const bpmValue = metadata?.bpm ?? metadata?.tempo
  const keyValue = metadata?.key ?? metadata?.key_note

  return NextResponse.json({
    title,
    artist: body?.artist?.trim() || lyrics?.artistName || '',
    youtubeVideoId: body?.videoId ?? null,
    youtubeUrl: body?.url ?? null,
    youtubeThumbnail: body?.thumbnail ?? null,
    youtubeDuration: body?.duration ?? null,
    keyNote: typeof keyValue === 'string' ? keyValue : null,
    bpm: typeof bpmValue === 'number' ? Math.round(bpmValue) : null,
    albumName: lyrics?.albumName ?? null,
    lyricsPlain: lyrics?.plainLyrics ?? null,
    lyricsSynced: lyrics?.syncedLyrics ?? null,
    metadataSource: soundcharts ? 'soundcharts+lrclib+youtube' : lyrics ? 'lrclib+youtube' : 'youtube',
    metadataPayload: { soundcharts, lrclibId: lyrics?.id ?? null },
  })
}
