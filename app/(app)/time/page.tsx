/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/page-header'
import { LaiaFloatingBadge } from '@/components/laia/laia-floating-badge'
import { PendingApprovals } from './pending-approvals'
import { TeamTable } from './team-table'
import type { ProfileWithTeam } from '@/types/database'

export default async function TimePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single()

  const isAdmin = currentProfile?.role === 'admin'

  // Fetch all active/inactive members with their team data
  const { data: members } = await supabase
    .from('profiles')
    .select('*, team_members(*)')
    .in('status', ['active', 'inactive'])
    .order('full_name')

  // Fetch pending members (admin only)
  const { data: pendingMembers } = isAdmin
    ? await supabase
        .from('profiles')
        .select('*')
        .eq('status', 'pending')
        .order('created_at')
    : { data: [] }

  const { data: scales } = isAdmin
    ? await supabase
        .from('events')
        .select(`
          id,
          title,
          type,
          date,
          start_time,
          event_members(id, instrument, profiles(id, full_name)),
          setlist_songs(id, song_title, key_note, profiles(id, full_name))
        `)
        .order('date', { ascending: false })
        .limit(50)
    : { data: [] }

  return (
    <>
      <PageHeader
        title="Time"
        subtitle="Gerencie os integrantes do ministério"
      />
      <div className="p-6 space-y-6">
        {isAdmin && (pendingMembers?.length ?? 0) > 0 && (
          <PendingApprovals members={pendingMembers ?? []} />
        )}
        <TeamTable
          members={(members ?? []) as ProfileWithTeam[]}
          isAdmin={isAdmin}
          currentUserId={user!.id}
          scales={(scales ?? []) as any[]}
        />
      </div>
      <LaiaFloatingBadge tip="Dicas de gestão de equipes" />
    </>
  )
}
