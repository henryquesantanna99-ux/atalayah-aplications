'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface PendingScreenProps {
  userId: string
}

export function PendingScreen({ userId }: PendingScreenProps) {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Poll every 15 seconds to check if admin approved
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('status')
        .eq('id', userId)
        .single()

      if (data?.status === 'active') {
        router.push('/dashboard')
      }
    }, 15000)

    return () => clearInterval(interval)
  }, [userId, supabase, router])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-brand/5 blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm text-center">
        {/* Laia pulsing avatar */}
        <div className="relative inline-block mb-8">
          <div className="absolute inset-0 rounded-full bg-brand/20 animate-ping" />
          <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-brand to-navy-800 border border-brand/30 flex items-center justify-center mx-auto">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-white" fill="currentColor">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-white mb-3">
          Aguardando Aprovação
        </h1>
        <p className="text-[#94A3B8] text-sm leading-relaxed mb-2">
          Seu cadastro foi recebido com sucesso! Um administrador precisa
          liberar o seu acesso à plataforma.
        </p>
        <p className="text-[#64748B] text-xs mb-10">
          Esta página verifica automaticamente a cada 15 segundos.
        </p>

        {/* Status indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
          <span className="text-sm text-yellow-400 font-medium">Pendente de aprovação</span>
        </div>

        <button
          onClick={handleSignOut}
          className="text-sm text-[#64748B] hover:text-[#94A3B8] transition-colors"
        >
          Sair da conta
        </button>
      </div>
    </div>
  )
}
