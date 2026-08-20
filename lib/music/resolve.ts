import { createLyricsExcerpt, normalizeSongTerm } from './lrclib.ts'

export type CatalogStatus = 'matched' | 'not_found' | 'unavailable'

type DiagnosticError = { code?: string; message?: string }

type Dependencies = {
  createClient: () => Promise<any>
  searchYouTube: (query: string) => Promise<any[]>
  findLyrics: (input: { trackName: string; artistName: string }) => Promise<any>
  logger?: Pick<Console, 'error'>
}

const AUTHENTICATION_CODES = new Set(['PGRST301', 'PGRST302', '401'])
const AUTHORIZATION_CODES = new Set(['42501', '403'])

function diagnostic(error: unknown): DiagnosticError {
  if (!error || typeof error !== 'object') return { message: String(error) }
  const value = error as DiagnosticError
  return { code: value.code, message: value.message }
}

function logFailure(logger: Pick<Console, 'error'>, stage: string, error: unknown) {
  const { code, message } = diagnostic(error)
  logger.error('[music/resolve]', { stage, code, message })
}

function providerError(error: unknown) {
  const { code, message } = diagnostic(error)
  const configurationFailure = code === 'YOUTUBE_NOT_CONFIGURED' || message?.includes('YOUTUBE_API_KEY')
  return Response.json(
    { error: configurationFailure ? 'A busca no YouTube não está configurada.' : 'Não foi possível buscar músicas no YouTube.' },
    { status: configurationFailure ? 503 : 502 },
  )
}

export function createMusicResolveHandler(dependencies: Dependencies) {
  const logger = dependencies.logger ?? console

  return async function POST(request: Request) {
    let supabase: any
    try {
      supabase = await dependencies.createClient()
    } catch (error) {
      logFailure(logger, 'catalog_configuration', error)
      return Response.json({ error: 'O serviço de catálogo não está configurado.' }, { status: 500 })
    }

    let authResult: any
    try {
      authResult = await supabase.auth.getUser()
    } catch (error) {
      logFailure(logger, 'authentication', error)
      return Response.json({ error: 'Não autorizado.' }, { status: 401 })
    }
    if (authResult.error) {
      logFailure(logger, 'authentication', authResult.error)
      const { code } = diagnostic(authResult.error)
      const status = AUTHORIZATION_CODES.has(code ?? '') ? 403 : 401
      return Response.json({ error: status === 403 ? 'Acesso negado.' : 'Não autorizado.' }, { status })
    }
    if (!authResult.data?.user) return Response.json({ error: 'Não autorizado.' }, { status: 401 })

    const body = await request.json().catch(() => null) as { title?: string; artist?: string } | null
    const title = body?.title?.trim() ?? ''
    const artist = body?.artist?.trim() ?? ''
    const normalizedTitle = normalizeSongTerm(title)
    const normalizedArtist = normalizeSongTerm(artist)
    if (!normalizedTitle) return Response.json({ error: 'Informe o título da música.' }, { status: 400 })

    let catalogStatus: CatalogStatus = 'not_found'
    let catalog: any[] = []
    try {
      const { data, error } = await supabase.from('songs')
        .select('id, title, artist, youtube_url, youtube_video_id, youtube_thumbnail, youtube_duration, lyrics_plain')
        .eq('is_catalog_visible', true).limit(200)
      if (error) {
        const { code } = diagnostic(error)
        logFailure(logger, 'catalog_query', error)
        if (AUTHENTICATION_CODES.has(code ?? '')) return Response.json({ error: 'Não autorizado.' }, { status: 401 })
        if (AUTHORIZATION_CODES.has(code ?? '')) return Response.json({ error: 'Acesso negado.' }, { status: 403 })
        catalogStatus = 'unavailable'
      } else {
        catalog = (data ?? []).filter((song: any) => normalizeSongTerm(song.title) === normalizedTitle
          && (!normalizedArtist || normalizeSongTerm(song.artist ?? '') === normalizedArtist))
        catalogStatus = catalog.length ? 'matched' : 'not_found'
      }
    } catch (error) {
      logFailure(logger, 'catalog_query', error)
      catalogStatus = 'unavailable'
    }

    if (catalogStatus === 'matched') {
      return Response.json({ catalogStatus, results: catalog.map((song) => ({
        source: 'catalog', songId: song.id, title: song.title, artist: song.artist ?? '',
        thumbnail: song.youtube_thumbnail, url: song.youtube_url, videoId: song.youtube_video_id,
        duration: song.youtube_duration,
        lyricsExcerpt: song.lyrics_plain ? createLyricsExcerpt(song.lyrics_plain) : null,
      })) })
    }

    try {
      const videos = await dependencies.searchYouTube([title, artist].filter(Boolean).join(' '))
      const results = await Promise.all(videos.map(async (video) => {
        const lyrics = await dependencies.findLyrics({ trackName: video.title, artistName: video.artist }).catch(() => null)
        return {
          source: 'youtube', songId: null, title: video.title, artist: video.artist,
          thumbnail: video.thumbnail, url: video.url, videoId: video.videoId, duration: video.duration,
          lyricsExcerpt: lyrics?.plainLyrics ? createLyricsExcerpt(lyrics.plainLyrics) : null,
          lyricsPlain: lyrics?.plainLyrics ?? null, lyricsSynced: lyrics?.syncedLyrics ?? null,
          albumName: lyrics?.albumName ?? null, lrclibId: lyrics?.id ?? null,
        }
      }))
      return Response.json({ catalogStatus, results })
    } catch (error) {
      logFailure(logger, 'youtube_search', error)
      return providerError(error)
    }
  }
}
