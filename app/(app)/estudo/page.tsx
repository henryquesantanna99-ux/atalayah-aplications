import Link from 'next/link'
import { BookOpen, ChevronRight, Guitar, Music2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/page-header'
import { LaiaFloatingBadge } from '@/components/laia/laia-floating-badge'

export default async function EstudoPage() {
  const supabase = await createClient()

  const today = new Date().toISOString().split('T')[0]

  const { data: nextEvent } = await supabase
    .from('events')
    .select('id, title, date')
    .gte('date', today)
    .eq('type', 'culto')
    .order('date', { ascending: true })
    .limit(1)
    .single()

  const { count: songCount } = nextEvent
    ? await supabase
        .from('setlist_songs')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', nextEvent.id)
    : { count: 0 }

  return (
    <>
      <PageHeader
        title="Estudo"
        subtitle="Ferramentas de estudo musical para a escala"
      />
      <main className="p-6 space-y-8">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">O que quer estudar hoje?</h2>
          {nextEvent && (
            <p className="text-sm text-[#64748B]">
              Próximo culto: <span className="text-[#94A3B8]">{nextEvent.title}</span>{' '}
              — {formatDate(nextEvent.date)}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {/* Card 1: Próximo evento */}
          <Link
            href="/estudo/proximo-evento"
            className="group rounded-modal border border-white/[0.08] bg-navy-900 p-6 hover:border-brand/40 hover:bg-brand/5 transition-all space-y-4"
          >
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-xl bg-brand/15 flex items-center justify-center">
                <Music2 className="w-6 h-6 text-brand" />
              </div>
              <ChevronRight className="w-5 h-5 text-[#64748B] group-hover:text-brand transition-colors mt-1" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">As músicas do próximo evento</h3>
              <p className="text-sm text-[#94A3B8] mt-1">
                {nextEvent
                  ? songCount
                    ? `${songCount} ${songCount === 1 ? 'música' : 'músicas'} na escala`
                    : 'Escala ainda sem músicas'
                  : 'Nenhum culto agendado'}
              </p>
            </div>
            {nextEvent && (
              <div className="text-xs text-[#64748B] bg-white/[0.04] rounded-card px-3 py-1.5 inline-block">
                {nextEvent.title} — {formatDate(nextEvent.date)}
              </div>
            )}
          </Link>

          {/* Card 2: Uma música específica (em desenvolvimento) */}
          <div className="rounded-modal border border-white/[0.04] bg-navy-900/50 p-6 space-y-4 opacity-50 cursor-not-allowed">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-xl bg-white/[0.04] flex items-center justify-center">
                <Guitar className="w-6 h-6 text-[#64748B]" />
              </div>
              <span className="text-[10px] text-[#64748B] bg-white/[0.06] px-2 py-0.5 rounded-full">em breve</span>
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Uma música específica</h3>
              <p className="text-sm text-[#64748B] mt-1">Estude qualquer música do catálogo individualmente</p>
            </div>
          </div>

          {/* Card 3: Técnica & Teoria (em desenvolvimento) */}
          <div className="rounded-modal border border-white/[0.04] bg-navy-900/50 p-6 space-y-4 opacity-50 cursor-not-allowed">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-xl bg-white/[0.04] flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-[#64748B]" />
              </div>
              <span className="text-[10px] text-[#64748B] bg-white/[0.06] px-2 py-0.5 rounded-full">em breve</span>
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Técnica & Teoria</h3>
              <p className="text-sm text-[#64748B] mt-1">Exercícios de teoria musical e técnica instrumental</p>
            </div>
          </div>
        </div>
      </main>
      <LaiaFloatingBadge tip="Posso ajudar a montar uma rotina de estudo para a escala." />
    </>
  )
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}
