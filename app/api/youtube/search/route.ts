import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface YouTubeSearchItem {
  id: { videoId?: string }
  snippet: {
    title: string
    channelTitle: string
    thumbnails?: {
      medium?: { url: string }
      high?: { url: string }
      default?: { url: string }
    }
  }
}

interface YouTubeVideoItem {
  id: string
  contentDetails?: { duration?: string }
}

async function requireActiveUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('status')
    .eq('id', user.id)
    .single()

  if (profile?.status !== 'active') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { error: null }
}

export async function GET(request: Request) {
  const { error } = await requireActiveUser()
  if (error) return error

  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'YOUTUBE_API_KEY is not configured.' },
      { status: 428 }
    )
  }

  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.trim()

  if (!query) {
    return NextResponse.json({ error: 'q is required' }, { status: 400 })
  }

  const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search')
  searchUrl.searchParams.set('part', 'snippet')
  searchUrl.searchParams.set('type', 'video')
  searchUrl.searchParams.set('videoCategoryId', '10')
  searchUrl.searchParams.set('maxResults', '8')
  searchUrl.searchParams.set('q', query)
  searchUrl.searchParams.set('key', apiKey)

  const searchResponse = await fetch(searchUrl)
  const searchJson = await searchResponse.json()

  if (!searchResponse.ok) {
    return NextResponse.json(
      { error: searchJson?.error?.message ?? 'Could not search YouTube.' },
      { status: 502 }
    )
  }

  const items = (searchJson.items ?? []) as YouTubeSearchItem[]
  const videoIds = items
    .map((item) => item.id.videoId)
    .filter(Boolean) as string[]

  const durations = new Map<string, string | null>()
  if (videoIds.length > 0) {
    const videosUrl = new URL('https://www.googleapis.com/youtube/v3/videos')
    videosUrl.searchParams.set('part', 'contentDetails')
    videosUrl.searchParams.set('id', videoIds.join(','))
    videosUrl.searchParams.set('key', apiKey)

    const videosResponse = await fetch(videosUrl)
    const videosJson = await videosResponse.json()

    if (videosResponse.ok) {
      for (const item of (videosJson.items ?? []) as YouTubeVideoItem[]) {
        durations.set(item.id, item.contentDetails?.duration ?? null)
      }
    }
  }

  return NextResponse.json({
    results: items
      .filter((item) => item.id.videoId)
      .map((item) => ({
        videoId: item.id.videoId,
        title: item.snippet.title,
        artist: item.snippet.channelTitle,
        thumbnail:
          item.snippet.thumbnails?.high?.url ??
          item.snippet.thumbnails?.medium?.url ??
          item.snippet.thumbnails?.default?.url ??
          null,
        duration: durations.get(item.id.videoId!) ?? null,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      })),
  })
}
