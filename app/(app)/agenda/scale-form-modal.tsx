'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ListChecks, Plus, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { createScale } from './actions'
import { createClient } from '@/lib/supabase/client'
import { isVocalFunction, type ScheduleFunctionOption } from '@/lib/schedule-functions'

type EventType = 'culto' | 'ensaio' | 'comunhao' | 'evento_externo'

export interface ScaleEventOption {
  id: string
  title: string
  type: EventType
  date: string
  arrival_time: string | null
  start_time: string | null
  notes: string | null
}

export interface ScaleProfile {
  id: string
  full_name: string | null
  team_members: {
    teams: string[]
    instruments: string[]
    function_role: 'lider' | 'integrante' | null
  }[]
}

interface ScaleFormModalProps {
  events: ScaleEventOption[]
  profiles: ScaleProfile[]
  initialSelectedMemberIds?: string[]
}

interface SongDraft {
  id: string
  songTitle: string
  soloistId: string
  keyNote: string
  referenceLink: string
}

const eventTypeOptions: { value: EventType; label: string }[] = [
  { value: 'culto', label: 'Culto' },
  { value: 'ensaio', label: 'Ensaio' },
  { value: 'comunhao', label: 'Comunhão' },
  { value: 'evento_externo', label: 'Evento Externo' },
]

