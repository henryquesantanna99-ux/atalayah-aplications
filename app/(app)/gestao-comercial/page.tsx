import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CommercialDashboard } from './commercial-dashboard'

export default async function GestaoComercialPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  return <CommercialDashboard />
}
