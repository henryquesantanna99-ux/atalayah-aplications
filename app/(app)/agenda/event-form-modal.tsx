'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarPlus, Headphones, Pencil, Plus, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { createEvent, updateEvent, createScale } from './actions'

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

export interface ProfileOption {
  id: string
  full_name: string | null
  team_members?: {
    teams: string[]
    instruments: string[]
    function_role: 'lider' | 'integrante' | null
  }[]
}

interface CatalogSong {
  id: string
  song_id: string
  title: string
  artist: string | null
  key_note: string | null
  moment: string | null
  soloist_id: string | null
  version: string | null
  youtube_url: string | null
}

interface EventSongDraft {
  id: string
  catalogVariationId: string | null
  songId: string | null
  title: string
  artist: string
  keyNote: string
  moment: string
  soloistId: string
  version: string
  youtubeUrl: string
}

interface EventFormModalProps {
  event?: CalendarEvent
  profiles?: ProfileOption[]
  triggerLabel?: string
  triggerVariant?: 'primary' | 'ghost'
}

const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
  'Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'A#m', 'Bm']
const MOMENTS = ['Prévia', 'Adoração', 'Palavra', 'Celebração'] as const

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

function newSongDraft(): EventSongDraft {
  return {
    id: crypto.randomUUID(),
    catalogVariationId: null,
    songId: null,
    title: '',
    artist: '',
    keyNote: '',
    moment: '',
    soloistId: '',
    version: '',
    youtubeUrl: '',
  }
}

function availableFunctions(profile: ProfileOption) {
  const member = profile.team_members?.[0]
  const values = [
    ...(member?.instruments ?? []),
    ...(member?.teams ?? []),
    member?.function_role === 'lider' ? 'Líder' : null,
  ].filter(Boolean) as string[]
  return Array.from(new Set(values))
}

