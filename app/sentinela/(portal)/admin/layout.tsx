import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sentinela/entrar')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  // Until season memberships have their own table, the platform admin role is the season role source of truth.
  const seasonRole = profile?.role === 'admin' ? 'season_admin' : 'participant'
  if (seasonRole !== 'season_admin') redirect('/sentinela/overview')
  return children
}
