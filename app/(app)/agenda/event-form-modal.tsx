'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarPlus, Pencil } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { createEvent, updateEvent } from './actions'

type EventType = 'culto' | 'ensaio' | 'comunhao' | 'evento_externo'

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
}

interface ProfileOption {
  id: string
  full_name: string | null
}

interface EventFormModalProps {
  event?: CalendarEvent
  profiles?: ProfileOption[]
  triggerLabel?: string
  triggerVariant?: 'primary' | 'ghost'
}

const emptyForm = {
  title: '',
  type: 'culto' as EventType,
  date: new Date().toISOString().split('T')[0],
  arrival_time: '',
  start_time: '',
  notes: '',
  agenda_topic: '',
  conductor_id: '',
  location: '',
  is_online: false,
  meet_link: '',
}

export function EventFormModal({
  event,
  profiles = [],
  triggerLabel,
  triggerVariant = 'primary',
}: EventFormModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(() => event
    ? {
        title: event.title,
        type: event.type as EventType,
        date: event.date,
        arrival_time: event.arrival_time?.slice(0, 5) ?? '',
        start_time: event.start_time?.slice(0, 5) ?? '',
        notes: event.notes ?? '',
        agenda_topic: event.agenda_topic ?? '',
        conductor_id: event.conductor_id ?? '',
        location: event.location ?? '',
        is_online: event.is_online ?? false,
        meet_link: event.meet_link ?? '',
      }
    : emptyForm
  )

  const isEditing = Boolean(event)

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const target = e.target
    const value = target instanceof HTMLInputElement && target.type === 'checkbox'
      ? target.checked
      : target.value
    setForm((current) => ({ ...current, [target.name]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) {
      toast.error('Informe o título do evento.')
      return
    }

    setSaving(true)
    const payload = {
      title: form.title.trim(),
      type: form.type,
      date: form.date,
      arrival_time: form.arrival_time || null,
      start_time: form.start_time || null,
      notes: form.notes.trim() || null,
      agenda_topic: form.type === 'comunhao' ? form.agenda_topic.trim() || null : null,
      conductor_id: form.type === 'comunhao' ? form.conductor_id || null : null,
      location: form.type === 'comunhao' ? form.location.trim() || null : null,
      is_online: form.type === 'comunhao' ? form.is_online : false,
      meet_link: form.type === 'comunhao' ? form.meet_link.trim() || null : null,
    }

    try {
      if (event) {
        await updateEvent(event.id, payload)
        toast.success('Evento atualizado.')
      } else {
        await createEvent(payload)
        toast.success('Evento criado.')
        setForm(emptyForm)
      }
      setOpen(false)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar evento.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className={
            triggerVariant === 'primary'
              ? 'flex items-center gap-2 px-4 py-2 rounded-card bg-brand text-white text-sm font-medium hover:bg-brand-light transition-colors'
              : 'inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-card border border-white/[0.08] text-[#94A3B8] hover:text-white hover:border-white/20 transition-colors'
          }
        >
          {isEditing ? <Pencil className="w-3.5 h-3.5" /> : <CalendarPlus className="w-4 h-4" />}
          {triggerLabel ?? (isEditing ? 'Editar' : 'Novo Evento')}
        </button>
      </DialogTrigger>
      <DialogContent className="bg-navy-900 border border-white/[0.08] text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white">
            {isEditing ? 'Editar Evento' : 'Novo Evento'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <label htmlFor="event-title" className="block text-xs text-[#94A3B8] mb-1">
              Título
            </label>
            <input
              id="event-title"
              name="title"
              value={form.title}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 rounded-card bg-navy-800 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-brand"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="event-type" className="block text-xs text-[#94A3B8] mb-1">
                Tipo
              </label>
              <select
                id="event-type"
                name="type"
                value={form.type}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-card bg-navy-800 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-brand"
              >
                <option value="culto">Culto</option>
                <option value="ensaio">Ensaio</option>
                <option value="comunhao">Comunhão</option>
                <option value="evento_externo">Evento Externo</option>
              </select>
            </div>
            <div>
              <label htmlFor="event-date" className="block text-xs text-[#94A3B8] mb-1">
                Data
              </label>
              <input
                id="event-date"
                name="date"
                type="date"
                value={form.date}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 rounded-card bg-navy-800 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-brand"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="arrival-time" className="block text-xs text-[#94A3B8] mb-1">
                Chegada
              </label>
              <input
                id="arrival-time"
                name="arrival_time"
                type="time"
                value={form.arrival_time}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-card bg-navy-800 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-brand"
              />
            </div>
            <div>
              <label htmlFor="start-time" className="block text-xs text-[#94A3B8] mb-1">
                Início
              </label>
              <input
                id="start-time"
                name="start_time"
                type="time"
                value={form.start_time}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-card bg-navy-800 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-brand"
              />
            </div>
          </div>

          {form.type === 'comunhao' && (
            <div className="space-y-3 rounded-card border border-white/[0.06] bg-navy-800/40 p-3">
              <p className="text-xs font-medium text-[#94A3B8] uppercase tracking-wide">
                Detalhes da Comunhão
              </p>
              <div>
                <label htmlFor="agenda-topic" className="block text-xs text-[#94A3B8] mb-1">
                  Pauta
                </label>
                <input
                  id="agenda-topic"
                  name="agenda_topic"
                  value={form.agenda_topic}
                  onChange={handleChange}
                  placeholder="Tema ou pauta do encontro"
                  className="w-full px-3 py-2 rounded-card bg-navy-900 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-brand placeholder-[#64748B]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="conductor-id" className="block text-xs text-[#94A3B8] mb-1">
                    Condutor
                  </label>
                  <select
                    id="conductor-id"
                    name="conductor_id"
                    value={form.conductor_id}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-card bg-navy-900 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-brand"
                  >
                    <option value="">Selecionar</option>
                    {profiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.full_name ?? 'Sem nome'}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="location" className="block text-xs text-[#94A3B8] mb-1">
                    Local
                  </label>
                  <input
                    id="location"
                    name="location"
                    value={form.location}
                    onChange={handleChange}
                    placeholder="Online, casa, igreja..."
                    className="w-full px-3 py-2 rounded-card bg-navy-900 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-brand placeholder-[#64748B]"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-[#94A3B8]">
                <input
                  type="checkbox"
                  name="is_online"
                  checked={form.is_online}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-white/[0.08] accent-brand"
                />
                Reunião online
              </label>

              <div>
                <label htmlFor="meet-link" className="block text-xs text-[#94A3B8] mb-1">
                  Link da reunião
                </label>
                <input
                  id="meet-link"
                  name="meet_link"
                  type="url"
                  value={form.meet_link}
                  onChange={handleChange}
                  placeholder="https://meet.google.com/..."
                  className="w-full px-3 py-2 rounded-card bg-navy-900 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-brand placeholder-[#64748B]"
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="event-notes" className="block text-xs text-[#94A3B8] mb-1">
              Observações
            </label>
            <textarea
              id="event-notes"
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 rounded-card bg-navy-800 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-brand resize-none"
            />
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
