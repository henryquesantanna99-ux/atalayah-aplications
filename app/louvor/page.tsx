import { Toaster } from 'sonner'
import { getMusicasParaVotacao } from './actions'
import { WorshipVotingClient } from './worship-voting-client'

export default async function LouvorPublicPage() {
  const songs = await getMusicasParaVotacao()

  return (
    <main className="min-h-screen bg-black p-4 sm:p-6">
      <div className="mx-auto max-w-5xl pb-10">
        <header className="mb-6 rounded-3xl border border-white/[0.08] bg-navy-900 p-5 sm:p-6">
          <p className="text-sm font-semibold text-brand">AtalaYah — Ministério de Louvor</p>
          <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-white">Indicação e Votação de Louvor</h1>
          <p className="mt-2 text-sm text-[#94A3B8]">
            Página pública para a igreja indicar músicas e votar sem precisar fazer login.
          </p>
        </header>
        <WorshipVotingClient songs={songs} />
      </div>
      <Toaster
        theme="dark"
        toastOptions={{
          style: {
            background: '#0E1E35',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#fff',
          },
        }}
      />
    </main>
  )
}
