'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { updatePost } from './actions'
import type { CommunionPostWithAuthor } from '@/types/database'

type PostType = 'estudo' | 'reflexao_texto' | 'reflexao_audio'

interface EditPostModalProps {
  post: CommunionPostWithAuthor
}

function formatDateTimeLocal(value: string | null) {
  if (!value) return ''
  return value.slice(0, 16)
}

export function EditPostModal({ post }: EditPostModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: post.title,
    content: post.content ?? '',
    type: post.type,
    bible_references: post.bible_references.join(', '),
    meet_link: post.meet_link ?? '',
    meet_date: formatDateTimeLocal(post.meet_date),
  })

  function handleChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!form.title.trim()) {
      toast.error('O título é obrigatório.')
      return
    }

    setSaving(true)
    try {
      await updatePost(post.id, {
        title: form.title.trim(),
        content: form.content.trim() || null,
        type: form.type as PostType,
        bible_references: form.bible_references
          .split(',')
          .map((reference) => reference.trim())
          .filter(Boolean),
        meet_link: form.meet_link.trim() || null,
        meet_date: form.meet_date || null,
      })
      toast.success('Postagem atualizada.')
      setOpen(false)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar postagem.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-card border border-white/[0.08] text-xs text-[#94A3B8] hover:text-white hover:border-white/20 transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
          Editar
        </button>
      </DialogTrigger>
      <DialogContent className="bg-navy-900 border border-white/[0.08] text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white">Editar Postagem</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <label htmlFor={`post-type-${post.id}`} className="block text-xs text-[#94A3B8] mb-1">
              Tipo
            </label>
            <select
              id={`post-type-${post.id}`}
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
            <label htmlFor={`post-title-${post.id}`} className="block text-xs text-[#94A3B8] mb-1">
              Título
            </label>
            <input
              id={`post-title-${post.id}`}
              name="title"
              value={form.title}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 rounded-card bg-navy-800 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-brand"
            />
          </div>

          <div>
            <label htmlFor={`post-content-${post.id}`} className="block text-xs text-[#94A3B8] mb-1">
              Conteúdo
            </label>
            <textarea
              id={`post-content-${post.id}`}
              name="content"
              value={form.content}
              onChange={handleChange}
              rows={5}
              className="w-full px-3 py-2 rounded-card bg-navy-800 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-brand resize-none"
            />
          </div>

          <div>
            <label
              htmlFor={`post-bible-${post.id}`}
              className="block text-xs text-[#94A3B8] mb-1"
            >
              Referências Bíblicas
            </label>
            <input
              id={`post-bible-${post.id}`}
              name="bible_references"
              value={form.bible_references}
              onChange={handleChange}
              placeholder="João 3:16, Salmos 23:1"
              className="w-full px-3 py-2 rounded-card bg-navy-800 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-brand placeholder-[#64748B]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor={`post-meet-${post.id}`} className="block text-xs text-[#94A3B8] mb-1">
                Link Google Meet
              </label>
              <input
                id={`post-meet-${post.id}`}
                name="meet_link"
                type="url"
                value={form.meet_link}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-card bg-navy-800 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-brand"
              />
            </div>
            <div>
              <label htmlFor={`post-date-${post.id}`} className="block text-xs text-[#94A3B8] mb-1">
                Data da reunião
              </label>
              <input
                id={`post-date-${post.id}`}
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
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
