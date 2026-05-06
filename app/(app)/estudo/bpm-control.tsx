'use client'

import { useState } from 'react'
import { Minus, Plus } from 'lucide-react'

interface BpmControlProps {
  originalBpm?: number | null
  onRateChange?: (rate: number) => void
}

export function BpmControl({ originalBpm, onRateChange }: BpmControlProps) {
  const [rate, setRate] = useState(1.0)

  const displayBpm = originalBpm ? Math.round(originalBpm * rate) : null

  function updateRate(newRate: number) {
    const clamped = Math.max(0.5, Math.min(1.0, newRate))
    setRate(clamped)
    onRateChange?.(clamped)
  }

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wide">Velocidade (BPM)</h4>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => updateRate(rate - 0.05)}
          disabled={rate <= 0.5}
          className="p-1.5 rounded-card border border-white/[0.08] text-[#94A3B8] hover:text-white hover:border-white/20 transition-colors disabled:opacity-30"
          aria-label="Reduzir velocidade"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <div className="flex-1 space-y-1">
          <input
            type="range"
            min="0.5"
            max="1"
            step="0.05"
            value={rate}
            onChange={(e) => updateRate(parseFloat(e.target.value))}
            className="w-full h-1.5 accent-brand cursor-pointer"
            aria-label="Controle de velocidade"
          />
          <div className="flex justify-between text-[10px] text-[#64748B]">
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => updateRate(rate + 0.05)}
          disabled={rate >= 1.0}
          className="p-1.5 rounded-card border border-white/[0.08] text-[#94A3B8] hover:text-white hover:border-white/20 transition-colors disabled:opacity-30"
          aria-label="Aumentar velocidade"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>

        <div className="text-center min-w-[64px]">
          <p className="text-white font-semibold text-sm">
            {displayBpm ? `${displayBpm} BPM` : `${Math.round(rate * 100)}%`}
          </p>
          {rate < 1 && (
            <p className="text-[10px] text-[#64748B]">
              {originalBpm ? `orig. ${originalBpm}` : `orig. 100%`}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
