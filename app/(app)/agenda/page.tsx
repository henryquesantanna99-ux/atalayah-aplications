import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/page-header'
import { LaiaFloatingBadge } from '@/components/laia/laia-floating-badge'
import { MonthlyCalendar } from './monthly-calendar'
import { EventFormModal } from './event-form-modal'

interface AgendaPageProps {
  searchParams: { year?: string; month?: string }
}

export default async function AgendaPage({ searchParams }: AgendaPageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const now = new Date()
  const year = parseInt(searchParams.year ?? String(now.getFullYear()))
  const month = parseInt(searchParams.month ?? String(now.getMonth() + 1))

  // Fetch events for current month ± 1 month for navigation
  const startDate = new Date(year, month - 2, 1).toISOString().split('T')[0]
  const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0]

  const { data: events } = await supabase
    .from('events')
    .select('id, title, type, date, arrival_time, start_time, notes')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  return (
    <>
      <PageHeader
        title="Agenda"
        subtitle="Visualize e gerencie os eventos do ministério"
        actions={isAdmin ? <EventFormModal /> : undefined}
      />
      <div className="p-6">
        <MonthlyCalendar
          events={events ?? []}
          year={year}
          month={month}
          isAdmin={isAdmin}
          userId={user!.id}
        />
      </div>
      <LaiaFloatingBadge tip="Confirme sua presença nos cultos!" />
    </>
  )
}
