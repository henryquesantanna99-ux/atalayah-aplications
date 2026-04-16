import { Headphones, Music2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/page-header'
import { LaiaFloatingBadge } from '@/components/laia/laia-floating-badge'
import { YouTubeSongSearch } from './youtube-song-search'
import { StemRequestButton } from './stem-request-button'
import { ChordSearchButton } from './chord-search-button'
import { Metronome } from './metronome'

interface StudySetlistSong {
  id: string
  song_title: string
  artist: string | null
  key_note: string | null
  reference_link: string | null
  song_id: string | null
  events: {
    title: string
    date: string
    type: string
  } | null
  songs: {
    id: string
    title: string
    artist: string | null
    youtube_url: string | null
    youtube_thumbnail: string | null
  } | null
  song_stem_jobs: {
    id: string
    status: string
    error_message: string | null
    created_at: string
  }[]
  song_stems: {
    id: string
    stem_type: string
    audio_url: string
  }[]
}

export default async function EstudoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  const { data: setlistSongsData } = await supabase
    .from('setlist_songs')
    .select(`
      id,
      song_title,
      artist,
      key_note,
      reference_link,
      song_id,
      events(title, date, type),
      songs(id, title, artist, youtube_url, youtube_thumbnail),
      song_stem_jobs(id, status, error_message, created_at),
      song_stems(id, stem_type, audio_url)
    `)
    .order('created_at', { ascending: false })
    .limit(30)

  const setlistSongs = (setlistSongsData ?? []) as unknown as StudySetlistSong[]

  return (
    <>
      <PageHeader
        title="Estudo"
        subtitle="Faixas separadas, cifras e metrônomo para tirar as músicas da escala."
      />
      <main className="p-6 space-y-8">
        {isAdmin && (
          <div className="rounded-modal border border-white/[0.08] bg-navy-900 p-5">
            <YouTubeSongSearch />
          </div>
        )}

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Músicas da escala</h2>
            <p className="text-sm text-[#94A3B8]">
              Separe faixas, toque stems e vincule cifras para estudo.
            </p>
          </div>

          {setlistSongs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center border border-white/[0.06] rounded-modal">
              <Music2 className="w-10 h-10 text-[#64748B] mb-3" aria-hidden="true" />
              <p className="text-[#94A3B8] font-medium mb-1">Nenhuma música encontrada</p>
              <p className="text-sm text-[#64748B]">Adicione músicas em uma escala para estudar por aqui.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {setlistSongs.map((setlistSong) => {
                const song = setlistSong.songs
                const latestJob = [...(setlistSong.song_stem_jobs ?? [])]
                  .sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
                const title = song?.title ?? setlistSong.song_title
                const artist = song?.artist ?? setlistSong.artist
                const youtubeUrl = song?.youtube_url ?? setlistSong.reference_link

                return (
                  <article
                    key={setlistSong.id}
                    className="rounded-modal border border-white/[0.08] bg-navy-900 p-4 space-y-4"
                  >
                    <div className="flex gap-3">
                      {song?.youtube_thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={song.youtube_thumbnail}
                          alt=""
                          className="w-24 h-16 rounded-card object-cover bg-navy-800"
                        />
                      ) : (
                        <div className="w-24 h-16 rounded-card bg-navy-800 flex items-center justify-center">
                          <Headphones className="w-6 h-6 text-[#64748B]" aria-hidden="true" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="text-white font-semibold line-clamp-2">{title}</h3>
                        <p className="text-sm text-[#94A3B8] truncate">{artist ?? 'Artista não informado'}</p>
                        {setlistSong.events && (
                          <p className="text-xs text-[#64748B] mt-1">
                            {setlistSong.events.title} - {formatDate(setlistSong.events.date)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <StemRequestButton setlistSongId={setlistSong.id} />
                      {setlistSong.song_id && (
                        <ChordSearchButton
                          songId={setlistSong.song_id}
                          title={title}
                          artist={artist}
                        />
                      )}
                      {youtubeUrl && (
                        <a
                          href={youtubeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-card border border-white/[0.08] px-3 py-2 text-sm text-[#94A3B8] hover:bg-white/[0.04] hover:text-white transition-colors"
                        >
                          Referência
                        </a>
                      )}
                    </div>

                    {latestJob && (
                      <p className="text-xs text-[#94A3B8]">
                        Status das faixas: <span className="text-white">{statusLabel(latestJob.status)}</span>
                        {latestJob.error_message ? ` - ${latestJob.error_message}` : ''}
                      </p>
                    )}

                    {setlistSong.song_stems?.length > 0 && (
                      <div className="space-y-3">
                        {setlistSong.song_stems.map((stem) => (
                          <div key={stem.id} className="space-y-1">
                            <p className="text-xs font-medium text-[#94A3B8]">{stemLabel(stem.stem_type)}</p>
                            <audio controls src={stem.audio_url} className="w-full" />
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <Metronome />
      </main>
      <LaiaFloatingBadge tip="Posso ajudar a montar uma rotina de estudo para a escala." />
    </>
  )
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
  })
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
    vocals: 'Vozes',
    back_vocal: 'Back vocal',
    drums: 'Bateria',
    bass: 'Baixo',
    guitar: 'Guitarra',
    piano: 'Piano',
    instrumental: 'Instrumental',
  }

  return labels[stem] ?? stem
}
