import Link from 'next/link'
import { ChevronLeft, ChevronRight, Music2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/page-header'
import { MomentBadge } from '@/components/ui/moment-badge'

export default async function ProximoEventoPage() {
  const supabase = await createClient()

  const today = new Date().toISOString().split('T')[0]

  // Get next upcoming event
  const { data: nextEvent } = await supabase
    .from('events')
    .select('id, title, date, type')
    .gte('date', today)
    .eq('type', 'culto')
    .order('date', { ascending: true })
    .limit(1)
    .single()

  const { data: setlistSongs } = nextEvent
    ? await supabase
        .from('setlist_songs')
        .select('id, song_title, artist, key_note, moment, soloist_id, version, reference_link, profiles(full_name), song_stems(id, stem_type, audio_url)')
        .eq('event_id', nextEvent.id)
        .order('order_index')
    : { data: [] }

  return (
    <>
      <PageHeader
        title="Próximo Evento"
        subtitle={nextEvent ? formatEventTitle(nextEvent) : 'Músicas para estudo'}
      />
      <main className="p-6 space-y-4">
        <Link
          href="/estudo"
          className="inline-flex items-center gap-1.5 text-sm text-[#94A3B8] hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Voltar
        </Link>

        {!nextEvent ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border border-white/[0.06] rounded-modal">
            <Music2 className="w-10 h-10 text-[#64748B] mb-3" />
            <p className="text-[#94A3B8] font-medium">Nenhum culto agendado</p>
            <p className="text-sm text-[#64748B] mt-1">Assim que um culto for criado na Agenda, as músicas aparecerão aqui.</p>
          </div>
        ) : (setlistSongs ?? []).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border border-white/[0.06] rounded-modal">
            <Music2 className="w-10 h-10 text-[#64748B] mb-3" />
            <p className="text-[#94A3B8] font-medium">Nenhuma música na escala</p>
            <p className="text-sm text-[#64748B] mt-1">As músicas adicionadas ao evento aparecerão aqui para estudo.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {(setlistSongs ?? []).map((song: any, index: number) => (
              <Link
                key={song.id}
                href={`/estudo/proximo-evento/${song.id}`}
                className="flex items-center gap-4 rounded-modal border border-white/[0.06] bg-navy-900 p-4 hover:border-white/20 hover:bg-white/[0.02] transition-all group"
              >
                <span className="text-xs text-[#64748B] w-5 flex-shrink-0">{index + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{song.song_title}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {song.artist && <span className="text-xs text-[#94A3B8]">{song.artist}</span>}
                    {song.key_note && (
                      <span className="text-xs font-mono bg-white/[0.06] px-1.5 py-0.5 rounded text-[#94A3B8]">
                        {song.key_note}
                      </span>
                    )}
                    <MomentBadge moment={song.moment} />
                    {song.profiles?.full_name && (
                      <span className="text-xs text-[#64748B]">{song.profiles.full_name}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {(song.song_stems ?? []).length > 0 && (
                    <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full">
                      faixas disponíveis
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-[#64748B] group-hover:text-white transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  )
}

function formatEventTitle(event: { title: string; date: string }) {
  const date = new Date(event.date + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  return `${event.title} — ${date}`
}
