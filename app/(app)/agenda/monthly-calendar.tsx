'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { DayDetailModal } from './day-detail-modal'

const EVENT_TYPE_COLORS = {
  culto: 'bg-brand/80 text-white',
  ensaio: 'bg-indigo-500/80 text-white',
  comunhao: 'bg-emerald-600/80 text-white',
  evento_externo: 'bg-amber-500/80 text-white',
}

const EVENT_TYPE_LABELS = {
  culto: 'Culto',
  ensaio: 'Ensaio',
  comunhao: 'Comunhão',
  evento_externo: 'Evento Externo',
}

const EVENT_FILTERS = [
  { type: 'all', label: 'Todos' },
  { type: 'culto', label: 'Culto' },
  { type: 'ensaio', label: 'Ensaio' },
  { type: 'comunhao', label: 'Comunhão' },
  { type: 'evento_externo', label: 'Evento Externo' },
]

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
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
  agenda_topic?: string | null
  conductor_id?: string | null
  location?: string | null
  is_online?: boolean
  meet_link?: string | null
  google_calendar_event_id?: string | null
}

interface MonthlyCalendarProps {
  events: CalendarEvent[]
  year: number
  month: number
  isAdmin: boolean
  userId: string
}

function getDaysInMonth(year: number, month: number) {
  // month is 1-indexed
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  const days: (Date | null)[] = []

  // Pad start with nulls for days before the first of the month
  for (let i = 0; i < firstDay.getDay(); i++) {
    days.push(null)
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month - 1, d))
  }
  // Pad end to complete the grid (multiple of 7)
  while (days.length % 7 !== 0) {
    days.push(null)
  }
  return days
}

