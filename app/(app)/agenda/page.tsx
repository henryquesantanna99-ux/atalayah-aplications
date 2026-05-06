import { createClient } from '@/lib/supabase/server'
import { canEdit } from '@/lib/permissions'
import { PageHeader } from '@/components/layout/page-header'
import { LaiaFloatingBadge } from '@/components/laia/laia-floating-badge'
import { MonthlyCalendar } from './monthly-calendar'
import { EventFormModal } from './event-form-modal'
import type { ProfileOption } from './event-form-modal'

interface AgendaPageProps {
  searchParams: { year?: string; month?: string }
}

export default async function AgendaPage({ searchParams }: AgendaPageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const now = new Date()
  const year = parseInt(searchParams.year ?? String(now.getFullYear()))
  const month = parseInt(searchParams.month ?? String(now.getMonth() + 1))

  const isEditor = canEdit(user?.email)

  const startDate = new Date(year, 0, 1).toISOString().split('T')[0]
  const endDate = new Date(year, 11, 31).toISOString().split('T')[0]

  const { data: events } = await supabase
    .from('events')
    .select('id, title, type, date, arrival_time, start_time, notes, agenda_topic, conductor_id, location, is_online, meet_link, google_calendar_event_id')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date')

  const { data: editorProfiles } = isEditor
    ? await supabase
        .from('profiles')
        .select('id, full_name, team_members(teams, instruments, function_role)')
        .eq('status', 'active')
        .order('full_name')
    : { data: [] }

  return (
    <>
      <PageHeader
        title="Agenda"
        subtitle="Visualize e gerencie os eventos do ministério"
        actions={
          isEditor ? (
            <EventFormModal profiles={(editorProfiles ?? []) as ProfileOption[]} />
          ) : undefined
        }
      />
      <div className="p-6">
        <MonthlyCalendar
          events={events ?? []}
          year={year}
          month={month}
          isAdmin={isEditor}
          userId={user!.id}
        />
      </div>
      <LaiaFloatingBadge tip="Confirme sua presença nos cultos!" />
    </>
  )
}
