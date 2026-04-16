import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/page-header'
import { LaiaFloatingBadge } from '@/components/laia/laia-floating-badge'
import { PostFeed } from './post-feed'
import { CreatePostModal } from './create-post-modal'

export default async function ComunhaoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  const { data: posts } = await supabase
    .from('communion_posts')
    .select('*, profiles(id, full_name, avatar_url)')
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <>
      <PageHeader
        title="Comunhão"
        subtitle="Estudos bíblicos e reflexões do ministério"
        actions={
          isAdmin ? <CreatePostModal userId={user!.id} /> : undefined
        }
      />
      <div className="p-6 max-w-3xl">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <PostFeed posts={(posts ?? []) as any[]} userId={user!.id} isAdmin={isAdmin} />
      </div>
      <LaiaFloatingBadge tip="Sugestões de versículos temáticos" />
    </>
  )
}
