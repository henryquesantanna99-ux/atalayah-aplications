import Link from 'next/link'
import { ChevronLeft, ExternalLink } from 'lucide-react'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MomentBadge } from '@/components/ui/moment-badge'
import { StemFaders } from '../../stem-faders'
import { BpmControlClient } from '../../bpm-control-client'
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
  song_stems: Array<{ id: string; stem_type: string; audio_url: string }> | null
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
      song_stems(id, stem_type, audio_url),
      song_stem_jobs(id, status, error_message, created_at)
    `)
    .eq('id', params.setlistSongId)
    .single()

  if (!song) notFound()

  const songData = song as unknown as SongStudyRecord
  const stems = songData.song_stems ?? []
  const latestJob = [...(songData.song_stem_jobs ?? [])]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0]

  const title = songData.songs?.title ?? songData.song_title ?? ''
  const artist = songData.artist ?? songData.songs?.artist ?? null
  const youtubeUrl = songData.reference_link ?? songData.songs?.youtube_url
  const thumbnail = songData.songs?.youtube_thumbnail

  return (
    <main className="p-6 space-y-6 max-w-3xl mx-auto">
      <Link
        href="/estudo/proximo-evento"
        className="inline-flex items-center gap-1.5 text-sm text-[#94A3B8] hover:text-white transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Voltar
      </Link>

      {/* Song header */}
      <div className="flex gap-4">
        {thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbnail} alt="" className="w-24 h-16 rounded-card object-cover bg-navy-800 flex-shrink-0" />
        ) : (
          <div className="w-24 h-16 rounded-card bg-navy-800 flex-shrink-0" />
        )}
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-white leading-tight">{title}</h1>
          {artist && <p className="text-[#94A3B8] mt-0.5">{artist}</p>}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {songData.key_note && (
              <span className="text-xs font-mono bg-white/[0.06] px-2 py-0.5 rounded text-[#94A3B8]">
                {songData.key_note}
              </span>
            )}
            <MomentBadge moment={songData.moment} />
            {songData.profiles?.full_name && (
              <span className="text-xs text-[#64748B]">{songData.profiles.full_name}</span>
            )}
            {songData.version && (
              <span className="text-xs text-[#64748B]">{songData.version}</span>
            )}
          </div>
        </div>
      </div>

      {/* Reference link */}
      {youtubeUrl && (
        <a
          href={youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-card border border-white/[0.08] text-[#94A3B8] text-sm hover:text-white hover:border-white/20 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Ver referência no YouTube
        </a>
      )}

      {/* Stem jobs status */}
      {latestJob && (
        <p className="text-xs text-[#94A3B8]">
          Status das faixas:{' '}
          <span className={`font-medium ${latestJob.status === 'completed' ? 'text-emerald-400' : latestJob.status === 'failed' ? 'text-red-400' : 'text-amber-400'}`}>
            {statusLabel(latestJob.status)}
          </span>
          {latestJob.error_message && ` — ${latestJob.error_message}`}
        </p>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        {songData.song_id && (
          <ChordSearchButton songId={songData.song_id} title={title} artist={artist} />
        )}
      </div>

      {/* BPM Control */}
      <div className="rounded-modal border border-white/[0.08] bg-navy-900 p-5">
        <BpmControlClient />
      </div>

      {/* Stem faders */}
      <div className="rounded-modal border border-white/[0.08] bg-navy-900 p-5">
        <StemFaders stems={stems} />
      </div>

      {/* Individual stem audio players (fallback) */}
      {stems.length > 0 && (
        <div className="rounded-modal border border-white/[0.08] bg-navy-900 p-5 space-y-3">
          <h4 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wide">Reprodutor de faixas</h4>
          {stems.map((stem) => (
            <div key={stem.id} className="space-y-1">
              <p className="text-xs font-medium text-[#94A3B8]">{stemLabel(stem.stem_type)}</p>
              <audio controls src={stem.audio_url} className="w-full" />
            </div>
          ))}
        </div>
      )}

      {/* Metronome */}
      <div className="rounded-modal border border-white/[0.08] bg-navy-900 p-5">
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

function stemLabel(stem: string) {
  const labels: Record<string, string> = {
    vocals: 'Vocais',
    voice_guide: 'Voz guia',
    back_vocal: 'Back vocal',
    piano: 'Teclados',
    guitar: 'Guitarras',
    acoustic_guitar: 'Violões',
    bass: 'Baixos',
    drums: 'Baterias',
    percussion: 'Percussões',
    strings: 'Cordas',
    brass: 'Sopros',
    click: 'Click',
  }
  return labels[stem] ?? stem
}
