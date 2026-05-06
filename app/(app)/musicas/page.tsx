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

  // Fetch all song variations (catalog)
  const { data: variationsData } = await supabase
    .from('song_variations')
    .select('*, songs(id, title, artist, youtube_url), profiles(id, full_name)')
    .order('created_at', { ascending: false })

  const variations = (variationsData ?? []) as unknown as SongVariationWithDetails[]

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
