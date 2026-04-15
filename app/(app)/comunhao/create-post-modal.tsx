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

interface CreatePostModalProps {
  userId: string
}

export function CreatePostModal({ userId }: CreatePostModalProps) {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '',
    content: '',
    type: 'estudo',
    bible_references: '',
    meet_link: '',
    meet_date: '',
  })

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) {
      toast.error('O título é obrigatório.')
      return
    }

    setSaving(true)
    const bibleRefs = form.bible_references
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean)

    const { error } = await supabase.from('communion_posts').insert({
      author_id: userId,
      title: form.title.trim(),
      content: form.content.trim() || null,
      type: form.type as 'estudo' | 'reflexao_texto' | 'reflexao_audio',
      bible_references: bibleRefs,
      meet_link: form.meet_link.trim() || null,
      meet_date: form.meet_date || null,
    })

    setSaving(false)
    if (error) {
      toast.error('Erro ao publicar. Tente novamente.')
      return
    }

    toast.success('Publicado com sucesso!')
    setOpen(false)
    setForm({ title: '', content: '', type: 'estudo', bible_references: '', meet_link: '', meet_date: '' })
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          aria-label="Criar nova reflexão ou estudo"
          className="flex items-center gap-2 px-4 py-2 rounded-card bg-brand text-white text-sm font-medium hover:bg-brand-light transition-colors"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          Nova Postagem
        </button>
      </DialogTrigger>
      <DialogContent className="bg-navy-900 border border-white/[0.08] text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white">Nova Reflexão / Estudo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <label htmlFor="type" className="block text-xs text-[#94A3B8] mb-1">Tipo</label>
            <select
              id="type"
              name="type"
              value={form.type}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-card bg-navy-800 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-brand"
            >
              <option value="estudo">Estudo Bíblico</option>
              <option value="reflexao_texto">Reflexão em Texto</option>
              <option value="reflexao_audio">Reflexão em Áudio</option>
            </select>
          </div>

          <div>
            <label htmlFor="title" className="block text-xs text-[#94A3B8] mb-1">
              Título <span className="text-red-400">*</span>
            </label>
            <input
              id="title"
              name="title"
              value={form.title}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 rounded-card bg-navy-800 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-brand"
            />
          </div>

          <div>
            <label htmlFor="content" className="block text-xs text-[#94A3B8] mb-1">Conteúdo</label>
            <textarea
              id="content"
              name="content"
              value={form.content}
              onChange={handleChange}
              rows={5}
              className="w-full px-3 py-2 rounded-card bg-navy-800 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-brand resize-none"
            />
          </div>

          <div>
            <label htmlFor="bible_references" className="block text-xs text-[#94A3B8] mb-1">
              Referências Bíblicas{' '}
              <span className="text-[#64748B]">(separadas por vírgula)</span>
            </label>
            <input
              id="bible_references"
              name="bible_references"
              value={form.bible_references}
              onChange={handleChange}
              placeholder="ex: João 3:16, Salmos 23:1"
              className="w-full px-3 py-2 rounded-card bg-navy-800 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-brand"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="meet_link" className="block text-xs text-[#94A3B8] mb-1">Link Google Meet</label>
              <input
                id="meet_link"
                name="meet_link"
                type="url"
                value={form.meet_link}
                onChange={handleChange}
                placeholder="https://meet.google.com/..."
                className="w-full px-3 py-2 rounded-card bg-navy-800 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-brand"
              />
            </div>
            <div>
              <label htmlFor="meet_date" className="block text-xs text-[#94A3B8] mb-1">Data da Reunião</label>
              <input
                id="meet_date"
                name="meet_date"
                type="datetime-local"
                value={form.meet_date}
                onChange={handleChange}
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
              {saving ? 'Publicando...' : 'Publicar'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
