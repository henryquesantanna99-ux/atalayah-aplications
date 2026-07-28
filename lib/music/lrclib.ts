export type LrclibLyrics = {
  id?: number
  trackName?: string
  artistName?: string
  albumName?: string
  duration?: number
  instrumental?: boolean
  plainLyrics?: string | null
  syncedLyrics?: string | null
}

export const MAX_LYRICS_ATTEMPTS = 3
export const LYRICS_EXCERPT_LINES = 5
export const LYRICS_EXCERPT_CHARACTERS = 300

export function normalizeSongTerm(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/\([^)]*(feat\.?|ft\.?|remaster|ao vivo|live)[^)]*\)/gi, ' ')
    .replace(/\b(feat\.?|ft\.?).*$/gi, ' ').replace(/\b(remaster(ed)?|ao vivo|live)\b/gi, ' ')
    .replace(/[^a-z0-9]+/g, ' ').trim()
}

function similarity(expected: string, actual?: string) {
  const a = new Set(normalizeSongTerm(expected).split(' ').filter(Boolean))
  const b = new Set(normalizeSongTerm(actual ?? '').split(' ').filter(Boolean))
  if (!a.size || !b.size) return 0
  const intersection = Array.from(a).filter((term) => b.has(term)).length
  return intersection / new Set(Array.from(a).concat(Array.from(b))).size
}

export function lyricsResultKey(item: LrclibLyrics) {
  return item.id != null ? String(item.id) : `${normalizeSongTerm(item.trackName ?? '')}:${normalizeSongTerm(item.artistName ?? '')}`
}

export function selectBestLyrics(results: LrclibLyrics[], input: { trackName: string; artistName?: string | null }, rejected: string[] = []) {
  return results
    .filter((item) => !item.instrumental && Boolean(item.plainLyrics?.trim()) && !rejected.includes(lyricsResultKey(item)))
    .map((item) => ({ item, score: similarity(input.trackName, item.trackName) * .7 + similarity(input.artistName ?? '', item.artistName) * .3 }))
    .sort((a, b) => b.score - a.score)[0]?.item ?? null
}

export function createLyricsExcerpt(lyrics: string, maxLines = LYRICS_EXCERPT_LINES, maxCharacters = LYRICS_EXCERPT_CHARACTERS) {
  const selected = lyrics.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, maxLines).join('\n')
  const truncated = selected.length > maxCharacters ? selected.slice(0, maxCharacters).replace(/\s+\S*$/, '').trimEnd() : selected
  return truncated.length < lyrics.trim().length ? `${truncated}…` : truncated
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function searchLyrics(input: { trackName: string; artistName?: string | null; attempt?: number }, fetcher: typeof fetch = fetch) {
  const baseUrl = process.env.LRCLIB_BASE_URL ?? 'https://lrclib.net'
  const url = new URL('/api/search', baseUrl)
  const attempt = Math.min(Math.max(input.attempt ?? 1, 1), MAX_LYRICS_ATTEMPTS)
  url.searchParams.set('track_name', attempt === 1 ? input.trackName : normalizeSongTerm(input.trackName))
  if (input.artistName && attempt < 3) url.searchParams.set('artist_name', attempt === 1 ? input.artistName : normalizeSongTerm(input.artistName))

  let lastError: unknown
  for (let networkAttempt = 0; networkAttempt < 3; networkAttempt += 1) {
    try {
      const response = await fetcher(url, {
        headers: { Accept: 'application/json', 'User-Agent': process.env.LRCLIB_USER_AGENT ?? 'Atalayah/1.0 (contato@atalayah.app)' },
        signal: AbortSignal.timeout(6000),
      })
      if (response.status === 404) return []
      if (!response.ok) {
        if (response.status < 500) throw new Error(`LRCLIB respondeu ${response.status}.`)
        throw new Error(`Falha temporária do LRCLIB (${response.status}).`)
      }
      return (await response.json()) as LrclibLyrics[]
    } catch (error) {
      lastError = error
      if (networkAttempt < 2) await sleep(200 * 2 ** networkAttempt)
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Não foi possível buscar letras no LRCLIB.')
}

export async function findBestLyrics(input: { trackName: string; artistName?: string | null }) {
  return selectBestLyrics(await searchLyrics(input), input)
}
