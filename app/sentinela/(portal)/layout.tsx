import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SentinelaNavigation } from '../_components/navigation'

export default async function SentinelaPortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sentinela/entrar')
  return <div className="min-h-screen"><a href="#sentinela-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-amber-300 focus:px-4 focus:py-2 focus:text-slate-950">Pular para o conteúdo</a><SentinelaNavigation/><main id="sentinela-content" className="min-h-screen px-5 pb-28 pt-7 lg:ml-64 lg:px-10 lg:pb-10">{children}</main></div>
}
