'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Headphones, Pause, Play, RotateCcw, SlidersHorizontal, Volume2, VolumeX } from 'lucide-react'

const STEM_TYPES = [
  { key: 'vocals', label: 'Vocais', color: 'from-pink-500 to-rose-400' },
  { key: 'voice_guide', label: 'Voz guia', color: 'from-fuchsia-500 to-purple-400' },
  { key: 'back_vocal', label: 'Back vocal', color: 'from-purple-500 to-indigo-400' },
  { key: 'piano', label: 'Teclados', color: 'from-cyan-500 to-sky-400' },
  { key: 'guitar', label: 'Guitarras', color: 'from-amber-500 to-orange-400' },
  { key: 'acoustic_guitar', label: 'Violões', color: 'from-yellow-500 to-lime-400' },
  { key: 'bass', label: 'Baixos', color: 'from-emerald-500 to-green-400' },
  { key: 'drums', label: 'Baterias', color: 'from-red-500 to-orange-400' },
  { key: 'percussion', label: 'Percussões', color: 'from-lime-500 to-emerald-400' },
  { key: 'strings', label: 'Cordas', color: 'from-blue-500 to-indigo-400' },
  { key: 'brass', label: 'Sopros', color: 'from-orange-500 to-yellow-400' },
  { key: 'click', label: 'Click', color: 'from-slate-400 to-slate-200' },
  { key: 'other', label: 'Outras', color: 'from-gray-500 to-slate-300' },
] as const

codex/implementar-melhorias-no-modulo-de-estudo-xvov4z
const STEM_LABELS: Record<string, string> = Object.fromEntries(STEM_TYPES.map((stem) => [stem.key, stem.label]))
const STEM_COLORS: Record<string, string> = Object.fromEntries(STEM_TYPES.map((stem) => [stem.key, stem.color]))
const STEM_ORDER: Record<string, number> = Object.fromEntries(STEM_TYPES.map((stem, index) => [stem.key, index]))

const STEM_LABELS = Object.fromEntries(STEM_TYPES.map((stem) => [stem.key, stem.label]))
const STEM_COLORS = Object.fromEntries(STEM_TYPES.map((stem) => [stem.key, stem.color]))
main

interface Stem {
  id: string
  stem_type: string
  audio_url: string
  original_file_name?: string | null
}

interface StemFadersProps {
  stems: Stem[]
}

