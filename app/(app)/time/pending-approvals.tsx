'use client'

import { useState } from 'react'
import { UserCheck, UserX } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { updateMemberStatus } from './actions'
import { toast } from 'sonner'
import type { Profile } from '@/types/database'

interface PendingApprovalsProps {
  members: Profile[]
}

export function PendingApprovals({ members }: PendingApprovalsProps) {
  const [processing, setProcessing] = useState<string | null>(null)

  async function handleApprove(profileId: string) {
    setProcessing(profileId)
    try {
      await updateMemberStatus(profileId, 'active')
      toast.success('Membro aprovado!')
    } catch {
      toast.error('Erro ao aprovar membro.')
    } finally {
      setProcessing(null)
    }
  }

  async function handleReject(profileId: string) {
    setProcessing(profileId)
    try {
      await updateMemberStatus(profileId, 'inactive')
      toast.success('Solicitação rejeitada.')
    } catch {
      toast.error('Erro ao processar solicitação.')
    } finally {
      setProcessing(null)
    }
  }

  return (
    <div className="bg-yellow-900/10 border border-yellow-700/30 rounded-modal p-4">
      <h2 className="text-sm font-semibold text-yellow-300 mb-3">
        Aprovações Pendentes ({members.length})
      </h2>
      <ul className="space-y-2">
        {members.map((member) => (
          <li
            key={member.id}
            className="flex items-center gap-3 bg-black/20 rounded-card px-3 py-2"
          >
            <Avatar className="w-8 h-8">
              <AvatarImage src={member.avatar_url ?? undefined} alt={member.full_name ?? 'Membro'} />
              <AvatarFallback className="bg-navy-700 text-white text-xs">
                {member.full_name?.[0] ?? '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {member.full_name ?? 'Sem nome'}
              </p>
              <p className="text-xs text-[#64748B]">{member.email}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleApprove(member.id)}
                disabled={processing === member.id}
                aria-label={`Aprovar ${member.full_name}`}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-card bg-emerald-900/40 border border-emerald-700/40 text-emerald-300 hover:bg-emerald-900/60 transition-colors disabled:opacity-50"
              >
                <UserCheck className="w-3.5 h-3.5" aria-hidden="true" />
                Aprovar
              </button>
              <button
                onClick={() => handleReject(member.id)}
                disabled={processing === member.id}
                aria-label={`Rejeitar ${member.full_name}`}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-card bg-red-900/40 border border-red-700/40 text-red-300 hover:bg-red-900/60 transition-colors disabled:opacity-50"
              >
                <UserX className="w-3.5 h-3.5" aria-hidden="true" />
                Rejeitar
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
