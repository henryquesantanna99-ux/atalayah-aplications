'use client'

import { useState } from 'react'
import {
  MoreHorizontal,
  ShieldCheck,
  UserCheck,
  UserX,
  Search,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { TeamBadge } from '@/components/ui/team-badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { updateMemberStatus, updateMemberRole } from './actions'
import { MemberTeamModal } from './member-team-modal'
import { toast } from 'sonner'
import type { Profile, TeamMember } from '@/types/database'

type MemberWithTeam = Profile & { team_members: TeamMember[] }

interface TeamTableProps {
  members: MemberWithTeam[]
  isAdmin: boolean
  currentUserId: string
}

const STATUS_STYLES = {
  active: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/40',
  inactive: 'bg-red-900/40 text-red-300 border-red-700/40',
  pending: 'bg-yellow-900/40 text-yellow-300 border-yellow-700/40',
}

const STATUS_LABELS = {
  active: 'Ativo',
  inactive: 'Inativo',
  pending: 'Pendente',
}

export function TeamTable({
  members,
  isAdmin,
  currentUserId,
}: TeamTableProps) {
  const [search, setSearch] = useState('')
  const [processing, setProcessing] = useState<string | null>(null)

  const filtered = members.filter((m) =>
    m.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase())
  )

  async function handleStatusChange(
    profileId: string,
    status: 'active' | 'inactive'
  ) {
    setProcessing(profileId)
    try {
      await updateMemberStatus(profileId, status)
      toast.success(status === 'active' ? 'Membro ativado.' : 'Membro desativado.')
    } catch {
      toast.error('Erro ao atualizar status.')
    } finally {
      setProcessing(null)
    }
  }

  async function handleRoleChange(profileId: string, role: 'admin' | 'integrante') {
    setProcessing(profileId)
    try {
      await updateMemberRole(profileId, role)
      toast.success(role === 'admin' ? 'Promovido a admin.' : 'Role atualizada.')
    } catch {
      toast.error('Erro ao atualizar role.')
    } finally {
      setProcessing(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-sm">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]"
          aria-hidden="true"
        />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou email..."
          aria-label="Buscar integrantes"
          className="w-full pl-9 pr-4 py-2.5 rounded-card bg-navy-800 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-brand placeholder-[#64748B]"
        />
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block border border-white/[0.06] rounded-modal overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] bg-navy-900">
              <th className="text-left py-3 px-5 text-xs font-medium text-[#64748B]">Colaborador</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-[#64748B]">Equipes</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-[#64748B]">Instrumentos</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-[#64748B]">Role</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-[#64748B]">Status</th>
              {isAdmin && <th className="w-12 py-3 px-4" aria-label="Ações" />}
            </tr>
          </thead>
          <tbody>
            {filtered.map((member) => {
              const teamMember = member.team_members?.[0]
              const teams = teamMember?.teams ?? []
              const instruments = teamMember?.instruments ?? []
              const statusStyle = STATUS_STYLES[member.status] ?? STATUS_STYLES.inactive
              const statusLabel = STATUS_LABELS[member.status] ?? member.status

              return (
                <tr
                  key={member.id}
                  className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                >
                  <td className="py-3 px-5">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage
                          src={member.avatar_url ?? undefined}
                          alt={member.full_name ?? 'Membro'}
                        />
                        <AvatarFallback className="bg-navy-700 text-white text-xs font-bold">
                          {member.full_name?.[0] ?? '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-white">
                          {member.full_name ?? 'Sem nome'}
                          {member.id === currentUserId && (
                            <span className="ml-2 text-xs text-brand">(você)</span>
                          )}
                        </p>
                        <p className="text-xs text-[#64748B]">{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {teams.length > 0
                        ? teams.map((t) => <TeamBadge key={t} team={t} />)
                        : <span className="text-[#64748B]">—</span>}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-[#94A3B8]">
                    {instruments.length > 0
                      ? instruments.join(', ')
                      : <span className="text-[#64748B]">—</span>}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                      member.role === 'admin'
                        ? 'bg-brand/20 text-brand border-brand/30'
                        : 'bg-white/[0.06] text-[#94A3B8] border-white/[0.06]'
                    }`}>
                      {member.role === 'admin' ? 'Admin' : 'Integrante'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusStyle}`}>
                      {statusLabel}
                    </span>
                  </td>
                  {isAdmin && member.id !== currentUserId && (
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <MemberTeamModal member={member} />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              disabled={processing === member.id}
                              aria-label={`Ações para ${member.full_name}`}
                              className="p-1.5 rounded text-[#64748B] hover:text-white hover:bg-white/[0.06] transition-colors disabled:opacity-50"
                            >
                              <MoreHorizontal className="w-4 h-4" aria-hidden="true" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            className="bg-navy-800 border border-white/[0.08] text-white"
                            align="end"
                          >
                            {member.status === 'active' ? (
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(member.id, 'inactive')}
                                className="text-red-400 focus:text-red-300 cursor-pointer"
                              >
                                <UserX className="w-4 h-4 mr-2" aria-hidden="true" />
                                Desativar
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(member.id, 'active')}
                                className="text-emerald-400 focus:text-emerald-300 cursor-pointer"
                              >
                                <UserCheck className="w-4 h-4 mr-2" aria-hidden="true" />
                                Ativar
                              </DropdownMenuItem>
                            )}
                            {member.role !== 'admin' && (
                              <DropdownMenuItem
                                onClick={() => handleRoleChange(member.id, 'admin')}
                                className="text-brand focus:text-brand-light cursor-pointer"
                              >
                                <ShieldCheck className="w-4 h-4 mr-2" aria-hidden="true" />
                                Promover a Admin
                              </DropdownMenuItem>
                            )}
                            {member.role === 'admin' && (
                              <DropdownMenuItem
                                onClick={() => handleRoleChange(member.id, 'integrante')}
                                className="cursor-pointer"
                              >
                                <ShieldCheck className="w-4 h-4 mr-2" aria-hidden="true" />
                                Remover Admin
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  )}
                  {isAdmin && member.id === currentUserId && (
                    <td className="py-3 px-4 text-right">
                      <MemberTeamModal member={member} />
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-12 text-center text-[#64748B] text-sm">
            Nenhum integrante encontrado.
          </div>
        )}
      </div>

      {/* Mobile cards */}
      <div className="lg:hidden space-y-2">
        {filtered.map((member) => {
          const teamMember = member.team_members?.[0]
          const teams = teamMember?.teams ?? []
          const instruments = teamMember?.instruments ?? []
          const statusStyle = STATUS_STYLES[member.status] ?? STATUS_STYLES.inactive
          const statusLabel = STATUS_LABELS[member.status] ?? member.status

          return (
            <div
              key={member.id}
              className="bg-navy-900 border border-white/[0.06] rounded-card p-4"
            >
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={member.avatar_url ?? undefined} alt={member.full_name ?? 'Membro'} />
                  <AvatarFallback className="bg-navy-700 text-white text-sm font-bold">
                    {member.full_name?.[0] ?? '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">{member.full_name ?? 'Sem nome'}</p>
                  <p className="text-xs text-[#64748B] truncate">{member.email}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border flex-shrink-0 ${statusStyle}`}>
                  {statusLabel}
                </span>
              </div>
              {teams.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {teams.map((t) => <TeamBadge key={t} team={t} />)}
                </div>
              )}
              {instruments.length > 0 && (
                <p className="text-xs text-[#64748B] mt-2">{instruments.join(', ')}</p>
              )}
              {isAdmin && (
                <div className="mt-3 pt-3 border-t border-white/[0.04]">
                  <MemberTeamModal member={member} />
                </div>
              )}
            </div>
          )
        })}
        {filtered.length === 0 && (
          <p className="text-center text-[#64748B] text-sm py-8">Nenhum integrante encontrado.</p>
        )}
      </div>
    </div>
  )
}
