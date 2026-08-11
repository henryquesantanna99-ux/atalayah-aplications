'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { CalendarPlus, Check, Music2, Pencil, Plus, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { createScale } from './actions'
import type { ScheduleFunctionOption } from '@/lib/schedule-functions'
import type { Json } from '@/types/database'

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

interface CatalogStem {
  id: string
  stem_type: string
  original_file_name: string | null
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
  stems: CatalogStem[]
}

interface SongVariationRow {
  id: string
  song_id: string
  songs: {
    title: string | null
    artist: string | null
  } | null
  artist: string | null
  key_note: string | null
  moment: EventSongDraft['moment'] | null
  soloist_id: string | null
  version: string | null
  youtube_url: string | null
}

interface SongRow {
  id: string
  title: string
  artist: string | null
  youtube_url: string | null
  created_at: string
  song_stems?: CatalogStem[] | null
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
  youtubeVideoId: string | null
  youtubeThumbnail: string | null
  youtubeDuration: string | null
  lyricsPlain: string | null
  lyricsSynced: string | null
  albumName: string | null
  bpm: number | null
  metadataSource: string | null
  metadataPayload: Json
  lrclibId: number | null
  addToGeneralCatalog: boolean
  isFromGeneralCatalog: boolean
}

interface MusicResolveResult {
  source: 'catalog' | 'youtube'
  songId: string | null
  title: string
  artist: string
  thumbnail: string | null
  url: string | null
  videoId: string | null
  duration: string | null
  lyricsExcerpt: string | null
  lyricsPlain?: string | null
  lyricsSynced?: string | null
  albumName?: string | null
  bpm?: number | null
  metadataSource?: string | null
  metadataPayload?: Json
  lrclibId?: number | null
}

