'use client'

import { useState } from 'react'
import { PlayCircle, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface YouTubeResult {
  videoId: string
  title: string
  artist: string
  thumbnail: string | null
  duration: string | null
  url: string
}

export function YouTubeSongSearch() {
  const supabase = createClient()
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<YouTubeResult[]>([])

  async function handleSearch(event: React.FormEvent) {
    event.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    try {
      const response = await fetch(`/api/youtube/search?q=${encodeURIComponent(query.trim())}`)
      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error ?? 'Erro ao buscar no YouTube.')
        return
      }

      setResults(data.results ?? [])
    } catch {
      toast.error('Erro ao buscar no YouTube.')
    } finally {
      setLoading(false)
    }
  }

  async function saveSong(result: YouTubeResult) {
    const { error } = await supabase
      .from('songs')
      .upsert(
        {
          title: result.title,
          artist: result.artist,
          youtube_video_id: result.videoId,
          youtube_url: result.url,
          youtube_thumbnail: result.thumbnail,
          youtube_duration: result.duration,
        },
        { onConflict: 'youtube_video_id' }
      )

    if (error) {
      toast.error('Erro ao salvar música.')
      return
    }

    toast.success('Música adicionada à biblioteca.')
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Biblioteca YouTube</h2>
        <p className="text-sm text-[#94A3B8]">
          Busque uma referência oficial e salve para usar nas escalas e no estudo.
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Nome da música, artista ou versão"
          className="flex-1 px-3 py-2 rounded-card bg-navy-800 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-brand placeholder-[#64748B]"
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-card bg-brand text-white text-sm font-medium hover:bg-brand-light transition-colors disabled:opacity-60"
        >
          <Search className="w-4 h-4" aria-hidden="true" />
          {loading ? 'Buscando...' : 'Buscar'}
        </button>
      </form>

      {results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {results.map((result) => (
            <article
              key={result.videoId}
              className="flex gap-3 rounded-card border border-white/[0.08] bg-navy-900 p-3"
            >
              {result.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={result.thumbnail}
                  alt=""
                  className="w-24 h-16 object-cover rounded-card bg-navy-800"
                />
              ) : (
                <div className="w-24 h-16 rounded-card bg-navy-800 flex items-center justify-center">
                  <PlayCircle className="w-6 h-6 text-[#64748B]" aria-hidden="true" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-medium text-white line-clamp-2">{result.title}</h3>
                <p className="text-xs text-[#94A3B8] truncate">{result.artist}</p>
                <button
                  type="button"
                  onClick={() => saveSong(result)}
                  className="mt-2 px-3 py-1.5 rounded-card border border-brand/30 bg-brand/15 text-brand text-xs hover:bg-brand/25 transition-colors"
                >
                  Salvar música
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
