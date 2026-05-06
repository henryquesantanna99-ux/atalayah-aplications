'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
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

export function AddCatalogSongModal({ profiles }: AddCatalogSongModalProps) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) {
      toast.error('O título da música é obrigatório.')
      return
    }

    setSaving(true)
    try {
      await addCatalogSong({
        title: form.title.trim(),
        artist: form.artist || null,
        keyNote: form.key_note || null,
        moment: form.moment || null,
        soloistId: form.soloist_id || null,
        version: form.version || null,
        youtubeUrl: form.youtube_url || null,
      })
      toast.success('Música adicionada ao catálogo.')
      setOpen(false)
      setForm(emptyForm)
    } catch {
      toast.error('Erro ao adicionar música.')
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