type MusicSearchState = { status: 'idle' | 'loading' | 'success' | 'error'; results: MusicResolveResult[]; error?: string }

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
    youtubeVideoId: null,
    youtubeThumbnail: null,
    youtubeDuration: null,
    lyricsPlain: null,
    lyricsSynced: null,
    albumName: null,
    bpm: null,
    metadataSource: null,
    metadataPayload: {},
    lrclibId: null,
    addToGeneralCatalog: false,
    isFromGeneralCatalog: false,
  }
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
  const [loadingExisting, setLoadingExisting] = useState(false)
  const [catalogSongs, setCatalogSongs] = useState<CatalogSong[]>([])
  const [scheduleFunctions, setScheduleFunctions] = useState<ScheduleFunctionOption[]>([])
  const [legacyAssignments, setLegacyAssignments] = useState<Record<string, string>>({})
  const [catalogLoaded, setCatalogLoaded] = useState(false)
  const [songSearchByDraft, setSongSearchByDraft] = useState<Record<string, string>>({})
  const [musicSearches, setMusicSearches] = useState<Record<string, MusicSearchState>>({})
  const suppressedSearches = useRef(new Set<string>())
  const searchSequence = useRef<Record<string, number>>({})

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
    const [{ data: variationsData }, { data: songsData }] = await Promise.all([
      supabase
        .from('song_variations')
        .select('id, song_id, songs!inner(title, artist, is_catalog_visible), key_note, moment, soloist_id, version, youtube_url')
        .eq('songs.is_catalog_visible', true)
        .order('created_at', { ascending: false }),
      supabase
        .from('songs')
        .select('id, title, artist, youtube_url, created_at, song_stems(id, stem_type, original_file_name)')
        .eq('is_catalog_visible', true)
        .order('created_at', { ascending: false }),
    ])

    setCatalogSongs(buildCatalogSongs(variationsData ?? [], songsData ?? []))
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
      next[profile.id] = scheduleFunctions[0]?.id ?? ''
      return next
    })
  }

  function addCatalogSongToEvent(variation: CatalogSong) {
    setSongs((current) => [
      ...current.filter((song) => song.title.trim()),
      {
        ...newSongDraft(),
        catalogVariationId: variation.id,
        songId: variation.song_id,
        title: variation.title,
        artist: variation.artist ?? '',
        keyNote: variation.key_note ?? '',
        moment: variation.moment ?? '',
        soloistId: variation.soloist_id ?? '',
        version: variation.version ?? '',
        youtubeUrl: variation.youtube_url ?? '',
        addToGeneralCatalog: true,
        isFromGeneralCatalog: true,
      },
    ])
  }

  function updateSongField(id: string, field: keyof EventSongDraft, value: string | boolean) {
    setSongs((prev) => prev.map((s) => s.id === id ? { ...s, [field]: value } : s))
  }

  function confirmResolvedSong(draftId: string, result: MusicResolveResult) {
    suppressedSearches.current.add(draftId)
    setSongs((current) => current.map((song) => song.id === draftId ? {
      ...song,
      songId: result.source === 'catalog' ? result.songId : null,
      catalogVariationId: null,
      title: result.title,
      artist: result.artist,
      youtubeUrl: result.url ?? '',
      youtubeVideoId: result.videoId,
      youtubeThumbnail: result.thumbnail,
      youtubeDuration: result.duration,
      lyricsPlain: result.lyricsPlain ?? null,
      lyricsSynced: result.lyricsSynced ?? null,
      albumName: result.albumName ?? null,
      bpm: result.bpm ?? null,
      metadataSource: result.metadataSource ?? (result.source === 'youtube' ? 'youtube' : null),
      metadataPayload: result.metadataPayload ?? (result.lrclibId ? { lrclibId: result.lrclibId } : {}),
      lrclibId: result.lrclibId ?? null,
      addToGeneralCatalog: result.source === 'catalog' ? true : song.addToGeneralCatalog,
      isFromGeneralCatalog: result.source === 'catalog',
    } : song))
    setMusicSearches((current) => ({ ...current, [draftId]: { status: 'idle', results: [] } }))
  }

  useEffect(() => {
    const controllers: AbortController[] = []
    const timers = songs.map((draft) => {
      if (suppressedSearches.current.delete(draft.id)) return undefined
      const title = draft.title.trim()
      if (title.length < 2) {
        setMusicSearches((current) => ({ ...current, [draft.id]: { status: 'idle', results: [] } }))
        return undefined
      }
      const sequence = (searchSequence.current[draft.id] ?? 0) + 1
      searchSequence.current[draft.id] = sequence
      const controller = new AbortController()
      controllers.push(controller)
      return window.setTimeout(async () => {
        setMusicSearches((current) => ({ ...current, [draft.id]: { status: 'loading', results: current[draft.id]?.results ?? [] } }))
        try {
          const response = await fetch('/api/music/resolve', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, artist: draft.artist.trim() }), signal: controller.signal,
          })
          const payload = await response.json()
          if (!response.ok) throw new Error(payload.error ?? 'Erro ao buscar músicas.')
          if (searchSequence.current[draft.id] !== sequence) return
          setMusicSearches((current) => ({ ...current, [draft.id]: { status: 'success', results: payload.results ?? [] } }))
        } catch (error) {
          if (controller.signal.aborted || searchSequence.current[draft.id] !== sequence) return
          setMusicSearches((current) => ({ ...current, [draft.id]: { status: 'error', results: [], error: error instanceof Error ? error.message : 'Erro ao buscar músicas.' } }))
        }
      }, 450)
    })
    return () => { timers.forEach((timer) => timer !== undefined && window.clearTimeout(timer)); controllers.forEach((controller) => controller.abort()) }
  }, [songs])

  async function loadExistingEvent() {
    if (!event) return
    setLoadingExisting(true)
    try {
      const [{ data: memberRows, error: memberError }, { data: songRows, error: songError }, { data: functionRows, error: functionError }] = await Promise.all([
        supabase.from('event_members').select('profile_id, instrument, schedule_function_id').eq('event_id', event.id),
        supabase
          .from('setlist_songs')
          .select('id, song_id, song_title, artist, key_note, moment, soloist_id, version, reference_link, order_index, songs(is_catalog_visible)')
          .eq('event_id', event.id)
          .order('order_index'),
        supabase.from('schedule_functions').select('id, display_name, category, is_active').eq('is_active', true).order('display_name'),
      ])
      if (memberError) throw memberError
      if (songError) throw songError
      if (functionError) throw functionError
      setScheduleFunctions((functionRows ?? []) as ScheduleFunctionOption[])
      setSelectedMembers(Object.fromEntries((memberRows ?? []).map((row) => [row.profile_id, row.schedule_function_id ?? ''])))
      setLegacyAssignments(Object.fromEntries((memberRows ?? [])
        .filter((row) => !row.schedule_function_id && row.instrument)
        .map((row) => [row.profile_id, row.instrument as string])))
      setSongs((songRows ?? []).length > 0
        ? (songRows ?? []).map((row) => ({
            id: row.id,
            catalogVariationId: null,
            songId: row.song_id,
            title: row.song_title,
            artist: row.artist ?? '',
            keyNote: row.key_note ?? '',
            moment: row.moment ?? '',
            soloistId: row.soloist_id ?? '',
            version: row.version ?? '',
            youtubeUrl: row.reference_link ?? '',
            youtubeVideoId: null,
            youtubeThumbnail: null,
            youtubeDuration: null,
            lyricsPlain: null,
            lyricsSynced: null,
            albumName: null,
            bpm: null,
            metadataSource: null,
            metadataPayload: {},
            lrclibId: null,
            addToGeneralCatalog: row.songs?.is_catalog_visible ?? false,
            isFromGeneralCatalog: row.songs?.is_catalog_visible ?? false,
          }))
        : [newSongDraft()])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar a escala do evento.')
    } finally {
      setLoadingExisting(false)
    }
  }

  async function handleOpenChange(val: boolean) {
    if (val && !event && scheduleFunctions.length === 0) {
      const { data, error } = await supabase.from('schedule_functions').select('id, display_name, category, is_active').eq('is_active', true).order('display_name')
      if (error) toast.error('Erro ao carregar as funções da escala.')
      else setScheduleFunctions((data ?? []) as ScheduleFunctionOption[])
    }
    setOpen(val)
    if (val && event) void loadExistingEvent()
    if (!val) {
      setStep(1)
      setSelectedMembers({})
      setLegacyAssignments({})
      setSongs([newSongDraft()])
      setSongSearchByDraft({})
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

  async function handleSubmit() {
    if (!form.title.trim()) {
      toast.error('Informe o título do evento.')
      return
    }
    const unresolvedLegacy = Object.keys(legacyAssignments)
      .some((profileId) => profileId in selectedMembers && !selectedMembers[profileId])
    if (unresolvedLegacy) {
      toast.error('Corrija as funções legadas destacadas antes de salvar.')
      return
    }

    const members = Object.entries(selectedMembers)
      .filter(([, scheduleFunctionId]) => Boolean(scheduleFunctionId))
      .map(([profileId, scheduleFunctionId]) => ({ profileId, scheduleFunctionId }))

    const validSongs = songs.filter((s) => s.title.trim())

    setSaving(true)
    try {
      await createScale({
        eventId: event?.id ?? null,
        event: buildPayload(),
        members,
        songs: validSongs.map((s) => ({
          setlistSongId: s.id,
          songId: s.songId ?? null,
          songTitle: s.title,
          artist: s.artist || null,
          soloistId: s.soloistId || null,
          keyNote: s.keyNote || null,
          moment: s.moment || null,
          version: s.version || null,
          referenceLink: s.youtubeUrl || null,
          youtubeVideoId: s.youtubeVideoId,
          youtubeUrl: s.youtubeUrl || null,
          youtubeThumbnail: s.youtubeThumbnail,
          youtubeDuration: s.youtubeDuration,
          lyricsPlain: s.lyricsPlain,
          lyricsSynced: s.lyricsSynced,
          albumName: s.albumName,
          bpm: s.bpm,
          metadataSource: s.metadataSource,
          metadataPayload: s.metadataPayload,
          addToGeneralCatalog: s.addToGeneralCatalog,
        })),
      })
      toast.success(isEditing ? 'Evento atualizado com sucesso.' : 'Evento criado com sucesso.')
      handleOpenChange(false)
      router.refresh()
    } catch (err) {
      // createScale only returns allow-listed domain messages; never render raw
      // PostgreSQL diagnostics in the client.
      toast.error(err instanceof Error ? err.message : 'Não foi possível salvar a escala. Tente novamente.')
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

  function filteredCatalogForDraft(draftId: string) {
    const q = (songSearchByDraft[draftId] ?? '').toLowerCase()
    if (!q) return catalogSongs.slice(0, 8)
    return catalogSongs.filter(
      (song) =>
        song.title.toLowerCase().includes(q) ||
        (song.artist ?? '').toLowerCase().includes(q) ||
        song.stems.some((stem) => stemDisplayName(stem).toLowerCase().includes(q))
    ).slice(0, 8)
  }

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

        {loadingExisting ? (
          <p className="py-8 text-center text-sm text-[#94A3B8]">Carregando evento...</p>
        ) : (
          <div className="space-y-5 mt-2">
            {step === 1 && (
              <div className="space-y-4">
                <Step1Fields form={form} profiles={profiles} onChange={handleChange} inputClass={inputClass} />
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2.5 rounded-card border border-white/[0.08] text-[#94A3B8] text-sm hover:bg-white/[0.04] transition-colors">Cancelar</button>
                  <button type="button" onClick={handleNext} className="flex-1 py-2.5 rounded-card bg-brand text-white text-sm font-medium hover:bg-brand-light transition-colors">Próximo →</button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-white">Membros da Escala</h3>
                {profiles.length === 0 ? (
                  <p className="text-sm text-[#64748B]">Nenhum membro ativo cadastrado.</p>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {profiles.map((profile) => {
                      const checked = profile.id in selectedMembers
                      const legacyValue = legacyAssignments[profile.id]
                      return (
                        <div key={profile.id} className="grid grid-cols-1 sm:grid-cols-[1fr_200px] gap-2 rounded-card border border-white/[0.06] bg-navy-800/50 p-3">
                          <label className="flex items-center gap-2 text-sm text-white">
                            <input type="checkbox" checked={checked} onChange={() => toggleMember(profile)} disabled={scheduleFunctions.length === 0} className="h-4 w-4 rounded border-white/[0.08] accent-brand" />
                            <span>{profile.full_name ?? 'Sem nome'}</span>
                            {legacyValue && <span className="text-xs text-amber-300">corrigir: “{legacyValue}”</span>}
                          </label>
                          <select
                            value={selectedMembers[profile.id] ?? ''}
                            onChange={(e) => setSelectedMembers((c) => ({ ...c, [profile.id]: e.target.value }))}
                            disabled={!checked}
                            className="px-3 py-2 rounded-card bg-navy-900 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-brand disabled:opacity-40"
                          >
                            <option value="">Selecione uma função</option>
                            {scheduleFunctions.map((fn) => <option key={fn.id} value={fn.id}>{fn.display_name}</option>)}
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
                    <button type="button" onClick={handleSubmit} disabled={saving} className="flex-1 py-2.5 rounded-card bg-brand text-white text-sm font-medium hover:bg-brand-light transition-colors disabled:opacity-60">{saving ? 'Salvando...' : (isEditing ? 'Salvar Evento' : 'Criar Evento')}</button>
                  )}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-white">Músicas do Culto</h3>
                  <p className="mt-1 text-xs text-[#64748B]">Adicione músicas do catálogo à esquerda e ajuste a escala à direita.</p>
                </div>

                <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(260px,0.85fr)_minmax(360px,1.15fr)]">
                  <section className="flex min-h-0 flex-col rounded-card border border-white/[0.06] bg-navy-800/40 p-3">
                    <label className="mb-2 text-[10px] font-medium uppercase tracking-wide text-[#64748B]">Catálogo</label>
                    <input
                      value={songSearchByDraft.catalog ?? ''}
                      onChange={(event) => setSongSearchByDraft((current) => ({ ...current, catalog: event.target.value }))}
                      placeholder="Buscar música ou artista..."
                      className={inputSmClass}
                    />
                    <div className="mt-3 max-h-[430px] space-y-2 overflow-y-auto pr-1">
                      {filteredCatalogForDraft('catalog').map((catalogSong) => (
                        (() => {
                          const alreadyAdded = songs.some((song) => song.catalogVariationId === catalogSong.id)
                          return (
                        <div key={catalogSong.id} className="flex items-center gap-2 rounded-card border border-white/[0.06] bg-navy-900 p-2.5">
                          <Music2 className="h-4 w-4 shrink-0 text-cyan-300" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-white">{catalogSong.title}</p>
                            <p className="truncate text-[11px] text-[#64748B]">{catalogSong.artist || 'Artista não informado'}{catalogSong.key_note ? ` · ${catalogSong.key_note}` : ''}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => addCatalogSongToEvent(catalogSong)}
                            disabled={alreadyAdded}
                            className="inline-flex shrink-0 items-center gap-1 rounded-card bg-brand/15 px-2 py-1.5 text-[11px] font-medium text-brand hover:bg-brand/25 disabled:cursor-default disabled:opacity-40"
                            aria-label={`Adicionar ${catalogSong.title}`}
                          >
                            {alreadyAdded ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />} {alreadyAdded ? 'Adicionada' : 'Adicionar'}
                          </button>
                        </div>
                          )
                        })()
                      ))}
                      {filteredCatalogForDraft('catalog').length === 0 && <p className="py-8 text-center text-xs text-[#64748B]">Nenhuma música encontrada.</p>}
                    </div>
                  </section>

                  <section className="flex min-h-0 flex-col rounded-card border border-white/[0.06] bg-navy-800/40 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-medium text-white">Selecionadas</p>
                        <p className="text-[11px] text-[#64748B]">{songs.filter((song) => song.title.trim()).length} música(s)</p>
                      </div>
                      <button type="button" onClick={() => setSongs((current) => [...current.filter((song) => song.title.trim()), newSongDraft()])} className="inline-flex items-center gap-1 rounded-card border border-white/[0.08] px-2.5 py-1.5 text-[11px] text-[#94A3B8] hover:text-white">
                        <Plus className="h-3.5 w-3.5" /> Música manual
                      </button>
                    </div>
                    <div className="max-h-[430px] space-y-3 overflow-y-auto pr-1">
                      {songs.map((draft, index) => (
                        <div key={draft.id} className="space-y-3 rounded-card border border-white/[0.06] bg-navy-900 p-3">
                          <label className={`inline-flex items-center gap-2 rounded-card border px-2 py-1.5 text-[11px] transition-colors ${
                            draft.addToGeneralCatalog
                              ? 'border-brand/40 bg-brand/15 text-cyan-200'
                              : 'border-white/[0.08] text-[#94A3B8] hover:border-white/20'
                          } ${draft.isFromGeneralCatalog ? 'cursor-default opacity-80' : 'cursor-pointer'}`}>
                            <input
                              type="checkbox"
                              checked={draft.addToGeneralCatalog}
                              disabled={draft.isFromGeneralCatalog}
                              onChange={(event) => updateSongField(draft.id, 'addToGeneralCatalog', event.target.checked)}
                              className="h-3.5 w-3.5 rounded border-white/[0.08] accent-brand"
                            />
                            <span>Adicionar ao setlist geral</span>
                            {draft.addToGeneralCatalog && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                          </label>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-[#94A3B8]">{index + 1}. {draft.title || 'Nova música'}</span>
                            <button type="button" onClick={() => setSongs((current) => current.filter((song) => song.id !== draft.id))} className="rounded p-1 text-[#64748B] hover:bg-red-400/10 hover:text-red-400" aria-label="Remover música"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <input value={draft.title} onChange={(event) => updateSongField(draft.id, 'title', event.target.value)} placeholder="Título" className={`col-span-2 ${inputSmClass}`} />
                            <input value={draft.artist} onChange={(event) => updateSongField(draft.id, 'artist', event.target.value)} placeholder="Artista" className={inputSmClass} />
                            <select value={draft.keyNote} onChange={(event) => updateSongField(draft.id, 'keyNote', event.target.value)} className={inputSmClass}><option value="">Tom</option>{KEYS.map((key) => <option key={key} value={key}>{key}</option>)}</select>
                            <select value={draft.moment} onChange={(event) => updateSongField(draft.id, 'moment', event.target.value)} className={inputSmClass}><option value="">Momento</option>{MOMENTS.map((moment) => <option key={moment} value={moment}>{moment}</option>)}</select>
                            <select value={draft.soloistId} onChange={(event) => updateSongField(draft.id, 'soloistId', event.target.value)} className={inputSmClass}><option value="">Solista</option>{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.full_name}</option>)}</select>
                            <input value={draft.version} onChange={(event) => updateSongField(draft.id, 'version', event.target.value)} placeholder="Versão" className={inputSmClass} />
                            <input value={draft.youtubeUrl} onChange={(event) => updateSongField(draft.id, 'youtubeUrl', event.target.value)} type="url" placeholder="Link do YouTube" className={inputSmClass} />
                          </div>
                          {musicSearches[draft.id]?.status === 'loading' && (
                            <p className="text-[11px] text-cyan-300" role="status">Buscando no catálogo e no YouTube…</p>
                          )}
                          {musicSearches[draft.id]?.status === 'error' && (
                            <p className="text-[11px] text-red-300" role="alert">{musicSearches[draft.id].error}</p>
                          )}
                          {musicSearches[draft.id]?.status === 'success' && musicSearches[draft.id].results.length === 0 && (
                            <p className="text-[11px] text-[#64748B]">Nenhum resultado encontrado.</p>
                          )}
                          {(musicSearches[draft.id]?.results.length ?? 0) > 0 && (
                            <div className="space-y-2 border-t border-white/[0.06] pt-2">
                              <p className="text-[10px] uppercase tracking-wide text-[#64748B]">Confirme uma versão</p>
                              {musicSearches[draft.id].results.map((result) => (
                                <div key={`${result.source}-${result.songId ?? result.videoId}`} className="flex gap-2 rounded-card border border-white/[0.06] bg-navy-800/70 p-2">
                                  {result.thumbnail ? <Image src={result.thumbnail} alt="" width={80} height={56} unoptimized className="h-14 w-20 shrink-0 rounded object-cover" /> : <div className="flex h-14 w-20 shrink-0 items-center justify-center rounded bg-navy-900"><Music2 className="h-4 w-4 text-[#64748B]" /></div>}
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-medium text-white">{result.title}</p>
                                    <p className="truncate text-[11px] text-[#94A3B8]">{result.artist || 'Artista não informado'}</p>
                                    {result.lyricsExcerpt && <p className="mt-1 line-clamp-2 whitespace-pre-line text-[10px] text-[#64748B]">{result.lyricsExcerpt}</p>}
                                  </div>
                                  <button type="button" onClick={() => confirmResolvedSong(draft.id, result)} className="h-fit shrink-0 rounded-card bg-brand px-2 py-1.5 text-[11px] font-medium text-white hover:bg-brand-light">Confirmar</button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setStep(2)} className="flex-1 rounded-card border border-white/[0.08] py-2.5 text-sm text-[#94A3B8] hover:bg-white/[0.04]">← Voltar</button>
                  <button type="button" onClick={handleSubmit} disabled={saving} className="flex-1 rounded-card bg-brand py-2.5 text-sm font-medium text-white hover:bg-brand-light disabled:opacity-60">{saving ? 'Salvando...' : (isEditing ? 'Salvar Evento' : 'Criar Evento')}</button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

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


function buildCatalogSongs(variationsData: unknown[], songsData: unknown[]): CatalogSong[] {
  const stemsBySongId = new Map<string, CatalogStem[]>()
  const songs = songsData as SongRow[]

  for (const song of songs) {
    stemsBySongId.set(song.id, song.song_stems ?? [])
  }

  const variations = (variationsData as SongVariationRow[]).map((variation) => ({
    id: variation.id,
    song_id: variation.song_id,
    title: variation.songs?.title ?? '',
    artist: variation.artist ?? variation.songs?.artist ?? '',
    key_note: variation.key_note,
    moment: variation.moment,
    soloist_id: variation.soloist_id,
    version: variation.version,
    youtube_url: variation.youtube_url,
    stems: stemsBySongId.get(variation.song_id) ?? [],
  }))

  const variationSongIds = new Set(variations.map((variation) => variation.song_id))
  const songsWithoutVariation = songs
    .filter((song) => !variationSongIds.has(song.id))
    .map((song) => ({
      id: `song:${song.id}`,
      song_id: song.id,
      title: song.title,
      artist: song.artist,
      key_note: null,
      moment: null,
      soloist_id: null,
      version: null,
      youtube_url: song.youtube_url,
      stems: song.song_stems ?? [],
    }))

  return [...variations, ...songsWithoutVariation]
}

function stemDisplayName(stem: CatalogStem) {
  return stem.original_file_name?.split('/').pop()?.replace(/\.[^.]+$/, '') ?? stem.stem_type
}
