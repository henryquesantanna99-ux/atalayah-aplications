import Link from 'next/link'
import { ChevronLeft, ExternalLink } from 'lucide-react'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MomentBadge } from '@/components/ui/moment-badge'
import { StemFaders } from '../../stem-faders'
import { ChordSearchButton } from '../../chord-search-button'
import { Metronome } from '../../metronome'

interface Props {
  params: { setlistSongId: string }
}

interface SongStudyRecord {
  id: string
  song_title: string
  artist: string | null
  key_note: string | null
  moment: string | null
  version: string | null
  reference_link: string | null
  song_id: string | null
  profiles: { full_name: string | null } | null
  songs: {
    id: string
    title: string | null
    artist: string | null
    youtube_url: string | null
    youtube_thumbnail: string | null
  } | null
  song_stem_jobs: Array<{ id: string; status: string; error_message: string | null; created_at: string }> | null
}

export default async function SongStudyPage({ params }: Props) {
  const supabase = await createClient()

  const { data: song } = await supabase
    .from('setlist_songs')
    .select(`
      id, song_title, artist, key_note, moment, version, reference_link, song_id,
      profiles(full_name),
      songs(id, title, artist, youtube_url, youtube_thumbnail),
      song_stem_jobs(id, status, error_message, created_at)
    `)
    .eq('id', params.setlistSongId)
    .single()

  if (!song) notFound()

  const songData = song as unknown as SongStudyRecord
  const stems = await loadStemsForSong(supabase, songData.id, songData.song_id)
  const latestJob = [...(songData.song_stem_jobs ?? [])]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0]

  const title = songData.songs?.title ?? songData.song_title ?? ''
  const artist = songData.artist ?? songData.songs?.artist ?? null
  const youtubeUrl = songData.reference_link ?? songData.songs?.youtube_url
  const thumbnail = songData.songs?.youtube_thumbnail
  const stemCount = stems.length

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <Link
        href="/estudo/proximo-evento"
        className="inline-flex items-center gap-1.5 text-sm text-[#94A3B8] transition-colors hover:text-white"
      >
        <ChevronLeft className="h-4 w-4" />
        Voltar
      </Link>

      <section className="overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_32%),linear-gradient(135deg,#0f172a,#020617)] shadow-2xl shadow-black/25">
        <div className="grid gap-6 p-5 md:grid-cols-[180px_1fr] md:p-6">
          {thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbnail} alt="" className="h-32 w-full rounded-3xl bg-navy-800 object-cover md:h-full" />
          ) : (
            <div className="flex h-32 items-center justify-center rounded-3xl bg-white/[0.04] md:h-full">
              <span className="text-3xl">🎚️</span>
            </div>
          )}
          <div className="min-w-0">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/80">Estudo do próximo evento</p>
                <h1 className="mt-2 text-3xl font-bold leading-tight text-white">{title}</h1>
                {artist && <p className="mt-1 text-[#94A3B8]">{artist}</p>}
              </div>
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-center">
                <p className="text-2xl font-bold text-white">{stemCount}</p>
                <p className="text-[11px] uppercase tracking-wide text-[#94A3B8]">faixas</p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              {songData.key_note && (
                <span className="rounded-full bg-white/[0.08] px-3 py-1.5 font-mono text-xs text-cyan-100">Tom {songData.key_note}</span>
              )}
              <MomentBadge moment={songData.moment} />
              {songData.profiles?.full_name && (
                <span className="rounded-full bg-white/[0.04] px-3 py-1.5 text-xs text-[#94A3B8]">Solista: {songData.profiles.full_name}</span>
              )}
              {songData.version && (
                <span className="rounded-full bg-white/[0.04] px-3 py-1.5 text-xs text-[#94A3B8]">{songData.version}</span>
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {youtubeUrl && (
                <a
                  href={youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] px-4 py-2 text-sm text-[#94A3B8] transition-colors hover:border-white/20 hover:text-white"
                >
                  <ExternalLink className="h-4 w-4" />
                  Ver referência
                </a>
              )}
              {songData.song_id && (
                <ChordSearchButton songId={songData.song_id} title={title} artist={artist} />
              )}
            </div>

            {latestJob && (
              <p className="mt-4 text-xs text-[#94A3B8]">
                Status das faixas:{' '}
                <span className={`font-medium ${latestJob.status === 'completed' ? 'text-emerald-400' : latestJob.status === 'failed' ? 'text-red-400' : 'text-amber-400'}`}>
                  {statusLabel(latestJob.status)}
                </span>
                {latestJob.error_message && ` — ${latestJob.error_message}`}
              </p>
            )}
          </div>
        </div>
      </section>

      <StemFaders stems={stems} />

      <div className="rounded-[2rem] border border-white/[0.08] bg-navy-900 p-5">
        <Metronome />
      </div>
    </main>
  )
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: 'Na fila',
    processing: 'Processando',
    completed: 'Pronto',
    failed: 'Erro',
  }
  return labels[status] ?? status
}


async function loadStemsForSong(
  supabase: Awaited<ReturnType<typeof createClient>>,
  setlistSongId: string,
  songId: string | null
) {
  const [setlistStemsResult, songStemsResult] = await Promise.all([
    supabase
      .from('song_stems')
      .select('id, stem_type, audio_url, original_file_name')
      .eq('setlist_song_id', setlistSongId),
    songId
      ? supabase
          .from('song_stems')
          .select('id, stem_type, audio_url, original_file_name')
          .eq('song_id', songId)
      : Promise.resolve({ data: [] }),
  ])

  const stems = [...(setlistStemsResult.data ?? []), ...(songStemsResult.data ?? [])]
  return Array.from(new Map(stems.map((stem) => [stem.id, stem])).values())
}
