'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function AppError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-red-900/20 border border-red-500/30 flex items-center justify-center mb-4">
        <AlertTriangle className="w-8 h-8 text-red-400" aria-hidden="true" />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">Algo deu errado</h2>
      <p className="text-sm text-[#94A3B8] mb-6 max-w-sm">
        Ocorreu um erro inesperado. Tente novamente ou entre em contato com o suporte.
      </p>
      <button
        onClick={reset}
        className="px-6 py-2.5 rounded-card bg-brand text-white text-sm font-medium hover:bg-brand-light transition-colors"
      >
        Tentar Novamente
      </button>
    </div>
  )
}
