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

  const { data: currentProfile } = user
    ? await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    : { data: null }
  const isEditor = canEdit(currentProfile?.role)

  const startDate = new Date(year, 0, 1).toISOString().split('T')[0]
  const endDate = new Date(year, 11, 31).toISOString().split('T')[0]

  const { data: events } = await supabase
    .from('events')
    .select('id, title, type, date, arrival_time, start_time, notes, agenda_topic, conductor_id, location, is_online, meet_link, google_calendar_event_id')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date')

  let editorProfiles: ProfileOption[] = []

  if (isEditor) {
    // Keep these as two typed queries. The generated database types do not expose
    // a profiles -> team_members relationship, so an embedded select is inferred
    // as SelectQueryError during production type-checking.
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('status', 'active')
      .order('full_name')

    const profileIds = (profiles ?? []).map((profile) => profile.id)
    const { data: memberships } = profileIds.length
      ? await supabase
          .from('team_members')
          .select('profile_id, teams, instruments, function_role')
          .in('profile_id', profileIds)
      : { data: [] }

    const membershipsByProfile = new Map<string, ProfileOption['team_members']>()
    for (const membership of memberships ?? []) {
      const current = membershipsByProfile.get(membership.profile_id) ?? []
      current.push({
        teams: membership.teams,
        instruments: membership.instruments,
        function_role: membership.function_role,
      })
      membershipsByProfile.set(membership.profile_id, current)
    }

    editorProfiles = (profiles ?? []).map((profile) => ({
      ...profile,
      team_members: membershipsByProfile.get(profile.id) ?? [],
    }))
  }

  return (
    <>
      <PageHeader
        title="Agenda"
        subtitle="Visualize e gerencie os eventos do ministério"
        actions={
          isEditor ? (
            <EventFormModal profiles={editorProfiles} />
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
