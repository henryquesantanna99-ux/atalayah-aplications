'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PlayCircle, Plus, Search } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
  'Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'A#m', 'Bm']
const MOMENTS = ['Prévia', 'Adoração', 'Palavra', 'Celebração'] as const

interface Profile {
  id: string
  full_name: string | null
}

interface AddSongModalProps {
  eventId: string
  profiles: Profile[]
}

interface YouTubeResult {
  videoId: string
  title: string
  artist: string
  thumbnail: string | null
  duration: string | null
  url: string
}

export function AddSongModal({ eventId, profiles }: AddSongModalProps) {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [searchingYoutube, setSearchingYoutube] = useState(false)
  const [youtubeQuery, setYoutubeQuery] = useState('')
  const [youtubeResults, setYoutubeResults] = useState<YouTubeResult[]>([])
  const [form, setForm] = useState({
    song_title: '',
    artist: '',
    key_note: '',
    moment: '',
    soloist_id: '',
    version: '',
    reference_link: '',
    playlist_link: '',
    youtube_video_id: '',
    youtube_thumbnail: '',
    youtube_duration: '',
  })

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleYoutubeSearch(event: React.FormEvent) {
    event.preventDefault()
    if (!youtubeQuery.trim()) return

    setSearchingYoutube(true)
    try {
      const response = await fetch(`/api/youtube/search?q=${encodeURIComponent(youtubeQuery.trim())}`)
      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error ?? 'Erro ao buscar no YouTube.')
        return
      }

      setYoutubeResults(data.results ?? [])
    } catch {
      toast.error('Erro ao buscar no YouTube.')
    } finally {
      setSearchingYoutube(false)
    }
  }

  function selectYoutubeResult(result: YouTubeResult) {
    setForm((current) => ({
      ...current,
      song_title: result.title,
      artist: result.artist,
      reference_link: result.url,
      youtube_video_id: result.videoId,
      youtube_thumbnail: result.thumbnail ?? '',
      youtube_duration: result.duration ?? '',
    }))
    toast.success('Referência selecionada.')
  }

  async function ensureSongRecord() {
    if (!form.youtube_video_id) return null

    const { data: existingSong } = await supabase
      .from('songs')
      .select('id')
      .eq('youtube_video_id', form.youtube_video_id)
      .maybeSingle()

    if (existingSong?.id) return existingSong.id

    const { data: createdSong, error } = await supabase
      .from('songs')
      .insert({
        title: form.song_title.trim(),
        artist: form.artist || null,
        youtube_video_id: form.youtube_video_id,
        youtube_url: form.reference_link || null,
        youtube_thumbnail: form.youtube_thumbnail || null,
        youtube_duration: form.youtube_duration || null,
        default_key: form.key_note || null,
      })
      .select('id')
      .single()

    if (error) throw new Error(error.message)
    return createdSong.id
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.song_title.trim()) {
      toast.error('O título da música é obrigatório.')
      return
    }

    setSaving(true)
    let songId: string | null = null
    try {
      songId = await ensureSongRecord()
    } catch {
      setSaving(false)
      toast.error('Erro ao salvar referência da música.')
      return
    }

    const { error } = await supabase.from('setlist_songs').insert({
      event_id: eventId,
      song_id: songId,
      song_title: form.song_title.trim(),
      artist: form.artist || null,
      key_note: form.key_note || null,
      moment: (form.moment as 'Prévia' | 'Adoração' | 'Palavra' | 'Celebração') || null,
      soloist_id: form.soloist_id || null,
      version: form.version || null,
      reference_link: form.reference_link || null,
      playlist_link: form.playlist_link || null,
      order_index: 9999,
    })

    setSaving(false)
    if (error) {
      toast.error('Erro ao adicionar música.')
      return
    }

    toast.success('Música adicionada!')
    setOpen(false)
    setForm({
      song_title: '', artist: '', key_note: '', moment: '',
      soloist_id: '', version: '', reference_link: '', playlist_link: '',
      youtube_video_id: '', youtube_thumbnail: '', youtube_duration: '',
    })
    setYoutubeQuery('')
    setYoutubeResults([])
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          aria-label="Adicionar nova música ao setlist"
          className="flex items-center gap-2 px-4 py-2 rounded-card bg-brand text-white text-sm font-medium hover:bg-brand-light transition-colors"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          Nova Música
        </button>
      </DialogTrigger>
      <DialogContent className="bg-navy-900 border border-white/[0.08] text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Adicionar Música</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleYoutubeSearch} className="space-y-3 mt-2">
          <label htmlFor="youtube-search" className="block text-xs text-[#94A3B8]">
            Buscar no YouTube
          </label>
          <div className="flex gap-2">
            <input
              id="youtube-search"
              value={youtubeQuery}
              onChange={(event) => setYoutubeQuery(event.target.value)}
              placeholder="Nome da música ou artista"
              className="flex-1 px-3 py-2 rounded-card bg-navy-800 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-brand placeholder-[#64748B]"
            />
            <button
              type="submit"
              disabled={searchingYoutube}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-card border border-brand/30 bg-brand/15 text-brand text-sm hover:bg-brand/25 transition-colors disabled:opacity-60"
            >
              <Search className="w-4 h-4" aria-hidden="true" />
              {searchingYoutube ? 'Buscando...' : 'Buscar'}
            </button>
          </div>
          {youtubeResults.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {youtubeResults.map((result) => (
                <button
                  key={result.videoId}
                  type="button"
                  onClick={() => selectYoutubeResult(result)}
                  className="flex gap-2 rounded-card border border-white/[0.08] p-2 text-left hover:bg-white/[0.04] transition-colors"
                >
                  {result.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={result.thumbnail} alt="" className="w-20 h-14 rounded-card object-cover bg-navy-800" />
                  ) : (
                    <span className="w-20 h-14 rounded-card bg-navy-800 flex items-center justify-center">
                      <PlayCircle className="w-5 h-5 text-[#64748B]" aria-hidden="true" />
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block text-xs font-medium text-white line-clamp-2">{result.title}</span>
                    <span className="block text-[11px] text-[#94A3B8] truncate">{result.artist}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </form>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label htmlFor="song_title" className="block text-xs text-[#94A3B8] mb-1">
                Título <span className="text-red-400">*</span>
              </label>
              <input
                id="song_title"
                name="song_title"
                value={form.song_title}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 rounded-card bg-navy-800 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-brand"
              />
            </div>

            <div>
              <label htmlFor="artist" className="block text-xs text-[#94A3B8] mb-1">Artista</label>
              <input
                id="artist"
                name="artist"
                value={form.artist}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-card bg-navy-800 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-brand"
              />
            </div>

            <div>
              <label htmlFor="version" className="block text-xs text-[#94A3B8] mb-1">Versão</label>
              <input
                id="version"
                name="version"
                value={form.version}
                onChange={handleChange}
                placeholder="ao vivo, original..."
                className="w-full px-3 py-2 rounded-card bg-navy-800 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-brand"
              />
            </div>

            <div>
              <label htmlFor="key_note" className="block text-xs text-[#94A3B8] mb-1">Tom</label>
              <select
                id="key_note"
                name="key_note"
                value={form.key_note}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-card bg-navy-800 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-brand"
              >
                <option value="">Selecionar</option>
                {KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="moment" className="block text-xs text-[#94A3B8] mb-1">Momento</label>
              <select
                id="moment"
                name="moment"
                value={form.moment}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-card bg-navy-800 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-brand"
              >
                <option value="">Selecionar</option>
                {MOMENTS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="soloist_id" className="block text-xs text-[#94A3B8] mb-1">Solista</label>
              <select
                id="soloist_id"
                name="soloist_id"
                value={form.soloist_id}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-card bg-navy-800 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-brand"
              >
                <option value="">Selecionar</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>{p.full_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="reference_link" className="block text-xs text-[#94A3B8] mb-1">Link Referência</label>
              <input
                id="reference_link"
                name="reference_link"
                type="url"
                value={form.reference_link}
                onChange={handleChange}
                placeholder="https://..."
                className="w-full px-3 py-2 rounded-card bg-navy-800 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-brand"
              />
            </div>

            <div className="col-span-2">
              <label htmlFor="playlist_link" className="block text-xs text-[#94A3B8] mb-1">Link Playlist Geral</label>
              <input
                id="playlist_link"
                name="playlist_link"
                type="url"
                value={form.playlist_link}
                onChange={handleChange}
                placeholder="https://youtube.com/..."
                className="w-full px-3 py-2 rounded-card bg-navy-800 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-brand"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-1 py-2.5 rounded-card border border-white/[0.08] text-[#94A3B8] text-sm hover:bg-white/[0.04] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-card bg-brand text-white text-sm font-medium hover:bg-brand-light transition-colors disabled:opacity-60"
            >
              {saving ? 'Adicionando...' : 'Adicionar'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
