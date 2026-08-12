'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Check, FolderUp, Loader2, Pencil, Plus, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { buildStemStoragePath, detectStemType, isAudioFileName } from '@/lib/stem-utils'
import { addCatalogSong, editCatalogSong } from './catalog-actions'
import type { Json } from '@/types/database'

const TEAM_MASTERY_OPTIONS = ['100% da equipe', 'Apenas a banda', 'Apenas os vocais', 'Só algumas pessoas'] as const

interface AddCatalogSongModalProps {
  song?: {
    songId: string
    variationId: string | null
    title: string
    artist: string | null
    version: string | null
    youtubeUrl: string | null
    youtubeVideoId: string | null
    youtubeThumbnail: string | null
    youtubeDuration: string | null
    bpm: number | null
    lyricsPlain: string | null
    lyricsSynced: string | null
    albumName: string | null
    metadataSource: string | null
    metadataPayload: Json
    teamMastery: typeof TEAM_MASTERY_OPTIONS[number]
  }
}

const emptyForm = {
  title: '',
  artist: '',
  version: '',
  youtube_url: '',
  youtube_video_id: '',
  youtube_thumbnail: '',
  youtube_duration: '',
  bpm: '',
  lyrics_plain: '',
  lyrics_synced: '',
  album_name: '',
  metadata_source: '',
  metadata_payload: {} as Json,
  team_mastery: 'Só algumas pessoas' as typeof TEAM_MASTERY_OPTIONS[number],
}

interface YouTubeResult {
  videoId: string
  title: string
  artist: string
  thumbnail: string | null
  duration: string | null
  url: string
}

type FileWithRelativePath = File & { webkitRelativePath?: string }

function getRelativeFilePath(file: File) {
  const relativePath = (file as FileWithRelativePath).webkitRelativePath
  return relativePath && relativePath.length > 0 ? relativePath : file.name
}