export function MonthlyCalendar({
  events,
  year,
  month,
  isAdmin,
  userId,
}: MonthlyCalendarProps) {
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [view, setView] = useState<'month' | 'year'>('month')
  const [typeFilter, setTypeFilter] = useState('all')

  const filteredEvents = typeFilter === 'all'
    ? events
    : events.filter((event) => event.type === typeFilter)
  const days = getDaysInMonth(year, month)
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  // Group events by date
  const eventsByDate: Record<string, CalendarEvent[]> = {}
  for (const event of filteredEvents) {
    if (!eventsByDate[event.date]) eventsByDate[event.date] = []
    eventsByDate[event.date].push(event)
  }

  function navigate(delta: number) {
    let newMonth = month + delta
    let newYear = year
    if (newMonth > 12) { newMonth = 1; newYear++ }
    if (newMonth < 1) { newMonth = 12; newYear-- }
    router.push(`/agenda?year=${newYear}&month=${newMonth}`)
  }

  function navigateYear(delta: number) {
    router.push(`/agenda?year=${year + delta}&month=${month}`)
  }

  const selectedEvents = selectedDate ? (eventsByDate[selectedDate] ?? []) : []

  return (
    <div>
      {/* Header navigation */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between">
        <button
          onClick={() => view === 'month' ? navigate(-1) : navigateYear(-1)}
          aria-label={view === 'month' ? 'Mês anterior' : 'Ano anterior'}
          className="p-2 rounded-card text-[#94A3B8] hover:text-white hover:bg-white/[0.06] transition-colors"
        >
          <ChevronLeft className="w-5 h-5" aria-hidden="true" />
        </button>
        <h2 className="text-lg font-semibold text-white">
          {view === 'month' ? `${MONTHS_PT[month - 1]} ${year}` : year}
        </h2>
        <button
          onClick={() => view === 'month' ? navigate(1) : navigateYear(1)}
          aria-label={view === 'month' ? 'Próximo mês' : 'Próximo ano'}
          className="p-2 rounded-card text-[#94A3B8] hover:text-white hover:bg-white/[0.06] transition-colors"
        >
          <ChevronRight className="w-5 h-5" aria-hidden="true" />
        </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-card border border-white/[0.08] bg-navy-900 p-1">
            {[
              { value: 'month', label: 'Mês' },
              { value: 'year', label: 'Ano' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setView(option.value as 'month' | 'year')}
                className={`px-3 py-1.5 rounded-card text-xs font-medium transition-colors ${
                  view === option.value
                    ? 'bg-brand text-white'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {EVENT_FILTERS.map((option) => (
              <button
                key={option.type}
                type="button"
                onClick={() => setTypeFilter(option.type)}
                className={`px-3 py-1.5 rounded-card border text-xs transition-colors ${
                  typeFilter === option.type
                    ? 'bg-brand/20 border-brand/30 text-brand'
                    : 'border-white/[0.08] text-[#94A3B8] hover:text-white hover:border-white/20'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4">
        {EVENT_FILTERS.filter((item) => item.type !== 'all').map(({ type, label }) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${EVENT_TYPE_COLORS[type as keyof typeof EVENT_TYPE_COLORS]}`} />
            <span className="text-xs text-[#64748B]">{label}</span>
          </div>
        ))}
      </div>

      {view === 'year' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {MONTHS_PT.map((monthName, monthIndex) => {
            const monthNumber = monthIndex + 1
            const monthEvents = filteredEvents.filter((event) => {
              const eventDate = new Date(event.date + 'T12:00:00')
              return eventDate.getFullYear() === year && eventDate.getMonth() === monthIndex
            })

            return (
              <section
                key={monthName}
                className="rounded-modal border border-white/[0.06] bg-navy-900 p-4"
              >
                <div className="flex items-center justify-between gap-3 mb-3">
                  <button
                    type="button"
                    onClick={() => {
                      router.push(`/agenda?year=${year}&month=${monthNumber}`)
                      setView('month')
                    }}
                    className="text-left text-sm font-semibold text-white hover:text-brand transition-colors"
                  >
                    {monthName}
                  </button>
                  <span className="inline-flex items-center gap-1 text-xs text-[#64748B]">
                    <CalendarDays className="w-3.5 h-3.5" aria-hidden="true" />
                    {monthEvents.length}
                  </span>
                </div>

                {monthEvents.length === 0 ? (
                  <p className="text-xs text-[#64748B] py-4">Sem eventos.</p>
                ) : (
                  <ul className="space-y-2">
                    {monthEvents.slice(0, 5).map((event) => {
                      const eventDay = new Date(event.date + 'T12:00:00').getDate()
                      return (
                        <li key={event.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDate(event.date)
                              router.push(`/agenda?year=${year}&month=${monthNumber}`)
                            }}
                            className="w-full text-left rounded-card border border-white/[0.04] bg-black/10 px-3 py-2 hover:bg-white/[0.04] transition-colors"
                          >
                            <span className="text-xs text-[#64748B]">{eventDay}</span>
                            <span className="mx-2 text-[#64748B]">·</span>
                            <span className="text-sm text-white">{event.title}</span>
                            <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded ${
                              EVENT_TYPE_COLORS[event.type as keyof typeof EVENT_TYPE_COLORS] ??
                              'bg-white/20 text-white'
                            }`}>
                              {EVENT_TYPE_LABELS[event.type as keyof typeof EVENT_TYPE_LABELS] ?? event.type}
                            </span>
                          </button>
                        </li>
                      )
                    })}
                    {monthEvents.length > 5 && (
                      <li className="text-xs text-[#64748B] px-3">
                        +{monthEvents.length - 5} outros eventos
                      </li>
                    )}
                  </ul>
                )}
              </section>
            )
          })}
        </div>
      ) : (
        <>

      {/* Calendar grid */}
      <div className="border border-white/[0.06] rounded-modal overflow-hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 bg-navy-900 border-b border-white/[0.06]">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="py-2.5 text-center text-xs font-medium text-[#64748B]"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {days.map((date, index) => {
            if (!date) {
              return (
                <div
                  key={`empty-${index}`}
                  className="min-h-[80px] border-b border-r border-white/[0.04] bg-black/20"
                />
              )
            }

            const dateStr = date.toISOString().split('T')[0]
            const dayEvents = eventsByDate[dateStr] ?? []
            const isToday = dateStr === todayStr
            const isSelected = dateStr === selectedDate
            const isCurrentMonth = date.getMonth() === month - 1

            return (
              <button
                key={dateStr}
                onClick={() => {
                  setSelectedDate(dayEvents.length > 0 ? dateStr : null)
                }}
                aria-label={`${date.getDate()} de ${MONTHS_PT[date.getMonth()]}${dayEvents.length > 0 ? `, ${dayEvents.length} evento(s)` : ''}`}
                className={`min-h-[80px] p-2 text-left border-b border-r border-white/[0.04] transition-colors ${
                  dayEvents.length > 0 ? 'hover:bg-white/[0.04] cursor-pointer' : 'cursor-default'
                } ${isSelected ? 'bg-brand/10' : ''} ${!isCurrentMonth ? 'opacity-30' : ''}`}
              >
                <span
                  className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium mb-1 ${
                    isToday
                      ? 'bg-brand text-white'
                      : 'text-white'
                  }`}
                >
                  {date.getDate()}
                </span>

                <div className="space-y-0.5">
                  {dayEvents.slice(0, 2).map((event) => (
                    <div
                      key={event.id}
                      className={`text-[10px] px-1.5 py-0.5 rounded truncate ${
                        EVENT_TYPE_COLORS[event.type as keyof typeof EVENT_TYPE_COLORS] ??
                        'bg-white/20 text-white'
                      }`}
                    >
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-[10px] text-[#64748B] px-1">
                      +{dayEvents.length - 2}
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>
        </>
      )}

      {/* Day detail modal */}
      {selectedDate && selectedEvents.length > 0 && (
        <DayDetailModal
          date={selectedDate}
          events={selectedEvents}
          isAdmin={isAdmin}
          userId={userId}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </div>
  )
}
