'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FolderUp, Plus, X } from 'lucide-react'
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
import { addCatalogSong } from './catalog-actions'

const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
  'Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'A#m', 'Bm']
const MOMENTS = ['Prévia', 'Adoração', 'Palavra', 'Celebração'] as const

interface Profile {
  id: string
  full_name: string | null
}

interface AddCatalogSongModalProps {
  profiles: Profile[]
}

const emptyForm = {
  title: '',
  artist: '',
  key_note: '',
  moment: '',
  soloist_id: '',
  version: '',
  youtube_url: '',
}

type FileWithRelativePath = File & { webkitRelativePath?: string }

function getRelativeFilePath(file: File) {
  const relativePath = (file as FileWithRelativePath).webkitRelativePath
  return relativePath && relativePath.length > 0 ? relativePath : file.name
}

export function AddCatalogSongModal({ profiles }: AddCatalogSongModalProps) {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [multitrackFiles, setMultitrackFiles] = useState<File[]>([])

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

    setSaving(true)
    try {
      const result = await addCatalogSong({
        title: form.title.trim(),
        artist: form.artist || null,
        keyNote: form.key_note || null,
        moment: form.moment || null,
        soloistId: form.soloist_id || null,
        version: form.version || null,
        youtubeUrl: form.youtube_url || null,
      })

      await uploadMultitracks(result.songId)

      toast.success('Música adicionada ao catálogo.')
      setOpen(false)
      setForm(emptyForm)
      setMultitrackFiles([])
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao adicionar música.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-2 px-4 py-2 rounded-card bg-brand text-white text-sm font-medium hover:bg-brand-light transition-colors">
          <Plus className="w-4 h-4" aria-hidden="true" />
          Adicionar Nova Música
        </button>
      </DialogTrigger>
      <DialogContent className="bg-navy-900 border border-white/[0.08] text-white max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Adicionar ao Catálogo</DialogTitle>
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

            <div>
              <label htmlFor="cat-key" className="block text-xs text-[#94A3B8] mb-1">Tom</label>
              <select
                id="cat-key"
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
              <label htmlFor="cat-moment" className="block text-xs text-[#94A3B8] mb-1">Momento</label>
              <select
                id="cat-moment"
                name="moment"
                value={form.moment}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-card bg-navy-800 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-brand"
              >
                <option value="">Selecionar</option>
                {MOMENTS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div className="col-span-2">
              <label htmlFor="cat-soloist" className="block text-xs text-[#94A3B8] mb-1">Solista</label>
              <select
                id="cat-soloist"
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
              {saving ? 'Salvando...' : 'Adicionar'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}