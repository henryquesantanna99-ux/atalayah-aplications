'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Clock, Check, Trash2, UserPlus } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { MomentBadge } from '@/components/ui/moment-badge'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { EventMember, Profile, SetlistSong } from '@/types/database'
import { assignEventMember, deleteEvent, removeEventMember } from './actions'
import { EventFormModal } from './event-form-modal'

const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

interface CalendarEvent {
  id: string
  title: string
  type: string
  date: string
  arrival_time: string | null
  start_time: string | null
  notes: string | null
}

interface DayDetailModalProps {
  date: string
  events: CalendarEvent[]
  isAdmin: boolean
  userId: string
  onClose: () => void
}

type EventMemberWithProfile = EventMember & {
  profiles: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
}

type EventSetlistSong = Pick<
  SetlistSong,
  'id' | 'song_title' | 'key_note' | 'moment' | 'order_index'
>

export function DayDetailModal({
  date,
  events,
  isAdmin = false,
  userId,
  onClose,
}: DayDetailModalProps) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [selectedEvent, setSelectedEvent] = useState(events[0])
  const [members, setMembers] = useState<EventMemberWithProfile[]>([])
  const [songs, setSongs] = useState<EventSetlistSong[]>([])
  const [profiles, setProfiles] = useState<Pick<Profile, 'id' | 'full_name'>[]>([])
  const [myMembership, setMyMembership] = useState<EventMemberWithProfile | null>(null)
  const [optimisticConfirmed, setOptimisticConfirmed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedProfileId, setSelectedProfileId] = useState('')
  const [instrument, setInstrument] = useState('')
  const [adminProcessing, setAdminProcessing] = useState<string | null>(null)

  const parsedDate = new Date(date + 'T12:00:00')
  const formattedDate = `${parsedDate.getDate()} de ${MONTHS_PT[parsedDate.getMonth()]} de ${parsedDate.getFullYear()}`

  useEffect(() => {
    async function fetchEventData() {
      setLoading(true)
      const [membersResult, songsResult, profilesResult] = await Promise.all([
        supabase
          .from('event_members')
          .select('*, profiles(id, full_name, avatar_url)')
          .eq('event_id', selectedEvent.id),
        supabase
          .from('setlist_songs')
          .select('id, song_title, key_note, moment, order_index')
          .eq('event_id', selectedEvent.id)
          .order('order_index'),
        isAdmin
          ? supabase
              .from('profiles')
              .select('id, full_name')
              .eq('status', 'active')
              .order('full_name')
          : Promise.resolve({ data: [] }),
      ])

      const membersList = (membersResult.data ?? []) as EventMemberWithProfile[]
      setMembers(membersList)
      setSongs((songsResult.data ?? []) as EventSetlistSong[])
      setProfiles((profilesResult.data ?? []) as Pick<Profile, 'id' | 'full_name'>[])

      const mine = membersList.find((m) => m.profile_id === userId)
      setMyMembership(mine ?? null)
      setOptimisticConfirmed(mine?.confirmed ?? false)
      setSelectedProfileId('')
      setInstrument('')
      setLoading(false)
    }

    fetchEventData()
  }, [isAdmin, selectedEvent.id, supabase, userId])

  async function handleConfirm() {
    if (!myMembership) return
    setOptimisticConfirmed(true)

    const { error } = await supabase
      .from('event_members')
      .update({ confirmed: true, confirmed_at: new Date().toISOString() })
      .eq('id', myMembership.id)

    if (error) {
      setOptimisticConfirmed(false)
      toast.error('Erro ao confirmar presença.')
    } else {
      toast.success('Presença confirmada!')
    }
  }

  async function handleDeleteEvent() {
    const confirmed = window.confirm(`Excluir o evento "${selectedEvent.title}"?`)
    if (!confirmed) return

    setAdminProcessing(`delete-${selectedEvent.id}`)
    try {
      await deleteEvent(selectedEvent.id)
      toast.success('Evento excluído.')
      onClose()
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir evento.')
    } finally {
      setAdminProcessing(null)
    }
  }

  async function handleAssignMember(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedProfileId) {
      toast.error('Selecione um integrante.')
      return
    }

    setAdminProcessing('assign-member')
    try {
      await assignEventMember({
        eventId: selectedEvent.id,
        profileId: selectedProfileId,
        instrument: instrument.trim() || null,
      })
      toast.success('Integrante adicionado à escala.')
      setSelectedProfileId('')
      setInstrument('')
      router.refresh()

      const { data } = await supabase
        .from('event_members')
        .select('*, profiles(id, full_name, avatar_url)')
        .eq('event_id', selectedEvent.id)
      setMembers((data ?? []) as EventMemberWithProfile[])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao atribuir integrante.')
    } finally {
      setAdminProcessing(null)
    }
  }

  async function handleRemoveMember(eventMemberId: string) {
    setAdminProcessing(`remove-${eventMemberId}`)
    try {
      await removeEventMember(eventMemberId)
      setMembers((current) => current.filter((member) => member.id !== eventMemberId))
      toast.success('Integrante removido da escala.')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao remover integrante.')
    } finally {
      setAdminProcessing(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="day-detail-title"
    >
      <div className="w-full sm:max-w-lg bg-navy-900 border border-white/[0.08] rounded-t-2xl sm:rounded-modal shadow-2xl max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] sticky top-0 bg-navy-900">
          <div>
            <h2 id="day-detail-title" className="text-base font-semibold text-white">
              {formattedDate}
            </h2>
            <p className="text-xs text-[#64748B]">{events.length} evento(s)</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="p-1.5 rounded-card text-[#64748B] hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Event selector (if multiple events) */}
        {events.length > 1 && (
          <div className="flex gap-2 px-5 pt-4 overflow-x-auto">
            {events.map((event) => (
              <button
                key={event.id}
                onClick={() => setSelectedEvent(event)}
                className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  selectedEvent.id === event.id
                    ? 'bg-brand/20 border-brand/40 text-brand'
                    : 'border-white/[0.06] text-[#94A3B8] hover:border-white/20'
                }`}
              >
                {event.title}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="px-5 py-4 space-y-5">
          {/* Event info */}
          <div>
            <div className="flex items-start justify-between gap-3 mb-2">
              <h3 className="text-lg font-bold text-white">{selectedEvent.title}</h3>
              {isAdmin && (
                <div className="flex items-center gap-2">
                  <EventFormModal
                    event={selectedEvent}
                    triggerLabel="Editar"
                    triggerVariant="ghost"
                  />
                  <button
                    type="button"
                    onClick={handleDeleteEvent}
                    disabled={adminProcessing === `delete-${selectedEvent.id}`}
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-card border border-red-500/20 text-red-300 hover:text-red-200 hover:border-red-400/40 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    Excluir
                  </button>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-[#94A3B8]">
              {selectedEvent.arrival_time && (
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-brand" aria-hidden="true" />
                  Chegada: <strong className="text-white">{selectedEvent.arrival_time.slice(0, 5)}</strong>
                </div>
              )}
              {selectedEvent.start_time && (
                <span>
                  Início: <strong className="text-white">{selectedEvent.start_time.slice(0, 5)}</strong>
                </span>
              )}
            </div>
            {selectedEvent.notes && (
              <p className="text-sm text-[#94A3B8] mt-2">{selectedEvent.notes}</p>
            )}
          </div>

          {loading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-24 rounded-card bg-navy-800" />
              <div className="h-32 rounded-card bg-navy-800" />
            </div>
          ) : (
            <>
              {/* Confirm presence */}
              {myMembership && !optimisticConfirmed && (
                <button
                  onClick={handleConfirm}
                  className="w-full py-2.5 rounded-card bg-brand/20 border border-brand/30 text-brand text-sm font-medium hover:bg-brand/30 transition-colors"
                >
                  Confirmar minha presença
                </button>
              )}
              {myMembership && optimisticConfirmed && (
                <div className="flex items-center justify-center gap-2 py-2 text-sm text-emerald-400">
                  <Check className="w-4 h-4" aria-hidden="true" />
                  Presença confirmada
                </div>
              )}

              {isAdmin && (
                <form
                  onSubmit={handleAssignMember}
                  className="space-y-3 rounded-card border border-white/[0.06] bg-navy-800/50 p-3"
                >
                  <div className="flex items-center gap-2 text-xs font-medium text-[#94A3B8] uppercase tracking-wide">
                    <UserPlus className="w-4 h-4 text-brand" aria-hidden="true" />
                    Atribuir integrante
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px_auto] gap-2">
                    <select
                      value={selectedProfileId}
                      onChange={(event) => setSelectedProfileId(event.target.value)}
                      className="px-3 py-2 rounded-card bg-navy-900 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-brand"
                    >
                      <option value="">Selecione um integrante</option>
                      {profiles
                        .filter((profile) => !members.some((member) => member.profile_id === profile.id))
                        .map((profile) => (
                          <option key={profile.id} value={profile.id}>
                            {profile.full_name ?? 'Sem nome'}
                          </option>
                        ))}
                    </select>
                    <input
                      value={instrument}
                      onChange={(event) => setInstrument(event.target.value)}
                      placeholder="Função"
                      className="px-3 py-2 rounded-card bg-navy-900 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-brand placeholder-[#64748B]"
                    />
                    <button
                      type="submit"
                      disabled={adminProcessing === 'assign-member'}
                      className="px-3 py-2 rounded-card bg-brand text-white text-sm font-medium hover:bg-brand-light transition-colors disabled:opacity-60"
                    >
                      Adicionar
                    </button>
                  </div>
                </form>
              )}

              {/* Members */}
              {members.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-[#64748B] uppercase tracking-wide mb-3">
                    Integrantes Escalados ({members.length})
                  </h4>
                  <ul className="space-y-2">
                    {members.map((member) => (
                      <li key={member.id} className="flex items-center gap-2.5">
                        <Avatar className="w-7 h-7">
                          <AvatarImage
                            src={member.profiles?.avatar_url ?? undefined}
                            alt={member.profiles?.full_name ?? 'Integrante'}
                          />
                          <AvatarFallback className="bg-navy-700 text-white text-xs">
                            {member.profiles?.full_name?.[0] ?? '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-white flex-1">{member.profiles?.full_name}</span>
                        {member.instrument && (
                          <span className="text-xs text-[#64748B]">{member.instrument}</span>
                        )}
                        {member.confirmed ? (
                          <Check className="w-4 h-4 text-emerald-400" aria-label="Confirmado" />
                        ) : (
                          <Clock className="w-4 h-4 text-yellow-400/50" aria-label="Pendente" />
                        )}
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(member.id)}
                            disabled={adminProcessing === `remove-${member.id}`}
                            aria-label={`Remover ${member.profiles?.full_name ?? 'integrante'} da escala`}
                            className="p-1 rounded text-red-300 hover:text-red-200 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                          >
                            <X className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Setlist */}
              {songs.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-[#64748B] uppercase tracking-wide mb-3">
                    Setlist ({songs.length} músicas)
                  </h4>
                  <ul className="space-y-1.5">
                    {songs.map((song, index) => (
                      <li key={song.id} className="flex items-center gap-2.5 text-sm">
                        <span className="text-xs text-[#64748B] w-5 text-right">{index + 1}</span>
                        <span className="text-white flex-1">{song.song_title}</span>
                        {song.key_note && (
                          <span className="text-xs font-mono text-[#94A3B8] bg-white/[0.06] px-1.5 py-0.5 rounded">
                            {song.key_note}
                          </span>
                        )}
                        <MomentBadge moment={song.moment} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
