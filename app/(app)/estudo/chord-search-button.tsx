'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText } from 'lucide-react'
import { toast } from 'sonner'

interface ChordSearchButtonProps {
  songId: string
  title: string
  artist: string | null
}

export function ChordSearchButton({ songId, title, artist }: ChordSearchButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function searchChord() {
    setLoading(true)
    try {
      const response = await fetch('/api/study/chords/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId, title, artist }),
      })
      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error ?? 'Cifra não encontrada.')
        return
      }

      toast.success('Cifra vinculada à música.')
      router.refresh()
    } catch {
      toast.error('Erro ao buscar cifra.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={searchChord}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-card border border-white/[0.08] px-3 py-2 text-sm text-[#94A3B8] hover:bg-white/[0.04] hover:text-white transition-colors disabled:opacity-60"
    >
      <FileText className="w-4 h-4" aria-hidden="true" />
      {loading ? 'Buscando...' : 'Buscar cifra'}
    </button>
  )
}
