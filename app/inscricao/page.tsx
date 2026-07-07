import { Toaster } from 'sonner'
import { InscricaoClient } from './inscricao-client'

export default function InscricaoPage({ searchParams }: { searchParams: { id?: string } }) {
  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 rounded-2xl border border-white/[0.08] bg-navy-900 p-5 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-brand/30 bg-brand/20 text-brand">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" /></svg>
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-brand">AtalaYah</p>
              <h1 className="text-2xl font-bold sm:text-3xl">Inscrição Ministério de Louvor</h1>
            </div>
          </div>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-[#CBD5E1] sm:text-lg">Preencha sua inscrição pública. A confirmação acontece automaticamente após o pagamento da taxa via Pix.</p>
        </header>
        <InscricaoClient initialId={searchParams.id} />
      </div>
      <Toaster theme="dark" toastOptions={{ style: { background: '#0E1E35', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' } }} />
    </main>
  )
}
