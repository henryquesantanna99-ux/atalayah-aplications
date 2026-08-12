'use client'

import { useState } from 'react'
import Image from 'next/image'
import { FolderUp, Loader2, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { buildStemStoragePath, detectStemType, isAudioFileName } from '@/lib/stem-utils'
import { editCatalogSong } from './catalog-actions'
import type { CatalogSong } from './catalog-types'

type Draft = {
  title: string; artist: string; youtubeUrl: string; youtubeVideoId: string; youtubeThumbnail: string
  youtubeDuration: string; bpm: string; albumName: string; lyricsPlain: string; lyricsSynced: string
  metadataSource: string; metadataPayload: CatalogSong['metadataPayload']
}

function initialDraft(song: CatalogSong): Draft {
  return {
    title: song.title, artist: song.artist ?? '', youtubeUrl: song.youtubeUrl ?? '', youtubeVideoId: song.youtubeVideoId ?? '',
    youtubeThumbnail: song.youtubeThumbnail ?? '', youtubeDuration: song.youtubeDuration ?? '', bpm: song.bpm ? String(song.bpm) : '',
    albumName: song.albumName ?? '', lyricsPlain: song.lyricsPlain ?? '', lyricsSynced: song.lyricsSynced ?? '',
    metadataSource: song.metadataSource ?? '', metadataPayload: song.metadataPayload ?? {},
  }
}

export function ResolveSongModal({ song }: { song: CatalogSong }) {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'automatic' | 'manual'>('automatic')
  const [draft, setDraft] = useState(() => initialDraft(song))
  const [preview, setPreview] = useState(false)
  const [working, setWorking] = useState(false)
  const [files, setFiles] = useState<File[]>([])

  function mergeReturned(data: Record<string, unknown>) {
    setDraft((current) => ({
      ...current,
      title: typeof data.title === 'string' && data.title ? data.title : current.title,
      artist: typeof data.artist === 'string' && data.artist ? data.artist : current.artist,
      youtubeUrl: typeof data.youtubeUrl === 'string' && data.youtubeUrl ? data.youtubeUrl : current.youtubeUrl,
      youtubeVideoId: typeof data.youtubeVideoId === 'string' && data.youtubeVideoId ? data.youtubeVideoId : current.youtubeVideoId,
      youtubeThumbnail: typeof data.youtubeThumbnail === 'string' && data.youtubeThumbnail ? data.youtubeThumbnail : current.youtubeThumbnail,
      youtubeDuration: typeof data.youtubeDuration === 'string' && data.youtubeDuration ? data.youtubeDuration : current.youtubeDuration,
      bpm: typeof data.bpm === 'number' ? String(data.bpm) : current.bpm,
      albumName: typeof data.albumName === 'string' && data.albumName ? data.albumName : current.albumName,
      lyricsPlain: typeof data.lyricsPlain === 'string' && data.lyricsPlain ? data.lyricsPlain : current.lyricsPlain,
      lyricsSynced: typeof data.lyricsSynced === 'string' && data.lyricsSynced ? data.lyricsSynced : current.lyricsSynced,
      metadataSource: typeof data.metadataSource === 'string' && data.metadataSource ? data.metadataSource : current.metadataSource,
      metadataPayload: data.metadataPayload != null ? data.metadataPayload as CatalogSong['metadataPayload'] : current.metadataPayload,
    }))
  }

  async function enrich(payload: Record<string, unknown>) {
    const response = await fetch('/api/music/enrich', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error ?? 'Não foi possível enriquecer a música.')
    mergeReturned(data)
  }

  async function automaticResolve() {
    setWorking(true)
    try {
      if (!draft.youtubeVideoId) {
        const response = await fetch(`/api/youtube/search?q=${encodeURIComponent(`${draft.title} ${draft.artist}`)}`)
        const data = await response.json()
        if (!response.ok || !data.results?.[0]) throw new Error(data.error ?? 'Nenhum vídeo encontrado no YouTube.')
        const result = data.results[0]
        await enrich(result)
      } else {
        await enrich({ title: draft.title, artist: draft.artist, videoId: draft.youtubeVideoId, url: draft.youtubeUrl, thumbnail: draft.youtubeThumbnail, duration: draft.youtubeDuration })
      }
      setPreview(true)
      toast.success('Dados encontrados. Revise a pré-visualização antes de salvar.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha na resolução automática.')
    } finally { setWorking(false) }
  }

  async function uploadStems() {
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index]
      if (!file) continue
      const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name
      const storagePath = buildStemStoragePath(song.songId, song.stems.length + index, relativePath)
      const { error } = await supabase.storage.from('song-stems').upload(storagePath, file, { contentType: file.type || undefined })
      if (error) throw new Error(error.message)
      const { data } = supabase.storage.from('song-stems').getPublicUrl(storagePath)
      const { error: insertError } = await supabase.from('song_stems').insert({ song_id: song.songId, stem_type: detectStemType(relativePath), audio_url: data.publicUrl, storage_path: storagePath, original_file_name: relativePath })
      if (insertError) throw new Error(insertError.message)
    }
  }

  async function save() {
    setWorking(true)
    try {
      await editCatalogSong(song.songId, song.variationId, {
        title: draft.title, artist: draft.artist || null, version: song.version,
        youtubeUrl: draft.youtubeUrl || null, youtubeVideoId: draft.youtubeVideoId || null,
        youtubeThumbnail: draft.youtubeThumbnail || null, youtubeDuration: draft.youtubeDuration || null,
        bpm: draft.bpm ? Number(draft.bpm) : null, albumName: draft.albumName || null,
        lyricsPlain: draft.lyricsPlain || null, lyricsSynced: draft.lyricsSynced || null,
        metadataSource: draft.metadataSource || null, metadataPayload: draft.metadataPayload, teamMastery: song.teamMastery,
      })
      await uploadStems()
      toast.success('Informações da música salvas.')
      setOpen(false)
      router.refresh()
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível salvar.') }
    finally { setWorking(false) }
  }

  const field = (name: keyof Draft, label: string, multiline = false) => <label className="block text-xs text-[#94A3B8]">{label}{multiline
    ? <textarea value={String(draft[name] ?? '')} onChange={(e) => setDraft((d) => ({ ...d, [name]: e.target.value }))} rows={name === 'lyricsPlain' ? 7 : 4} className="mt-1 w-full rounded-card border border-white/[0.08] bg-navy-800 p-2 text-sm text-white" />
    : <input value={String(draft[name] ?? '')} onChange={(e) => setDraft((d) => ({ ...d, [name]: e.target.value }))} className="mt-1 w-full rounded-card border border-white/[0.08] bg-navy-800 p-2 text-sm text-white" />}</label>

  return <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (value) { setDraft(initialDraft(song)); setPreview(false) } }}>
    <DialogTrigger asChild><button className="rounded-card bg-amber-400/15 px-2.5 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-400/25">Resolver</button></DialogTrigger>
    <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-white/[0.08] bg-navy-900 text-white">
      <DialogHeader><DialogTitle>Resolver informações · {song.title}</DialogTitle></DialogHeader>
      <div className="flex gap-2"><button onClick={() => setMode('automatic')} className={`rounded-card px-3 py-2 text-sm ${mode === 'automatic' ? 'bg-brand' : 'bg-white/[0.06]'}`}>Automático</button><button onClick={() => setMode('manual')} className={`rounded-card px-3 py-2 text-sm ${mode === 'manual' ? 'bg-brand' : 'bg-white/[0.06]'}`}>Manual</button></div>
      {mode === 'automatic' && <div className="rounded-card border border-brand/20 bg-brand/10 p-4"><p className="text-sm text-[#CBD5E1]">Busca YouTube, letra e metadados. Nada que já existe será apagado quando um provedor não retornar um campo.</p><button disabled={working} onClick={automaticResolve} className="mt-3 inline-flex items-center gap-2 rounded-card bg-brand px-3 py-2 text-sm disabled:opacity-50">{working ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}Buscar informações</button></div>}
      {(mode === 'manual' || preview) && <div className="space-y-3"><p className="text-sm font-semibold">{preview ? 'Pré-visualização antes de salvar' : 'Edição manual'}</p><div className="grid gap-3 sm:grid-cols-2">{field('title', 'Título')}{field('artist', 'Artista')}{field('youtubeUrl', 'URL do YouTube')}{field('youtubeVideoId', 'ID do YouTube')}{field('youtubeThumbnail', 'Thumbnail')}{field('youtubeDuration', 'Duração')}{field('albumName', 'Álbum')}{field('bpm', 'BPM')}{field('metadataSource', 'Fonte')}</div>{draft.youtubeThumbnail && <Image src={draft.youtubeThumbnail} alt="Prévia do vídeo" width={240} height={135} className="rounded-card" />}{field('lyricsPlain', 'Letra simples', true)}{field('lyricsSynced', 'Letra sincronizada', true)}<label className="block text-xs text-[#94A3B8]">Payload de metadados<textarea value={JSON.stringify(draft.metadataPayload, null, 2)} onChange={(e) => { try { setDraft((d) => ({ ...d, metadataPayload: JSON.parse(e.target.value) })) } catch {} }} rows={5} className="mt-1 w-full rounded-card border border-white/[0.08] bg-navy-800 p-2 font-mono text-xs text-white" /></label></div>}
      <div className="rounded-card border border-dashed border-brand/30 p-4"><label className="inline-flex cursor-pointer items-center gap-2 text-sm"><FolderUp className="h-4 w-4" />Adicionar pasta de stems<input type="file" multiple accept="audio/*,.mp3,.wav,.m4a,.aac,.flac,.ogg,.aiff,.aif" className="sr-only" {...{ webkitdirectory: '', directory: '' }} onChange={(e) => setFiles(Array.from(e.target.files ?? []).filter((file) => file.type.startsWith('audio/') || isAudioFileName(file.name)))} /></label>{files.length > 0 && <p className="mt-2 text-xs text-emerald-300">{files.length} nova(s) stem(s) pronta(s) para upload.</p>}</div>
      <div className="flex justify-end"><button disabled={working || (!preview && mode === 'automatic')} onClick={save} className="rounded-card bg-brand px-4 py-2 text-sm disabled:opacity-40">Salvar informações</button></div>
    </DialogContent>
  </Dialog>
}
