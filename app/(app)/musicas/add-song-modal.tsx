'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
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

export function AddSongModal({ eventId, profiles }: AddSongModalProps) {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    song_title: '',
    artist: '',
    key_note: '',
    moment: '',
    soloist_id: '',
    version: '',
    reference_link: '',
    playlist_link: '',
  })

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.song_title.trim()) {
      toast.error('O título da música é obrigatório.')
      return
    }

    setSaving(true)
    const { error } = await supabase.from('setlist_songs').insert({
      event_id: eventId,
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
    })
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
      <DialogContent className="bg-navy-900 border border-white/[0.08] text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white">Adicionar Música</DialogTitle>
        </DialogHeader>
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
