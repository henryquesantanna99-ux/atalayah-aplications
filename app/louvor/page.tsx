import { Toaster } from 'sonner'
import { getMusicasParaVotacao } from './actions'
import { WorshipVotingClient } from './worship-voting-client'

export default async function LouvorPublicPage() {
  const songs = await getMusicasParaVotacao()

  return (
    <main className="min-h-screen bg-black p-4 sm:p-6">
      <div className="mx-auto max-w-5xl pb-10">
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
