import { createClient } from '@/lib/supabase/server'
import { canEdit } from '@/lib/permissions'
import { PageHeader } from '@/components/layout/page-header'
import { LaiaFloatingBadge } from '@/components/laia/laia-floating-badge'
import { CatalogTable } from './catalog-table'
import { AddCatalogSongModal } from './add-catalog-song-modal'
import type { SongVariationWithDetails } from '@/types/database'

export default async function MusicasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: currentProfile } = user
    ? await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    : { data: null }
  const isEditor = canEdit(user?.email) || currentProfile?.role === 'admin'

  // Fetch the catalog variations and the base songs separately.
  // Some songs may exist before a variation row is created; those are still
  // rendered as catalog entries so the song never "disappears" from /musicas.
  const [{ data: variationsData }, { data: songsData }] = await Promise.all([
    supabase
      .from('song_variations')
      .select('*, songs(id, title, artist, team_mastery, youtube_video_id, youtube_url, youtube_thumbnail, youtube_duration, bpm, default_key, album_name, lyrics_plain, lyrics_synced, metadata_source, metadata_payload), profiles(id, full_name)')
      .order('created_at', { ascending: false }),
    supabase
      .from('songs')
      .select('id, title, artist, team_mastery, youtube_video_id, youtube_url, youtube_thumbnail, youtube_duration, bpm, default_key, album_name, lyrics_plain, lyrics_synced, metadata_source, metadata_payload, created_at, song_stems(id, stem_type, original_file_name)')
      .order('created_at', { ascending: false }),
  ])

  const variations = buildCatalogRows(variationsData ?? [], songsData ?? [])

  // Profiles for the add modal soloist selector
  const { data: activeProfiles } = isEditor
    ? await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('status', 'active')
        .order('full_name')
    : { data: [] }

  return (
    <>
      <PageHeader
        title="Músicas"
        subtitle="Catálogo geral de músicas do ministério"
        actions={
          isEditor ? (
            <AddCatalogSongModal profiles={activeProfiles ?? []} />
          ) : undefined
        }
      />
      <div className="p-6">
        <CatalogTable
          variations={variations}
          isEditor={isEditor}
          profiles={activeProfiles ?? []}
        />
      </div>
      <LaiaFloatingBadge tip="Sugestão de músicas para o culto" />
    </>
  )
}


function buildCatalogRows(variationsData: unknown[], songsData: unknown[]): SongVariationWithDetails[] {
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
    default_key: string | null
    album_name: string | null
    lyrics_plain: string | null
    lyrics_synced: string | null
    metadata_source: string | null
    metadata_payload: import('@/types/database').Json
    created_at: string
    song_stems?: Array<{ id: string; stem_type: string; original_file_name: string | null }> | null
  }>
  const stemsBySongId = new Map(songs.map((song) => [song.id, song.song_stems ?? []]))
  const variations = (variationsData as SongVariationWithDetails[]).map((variation) => ({
    ...variation,
    song_stems: stemsBySongId.get(variation.song_id) ?? [],
  }))
  const variationSongIds = new Set(variations.map((variation) => variation.song_id))

  const songsWithoutVariation = songs
    .filter((song) => !variationSongIds.has(song.id))
    .map((song) => ({
      id: `song:${song.id}`,
      song_id: song.id,
      artist: song.artist,
      key_note: null,
      moment: null,
      soloist_id: null,
      version: null,
      youtube_url: song.youtube_url,
      created_by: null,
      created_at: song.created_at,
      songs: {
        id: song.id,
        title: song.title,
        artist: song.artist,
        team_mastery: song.team_mastery,
        youtube_url: song.youtube_url,
        youtube_video_id: song.youtube_video_id,
        youtube_thumbnail: song.youtube_thumbnail,
        youtube_duration: song.youtube_duration,
        bpm: song.bpm,
        default_key: song.default_key,
        album_name: song.album_name,
        lyrics_plain: song.lyrics_plain,
        lyrics_synced: song.lyrics_synced,
        metadata_source: song.metadata_source,
        metadata_payload: song.metadata_payload,
      },
      profiles: null,
      song_stems: song.song_stems ?? [],
      is_virtual: true,
    })) satisfies SongVariationWithDetails[]

  return [...variations, ...songsWithoutVariation]
}
