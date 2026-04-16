'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SlidersHorizontal } from 'lucide-react'
import { toast } from 'sonner'

interface StemRequestButtonProps {
  setlistSongId: string
}

export function StemRequestButton({ setlistSongId }: StemRequestButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function requestStems() {
    setLoading(true)
    try {
      const response = await fetch('/api/study/stems/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setlistSongId }),
      })
      const data = await response.json()

      if (!response.ok) {
        if (response.status === 428 && Array.isArray(data.missing)) {
          toast.error(`Configure na Vercel: ${data.missing.join(', ')}`)
        } else {
          toast.error(data.error ?? 'Erro ao iniciar separação.')
        }
        return
      }

      toast.success('Separação de faixas iniciada.')
      router.refresh()
    } catch {
      toast.error('Erro ao iniciar separação.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={requestStems}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-card border border-brand/30 bg-brand/15 px-3 py-2 text-sm text-brand hover:bg-brand/25 transition-colors disabled:opacity-60"
    >
      <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
      {loading ? 'Iniciando...' : 'Separar faixas'}
    </button>
  )
}
