const BASE_URL = process.env.SOUNDCHARTS_BASE_URL ?? 'https://customer.api.soundcharts.com'

function buildHeaders() {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (process.env.SOUNDCHARTS_ACCESS_TOKEN) headers.Authorization = `Bearer ${process.env.SOUNDCHARTS_ACCESS_TOKEN}`
  if (process.env.SOUNDCHARTS_APP_ID) headers['x-app-id'] = process.env.SOUNDCHARTS_APP_ID
  if (process.env.SOUNDCHARTS_API_KEY) headers['x-api-key'] = process.env.SOUNDCHARTS_API_KEY
  return headers
}

export async function soundchartsGet<T>(path: string, params: Record<string, string> = {}) {
  const url = new URL(path, BASE_URL)
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value))
  const response = await fetch(url, { headers: buildHeaders(), next: { revalidate: 60 * 60 * 24 } })
  const json = await response.json().catch(() => null)
  if (!response.ok) throw new Error(json?.error?.message ?? 'Não foi possível consultar o Soundcharts.')
  return json as T
}

export async function searchSoundchartsSong(input: { title: string; artist?: string | null }) {
  if (!process.env.SOUNDCHARTS_ACCESS_TOKEN && !process.env.SOUNDCHARTS_APP_ID && !process.env.SOUNDCHARTS_API_KEY) {
    return null
  }

  const term = [input.title, input.artist].filter(Boolean).join(' ')
  if (!term.trim()) return null

  return soundchartsGet<unknown>(`/api/v2/song/search/${encodeURIComponent(term)}`)
}
