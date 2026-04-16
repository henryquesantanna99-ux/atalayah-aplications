'use client'

import { useEffect, useRef, useState } from 'react'
import { Play, Square } from 'lucide-react'

interface WindowWithWebkitAudio extends Window {
  webkitAudioContext?: typeof AudioContext
}

export function Metronome() {
  const [bpm, setBpm] = useState(80)
  const [beatsPerBar, setBeatsPerBar] = useState(4)
  const [playing, setPlaying] = useState(false)
  const [beat, setBeat] = useState(0)
  const audioContextRef = useRef<AudioContext | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const beatRef = useRef(0)

  function tick() {
    const AudioContextClass = window.AudioContext || (window as WindowWithWebkitAudio).webkitAudioContext
    if (!AudioContextClass) return
    const context = audioContextRef.current ?? new AudioContextClass()
    audioContextRef.current = context

    const oscillator = context.createOscillator()
    const gain = context.createGain()
    const isAccent = beatRef.current % beatsPerBar === 0

    oscillator.frequency.value = isAccent ? 1200 : 800
    gain.gain.setValueAtTime(0.0001, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(isAccent ? 0.5 : 0.3, context.currentTime + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.08)

    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start(context.currentTime)
    oscillator.stop(context.currentTime + 0.09)

    beatRef.current = (beatRef.current + 1) % beatsPerBar
    setBeat(beatRef.current)
  }

  function stop() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = null
    setPlaying(false)
    beatRef.current = 0
    setBeat(0)
  }

  function start() {
    stop()
    setPlaying(true)
    tick()
    intervalRef.current = setInterval(tick, 60000 / bpm)
  }

  useEffect(() => {
    if (playing) start()
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bpm, beatsPerBar])

  return (
    <section className="rounded-modal border border-white/[0.08] bg-navy-900 p-5 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Metrônomo</h2>
        <p className="text-sm text-[#94A3B8]">Marque o tempo para tirar a música com precisão.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className="text-xs text-[#94A3B8]">BPM</span>
          <input
            type="number"
            min={40}
            max={240}
            value={bpm}
            onChange={(event) => setBpm(Number(event.target.value))}
            className="w-full px-3 py-2 rounded-card bg-navy-800 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-brand"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-[#94A3B8]">Compasso</span>
          <select
            value={beatsPerBar}
            onChange={(event) => setBeatsPerBar(Number(event.target.value))}
            className="w-full px-3 py-2 rounded-card bg-navy-800 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-brand"
          >
            <option value={2}>2/4</option>
            <option value={3}>3/4</option>
            <option value={4}>4/4</option>
            <option value={6}>6/8</option>
          </select>
        </label>
      </div>

      <div className="flex items-center gap-2">
        {Array.from({ length: beatsPerBar }).map((_, index) => (
          <span
            key={index}
            className={`h-3 flex-1 rounded-full transition-colors ${
              index === beat ? 'bg-brand' : 'bg-white/[0.08]'
            }`}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={playing ? stop : start}
        className="inline-flex items-center justify-center gap-2 rounded-card bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-light transition-colors"
      >
        {playing ? <Square className="w-4 h-4" aria-hidden="true" /> : <Play className="w-4 h-4" aria-hidden="true" />}
        {playing ? 'Parar' : 'Iniciar'}
      </button>
    </section>
  )
}
