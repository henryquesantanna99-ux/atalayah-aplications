'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, Copy, MessageSquare } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface ScaleMember {
  id: string
  instrument: string | null
  profiles: {
    id: string
    full_name: string | null
  } | null
}

interface ScaleSong {
  id: string
  song_title: string
  key_note: string | null
  profiles: {
    id: string
    full_name: string | null
  } | null
}

interface ScaleEvent {
  id: string
  title: string
  type: string
  date: string
  start_time: string | null
  event_members: ScaleMember[]
  setlist_songs: ScaleSong[]
}

interface ScalesModalProps {
  scales: ScaleEvent[]
}

function formatDate(value: string) {
  return new Date(value + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function ScalesModal({ scales }: ScalesModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<'all' | 'past' | 'future'>('all')
  const today = new Date().toISOString().split('T')[0]

  const filteredScales = useMemo(() => {
    if (filter === 'past') return scales.filter((scale) => scale.date < today)
    if (filter === 'future') return scales.filter((scale) => scale.date >= today)
    return scales
  }, [filter, scales, today])

  function messageScale(scale: ScaleEvent) {
    const mentions = scale.event_members
      .map((member) => member.profiles?.full_name)
      .filter(Boolean)
      .map((name) => `@${name}`)
      .join(' ')

    router.push(`/chat?draft=${encodeURIComponent(`${mentions} `)}`)
  }

  function reuseScale(scale: ScaleEvent) {
    const memberIds = scale.event_members
      .map((member) => member.profiles?.id)
      .filter(Boolean)
      .join(',')

    router.push(`/agenda?scaleMembers=${memberIds}`)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="inline-flex items-center gap-2 px-4 py-2 rounded-card border border-white/[0.08] text-sm text-[#94A3B8] hover:text-white hover:border-white/20 transition-colors">
          <CalendarDays className="w-4 h-4" aria-hidden="true" />
          Ver escalas
        </button>
      </DialogTrigger>
      <DialogContent className="bg-navy-900 border border-white/[0.08] text-white max-w-4xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Escalas Criadas</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          {[
            { value: 'all', label: 'Todas' },
            { value: 'future', label: 'Futuras' },
            { value: 'past', label: 'Passadas' },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value as 'all' | 'past' | 'future')}
              className={`px-3 py-1.5 rounded-card text-xs border transition-colors ${
                filter === option.value
                  ? 'bg-brand/20 border-brand/30 text-brand'
                  : 'border-white/[0.08] text-[#94A3B8] hover:text-white'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {filteredScales.length === 0 ? (
          <p className="text-sm text-[#64748B] py-8 text-center">Nenhuma escala encontrada.</p>
        ) : (
          <div className="space-y-3">
            {filteredScales.map((scale) => (
              <article
                key={scale.id}
                className="rounded-card border border-white/[0.06] bg-navy-800/50 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-white">{scale.title}</h3>
                    <p className="text-xs text-[#64748B]">
                      {formatDate(scale.date)}
                      {scale.start_time ? ` · ${scale.start_time.slice(0, 5)}` : ''}
                      {' · '}
                      {scale.type}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => reuseScale(scale)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-card bg-brand/15 border border-brand/30 text-brand text-xs hover:bg-brand/25 transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                      Reutilizar
                    </button>
                    <button
                      type="button"
                      onClick={() => messageScale(scale)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-card border border-white/[0.08] text-[#94A3B8] text-xs hover:text-white hover:border-white/20 transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
                      Mensagem
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <h4 className="text-xs font-medium text-[#64748B] uppercase tracking-wide mb-2">
                      Integrantes
                    </h4>
                    <ul className="space-y-1">
                      {scale.event_members.map((member) => (
                        <li key={member.id} className="text-sm text-[#94A3B8]">
                          <span className="text-white">{member.profiles?.full_name ?? 'Integrante'}</span>
                          {member.instrument ? ` · ${member.instrument}` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-[#64748B] uppercase tracking-wide mb-2">
                      Músicas
                    </h4>
                    {scale.setlist_songs.length === 0 ? (
                      <p className="text-sm text-[#64748B]">Nenhuma música definida.</p>
                    ) : (
                      <ul className="space-y-1">
                        {scale.setlist_songs.map((song) => (
                          <li key={song.id} className="text-sm text-[#94A3B8]">
                            <span className="text-white">{song.song_title}</span>
                            {song.profiles?.full_name ? ` · ${song.profiles.full_name}` : ''}
                            {song.key_note ? ` · ${song.key_note}` : ''}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
