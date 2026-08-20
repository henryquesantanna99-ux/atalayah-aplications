import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createMusicResolveHandler } from '../../lib/music/resolve.ts'

const video = { videoId: 'yt1', title: 'Graça', artist: 'Banda', thumbnail: null, duration: 'PT3M', url: 'https://youtu.be/yt1' }
const song = { id: 's1', title: 'Graça', artist: 'Banda', youtube_url: video.url, youtube_video_id: 'yt1', youtube_thumbnail: null, youtube_duration: 'PT3M', lyrics_plain: null }

function client(data: unknown[] | null, error: unknown = null, user: unknown = { id: 'u1' }) {
  const query = { select: () => query, eq: () => query, limit: async () => ({ data, error }) }
  return { auth: { getUser: async () => ({ data: { user }, error: null }) }, from: () => query }
}

function request() {
  return new Request('http://localhost/api/music/resolve', { method: 'POST', body: JSON.stringify({ title: 'Graça', artist: 'Banda' }) })
}

function handler(options: { data?: unknown[]; catalogError?: unknown; youtubeError?: unknown; user?: unknown; logs?: unknown[] } = {}) {
  return createMusicResolveHandler({
    createClient: async () => client(options.data ?? [], options.catalogError, options.user === undefined ? { id: 'u1' } : options.user),
    searchYouTube: async () => { if (options.youtubeError) throw options.youtubeError; return [video] },
    findLyrics: async () => null,
    logger: { error: (...values: unknown[]) => options.logs?.push(values) },
  })
}

describe('POST /api/music/resolve', () => {
  it('returns an internal match without querying YouTube', async () => {
    let youtubeCalls = 0
    const route = createMusicResolveHandler({
      createClient: async () => client([song]), searchYouTube: async () => { youtubeCalls++; return [video] },
      findLyrics: async () => null, logger: { error() {} },
    })
    const response = await route(request())
    assert.equal(response.status, 200)
    assert.deepEqual((await response.json()).catalogStatus, 'matched')
    assert.equal(youtubeCalls, 0)
  })

  it('falls back to YouTube when the catalog has no match', async () => {
    const response = await handler()(request())
    const payload = await response.json()
    assert.equal(response.status, 200)
    assert.equal(payload.catalogStatus, 'not_found')
    assert.equal(payload.results[0].source, 'youtube')
  })

  it('logs a recoverable catalog failure and returns YouTube results', async () => {
    const logs: unknown[] = []
    const response = await handler({ catalogError: { code: 'XX001', message: 'database detail' }, logs })(request())
    const payload = await response.json()
    assert.equal(payload.catalogStatus, 'unavailable')
    assert.equal(payload.results[0].source, 'youtube')
    assert.match(JSON.stringify(logs), /catalog_query.*XX001.*database detail/)
    assert.doesNotMatch(JSON.stringify(payload), /database detail|XX001/)
  })

  it('returns a provider-specific response when both providers fail', async () => {
    const response = await handler({ catalogError: { code: 'XX001', message: 'db down' }, youtubeError: new Error('quota detail') })(request())
    assert.equal(response.status, 502)
    assert.deepEqual(await response.json(), { error: 'Não foi possível buscar músicas no YouTube.' })
  })

  it('stops with 401 for an unauthenticated user', async () => {
    let searched = false
    const route = createMusicResolveHandler({
      createClient: async () => client([], null, null), searchYouTube: async () => { searched = true; return [] },
      findLyrics: async () => null, logger: { error() {} },
    })
    const response = await route(request())
    assert.equal(response.status, 401)
    assert.equal(searched, false)
  })

  it('does not fall back on catalog authorization failures', async () => {
    const response = await handler({ catalogError: { code: '42501', message: 'policy detail' } })(request())
    assert.equal(response.status, 403)
    assert.deepEqual(await response.json(), { error: 'Acesso negado.' })
  })
})
