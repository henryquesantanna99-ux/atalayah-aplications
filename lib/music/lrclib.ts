export type LrclibLyrics = {
  id?: number
  trackName?: string
  artistName?: string
  albumName?: string
  duration?: number
  plainLyrics?: string | null
  syncedLyrics?: string | null
}

export async function searchLyrics(input: { trackName: string; artistName?: string | null }) {
  const baseUrl = process.env.LRCLIB_BASE_URL ?? 'https://lrclib.net'
  const url = new URL('/api/search', baseUrl)
  url.searchParams.set('track_name', input.trackName)
  if (input.artistName) url.searchParams.set('artist_name', input.artistName)

  const response = await fetch(url, { headers: { Accept: 'application/json' }, next: { revalidate: 60 * 60 * 24 } })
  if (!response.ok) throw new Error('Não foi possível buscar letras no LRCLIB.')
  return (await response.json()) as LrclibLyrics[]
}

export async function findBestLyrics(input: { trackName: string; artistName?: string | null }) {
  const results = await searchLyrics(input)
  return results.find((item) => item.plainLyrics || item.syncedLyrics) ?? null
}
