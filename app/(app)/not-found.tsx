import Link from 'next/link'

export default function AppNotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <p className="text-6xl font-bold text-brand mb-4">404</p>
      <h2 className="text-xl font-bold text-white mb-2">Página não encontrada</h2>
      <p className="text-sm text-[#94A3B8] mb-6">
        Esta página não existe ou foi movida.
      </p>
      <Link
        href="/dashboard"
        className="px-6 py-2.5 rounded-card bg-brand text-white text-sm font-medium hover:bg-brand-light transition-colors"
      >
        Voltar ao início
      </Link>
    </div>
  )
}
