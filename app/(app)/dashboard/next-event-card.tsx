'use client'

import { Calendar, Clock, MapPin } from 'lucide-react'
import type { Event } from '@/types/database'

const EVENT_TYPE_LABELS = {
  culto: 'Culto',
  ensaio: 'Ensaio',
  comunhao: 'Comunhão',
  evento_externo: 'Evento Externo',
}

const EVENT_TYPE_COLORS = {
  culto: 'bg-brand/20 text-brand border-brand/30',
  ensaio: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  comunhao: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  evento_externo: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr + 'T12:00:00')
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function getDaysUntil(dateStr: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const eventDate = new Date(dateStr + 'T00:00:00')
  const diff = Math.round((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return 'Hoje'
  if (diff === 1) return 'Amanhã'
  return `Em ${diff} dias`
}

interface NextEventCardProps {
  event: Event | null
  userId?: string
}

export function NextEventCard({ event }: NextEventCardProps) {
  if (!event) {
    return (
      <div className="bg-navy-900 border border-white/[0.06] rounded-modal p-6">
        <h2 className="text-sm font-medium text-[#94A3B8] mb-2">Próximo Evento</h2>
        <p className="text-[#64748B] text-sm">Nenhum evento agendado.</p>
      </div>
    )
  }

  const typeColors = EVENT_TYPE_COLORS[event.type] ?? EVENT_TYPE_COLORS.culto
  const typeLabel = EVENT_TYPE_LABELS[event.type] ?? event.type

  return (
    <div className="bg-navy-900 border border-white/[0.06] rounded-modal p-6 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-brand/5 blur-3xl pointer-events-none" />

      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-sm font-medium text-[#94A3B8]">Próximo Evento</h2>
          <span
            className={`text-xs font-medium px-2 py-1 rounded-full border ${typeColors}`}
          >
            {typeLabel}
          </span>
        </div>

        <h3 className="text-xl font-bold text-white mb-4 capitalize">
          {getDaysUntil(event.date)}
        </h3>

        <div className="space-y-2.5">
          <div className="flex items-center gap-2.5 text-sm text-[#94A3B8]">
            <Calendar className="w-4 h-4 text-brand flex-shrink-0" aria-hidden="true" />
            <span className="capitalize">{formatDate(event.date)}</span>
          </div>

          {event.arrival_time && (
            <div className="flex items-center gap-2.5 text-sm text-[#94A3B8]">
              <Clock className="w-4 h-4 text-brand flex-shrink-0" aria-hidden="true" />
              <span>
                Chegada: <strong className="text-white">{event.arrival_time.slice(0, 5)}</strong>
                {event.start_time && (
                  <> · Início: <strong className="text-white">{event.start_time.slice(0, 5)}</strong></>
                )}
              </span>
            </div>
          )}

          {event.notes && (
            <div className="flex items-start gap-2.5 text-sm text-[#94A3B8]">
              <MapPin className="w-4 h-4 text-brand flex-shrink-0 mt-0.5" aria-hidden="true" />
              <span className="line-clamp-2">{event.notes}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
