import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/page-header'
import { LaiaFloatingBadge } from '@/components/laia/laia-floating-badge'
import { SetlistTable } from './setlist-table'
import { AddSongModal } from './add-song-modal'

interface MusicasPageProps {
  searchParams: { eventId?: string }
}

export default async function MusicasPage({ searchParams }: MusicasPageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  // Get all events for the selector
  const { data: events } = await supabase
    .from('events')
    .select('id, title, date, type')
    .order('date', { ascending: false })
    .limit(20)

  // Determine which event to show
  const today = new Date().toISOString().split('T')[0]
  let selectedEventId = searchParams.eventId

  if (!selectedEventId) {
    // Default to next upcoming event
    const { data: nextEvent } = await supabase
      .from('events')
      .select('id')
      .gte('date', today)
      .order('date', { ascending: true })
      .limit(1)
      .single()
    selectedEventId = nextEvent?.id
  }

  // Get setlist for selected event
  const { data: songs } = selectedEventId
    ? await supabase
        .from('setlist_songs')
        .select('*, profiles(id, full_name)')
        .eq('event_id', selectedEventId)
        .order('order_index')
    : { data: [] }

  // Get profiles for soloist selector
  const { data: activeProfiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('status', 'active')
    .order('full_name')

  const selectedEvent = events?.find((e) => e.id === selectedEventId) ?? null

  return (
    <>
      <PageHeader
        title="Músicas"
        subtitle={selectedEvent ? `${selectedEvent.title} — ${formatDate(selectedEvent.date)}` : 'Setlist do próximo culto'}
        actions={
          isAdmin && selectedEventId ? (
            <AddSongModal
              eventId={selectedEventId}
              profiles={activeProfiles ?? []}
            />
          ) : undefined
        }
      />
      <div className="p-6">
        <SetlistTable
          songs={songs ?? []}
          events={events ?? []}
          selectedEventId={selectedEventId ?? null}
          isAdmin={isAdmin}
          profiles={activeProfiles ?? []}
        />
      </div>
      <LaiaFloatingBadge tip="Sugestão de músicas para o culto" />
    </>
  )
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}
