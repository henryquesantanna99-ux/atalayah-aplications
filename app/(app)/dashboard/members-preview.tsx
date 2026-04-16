'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Clock, Users } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/components/layout/profile-context'
import { toast } from 'sonner'

interface MemberWithProfile {
  id: string
  profile_id: string
  instrument: string | null
  confirmed: boolean
  profiles: {
    id: string
    full_name: string | null
    avatar_url: string | null
  } | null
}

interface SongWithSoloist {
  id: string
  song_title: string
  soloist_id: string | null
}

interface MembersPreviewProps {
  members: MemberWithProfile[]
  eventId?: string
  songs: SongWithSoloist[]
}

export function MembersPreview({ members, eventId, songs }: MembersPreviewProps) {
  const profile = useProfile()
  const supabase = createClient()
  const [localMembers, setLocalMembers] = useState(members)

  const myMembership = localMembers.find((m) => m.profile_id === profile.id)
  const confirmedCount = localMembers.filter((m) => m.confirmed).length

  async function handleConfirm() {
    if (!myMembership || !eventId) return

    // Optimistic update
    setLocalMembers((prev) =>
      prev.map((m) =>
        m.id === myMembership.id ? { ...m, confirmed: true } : m
      )
    )

    const { error } = await supabase
      .from('event_members')
      .update({ confirmed: true, confirmed_at: new Date().toISOString() })
      .eq('id', myMembership.id)

    if (error) {
      // Revert
      setLocalMembers(members)
      toast.error('Erro ao confirmar presença. Tente novamente.')
    } else {
      toast.success('Presença confirmada!')
    }
  }

  return (
    <div className="bg-navy-900 border border-white/[0.06] rounded-modal p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-[#94A3B8]">Integrantes Escalados</h2>
        <span className="text-xs text-[#64748B]">
          {confirmedCount}/{localMembers.length} confirmados
        </span>
      </div>

      {localMembers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <Users className="w-8 h-8 text-[#64748B] mb-2" aria-hidden="true" />
          <p className="text-sm text-[#64748B]">Nenhum integrante escalado ainda.</p>
        </div>
      ) : (
        <>
          <ul className="space-y-2 mb-4">
            {localMembers.slice(0, 5).map((member) => (
              <li key={member.id} className="flex items-center gap-3">
                <Avatar className="w-7 h-7 flex-shrink-0">
                  <AvatarImage
                    src={member.profiles?.avatar_url ?? undefined}
                    alt={member.profiles?.full_name ?? 'Membro'}
                  />
                  <AvatarFallback className="bg-navy-700 text-white text-xs">
                    {member.profiles?.full_name?.[0] ?? '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">
                    {member.profiles?.full_name ?? 'Membro'}
                  </p>
                  <p className="text-xs text-[#64748B]">
                    {member.instrument ?? 'Função não definida'}
                  </p>
                  {member.instrument?.toLowerCase().includes('vocal') && (
                    <p className="text-xs text-brand truncate">
                      {songs
                        .filter((song) => song.soloist_id === member.profile_id)
                        .map((song) => song.song_title)
                        .join(', ') || 'Sem músicas atribuídas'}
                    </p>
                  )}
                </div>
                <div aria-label={member.confirmed ? 'Confirmado' : 'Pendente'}>
                  {member.confirmed ? (
                    <Check className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                  ) : (
                    <Clock className="w-4 h-4 text-yellow-400/60" aria-hidden="true" />
                  )}
                </div>
              </li>
            ))}
          </ul>

          {localMembers.length > 5 && (
            <p className="text-xs text-[#64748B] mb-3">
              +{localMembers.length - 5} outros integrantes
            </p>
          )}

          {myMembership && !myMembership.confirmed && (
            <button
              onClick={handleConfirm}
              className="w-full py-2.5 rounded-card bg-brand/20 border border-brand/30 text-brand text-sm font-medium hover:bg-brand/30 transition-colors"
            >
              Confirmar minha presença
            </button>
          )}

          {myMembership?.confirmed && (
            <div className="flex items-center justify-center gap-2 py-2 text-sm text-emerald-400">
              <Check className="w-4 h-4" aria-hidden="true" />
              Presença confirmada
            </div>
          )}
        </>
      )}

      <Link
        href="/agenda"
        className="block text-center text-xs text-[#64748B] hover:text-[#94A3B8] mt-3 transition-colors"
      >
        Ver agenda completa →
      </Link>
    </div>
  )
}
