import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

interface AuthErrorPageProps {
  searchParams: { error?: string }
}

export default function AuthErrorPage({ searchParams }: AuthErrorPageProps) {
  const error = searchParams.error ?? 'Ocorreu um erro durante a autenticação'

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-red-900/20 border border-red-500/30 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">
          Erro de Autenticação
        </h1>
        <p className="text-[#94A3B8] mb-8 text-sm leading-relaxed">
          {decodeURIComponent(error)}
        </p>
        <Link
          href="/login"
          className="inline-flex items-center justify-center px-6 py-3 rounded-card bg-brand text-white font-medium text-sm transition-colors hover:bg-brand-light"
        >
          Voltar ao Login
        </Link>
      </div>
    </div>
  )
}
