'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Video, VideoOff } from 'lucide-react'
import { toast } from 'sonner'

interface CreateMeetButtonProps {
  eventId: string
  mode?: 'create' | 'end'
  onEnded?: () => void
  onCreated?: (meetLink: string) => void
}

export function CreateMeetButton({
  eventId,
  mode = 'create',
  onEnded,
  onCreated,
}: CreateMeetButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleMeetAction() {
    if (mode === 'end') {
      const confirmed = window.confirm('Encerrar este Google Meet e remover o link do evento?')
      if (!confirmed) return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/google/meet', {
        method: mode === 'create' ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }),
      })
      const data = await response.json()

      if (!response.ok) {
        if (response.status === 428 && Array.isArray(data.missing)) {
          toast.error(`Configure no Vercel: ${data.missing.join(', ')}`)
        } else {
          toast.error(data.error ?? 'Erro ao criar Google Meet.')
        }
        return
      }

      if (mode === 'create') {
        toast.success('Google Meet criado.')
        onCreated?.(data.meetLink)
      } else {
        toast.success('Google Meet encerrado.')
        onEnded?.()
      }
      router.refresh()
    } catch {
      toast.error(mode === 'create' ? 'Erro ao criar Google Meet.' : 'Erro ao encerrar Google Meet.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleMeetAction}
      disabled={loading}
      className={`inline-flex items-center gap-2 rounded-card border px-3 py-2 text-sm transition-colors disabled:opacity-50 ${
        mode === 'create'
          ? 'bg-brand/15 border-brand/30 text-brand hover:bg-brand/25'
          : 'bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/20'
      }`}
    >
      {mode === 'create'
        ? <Video className="w-4 h-4" aria-hidden="true" />
        : <VideoOff className="w-4 h-4" aria-hidden="true" />}
      {loading
        ? mode === 'create' ? 'Criando...' : 'Encerrando...'
        : mode === 'create' ? 'Criar Google Meet' : 'Encerrar Google Meet'}
    </button>
  )
}