export function EventFormModal({
  event,
  profiles = [],
  triggerLabel,
  triggerVariant = 'primary',
}: EventFormModalProps) {
  const router = useRouter()
  const supabase = createClient()
  const isEditing = Boolean(event)

  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [catalogSongs, setCatalogSongs] = useState<CatalogSong[]>([])
  const [catalogLoaded, setCatalogLoaded] = useState(false)
  const [songSearch, setSongSearch] = useState('')

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
  const [selectedMembers, setSelectedMembers] = useState<Record<string, string>>({})
  const [songs, setSongs] = useState<EventSongDraft[]>([newSongDraft()])

  const totalSteps = form.type === 'culto' ? 3 : 2

  async function loadCatalog() {
    if (catalogLoaded) return
    const { data } = await supabase
      .from('song_variations')
      .select('id, song_id, songs(title, artist), key_note, moment, soloist_id, version, youtube_url')
      .order('created_at', { ascending: false })
    setCatalogSongs(
      (data ?? []).map((v: any) => ({
        id: v.id,
        song_id: v.song_id,
        title: v.songs?.title ?? '',
        artist: v.artist ?? v.songs?.artist ?? '',
        key_note: v.key_note,
        moment: v.moment,
        soloist_id: v.soloist_id,
        version: v.version,
        youtube_url: v.youtube_url,
      }))
    )
    setCatalogLoaded(true)
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const target = e.target
    const value = target instanceof HTMLInputElement && target.type === 'checkbox'
      ? target.checked
      : target.value
    setForm((c) => ({ ...c, [target.name]: value }))
  }

  function toggleMember(profile: ProfileOption) {
    setSelectedMembers((current) => {
      const next = { ...current }
      if (next[profile.id]) {
        delete next[profile.id]
        return next
      }
      const functions = availableFunctions(profile)
      next[profile.id] = functions[0] ?? ''
      return next
    })
  }

  function selectCatalogSong(draft: EventSongDraft, variation: CatalogSong) {
    setSongs((prev) => prev.map((s) =>
      s.id === draft.id
        ? {
            ...s,
            catalogVariationId: variation.id,
            songId: variation.song_id,
            title: variation.title,
            artist: variation.artist ?? '',
            keyNote: variation.key_note ?? '',
            moment: variation.moment ?? '',
            soloistId: variation.soloist_id ?? '',
            version: variation.version ?? '',
            youtubeUrl: variation.youtube_url ?? '',
          }
        : s
    ))
    setSongSearch('')
  }

  function updateSongField(id: string, field: keyof EventSongDraft, value: string) {
    setSongs((prev) => prev.map((s) => s.id === id ? { ...s, [field]: value } : s))
  }

  function handleOpenChange(val: boolean) {
    setOpen(val)
    if (!val) {
      setStep(1)
      setSelectedMembers({})
      setSongs([newSongDraft()])
      setSongSearch('')
      if (!isEditing) setForm(emptyForm)
    }
  }

  async function handleNext() {
    if (step === 1 && !form.title.trim()) {
      toast.error('Informe o título do evento.')
      return
    }
    if (step === 2) {
      await loadCatalog()
    }
    setStep((s) => s + 1)
  }

  async function handleSubmitEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!event) return
    if (!form.title.trim()) {
      toast.error('Informe o título do evento.')
      return
    }
    setSaving(true)
    const payload = buildPayload()
    try {
      await updateEvent(event.id, payload)
      toast.success('Evento atualizado.')
      setOpen(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar evento.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmitCreate() {
    if (!form.title.trim()) {
      toast.error('Informe o título do evento.')
      return
    }

    const members = Object.entries(selectedMembers)
      .filter(([, fn]) => Boolean(fn))
      .map(([profileId, functionName]) => ({ profileId, functionName: functionName as string }))

    const validSongs = songs.filter((s) => s.title.trim())

    setSaving(true)
    try {
      await createScale({
        eventId: null,
        event: buildPayload(),
        members,
        songs: validSongs.map((s) => ({
          songId: s.songId ?? null,
          songTitle: s.title,
          artist: s.artist || null,
          soloistId: s.soloistId || null,
          keyNote: s.keyNote || null,
          moment: s.moment || null,
          version: s.version || null,
          referenceLink: s.youtubeUrl || null,
        })),
      })
      toast.success('Evento criado com sucesso.')
      handleOpenChange(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar evento.')
    } finally {
      setSaving(false)
    }
  }

  function buildPayload() {
    return {
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
  }

  const filteredCatalog = useMemo(() => {
    const q = songSearch.toLowerCase()
    if (!q) return catalogSongs.slice(0, 8)
    return catalogSongs.filter(
      (s) => s.title.toLowerCase().includes(q) || s.artist?.toLowerCase().includes(q)
    ).slice(0, 8)
  }, [catalogSongs, songSearch])

  const inputClass = 'w-full px-3 py-2 rounded-card bg-navy-800 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-brand placeholder-[#64748B]'
  const inputSmClass = 'w-full px-2 py-1.5 rounded-card bg-navy-900 border border-white/[0.08] text-white text-xs focus:outline-none focus:border-brand placeholder-[#64748B]'

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          className={
            triggerVariant === 'primary'
              ? 'flex items-center gap-2 px-4 py-2 rounded-card bg-brand text-white text-sm font-medium hover:bg-brand-light transition-colors'
              : 'inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-card border border-white/[0.08] text-[#94A3B8] hover:text-white hover:border-white/20 transition-colors'
          }
        >
          {isEditing ? <Pencil className="w-3.5 h-3.5" /> : <CalendarPlus className="w-4 h-4" />}
          {triggerLabel ?? (isEditing ? 'Editar' : 'Criar Evento')}
        </button>
      </DialogTrigger>
      <DialogContent className="bg-navy-900 border border-white/[0.08] text-white max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">
            {isEditing ? 'Editar Evento' : 'Criar Evento'}
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator (create mode only) */}
        {!isEditing && (
          <div className="flex items-center gap-2 mt-1 mb-2">
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium transition-colors ${
                  s < step ? 'bg-brand text-white' : s === step ? 'bg-brand text-white' : 'bg-navy-800 text-[#64748B]'
                }`}>
                  {s < step ? '✓' : s}
                </div>
                <span className={`text-xs hidden sm:inline ${s === step ? 'text-white' : 'text-[#64748B]'}`}>
                  {s === 1 ? 'Dados' : s === 2 ? 'Membros' : 'Músicas'}
                </span>
                {s < totalSteps && <div className="w-8 h-px bg-white/[0.08]" />}
              </div>
            ))}
          </div>
        )}

        {/* ── EDIT MODE: single-step form ── */}
        {isEditing && (
          <form onSubmit={handleSubmitEdit} className="space-y-4 mt-2">
            <Step1Fields form={form} profiles={profiles} onChange={handleChange} inputClass={inputClass} />
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2.5 rounded-card border border-white/[0.08] text-[#94A3B8] text-sm hover:bg-white/[0.04] transition-colors">Cancelar</button>
              <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-card bg-brand text-white text-sm font-medium hover:bg-brand-light transition-colors disabled:opacity-60">{saving ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </form>
        )}

        {/* ── CREATE MODE: multi-step ── */}
        {!isEditing && (
          <div className="space-y-5 mt-2">
            {/* Step 1: Dados do Evento */}
            {step === 1 && (
              <div className="space-y-4">
                <Step1Fields form={form} profiles={profiles} onChange={handleChange} inputClass={inputClass} />
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2.5 rounded-card border border-white/[0.08] text-[#94A3B8] text-sm hover:bg-white/[0.04] transition-colors">Cancelar</button>
                  <button type="button" onClick={handleNext} className="flex-1 py-2.5 rounded-card bg-brand text-white text-sm font-medium hover:bg-brand-light transition-colors">Próximo →</button>
                </div>
              </div>
            )}

            {/* Step 2: Membros da Escala */}
            {step === 2 && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-white">Membros da Escala</h3>
                {profiles.length === 0 ? (
                  <p className="text-sm text-[#64748B]">Nenhum membro ativo cadastrado.</p>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {profiles.map((profile) => {
                      const functions = availableFunctions(profile)
                      const checked = profile.id in selectedMembers
                      return (
                        <div key={profile.id} className="grid grid-cols-1 sm:grid-cols-[1fr_200px] gap-2 rounded-card border border-white/[0.06] bg-navy-800/50 p-3">
                          <label className="flex items-center gap-2 text-sm text-white">
                            <input type="checkbox" checked={checked} onChange={() => toggleMember(profile)} disabled={functions.length === 0} className="h-4 w-4 rounded border-white/[0.08] accent-brand" />
                            <span>{profile.full_name ?? 'Sem nome'}</span>
                            {functions.length === 0 && <span className="text-xs text-[#64748B]">sem funções</span>}
                          </label>
                          <select
                            value={selectedMembers[profile.id] ?? ''}
                            onChange={(e) => setSelectedMembers((c) => ({ ...c, [profile.id]: e.target.value }))}
                            disabled={!checked}
                            className="px-3 py-2 rounded-card bg-navy-900 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-brand disabled:opacity-40"
                          >
                            {functions.map((fn) => <option key={fn} value={fn}>{fn}</option>)}
                          </select>
                        </div>
                      )
                    })}
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setStep(1)} className="flex-1 py-2.5 rounded-card border border-white/[0.08] text-[#94A3B8] text-sm hover:bg-white/[0.04] transition-colors">← Voltar</button>
                  {form.type === 'culto' ? (
                    <button type="button" onClick={handleNext} className="flex-1 py-2.5 rounded-card bg-brand text-white text-sm font-medium hover:bg-brand-light transition-colors">Próximo →</button>
                  ) : (
                    <button type="button" onClick={handleSubmitCreate} disabled={saving} className="flex-1 py-2.5 rounded-card bg-brand text-white text-sm font-medium hover:bg-brand-light transition-colors disabled:opacity-60">{saving ? 'Criando...' : 'Criar Evento'}</button>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Músicas do Culto */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-white">Músicas do Culto</h3>
                  <button
                    type="button"
                    onClick={() => setSongs((prev) => [...prev, newSongDraft()])}
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-card border border-white/[0.08] text-[#94A3B8] hover:text-white hover:border-white/20 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Música
                  </button>
                </div>

                <div className="space-y-3">
                  {songs.map((draft, index) => (
                    <div key={draft.id} className="rounded-card border border-white/[0.06] bg-navy-800/50 p-3 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-[#64748B]">Música {index + 1}</span>
                        <button
                          type="button"
                          onClick={() => setSongs((prev) => prev.filter((s) => s.id !== draft.id))}
                          className="p-1 rounded text-[#64748B] hover:text-red-400 hover:bg-red-400/10 transition-colors"
                          aria-label="Remover música"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Catalog search */}
                      <div className="relative">
                        <input
                          value={draft.catalogVariationId ? `${draft.title}${draft.artist ? ` — ${draft.artist}` : ''}` : songSearch}
                          onChange={(e) => {
                            if (draft.catalogVariationId) {
                              setSongs((prev) => prev.map((s) => s.id === draft.id ? { ...newSongDraft(), id: s.id } : s))
                            }
                            setSongSearch(e.target.value)
                          }}
                          onFocus={() => { if (!catalogLoaded) loadCatalog() }}
                          placeholder="Buscar no catálogo ou digitar nova música..."
                          className={inputSmClass}
                        />
                        {!draft.catalogVariationId && (filteredCatalog.length > 0 || songSearch) && (
                          <div className="absolute z-10 mt-1 w-full rounded-card border border-white/[0.08] bg-navy-900 shadow-xl overflow-hidden">
                            {filteredCatalog.map((cat) => (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() => selectCatalogSong(draft, cat)}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-white/[0.05] transition-colors"
                              >
                                <span className="text-white font-medium">{cat.title}</span>
                                {cat.artist && <span className="text-[#64748B] ml-2">{cat.artist}</span>}
                                {cat.key_note && <span className="ml-2 text-[#94A3B8] font-mono">{cat.key_note}</span>}
                              </button>
                            ))}
                            {songSearch && filteredCatalog.length === 0 && (
                              <div className="px-3 py-2 text-xs text-[#64748B]">Nenhuma música encontrada. Preencha os campos abaixo para criar.</div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Song fields */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="col-span-2">
                          <label className="block text-[10px] text-[#64748B] mb-1">Título</label>
                          <input value={draft.title} onChange={(e) => updateSongField(draft.id, 'title', e.target.value)} placeholder="Nome da música" className={inputSmClass} />
                        </div>
                        <div>
                          <label className="block text-[10px] text-[#64748B] mb-1">Artista</label>
                          <input value={draft.artist} onChange={(e) => updateSongField(draft.id, 'artist', e.target.value)} placeholder="Artista" className={inputSmClass} />
                        </div>
                        <div>
                          <label className="block text-[10px] text-[#64748B] mb-1">Tom</label>
                          <select value={draft.keyNote} onChange={(e) => updateSongField(draft.id, 'keyNote', e.target.value)} className={inputSmClass}>
                            <option value="">—</option>
                            {KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] text-[#64748B] mb-1">Momento</label>
                          <select value={draft.moment} onChange={(e) => updateSongField(draft.id, 'moment', e.target.value)} className={inputSmClass}>
                            <option value="">—</option>
                            {MOMENTS.map((m) => <option key={m} value={m}>{m}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] text-[#64748B] mb-1">Solista</label>
                          <select value={draft.soloistId} onChange={(e) => updateSongField(draft.id, 'soloistId', e.target.value)} className={inputSmClass}>
                            <option value="">—</option>
                            {profiles.map((p) => (
                              <option key={p.id} value={p.id}>{p.full_name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] text-[#64748B] mb-1">Versão</label>
                          <input value={draft.version} onChange={(e) => updateSongField(draft.id, 'version', e.target.value)} placeholder="ao vivo, original..." className={inputSmClass} />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-[10px] text-[#64748B] mb-1">Link de Referência do YouTube</label>
                          <input value={draft.youtubeUrl} onChange={(e) => updateSongField(draft.id, 'youtubeUrl', e.target.value)} type="url" placeholder="https://youtube.com/..." className={inputSmClass} />
                        </div>
                      </div>

                      {/* Ouvir Faixas placeholder */}
                      <button
                        type="button"
                        disabled
                        className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-card border border-white/[0.06] text-[#64748B] cursor-not-allowed opacity-50"
                        title="Em desenvolvimento"
                      >
                        <Headphones className="w-3.5 h-3.5" />
                        Ouvir Faixas
                        <span className="text-[10px] bg-white/[0.06] px-1.5 py-0.5 rounded ml-1">em breve</span>
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setStep(2)} className="flex-1 py-2.5 rounded-card border border-white/[0.08] text-[#94A3B8] text-sm hover:bg-white/[0.04] transition-colors">← Voltar</button>
                  <button type="button" onClick={handleSubmitCreate} disabled={saving} className="flex-1 py-2.5 rounded-card bg-brand text-white text-sm font-medium hover:bg-brand-light transition-colors disabled:opacity-60">{saving ? 'Criando...' : 'Criar Evento'}</button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// Extracted step 1 form fields component
function Step1Fields({
  form,
  profiles,
  onChange,
  inputClass,
}: {
  form: typeof emptyForm
  profiles: ProfileOption[]
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void
  inputClass: string
}) {
  return (
    <>
      <div>
        <label htmlFor="event-title" className="block text-xs text-[#94A3B8] mb-1">Título</label>
        <input id="event-title" name="title" value={form.title} onChange={onChange} required className={inputClass} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="event-type" className="block text-xs text-[#94A3B8] mb-1">Tipo</label>
          <select id="event-type" name="type" value={form.type} onChange={onChange} className={inputClass}>
            <option value="culto">Culto</option>
            <option value="ensaio">Ensaio</option>
            <option value="comunhao">Comunhão</option>
            <option value="evento_externo">Evento Externo</option>
          </select>
        </div>
        <div>
          <label htmlFor="event-date" className="block text-xs text-[#94A3B8] mb-1">Data</label>
          <input id="event-date" name="date" type="date" value={form.date} onChange={onChange} required className={inputClass} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="arrival-time" className="block text-xs text-[#94A3B8] mb-1">Chegada</label>
          <input id="arrival-time" name="arrival_time" type="time" value={form.arrival_time} onChange={onChange} className={inputClass} />
        </div>
        <div>
          <label htmlFor="start-time" className="block text-xs text-[#94A3B8] mb-1">Início</label>
          <input id="start-time" name="start_time" type="time" value={form.start_time} onChange={onChange} className={inputClass} />
        </div>
      </div>

      {form.type === 'comunhao' && (
        <div className="space-y-3 rounded-card border border-white/[0.06] bg-navy-800/40 p-3">
          <p className="text-xs font-medium text-[#94A3B8] uppercase tracking-wide">Detalhes da Comunhão</p>
          <input name="agenda_topic" value={form.agenda_topic} onChange={onChange} placeholder="Pauta do encontro" className={inputClass} />
          <div className="grid grid-cols-2 gap-3">
            <select name="conductor_id" value={form.conductor_id} onChange={onChange} className={inputClass}>
              <option value="">Condutor</option>
              {profiles.map((p) => <option key={p.id} value={p.id}>{p.full_name ?? 'Sem nome'}</option>)}
            </select>
            <input name="location" value={form.location} onChange={onChange} placeholder="Local" className={inputClass} />
          </div>
          <label className="flex items-center gap-2 text-sm text-[#94A3B8]">
            <input type="checkbox" name="is_online" checked={form.is_online} onChange={onChange} className="h-4 w-4 rounded border-white/[0.08] accent-brand" />
            Reunião online
          </label>
          <input name="meet_link" type="url" value={form.meet_link} onChange={onChange} placeholder="https://meet.google.com/..." className={inputClass} />
        </div>
      )}

      <div>
        <label htmlFor="event-notes" className="block text-xs text-[#94A3B8] mb-1">Observações</label>
        <textarea id="event-notes" name="notes" value={form.notes} onChange={onChange} rows={3} className={`${inputClass} resize-none`} />
      </div>
    </>
  )
}
