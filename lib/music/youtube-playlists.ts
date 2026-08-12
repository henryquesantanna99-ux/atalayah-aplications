import 'server-only'

const YOUTUBE_API = 'https://www.googleapis.com/youtube/v3'
export const YOUTUBE_PLAYLIST_SCOPE = 'https://www.googleapis.com/auth/youtube'

export function extractYoutubeVideoId(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    const host = url.hostname.toLowerCase().replace(/^www\./, '')
    let id: string | null = null
    if (host === 'youtu.be') id = url.pathname.split('/').filter(Boolean)[0] ?? null
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      id = url.pathname === '/watch' ? url.searchParams.get('v') : url.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1] ?? null
    }
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null
  } catch {
    return null
  }
}

async function youtubeRequest<T>(accessToken: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${YOUTUBE_API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', ...init?.headers },
    cache: 'no-store',
  })
  if (!response.ok) throw new Error(`YouTube request failed (${response.status})`)
  return response.json() as Promise<T>
}

export async function getYoutubeOAuthAccessToken(): Promise<string> {
  const clientId = process.env.GOOGLE_YOUTUBE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_YOUTUBE_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_YOUTUBE_REFRESH_TOKEN
  if (!clientId || !clientSecret || !refreshToken) throw new Error('YouTube OAuth is not configured')
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' }),
    cache: 'no-store',
  })
  if (!response.ok) throw new Error('YouTube OAuth token refresh failed')
  const payload = await response.json() as { access_token?: string; scope?: string }
  if (!payload.access_token) throw new Error('YouTube OAuth returned no access token')
  if (payload.scope && !payload.scope.split(' ').includes(YOUTUBE_PLAYLIST_SCOPE)) throw new Error('YouTube OAuth scope is insufficient')
  return payload.access_token
}

async function createPlaylist(accessToken: string, title: string) {
  const result = await youtubeRequest<{ id: string }>(accessToken, '/playlists?part=snippet,status', {
    method: 'POST', body: JSON.stringify({ snippet: { title }, status: { privacyStatus: 'unlisted' } }),
  })
  return result.id
}

async function updatePlaylistTitle(accessToken: string, playlistId: string, title: string) {
  await youtubeRequest(accessToken, '/playlists?part=snippet', {
    method: 'PUT', body: JSON.stringify({ id: playlistId, snippet: { title } }),
  })
}

async function clearPlaylist(accessToken: string, playlistId: string) {
  let foundItems = false
  do {
    const query = new URLSearchParams({ part: 'id', playlistId, maxResults: '50' })
    const page = await youtubeRequest<{ items: { id: string }[] }>(accessToken, `/playlistItems?${query}`)
    foundItems = page.items.length > 0
    for (const item of page.items) await youtubeRequest(accessToken, `/playlistItems?id=${encodeURIComponent(item.id)}`, { method: 'DELETE' })
  } while (foundItems)
}

export async function syncYoutubePlaylist(input: {
  title: string
  playlistId?: string | null
  songUrls: (string | null)[]
  onPlaylistReady?: (playlist: { id: string; url: string }) => Promise<void>
}) {
  const accessToken = await getYoutubeOAuthAccessToken()
  const playlistId = input.playlistId || await createPlaylist(accessToken, input.title)
  const playlist = { id: playlistId, url: `https://www.youtube.com/playlist?list=${encodeURIComponent(playlistId)}` }
  // Persist a newly-created ID before inserting items so a partial failure cannot
  // cause the retry to create a second playlist.
  await input.onPlaylistReady?.(playlist)
  if (input.playlistId) {
    await updatePlaylistTitle(accessToken, playlistId, input.title)
    await clearPlaylist(accessToken, playlistId)
  }
  const videoIds = input.songUrls.map(extractYoutubeVideoId).filter((id): id is string => Boolean(id))
  for (const videoId of videoIds) {
    await youtubeRequest(accessToken, '/playlistItems?part=snippet', {
      method: 'POST',
      body: JSON.stringify({ snippet: { playlistId, resourceId: { kind: 'youtube#video', videoId } } }),
    })
  }
  return playlist
}
