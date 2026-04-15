'use client'

import { useEffect, useMemo, useState } from 'react'
import { X, Clock, Check } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { MomentBadge } from '@/components/ui/moment-badge'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { EventMember, Profile, SetlistSong } from '@/types/database'

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
  userId,
  onClose,
}: Omit<DayDetailModalProps, 'isAdmin'> & { isAdmin?: boolean }) {
  const supabase = useMemo(() => createClient(), [])
  const [selectedEvent, setSelectedEvent] = useState(events[0])
  const [members, setMembers] = useState<EventMemberWithProfile[]>([])
  const [songs, setSongs] = useState<EventSetlistSong[]>([])
  const [myMembership, setMyMembership] = useState<EventMemberWithProfile | null>(null)
  const [optimisticConfirmed, setOptimisticConfirmed] = useState(false)
  const [loading, setLoading] = useState(true)

  const parsedDate = new Date(date + 'T12:00:00')
  const formattedDate = `${parsedDate.getDate()} de ${MONTHS_PT[parsedDate.getMonth()]} de ${parsedDate.getFullYear()}`

  useEffect(() => {
    async function fetchEventData() {
      setLoading(true)
      const [membersResult, songsResult] = await Promise.all([
        supabase
          .from('event_members')
          .select('*, profiles(id, full_name, avatar_url)')
          .eq('event_id', selectedEvent.id),
        supabase
          .from('setlist_songs')
          .select('id, song_title, key_note, moment, order_index')
          .eq('event_id', selectedEvent.id)
          .order('order_index'),
      ])

      const membersList = (membersResult.data ?? []) as EventMemberWithProfile[]
      setMembers(membersList)
      setSongs((songsResult.data ?? []) as EventSetlistSong[])

      const mine = membersList.find((m) => m.profile_id === userId)
      setMyMembership(mine ?? null)
      setOptimisticConfirmed(mine?.confirmed ?? false)
      setLoading(false)
    }

    fetchEventData()
  }, [selectedEvent.id, supabase, userId])

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
            <h3 className="text-lg font-bold text-white mb-2">{selectedEvent.title}</h3>
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
