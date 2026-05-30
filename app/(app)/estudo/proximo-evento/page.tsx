import Link from 'next/link'
import { ChevronLeft, ChevronRight, Music2, SlidersHorizontal } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/page-header'
import { MomentBadge } from '@/components/ui/moment-badge'

interface Stem {
  id: string
  stem_type: string
  audio_url: string
  original_file_name: string | null
}

interface NextEventSong {
  id: string
  song_id: string | null
  song_title: string
  artist: string | null
  key_note: string | null
  moment: string | null
  profiles: { full_name: string | null } | null
  song_stems: Array<{ id: string; stem_type: string; audio_url: string; original_file_name: string | null }> | null
}

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

  const { data: setlistSongsData } = nextEvent
    ? await supabase
        .from('setlist_songs')
        .select('id, song_title, artist, key_note, moment, soloist_id, version, reference_link, profiles(full_name), song_stems(id, stem_type, audio_url, original_file_name)')
        .eq('event_id', nextEvent.id)
        .order('order_index')
    : { data: [] }

  const setlistSongs = ((setlistSongsData ?? []) as unknown as NextEventSong[])
  const stemsBySetlistSong = await loadStemsForSongs(supabase, setlistSongs)

  const songsWithStems = setlistSongs.map((song) => ({
    ...song,
    song_stems: stemsBySetlistSong.get(song.id) ?? [],
  }))

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
        ) : songsWithStems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border border-white/[0.06] rounded-modal">
            <Music2 className="w-10 h-10 text-[#64748B] mb-3" />
            <p className="text-[#94A3B8] font-medium">Nenhuma música na escala</p>
            <p className="text-sm text-[#64748B] mt-1">As músicas adicionadas ao evento aparecerão aqui para estudo.</p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {((setlistSongs ?? []) as NextEventSong[]).map((song, index: number) => {
              const stemCount = (song.song_stems ?? []).length

              return (
                <Link
                  key={song.id}
                  href={`/estudo/proximo-evento/${song.id}`}
                  className="group overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_34%),linear-gradient(135deg,#0f172a,#020617)] p-4 shadow-xl shadow-black/20 transition-all hover:-translate-y-0.5 hover:border-cyan-300/30 hover:shadow-cyan-950/30"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] font-mono text-sm font-bold text-cyan-200">
                      {String(index + 1).padStart(2, '0')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-base font-bold text-white">{song.song_title}</p>
                          {song.artist && <p className="mt-0.5 truncate text-sm text-[#94A3B8]">{song.artist}</p>}
                        </div>
                        <ChevronRight className="mt-1 h-4 w-4 flex-shrink-0 text-[#64748B] transition-colors group-hover:text-white" />
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {song.key_note && (
                          <span className="rounded-full bg-white/[0.08] px-2 py-1 font-mono text-xs text-cyan-100">
                            Tom {song.key_note}
                          </span>
                        )}
                        <MomentBadge moment={song.moment} />
                        {song.profiles?.full_name && (
                          <span className="rounded-full bg-white/[0.04] px-2 py-1 text-xs text-[#94A3B8]">{song.profiles.full_name}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-white/[0.06] bg-black/20 p-3">
                    <div className="mb-3 flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-2 font-medium text-[#94A3B8]">
                        <SlidersHorizontal className="h-3.5 w-3.5 text-cyan-300" />
                        Mesa de estudo
                      </span>
                      <span className={stemCount > 0 ? 'text-emerald-300' : 'text-[#64748B]'}>
                        {stemCount > 0 ? `${stemCount} faixa(s)` : 'sem multitracks'}
                      </span>
                    </div>
                    <div className="flex h-16 items-end gap-1.5">
                      {Array.from({ length: 10 }).map((_, meterIndex) => {
                        const active = meterIndex < Math.min(stemCount, 10)
                        const height = 22 + ((meterIndex * 13) % 38)
                        return (
                          <span
                            key={meterIndex}
                            className={`flex-1 rounded-t-full transition-colors ${active ? 'bg-gradient-to-t from-emerald-500 via-cyan-300 to-white shadow-[0_0_12px_rgba(34,211,238,0.35)]' : 'bg-white/[0.06]'}`}
                            style={{ height: `${height}px` }}
                          />
                        )
                      })}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </>
  )
}

async function loadStemsForSongs(supabase: Awaited<ReturnType<typeof createClient>>, songs: NextEventSong[]) {
  const stemsBySetlistSong = new Map<string, Stem[]>()
  if (songs.length === 0) return stemsBySetlistSong

  const setlistIds = songs.map((song) => song.id)
  const songIds = songs.map((song) => song.song_id).filter((id): id is string => Boolean(id))

  const [setlistStemsResult, songStemsResult] = await Promise.all([
    supabase
      .from('song_stems')
      .select('id, setlist_song_id, song_id, stem_type, audio_url, original_file_name')
      .in('setlist_song_id', setlistIds),
    songIds.length > 0
      ? supabase
          .from('song_stems')
          .select('id, setlist_song_id, song_id, stem_type, audio_url, original_file_name')
          .in('song_id', songIds)
      : Promise.resolve({ data: [] }),
  ])

  const allStems = [...(setlistStemsResult.data ?? []), ...(songStemsResult.data ?? [])]
  const seenBySetlistSong = new Map<string, Set<string>>()

  for (const song of songs) {
    const stemsForSong = allStems.filter((stem) => stem.setlist_song_id === song.id || (song.song_id && stem.song_id === song.song_id))
    for (const stem of stemsForSong) {
      const seen = seenBySetlistSong.get(song.id) ?? new Set<string>()
      if (seen.has(stem.id)) continue
      seen.add(stem.id)
      seenBySetlistSong.set(song.id, seen)

      const current = stemsBySetlistSong.get(song.id) ?? []
      current.push({
        id: stem.id,
        stem_type: stem.stem_type,
        audio_url: stem.audio_url,
        original_file_name: stem.original_file_name,
      })
      stemsBySetlistSong.set(song.id, current)
    }
  }

  return stemsBySetlistSong
}

function formatEventTitle(event: { title: string; date: string }) {
  const date = new Date(event.date + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  return `${event.title} — ${date}`
}
