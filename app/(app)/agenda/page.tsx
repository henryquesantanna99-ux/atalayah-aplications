import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/page-header'
import { LaiaFloatingBadge } from '@/components/laia/laia-floating-badge'
import { MonthlyCalendar } from './monthly-calendar'
import { EventFormModal } from './event-form-modal'
import { ScaleFormModal } from './scale-form-modal'
import type { ScaleEventOption, ScaleProfile } from './scale-form-modal'

interface AgendaPageProps {
  searchParams: { year?: string; month?: string; scaleMembers?: string }
}

export default async function AgendaPage({ searchParams }: AgendaPageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const now = new Date()
  const year = parseInt(searchParams.year ?? String(now.getFullYear()))
  const month = parseInt(searchParams.month ?? String(now.getMonth() + 1))
  const initialScaleMemberIds = searchParams.scaleMembers
    ?.split(',')
    .map((id) => id.trim())
    .filter(Boolean) ?? []

  // Fetch the full year so the monthly and annual views share the same data.
  const startDate = new Date(year, 0, 1).toISOString().split('T')[0]
  const endDate = new Date(year, 11, 31).toISOString().split('T')[0]

  const { data: events } = await supabase
    .from('events')
    .select('id, title, type, date, arrival_time, start_time, notes, agenda_topic, conductor_id, location, is_online, meet_link')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  const [{ data: scaleEvents }, { data: scaleProfiles }] = isAdmin
    ? await Promise.all([
        supabase
          .from('events')
          .select('id, title, type, date, arrival_time, start_time, notes, agenda_topic, conductor_id, location, is_online, meet_link')
          .order('date', { ascending: false })
          .limit(40),
        supabase
          .from('profiles')
          .select('id, full_name, team_members(teams, instruments, function_role)')
          .eq('status', 'active')
          .order('full_name'),
      ])
    : [{ data: [] }, { data: [] }]

  return (
    <>
      <PageHeader
        title="Agenda"
        subtitle="Visualize e gerencie os eventos do ministério"
        actions={
          isAdmin ? (
            <div className="flex flex-wrap items-center gap-2">
              <ScaleFormModal
                events={(scaleEvents ?? []) as ScaleEventOption[]}
                profiles={(scaleProfiles ?? []) as ScaleProfile[]}
                initialSelectedMemberIds={initialScaleMemberIds}
              />
              <EventFormModal profiles={(scaleProfiles ?? []) as ScaleProfile[]} />
            </div>
          ) : undefined
        }
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
