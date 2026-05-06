'use client'

import { useRef, useState } from 'react'

const STEM_TYPES = [
  { key: 'vocals', label: 'Vocais' },
  { key: 'voice_guide', label: 'Voz guia' },
  { key: 'back_vocal', label: 'Back vocal' },
  { key: 'piano', label: 'Teclados' },
  { key: 'guitar', label: 'Guitarras' },
  { key: 'acoustic_guitar', label: 'Violões' },
  { key: 'bass', label: 'Baixos' },
  { key: 'drums', label: 'Baterias' },
  { key: 'percussion', label: 'Percussões' },
  { key: 'strings', label: 'Cordas' },
  { key: 'brass', label: 'Sopros' },
  { key: 'click', label: 'Click' },
] as const

interface Stem {
  id: string
  stem_type: string
  audio_url: string
}

interface StemFadersProps {
  stems: Stem[]
  playbackRate?: number
}

export function StemFaders({ stems, playbackRate = 1 }: StemFadersProps) {
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({})
  const [volumes, setVolumes] = useState<Record<string, number>>(
    Object.fromEntries(STEM_TYPES.map((s) => [s.key, 1]))
  )

  function handleVolumeChange(stemKey: string, value: number) {
    setVolumes((v) => ({ ...v, [stemKey]: value }))
    const audio = audioRefs.current[stemKey]
    if (audio) audio.volume = value
  }

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wide">Faixas separadas</h4>
      <div className="space-y-2">
        {STEM_TYPES.map(({ key, label }) => {
          const stem = stems.find((s) => s.stem_type === key)
          const volume = volumes[key] ?? 1

          return (
            <div key={key} className="flex items-center gap-3">
              <span className={`text-xs w-24 flex-shrink-0 ${stem ? 'text-[#94A3B8]' : 'text-[#475569]'}`}>
                {label}
              </span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                disabled={!stem}
                onChange={(e) => handleVolumeChange(key, parseFloat(e.target.value))}
                className="flex-1 h-1.5 accent-brand disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                aria-label={`Volume ${label}`}
              />
              <span className="text-[10px] text-[#64748B] w-8 text-right">
                {stem ? `${Math.round(volume * 100)}%` : '—'}
              </span>
              {stem && (
                <audio
                  ref={(el) => { audioRefs.current[key] = el }}
                  src={stem.audio_url}
                  loop
                  style={{ display: 'none' }}
                  onLoadedMetadata={(e) => {
                    const audio = e.currentTarget
                    audio.volume = volume
                    audio.playbackRate = playbackRate
                  }}
                />
              )}
            </div>
          )
        })}
      </div>
      {stems.length === 0 && (
        <p className="text-xs text-[#64748B] pt-1">
          Nenhuma faixa separada disponível. Use o botão de stems para solicitar a separação.
        </p>
      )}
    </div>
  )
}