const keys = ['', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
  'Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'A#m', 'Bm']

function today() {
  return new Date().toISOString().split('T')[0]
}

function newSong(): SongDraft {
  return {
    id: crypto.randomUUID(),
    songTitle: '',
    soloistId: '',
    keyNote: '',
    referenceLink: '',
  }
}

export function ScaleFormModal({
  events,
  profiles,
  initialSelectedMemberIds,
}: ScaleFormModalProps) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [scheduleFunctions, setScheduleFunctions] = useState<ScheduleFunctionOption[]>([])
  const initialSelection = useMemo(() => {
    const selected = new Set(initialSelectedMemberIds ?? [])
    return Object.fromEntries(
      profiles
        .filter((profile) => selected.has(profile.id))
        .map((profile) => [profile.id, ''])
    )
  }, [initialSelectedMemberIds, profiles])
  const [open, setOpen] = useState((initialSelectedMemberIds?.length ?? 0) > 0)
  const [saving, setSaving] = useState(false)
  const [selectedEventId, setSelectedEventId] = useState('')
  const [eventForm, setEventForm] = useState({
    title: '',
    type: 'culto' as EventType,
    date: today(),
    arrival_time: '',
    start_time: '',
    notes: '',
  })
  const [selectedMembers, setSelectedMembers] = useState<Record<string, string>>(initialSelection)
  const [songs, setSongs] = useState<SongDraft[]>([newSong()])

  const selectedEvent = events.find((event) => event.id === selectedEventId)
  const effectiveType = selectedEvent?.type ?? eventForm.type
  const selectedVocalists = useMemo(
    () => profiles.filter((profile) => {
      const assignedFunction = selectedMembers[profile.id]
      return isVocalFunction(scheduleFunctions.find((item) => item.id === assignedFunction)?.category)
    }),
    [profiles, scheduleFunctions, selectedMembers]
  )

  useEffect(() => {
    void supabase.from('schedule_functions')
      .select('id, display_name, category, is_active')
      .eq('is_active', true)
      .order('display_name')
      .then(({ data }) => setScheduleFunctions((data ?? []) as ScheduleFunctionOption[]))
  }, [supabase])

  function toggleMember(profile: ScaleProfile) {
    setSelectedMembers((current) => {
      const next = { ...current }
      if (next[profile.id]) {
        delete next[profile.id]
        return next
      }

      next[profile.id] = scheduleFunctions[0]?.id ?? ''
      return next
    })
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (!selectedEventId && !eventForm.title.trim()) {
      toast.error('Informe o título do evento.')
      return
    }

    const members = Object.entries(selectedMembers)
      .filter(([, scheduleFunctionId]) => scheduleFunctionId)
      .map(([profileId, scheduleFunctionId]) => ({ profileId, scheduleFunctionId }))

    if (members.length === 0) {
      toast.error('Selecione pelo menos um integrante.')
      return
    }

    setSaving(true)
    try {
      await createScale({
        eventId: selectedEventId || null,
        event: {
          title: selectedEvent?.title ?? eventForm.title.trim(),
          type: selectedEvent?.type ?? eventForm.type,
          date: selectedEvent?.date ?? eventForm.date,
          arrival_time: selectedEvent?.arrival_time ?? (eventForm.arrival_time || null),
          start_time: selectedEvent?.start_time ?? (eventForm.start_time || null),
          notes: selectedEvent?.notes ?? (eventForm.notes.trim() || null),
        },
        members,
        songs: songs.map((song) => ({
          setlistSongId: crypto.randomUUID(),
          songTitle: song.songTitle,
          soloistId: song.soloistId || null,
          keyNote: song.keyNote || null,
          referenceLink: song.referenceLink.trim() || null,
          youtubeVideoId: null,
          youtubeUrl: song.referenceLink.trim() || null,
          youtubeThumbnail: null,
          youtubeDuration: null,
          lyricsPlain: null,
          lyricsSynced: null,
          albumName: null,
          bpm: null,
          metadataSource: null,
          metadataPayload: {},
        })),
      })
      toast.success('Escala criada.')
      setOpen(false)
      setSelectedEventId('')
      setSelectedMembers({})
      setSongs([newSong()])
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao criar escala.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-2 px-4 py-2 rounded-card border border-brand/30 bg-brand/15 text-brand text-sm font-medium hover:bg-brand/25 transition-colors">
          <ListChecks className="w-4 h-4" aria-hidden="true" />
          Criar Escala
        </button>
      </DialogTrigger>
      <DialogContent className="bg-navy-900 border border-white/[0.08] text-white max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Criar Escala</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-white">1. Escolher data e evento</h3>
            <select
              value={selectedEventId}
              onChange={(event) => setSelectedEventId(event.target.value)}
              className="w-full px-3 py-2 rounded-card bg-navy-800 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-brand"
            >
              <option value="">Criar novo evento</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title} - {event.date}
                </option>
              ))}
            </select>

            {!selectedEventId && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  value={eventForm.title}
                  onChange={(event) => setEventForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Título do evento"
                  className="px-3 py-2 rounded-card bg-navy-800 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-brand placeholder-[#64748B]"
                />
                <select
                  value={eventForm.type}
                  onChange={(event) => setEventForm((current) => ({ ...current, type: event.target.value as EventType }))}
                  className="px-3 py-2 rounded-card bg-navy-800 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-brand"
                >
                  {eventTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <input
                  type="date"
                  value={eventForm.date}
                  onChange={(event) => setEventForm((current) => ({ ...current, date: event.target.value }))}
                  className="px-3 py-2 rounded-card bg-navy-800 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-brand"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="time"
                    value={eventForm.arrival_time}
                    onChange={(event) => setEventForm((current) => ({ ...current, arrival_time: event.target.value }))}
                    className="px-3 py-2 rounded-card bg-navy-800 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-brand"
                    aria-label="Horário de chegada"
                  />
                  <input
                    type="time"
                    value={eventForm.start_time}
                    onChange={(event) => setEventForm((current) => ({ ...current, start_time: event.target.value }))}
                    className="px-3 py-2 rounded-card bg-navy-800 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-brand"
                    aria-label="Horário de início"
                  />
                </div>
                <textarea
                  value={eventForm.notes}
                  onChange={(event) => setEventForm((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="Observações"
                  rows={3}
                  className="sm:col-span-2 px-3 py-2 rounded-card bg-navy-800 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-brand resize-none placeholder-[#64748B]"
                />
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-white">2. Escolher integrantes e funções</h3>
            <div className="space-y-2">
              {profiles.map((profile) => {
                const checked = profile.id in selectedMembers
                return (
                  <div
                    key={profile.id}
                    className="grid grid-cols-1 sm:grid-cols-[1fr_220px] gap-2 rounded-card border border-white/[0.06] bg-navy-800/50 p-3"
                  >
                    <label className="flex items-center gap-2 text-sm text-white">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleMember(profile)}
                        disabled={scheduleFunctions.length === 0}
                        className="h-4 w-4 rounded border-white/[0.08] accent-brand"
                      />
                      <span>{profile.full_name ?? 'Sem nome'}</span>
                      {scheduleFunctions.length === 0 && (
                        <span className="text-xs text-[#64748B]">sem funções cadastradas</span>
                      )}
                    </label>
                    <select
                      value={selectedMembers[profile.id] ?? ''}
                      onChange={(event) => setSelectedMembers((current) => ({
                        ...current,
                        [profile.id]: event.target.value,
                      }))}
                      disabled={!checked}
                      className="px-3 py-2 rounded-card bg-navy-900 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-brand disabled:opacity-40"
                    >
                      <option value="">Selecione uma função</option>
                      {scheduleFunctions.map((scheduleFunction) => (
                        <option key={scheduleFunction.id} value={scheduleFunction.id}>{scheduleFunction.display_name}</option>
                      ))}
                    </select>
                  </div>
                )
              })}
            </div>
          </section>

          {effectiveType === 'culto' && (
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-white">3. Músicas do culto</h3>
                <button
                  type="button"
                  onClick={() => setSongs((current) => [...current, newSong()])}
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-card border border-white/[0.08] text-[#94A3B8] hover:text-white hover:border-white/20 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  Música
                </button>
              </div>
              <div className="space-y-2">
                {songs.map((song, index) => (
                  <div
                    key={song.id}
                    className="grid grid-cols-1 sm:grid-cols-[1.3fr_1fr_90px_1fr_auto] gap-2 rounded-card border border-white/[0.06] bg-navy-800/50 p-3"
                  >
                    <input
                      value={song.songTitle}
                      onChange={(event) => setSongs((current) => current.map((item) =>
                        item.id === song.id ? { ...item, songTitle: event.target.value } : item
                      ))}
                      placeholder={`Música ${index + 1}`}
                      className="px-3 py-2 rounded-card bg-navy-900 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-brand placeholder-[#64748B]"
                    />
                    <select
                      value={song.soloistId}
                      onChange={(event) => setSongs((current) => current.map((item) =>
                        item.id === song.id ? { ...item, soloistId: event.target.value } : item
                      ))}
                      className="px-3 py-2 rounded-card bg-navy-900 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-brand"
                    >
                      <option value="">Vocal</option>
                      {selectedVocalists.map((profile) => (
                        <option key={profile.id} value={profile.id}>
                          {profile.full_name ?? 'Sem nome'}
                        </option>
                      ))}
                    </select>
                    <select
                      value={song.keyNote}
                      onChange={(event) => setSongs((current) => current.map((item) =>
                        item.id === song.id ? { ...item, keyNote: event.target.value } : item
                      ))}
                      className="px-3 py-2 rounded-card bg-navy-900 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-brand"
                    >
                      {keys.map((key) => (
                        <option key={key || 'empty'} value={key}>{key || 'Tom'}</option>
                      ))}
                    </select>
                    <input
                      value={song.referenceLink}
                      onChange={(event) => setSongs((current) => current.map((item) =>
                        item.id === song.id ? { ...item, referenceLink: event.target.value } : item
                      ))}
                      placeholder="Referência YouTube"
                      className="px-3 py-2 rounded-card bg-navy-900 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-brand placeholder-[#64748B]"
                    />
                    <button
                      type="button"
                      onClick={() => setSongs((current) => current.filter((item) => item.id !== song.id))}
                      className="p-2 rounded-card text-red-300 hover:bg-red-500/10 transition-colors"
                      aria-label="Remover música"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

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
              {saving ? 'Salvando...' : 'Salvar Escala'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
