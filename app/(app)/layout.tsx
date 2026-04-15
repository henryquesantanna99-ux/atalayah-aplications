import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { BottomNav } from '@/components/layout/bottom-nav'
import { ProfileProvider } from '@/components/layout/profile-context'
import { QueryProvider } from '@/components/layout/query-provider'
import { Toaster } from 'sonner'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  if (!profile.onboarding_completed || profile.status !== 'active') {
    redirect('/onboarding')
  }

  return (
    <QueryProvider>
      <ProfileProvider profile={profile}>
        {/* Skip to main content for accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-brand focus:text-white focus:rounded-card"
        >
          Pular para o conteúdo principal
        </a>

        <div className="flex min-h-screen bg-black">
          <Sidebar />

          {/* Main content area (offset for sidebar on desktop) */}
          <main
            id="main-content"
            className="flex-1 lg:ml-[240px] min-h-screen pb-20 lg:pb-0"
          >
            {children}
          </main>
        </div>

        <BottomNav />

        <Toaster
          theme="dark"
          toastOptions={{
            style: {
              background: '#0E1E35',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#fff',
            },
          }}
        />
      </ProfileProvider>
    </QueryProvider>
  )
}
