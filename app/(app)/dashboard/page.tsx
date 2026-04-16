import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/page-header'
import { LaiaFloatingBadge } from '@/components/laia/laia-floating-badge'
import { NextEventCard } from './next-event-card'
import { MembersPreview } from './members-preview'
import { SetlistPreview } from './setlist-preview'
import { LaiaDailyMessage } from './laia-daily-message'
import { DashboardSkeleton } from './dashboard-skeleton'

export default async function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Visão Geral"
        subtitle="Resumo do próximo culto e atividades do ministério"
      />
      <div className="p-6">
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardContent />
        </Suspense>
      </div>
      <LaiaFloatingBadge tip="Como posso ajudar hoje?" />
    </>
  )
}

async function DashboardContent() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch next event
  const today = new Date().toISOString().split('T')[0]
  const { data: nextEvent } = await supabase
    .from('events')
    .select('*')
    .gte('date', today)
    .order('date', { ascending: true })
    .limit(1)
    .single()

  // Fetch event data in parallel if we have an event
  const [eventMembersResult, setlistResult, laiaMessageResult] = await Promise.all([
    nextEvent
      ? supabase
          .from('event_members')
          .select('*, profiles(id, full_name, avatar_url)')
          .eq('event_id', nextEvent.id)
          .order('created_at')
      : Promise.resolve({ data: [] }),
    nextEvent
      ? supabase
          .from('setlist_songs')
          .select('*, profiles(id, full_name)')
          .eq('event_id', nextEvent.id)
          .order('order_index')
          .limit(6)
      : Promise.resolve({ data: [] }),
    user
      ? supabase
          .from('laia_messages')
          .select('content')
          .eq('profile_id', user.id)
          .eq('role', 'assistant')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
      : Promise.resolve({ data: null }),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const eventMembers = (eventMembersResult.data ?? []) as any[]
  const setlistSongs = setlistResult.data ?? []
  const laiaMessage = laiaMessageResult.data?.content ?? null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-5xl">
      {/* Laia daily message */}
      <div className="lg:col-span-2">
        <LaiaDailyMessage message={laiaMessage} />
      </div>

      {/* Next event */}
      <NextEventCard event={nextEvent} userId={user?.id} />

      {/* Scaled members */}
      <MembersPreview members={eventMembers} eventId={nextEvent?.id} songs={setlistSongs} />

      {/* Setlist preview */}
      <SetlistPreview songs={setlistSongs} eventType={nextEvent?.type} />
    </div>
  )
}
