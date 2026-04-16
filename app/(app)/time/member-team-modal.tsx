'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { updateMemberTeamData } from './actions'
import type { Profile, TeamMember } from '@/types/database'

type MemberWithTeam = Profile & { team_members: TeamMember[] }

interface MemberTeamModalProps {
  member: MemberWithTeam
}

function toText(values: string[]) {
  return values.join(', ')
}

function toList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function MemberTeamModal({ member }: MemberTeamModalProps) {
  const router = useRouter()
  const teamMember = member.team_members?.[0]
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    teams: toText(teamMember?.teams ?? []),
    instruments: toText(teamMember?.instruments ?? []),
    function_role: teamMember?.function_role ?? '',
    is_active: teamMember?.is_active ?? true,
  })

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)

    try {
      await updateMemberTeamData(member.id, {
        teams: toList(form.teams),
        instruments: toList(form.instruments),
        function_role: form.function_role
          ? form.function_role as 'lider' | 'integrante'
          : null,
        is_active: form.is_active,
      })
      toast.success('Dados do integrante atualizados.')
      setOpen(false)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar integrante.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-card border border-white/[0.08] text-xs text-[#94A3B8] hover:text-white hover:border-white/20 transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
          Editar
        </button>
      </DialogTrigger>
      <DialogContent className="bg-navy-900 border border-white/[0.08] text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white">
            Editar {member.full_name ?? member.email}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <label htmlFor={`teams-${member.id}`} className="block text-xs text-[#94A3B8] mb-1">
              Equipes
            </label>
            <input
              id={`teams-${member.id}`}
              value={form.teams}
              onChange={(event) => setForm((current) => ({ ...current, teams: event.target.value }))}
              placeholder="Vocal, Instrumental, Som"
              className="w-full px-3 py-2 rounded-card bg-navy-800 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-brand placeholder-[#64748B]"
            />
            <p className="text-[11px] text-[#64748B] mt-1">Separe por vírgula.</p>
          </div>

          <div>
            <label htmlFor={`instruments-${member.id}`} className="block text-xs text-[#94A3B8] mb-1">
              Instrumentos / funções
            </label>
            <input
              id={`instruments-${member.id}`}
              value={form.instruments}
              onChange={(event) => setForm((current) => ({ ...current, instruments: event.target.value }))}
              placeholder="Voz, Violão, Guitarra"
              className="w-full px-3 py-2 rounded-card bg-navy-800 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-brand placeholder-[#64748B]"
            />
            <p className="text-[11px] text-[#64748B] mt-1">Separe por vírgula.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor={`function-${member.id}`} className="block text-xs text-[#94A3B8] mb-1">
                Função no time
              </label>
              <select
                id={`function-${member.id}`}
                value={form.function_role}
                onChange={(event) => setForm((current) => ({ ...current, function_role: event.target.value }))}
                className="w-full px-3 py-2 rounded-card bg-navy-800 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-brand"
              >
                <option value="">Sem função</option>
                <option value="integrante">Integrante</option>
                <option value="lider">Líder</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-[#94A3B8] pt-6">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))}
                className="h-4 w-4 rounded border-white/[0.08] accent-brand"
              />
              Participa das escalas
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-1 py-2.5 rounded-card border border-white/[0.08] text-[#94A3B8] text-sm hover:bg-white/[0.04] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-card bg-brand text-white text-sm font-medium hover:bg-brand-light transition-colors disabled:opacity-60"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
