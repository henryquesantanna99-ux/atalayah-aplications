'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Video } from 'lucide-react'
import { toast } from 'sonner'

interface CreateMeetButtonProps {
  eventId: string
}

export function CreateMeetButton({ eventId }: CreateMeetButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleCreateMeet() {
    setLoading(true)
    try {
      const response = await fetch('/api/google/meet', {
        method: 'POST',
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

      toast.success('Google Meet criado.')
      router.refresh()
    } catch {
      toast.error('Erro ao criar Google Meet.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleCreateMeet}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-card bg-brand/15 border border-brand/30 px-3 py-2 text-sm text-brand hover:bg-brand/25 transition-colors disabled:opacity-50"
    >
      <Video className="w-4 h-4" aria-hidden="true" />
      {loading ? 'Criando...' : 'Criar Google Meet'}
    </button>
  )
}
