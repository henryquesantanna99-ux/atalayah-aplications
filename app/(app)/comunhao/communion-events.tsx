import { CalendarDays, MapPin, Video } from 'lucide-react'
import { CreateMeetButton } from './create-meet-button'

interface CommunionEvent {
  id: string
  title: string
  date: string
  start_time: string | null
  arrival_time: string | null
  agenda_topic: string | null
  location: string | null
  is_online: boolean
  meet_link: string | null
  profiles: {
    id: string
    full_name: string | null
  } | null
}

interface CommunionEventsProps {
  events: CommunionEvent[]
  isAdmin: boolean
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export function CommunionEvents({ events, isAdmin }: CommunionEventsProps) {
  if (events.length === 0) {
    return null
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-medium text-[#94A3B8]">Próximas Comunhões</h2>
        <p className="text-xs text-[#64748B]">Encontros criados pela Agenda</p>
      </div>

      <div className="space-y-3">
        {events.map((event) => (
          <article
            key={event.id}
            className="rounded-modal border border-white/[0.06] bg-navy-900 p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white">{event.title}</h3>
                <p className="mt-1 flex items-center gap-2 text-sm text-[#94A3B8] capitalize">
                  <CalendarDays className="w-4 h-4 text-brand" aria-hidden="true" />
                  {formatDate(event.date)}
                  {event.start_time ? ` · ${event.start_time.slice(0, 5)}` : ''}
                </p>
              </div>
              {event.is_online && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300">
                  <Video className="w-3.5 h-3.5" aria-hidden="true" />
                  Online
                </span>
              )}
            </div>

            <div className="mt-4 space-y-2 text-sm text-[#94A3B8]">
              {event.agenda_topic && (
                <p>
                  <strong className="text-white">Pauta:</strong> {event.agenda_topic}
                </p>
              )}
              {event.profiles?.full_name && (
                <p>
                  <strong className="text-white">Condutor:</strong> {event.profiles.full_name}
                </p>
              )}
              {event.location && (
                <p className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-brand" aria-hidden="true" />
                  {event.location}
                </p>
              )}
              {event.meet_link && (
                <a
                  href={event.meet_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-card bg-brand/15 border border-brand/30 px-3 py-2 text-sm text-brand hover:bg-brand/25 transition-colors"
                >
                  <Video className="w-4 h-4" aria-hidden="true" />
                  Entrar na reunião
                </a>
              )}
              {isAdmin && !event.meet_link && (
                <CreateMeetButton eventId={event.id} />
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