export function AddCatalogSongModal({ song }: AddCatalogSongModalProps) {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const isEditing = Boolean(song)
  const initialForm = song ? {
    title: song.title, artist: song.artist ?? '', version: song.version ?? '', youtube_url: song.youtubeUrl ?? '',
    youtube_video_id: song.youtubeVideoId ?? '', youtube_thumbnail: song.youtubeThumbnail ?? '',
    youtube_duration: song.youtubeDuration ?? '', bpm: song.bpm ? String(song.bpm) : '',
    lyrics_plain: song.lyricsPlain ?? '', lyrics_synced: song.lyricsSynced ?? '', album_name: song.albumName ?? '',
    metadata_source: song.metadataSource ?? '', metadata_payload: song.metadataPayload ?? {}, team_mastery: song.teamMastery,
  } : emptyForm
  const [form, setForm] = useState(initialForm)
  const [multitrackFiles, setMultitrackFiles] = useState<File[]>([])
  const [youtubeResults, setYoutubeResults] = useState<YouTubeResult[]>([])
  const [searching, setSearching] = useState(false)
  const [enriching, setEnriching] = useState(false)

  useEffect(() => {
    const query = form.title.trim()
    if (query.length < 3 || form.youtube_video_id) {
      setYoutubeResults([])
      return
    }
    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      setSearching(true)
      try {
        const response = await fetch(`/api/youtube/search?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        const data = await response.json()
        if (response.ok) setYoutubeResults(data.results ?? [])
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) toast.error('Erro ao buscar no YouTube.')
      } finally {
        if (!controller.signal.aborted) setSearching(false)
      }
    }, 450)
    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [form.title, form.youtube_video_id])

  async function confirmYoutubeResult(result: YouTubeResult) {
    setEnriching(true)
    try {
      const response = await fetch('/api/music/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Não foi possível enriquecer a música.')
      setForm((current) => ({
        ...current,
        title: data.title || result.title,
        artist: data.artist || result.artist,
        youtube_url: data.youtubeUrl || result.url,
        youtube_video_id: data.youtubeVideoId || result.videoId,
        youtube_thumbnail: data.youtubeThumbnail || result.thumbnail || '',
        youtube_duration: data.youtubeDuration || result.duration || '',
        bpm: data.bpm ? String(data.bpm) : current.bpm,
        album_name: data.albumName || current.album_name,
        lyrics_plain: data.lyricsPlain || current.lyrics_plain,
        lyrics_synced: data.lyricsSynced || current.lyrics_synced,
        metadata_source: data.metadataSource || current.metadata_source || 'youtube',
        metadata_payload: data.metadataPayload || current.metadata_payload,
      }))
      setYoutubeResults([])
      toast.success('Música confirmada e informações preenchidas.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao confirmar música.')
    } finally {
      setEnriching(false)
    }
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  function handleMultitrackFolderChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).filter((file) => file.type.startsWith('audio/') || isAudioFileName(file.name))
    setMultitrackFiles(files)

    if (files.length > 0) {
      toast.success(`${files.length} faixa(s) de áudio detectada(s) na pasta.`)
    }
  }

  async function uploadMultitracks(songId: string) {
    if (multitrackFiles.length === 0) return

    const uploads: Array<{ stem_type: string; audio_url: string; storage_path: string; original_file_name: string; song_id: string }> = []

    for (let index = 0; index < multitrackFiles.length; index += 1) {
      const file = multitrackFiles[index]
      if (!file) continue

      const relativePath = getRelativeFilePath(file)
      const storagePath = buildStemStoragePath(songId, index, relativePath)
      const { error: uploadError } = await supabase.storage
        .from('song-stems')
        .upload(storagePath, file, { upsert: false, contentType: file.type || undefined })

      if (uploadError) throw new Error(uploadError.message)

      const { data } = supabase.storage.from('song-stems').getPublicUrl(storagePath)

      uploads.push({
        song_id: songId,
        stem_type: detectStemType(relativePath),
        audio_url: data.publicUrl,
        storage_path: storagePath,
        original_file_name: relativePath,
      })
    }

    if (uploads.length === 0) throw new Error('Nenhum áudio válido para upload.')

    const { error: insertError } = await supabase.from('song_stems').insert(uploads)
    if (insertError) throw new Error(insertError.message)

    toast.success(`${uploads.length} faixa(s) de multitrack adicionada(s).`)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) {
      toast.error('O título da música é obrigatório.')
      return
    }
    if (!TEAM_MASTERY_OPTIONS.includes(form.team_mastery)) {
      toast.error('Selecione um nível de domínio da equipe válido.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        artist: form.artist || null,
        version: form.version || null,
        youtubeUrl: form.youtube_url || null,
        youtubeVideoId: form.youtube_video_id || null,
        youtubeThumbnail: form.youtube_thumbnail || null,
        youtubeDuration: form.youtube_duration || null,
        bpm: form.bpm ? Number(form.bpm) : null,
        lyricsPlain: form.lyrics_plain || null,
        lyricsSynced: form.lyrics_synced || null,
        albumName: form.album_name || null,
        metadataSource: form.metadata_source || null,
        metadataPayload: form.metadata_payload,
        teamMastery: form.team_mastery,
      }
      const result = song
        ? await editCatalogSong(song.songId, song.variationId, payload)
        : await addCatalogSong(payload)

      await uploadMultitracks(result.songId)

      toast.success(isEditing ? 'Música atualizada.' : 'Música adicionada ao catálogo.')
      setOpen(false)
      setForm(initialForm)
      setMultitrackFiles([])
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao adicionar música.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (value) setForm(initialForm) }}>
      <DialogTrigger asChild>
        <button aria-label={isEditing ? `Editar ${song?.title}` : 'Adicionar nova música'} className={isEditing ? 'rounded p-1.5 text-[#64748B] hover:bg-white/[0.06] hover:text-white' : 'flex items-center gap-2 px-4 py-2 rounded-card bg-brand text-white text-sm font-medium hover:bg-brand-light transition-colors'}>
          {isEditing ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="w-4 h-4" aria-hidden="true" />}
          {!isEditing && 'Adicionar Nova Música'}
        </button>
      </DialogTrigger>
      <DialogContent className="bg-navy-900 border border-white/[0.08] text-white max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">{isEditing ? 'Editar Música' : 'Adicionar ao Catálogo'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label htmlFor="cat-title" className="block text-xs text-[#94A3B8] mb-1">
                Música <span className="text-red-400">*</span>
              </label>
              <input
                id="cat-title"
                name="title"
                value={form.title}
                onChange={handleChange}
                required
                placeholder="Nome da música"
                className="w-full px-3 py-2 rounded-card bg-navy-800 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-brand placeholder-[#64748B]"
              />
              {searching && <p className="mt-2 flex items-center gap-2 text-xs text-[#94A3B8]"><Loader2 className="h-3.5 w-3.5 animate-spin" />Buscando opções no YouTube...</p>}
              {youtubeResults.length > 0 && (
                <div className="mt-2 max-h-56 space-y-2 overflow-y-auto rounded-card border border-white/[0.08] bg-navy-800 p-2">
                  {youtubeResults.map((result) => (
                    <div key={result.videoId} className="flex items-center gap-3 rounded-card bg-navy-900 p-2">
                      {result.thumbnail && <Image src={result.thumbnail} alt="" width={80} height={48} className="h-12 w-20 rounded object-cover" />}
                      <div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-white">{result.title}</p><p className="truncate text-[11px] text-[#64748B]">{result.artist}</p></div>
                      <button type="button" disabled={enriching} onClick={() => confirmYoutubeResult(result)} className="inline-flex items-center gap-1 rounded-card bg-brand px-2 py-1.5 text-xs text-white disabled:opacity-50"><Check className="h-3.5 w-3.5" />Confirmar</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="cat-artist" className="block text-xs text-[#94A3B8] mb-1">Artista</label>
              <input
                id="cat-artist"
                name="artist"
                value={form.artist}
                onChange={handleChange}
                placeholder="Hillsong, Elevation..."
                className="w-full px-3 py-2 rounded-card bg-navy-800 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-brand placeholder-[#64748B]"
              />
            </div>

            <div>
              <label htmlFor="cat-bpm" className="block text-xs text-[#94A3B8] mb-1">BPM</label>
              <input id="cat-bpm" name="bpm" type="number" min="20" max="300" value={form.bpm} onChange={handleChange} className="w-full px-3 py-2 rounded-card bg-navy-800 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-brand" />
            </div>

            {form.youtube_video_id && (
              <details className="col-span-2 rounded-card border border-white/[0.08] bg-navy-800/60 p-3">
                <summary className="cursor-pointer text-sm font-medium text-white">Informações da música</summary>
                <div className="mt-3 space-y-3">
                  <input name="album_name" value={form.album_name} onChange={handleChange} placeholder="Álbum" className="w-full px-3 py-2 rounded-card bg-navy-900 border border-white/[0.08] text-white text-sm" />
                  <textarea name="lyrics_plain" value={form.lyrics_plain} onChange={(event) => setForm((current) => ({ ...current, lyrics_plain: event.target.value }))} rows={8} placeholder="Letra" className="w-full px-3 py-2 rounded-card bg-navy-900 border border-white/[0.08] text-white text-sm resize-y" />
                  <p className="text-[11px] text-[#64748B]">Fonte: {form.metadata_source || 'YouTube'}</p>
                </div>
              </details>
            )}

            <div>
              <label htmlFor="cat-version" className="block text-xs text-[#94A3B8] mb-1">Versão</label>
              <input
                id="cat-version"
                name="version"
                value={form.version}
                onChange={handleChange}
                placeholder="ao vivo, original..."
                className="w-full px-3 py-2 rounded-card bg-navy-800 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-brand placeholder-[#64748B]"
              />
            </div>

            <div className="col-span-2">
              <label htmlFor="cat-youtube" className="block text-xs text-[#94A3B8] mb-1">Link de Referência do YouTube</label>
              <input
                id="cat-youtube"
                name="youtube_url"
                type="url"
                value={form.youtube_url}
                onChange={handleChange}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full px-3 py-2 rounded-card bg-navy-800 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-brand placeholder-[#64748B]"
              />
            </div>

            <div className="col-span-2 rounded-card border border-dashed border-brand/30 bg-brand/10 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">Pasta de multitracks</p>
                  <p className="mt-1 text-xs text-[#94A3B8]">
                    Selecione uma pasta com mp3, wav, m4a e outros áudios. As faixas serão categorizadas por instrumento automaticamente.
                  </p>
                </div>
                <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-card bg-white/[0.08] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/[0.12]">
                  <FolderUp className="h-4 w-4" aria-hidden="true" />
                  Adicionar pasta
                  <input
                    type="file"
                    multiple
                    accept="audio/*,.mp3,.wav,.m4a,.aac,.flac,.ogg,.aiff,.aif,.wma"
                    onChange={handleMultitrackFolderChange}
                    className="sr-only"
                    {...{ webkitdirectory: '', directory: '' }}
                  />
                </label>
              </div>
              {multitrackFiles.length > 0 && (
                <div className="mt-3 rounded-card border border-white/[0.08] bg-navy-900/70 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-emerald-300">{multitrackFiles.length} arquivo(s) pronto(s) para envio</span>
                    <button
                      type="button"
                      onClick={() => setMultitrackFiles([])}
                      className="inline-flex items-center gap-1 text-xs text-[#94A3B8] hover:text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                      Limpar
                    </button>
                  </div>
                  <div className="max-h-24 space-y-1 overflow-y-auto pr-1">
                    {multitrackFiles.slice(0, 8).map((file) => (
                      <p key={`${file.name}-${file.size}`} className="truncate text-[11px] text-[#94A3B8]">
                        {getRelativeFilePath(file)}
                      </p>
                    ))}
                    {multitrackFiles.length > 8 && (
                      <p className="text-[11px] text-[#64748B]">+ {multitrackFiles.length - 8} arquivo(s)</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="col-span-2">
              <label htmlFor="cat-team-mastery" className="block text-xs text-[#94A3B8] mb-1">Qual nível de domínio da equipe?</label>
              <select id="cat-team-mastery" name="team_mastery" required value={form.team_mastery} onChange={handleChange} className="w-full px-3 py-2 rounded-card bg-navy-800 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-brand">
                {TEAM_MASTERY_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
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
              {saving ? 'Salvando...' : (isEditing ? 'Salvar alterações' : 'Adicionar')}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
