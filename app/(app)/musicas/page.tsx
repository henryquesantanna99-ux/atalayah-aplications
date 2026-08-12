import { createClient } from '@/lib/supabase/server'
import { canEdit } from '@/lib/permissions'
import { PageHeader } from '@/components/layout/page-header'
import { LaiaFloatingBadge } from '@/components/laia/laia-floating-badge'
import { CatalogTable } from './catalog-table'
import { AddCatalogSongModal } from './add-catalog-song-modal'
import type { CatalogSong } from './catalog-types'

export default async function MusicasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: currentProfile } = user
    ? await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    : { data: null }
  const isEditor = canEdit(currentProfile?.role)

  // Fetch the catalog variations and the base songs separately.
  // Some songs may exist before a variation row is created; those are still
  // rendered as catalog entries so the song never "disappears" from /musicas.
  const [variationsResult, songsResult] = await Promise.all([
    supabase
      .from('song_variations')
      .select('id, song_id, version, songs!inner(is_catalog_visible)')
      .eq('songs.is_catalog_visible', true)
      .order('created_at', { ascending: false }),
    supabase
      .from('songs')
      .select('id, title, artist, team_mastery, youtube_video_id, youtube_url, youtube_thumbnail, youtube_duration, bpm, default_key, album_name, lyrics_plain, lyrics_synced, metadata_source, metadata_payload, created_at, song_stems(id, stem_type, original_file_name)')
      .eq('is_catalog_visible', true)
      .order('created_at', { ascending: false }),
  ])

  if (variationsResult.error || songsResult.error) {
    console.error('Falha ao carregar catálogo de músicas', {
      variations: variationsResult.error?.message,
      songs: songsResult.error?.message,
    })
    return <CatalogReadError />
  }

  const variations = buildCatalogRows(variationsResult.data, songsResult.data)

  return (
    <>
      <PageHeader
        title="Músicas"
        subtitle="Catálogo geral de músicas do ministério"
        actions={
          isEditor ? (
            <AddCatalogSongModal />
          ) : undefined
        }
      />
      <div className="p-6">
        <CatalogTable
          variations={variations}
          isEditor={isEditor}
        />
      </div>
      <LaiaFloatingBadge tip="Sugestão de músicas para o culto" />
    </>
  )
}


function buildCatalogRows(variationsData: unknown[], songsData: unknown[]): CatalogSong[] {
  const songs = songsData as Array<{
    id: string
    title: string
    artist: string | null
    team_mastery: import('@/types/database').TeamMastery
    youtube_url: string | null
    youtube_video_id: string | null
    youtube_thumbnail: string | null
    youtube_duration: string | null
    bpm: number | null
    album_name: string | null
    lyrics_plain: string | null
    lyrics_synced: string | null
    metadata_source: string | null
    metadata_payload: import('@/types/database').Json
    created_at: string
    song_stems?: Array<{ id: string; stem_type: string; original_file_name: string | null }> | null
  }>
  const firstVariation = new Map<string, { id: string; song_id: string; version: string | null }>()
  for (const variation of variationsData as Array<{ id: string; song_id: string; version: string | null }>) {
    if (!firstVariation.has(variation.song_id)) firstVariation.set(variation.song_id, variation)
  }

  return songs.map((song) => {
    const variation = firstVariation.get(song.id)
    return {
      id: variation?.id ?? `song:${song.id}`,
      songId: song.id,
      variationId: variation?.id ?? null,
      title: song.title,
      artist: song.artist,
      version: variation?.version ?? null,
      youtubeUrl: song.youtube_url,
      youtubeVideoId: song.youtube_video_id,
      youtubeThumbnail: song.youtube_thumbnail,
      youtubeDuration: song.youtube_duration,
      bpm: song.bpm,
      albumName: song.album_name,
      lyricsPlain: song.lyrics_plain,
      lyricsSynced: song.lyrics_synced,
      metadataSource: song.metadata_source,
      metadataPayload: song.metadata_payload,
      teamMastery: song.team_mastery,
      stems: song.song_stems ?? [],
    }
  })
}

function CatalogReadError() {
  return (
    <div className="p-6">
      <div role="alert" className="rounded-modal border border-red-400/30 bg-red-400/10 p-6 text-red-100">
        <h1 className="text-lg font-semibold">Não foi possível carregar o catálogo</h1>
        <p className="mt-2 text-sm text-red-100/80">Ocorreu uma falha ao consultar as músicas. Tente atualizar a página em alguns instantes.</p>
      </div>
    </div>
  )
}
