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

  const isEditor = canEdit(user?.email)

  // Fetch the catalog variations and the base songs separately.
  // Some songs may exist before a variation row is created; those are still
  // rendered as catalog entries so the song never "disappears" from /musicas.
  const [{ data: variationsData }, { data: songsData }] = await Promise.all([
    supabase
      .from('song_variations')
      .select('*, songs(id, title, artist, youtube_url), profiles(id, full_name)')
      .order('created_at', { ascending: false }),
    supabase
      .from('songs')
      .select('id, title, artist, youtube_url, created_at, song_stems(id, stem_type, original_file_name)')
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
    youtube_url: string | null
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
        youtube_url: song.youtube_url,
      },
      profiles: null,
      song_stems: song.song_stems ?? [],
      is_virtual: true,
    })) satisfies SongVariationWithDetails[]

  return [...variations, ...songsWithoutVariation]
}
