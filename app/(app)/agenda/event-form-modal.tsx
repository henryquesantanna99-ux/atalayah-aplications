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
}

interface EventFormModalProps {
  event?: CalendarEvent
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
}

export function EventFormModal({
  event,
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
      }
    : emptyForm
  )

  const isEditing = Boolean(event)

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    setForm((current) => ({ ...current, [e.target.name]: e.target.value }))
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