export function StemFaders({ stems }: StemFadersProps) {
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({})
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [volumes, setVolumes] = useState<Record<string, number>>({})
  const [muted, setMuted] = useState<Record<string, boolean>>({})
  const [soloed, setSoloed] = useState<Record<string, boolean>>({})

  const orderedStems = useMemo(() => {
 codex/implementar-melhorias-no-modulo-de-estudo-xvov4z
    return [...stems].sort((a, b) => {
      const byType = (STEM_ORDER[a.stem_type] ?? 99) - (STEM_ORDER[b.stem_type] ?? 99)

    const order = new Map(STEM_TYPES.map((stem, index) => [stem.key, index]))
    return [...stems].sort((a, b) => {
      const byType = (order.get(a.stem_type) ?? 99) - (order.get(b.stem_type) ?? 99)
 main
      if (byType !== 0) return byType
      return displayName(a).localeCompare(displayName(b), 'pt-BR')
    })
  }, [stems])

  const hasSolo = Object.values(soloed).some(Boolean)

  useEffect(() => {
    for (const stem of stems) {
      const audio = audioRefs.current[stem.id]
      if (!audio) continue

      audio.playbackRate = playbackRate
      audio.volume = effectiveVolume(volumes[stem.id] ?? 1, muted[stem.id] ?? false, soloed[stem.id] ?? false, hasSolo)
    }
  }, [hasSolo, muted, playbackRate, soloed, stems, volumes])

  async function togglePlayback() {
    if (isPlaying) {
      Object.values(audioRefs.current).forEach((audio) => audio?.pause())
      setIsPlaying(false)
      return
    }

    const audios = orderedStems
      .map((stem) => audioRefs.current[stem.id])
      .filter((audio): audio is HTMLAudioElement => Boolean(audio))
    if (audios.length === 0) return

    const currentTime = Math.min(...audios.map((audio) => audio.currentTime || 0))

    try {
      await Promise.all(audios.map(async (audio) => {
        audio.currentTime = currentTime
        audio.playbackRate = playbackRate
        await audio.play()
      }))
      setIsPlaying(true)
    } catch {
      setIsPlaying(false)
    }
  }

  function stopAll() {
    Object.values(audioRefs.current).forEach((audio) => {
      if (!audio) return
      audio.pause()
      audio.currentTime = 0
    })
    setIsPlaying(false)
  }

  function handleVolumeChange(stemId: string, value: number) {
    setVolumes((current) => ({ ...current, [stemId]: value }))
  }

  function toggleMute(stemId: string) {
    setMuted((current) => ({ ...current, [stemId]: !current[stemId] }))
  }

  function toggleSolo(stemId: string) {
    setSoloed((current) => ({ ...current, [stemId]: !current[stemId] }))
  }

  function resetMixer() {
    setPlaybackRate(1)
    setVolumes({})
    setMuted({})
    setSoloed({})
  }

  if (stems.length === 0) {
    return (
      <div className="rounded-[2rem] border border-white/[0.08] bg-gradient-to-br from-slate-950 via-navy-900 to-slate-900 p-6 text-center shadow-2xl">
        <SlidersHorizontal className="mx-auto mb-3 h-9 w-9 text-[#64748B]" />
        <h4 className="text-sm font-semibold text-white">Mesa de estudos sem multitracks</h4>
        <p className="mx-auto mt-2 max-w-md text-sm text-[#94A3B8]">
          Adicione uma pasta de multitracks ao criar a música. Os arquivos serão categorizados automaticamente por instrumento.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_34%),linear-gradient(135deg,#020617,#0f172a_52%,#111827)] shadow-2xl shadow-black/30">
      <div className="border-b border-white/[0.08] bg-white/[0.03] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.9)]" />
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/80">Mesa de som</p>
            </div>
            <h4 className="mt-2 text-xl font-bold text-white">Multitracks do estudo</h4>
            <p className="text-sm text-[#94A3B8]">Toque tudo junto, ajuste andamento, mute, solo e volume por faixa.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={togglePlayback}
              className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-brand/20 transition-colors hover:bg-brand-light"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {isPlaying ? 'Pausar geral' : 'Tocar geral'}
            </button>
            <button
              type="button"
              onClick={stopAll}
              className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] px-4 py-2 text-sm text-[#94A3B8] transition-colors hover:border-white/20 hover:text-white"
            >
              <RotateCcw className="h-4 w-4" />
              Reiniciar
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <div className="mb-2 flex items-center justify-between text-xs text-[#94A3B8]">
              <span>Andamento</span>
              <span className="font-mono text-white">{Math.round(playbackRate * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="1.25"
              step="0.01"
              value={playbackRate}
              onChange={(event) => setPlaybackRate(parseFloat(event.target.value))}
              className="h-2 w-full cursor-pointer accent-cyan-300"
              aria-label="Alterar andamento geral"
            />
            <div className="mt-1 flex justify-between text-[10px] text-[#64748B]">
              <span>50%</span>
              <span>100%</span>
              <span>125%</span>
            </div>
          </div>
          <button
            type="button"
            onClick={resetMixer}
            className="rounded-full border border-white/[0.08] px-4 py-2 text-xs font-medium text-[#94A3B8] transition-colors hover:border-white/20 hover:text-white"
          >
            Resetar mix
          </button>
        </div>
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
        {orderedStems.map((stem) => {
          const volume = volumes[stem.id] ?? 1
          const isMuted = muted[stem.id] ?? false
          const isSolo = soloed[stem.id] ?? false
          const disabledBySolo = hasSolo && !isSolo
          const color = STEM_COLORS[stem.stem_type] ?? STEM_COLORS.other

          return (
            <div
              key={stem.id}
              className={`relative overflow-hidden rounded-3xl border p-4 transition-all ${isSolo ? 'border-amber-300/60 bg-amber-300/[0.08]' : 'border-white/[0.08] bg-white/[0.04]'} ${disabledBySolo || isMuted ? 'opacity-55' : ''}`}
            >
              <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${color}`} />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{STEM_LABELS[stem.stem_type] ?? 'Outras'}</p>
                  <p className="mt-0.5 truncate text-xs text-[#94A3B8]" title={displayName(stem)}>{displayName(stem)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`h-2 w-2 rounded-full ${isPlaying && !isMuted && !disabledBySolo ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]' : 'bg-[#475569]'}`} />
                  <span className={`h-2 w-2 rounded-full ${volume > 0.55 && !isMuted && !disabledBySolo ? 'bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.8)]' : 'bg-[#475569]'}`} />
                </div>
              </div>

              <div className="mt-5 grid grid-cols-[auto_1fr_auto] items-center gap-3">
                {isMuted ? <VolumeX className="h-4 w-4 text-red-300" /> : <Volume2 className="h-4 w-4 text-[#94A3B8]" />}
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={(event) => handleVolumeChange(stem.id, parseFloat(event.target.value))}
                  className="h-2 w-full cursor-pointer accent-cyan-300"
                  aria-label={`Volume ${displayName(stem)}`}
                />
                <span className="w-10 text-right font-mono text-xs text-white">{Math.round(volume * 100)}%</span>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => toggleMute(stem.id)}
                  className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold transition-colors ${isMuted ? 'bg-red-500/20 text-red-200' : 'bg-white/[0.06] text-[#94A3B8] hover:bg-white/[0.1] hover:text-white'}`}
                >
                  Mute
                </button>
                <button
                  type="button"
                  onClick={() => toggleSolo(stem.id)}
                  className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold transition-colors ${isSolo ? 'bg-amber-400/20 text-amber-100' : 'bg-white/[0.06] text-[#94A3B8] hover:bg-white/[0.1] hover:text-white'}`}
                >
                  <Headphones className="mr-1 inline h-3.5 w-3.5" />
                  Solo
                </button>
              </div>

              <audio
                ref={(element) => { audioRefs.current[stem.id] = element }}
                src={stem.audio_url}
                preload="metadata"
                onEnded={() => setIsPlaying(false)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function effectiveVolume(volume: number, isMuted: boolean, isSolo: boolean, hasSolo: boolean) {
  if (isMuted) return 0
  if (hasSolo && !isSolo) return 0
  return volume
}

function displayName(stem: Stem) {
  return stem.original_file_name?.split('/').pop() ?? `${STEM_LABELS[stem.stem_type] ?? 'Faixa'} ${stem.id.slice(0, 4)}`
}
