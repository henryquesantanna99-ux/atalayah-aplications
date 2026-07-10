export type YouTubeMusicOption = {
  videoId: string
  title: string
  artist: string
  thumbnail: string | null
  duration: string | null
  url: string
}

type YouTubeSearchItem = {
  id: { videoId?: string }
  snippet: {
    title: string
    channelTitle: string
    thumbnails?: { high?: { url: string }; medium?: { url: string }; default?: { url: string } }
  }
}

type YouTubeVideoItem = { id: string; contentDetails?: { duration?: string } }

export async function searchYouTubeMusic(query: string, maxResults = 5): Promise<YouTubeMusicOption[]> {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) throw new Error('YOUTUBE_API_KEY não configurada')

  const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search')
  searchUrl.searchParams.set('part', 'snippet')
  searchUrl.searchParams.set('type', 'video')
  searchUrl.searchParams.set('videoCategoryId', '10')
  searchUrl.searchParams.set('maxResults', String(Math.max(maxResults, 5)))
  searchUrl.searchParams.set('q', query)
  searchUrl.searchParams.set('key', apiKey)

  const searchResponse = await fetch(searchUrl, { next: { revalidate: 60 * 60 } })
  const searchJson = await searchResponse.json()
  if (!searchResponse.ok) throw new Error(searchJson?.error?.message ?? 'Não foi possível buscar músicas no YouTube.')

  const items = (searchJson.items ?? []) as YouTubeSearchItem[]
  const videoIds = items.map((item) => item.id.videoId).filter(Boolean) as string[]
  const durations = new Map<string, string | null>()

  if (videoIds.length > 0) {
    const videosUrl = new URL('https://www.googleapis.com/youtube/v3/videos')
    videosUrl.searchParams.set('part', 'contentDetails')
    videosUrl.searchParams.set('id', videoIds.join(','))
    videosUrl.searchParams.set('key', apiKey)

    const videosResponse = await fetch(videosUrl, { next: { revalidate: 60 * 60 } })
    const videosJson = await videosResponse.json()
    if (videosResponse.ok) {
      for (const item of (videosJson.items ?? []) as YouTubeVideoItem[]) {
        durations.set(item.id, item.contentDetails?.duration ?? null)
      }
    }
  }

  return items.filter((item) => item.id.videoId).map((item) => ({
    videoId: item.id.videoId!,
    title: item.snippet.title,
    artist: item.snippet.channelTitle,
    thumbnail: item.snippet.thumbnails?.high?.url ?? item.snippet.thumbnails?.medium?.url ?? item.snippet.thumbnails?.default?.url ?? null,
    duration: durations.get(item.id.videoId!) ?? null,
    url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
  }))
}
