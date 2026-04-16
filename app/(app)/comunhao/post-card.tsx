'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, BookOpen, FileText, Mic, Video } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { BibleVerseBlock } from './bible-verse-block'
import type { CommunionPostWithAuthor } from '@/types/database'
import { EditPostModal } from './edit-post-modal'
import { deletePost } from './actions'
import { toast } from 'sonner'

const POST_TYPE_CONFIG = {
  estudo: {
    icon: BookOpen,
    label: 'Estudo Bíblico',
    color: 'bg-brand/20 text-brand border-brand/30',
  },
  reflexao_texto: {
    icon: FileText,
    label: 'Reflexão',
    color: 'bg-purple-900/40 text-purple-300 border-purple-700/40',
  },
  reflexao_audio: {
    icon: Mic,
    label: 'Reflexão em Áudio',
    color: 'bg-pink-900/40 text-pink-300 border-pink-700/40',
  },
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

interface PostCardProps {
  post: CommunionPostWithAuthor
  isAdmin: boolean
}

export function PostCard({ post, isAdmin }: PostCardProps) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const config = POST_TYPE_CONFIG[post.type] ?? POST_TYPE_CONFIG.estudo
  const Icon = config.icon
  const preview = post.content?.slice(0, 200) ?? ''
  const hasMore = (post.content?.length ?? 0) > 200

  async function handleDelete() {
    const confirmed = window.confirm(`Excluir a postagem "${post.title}"?`)
    if (!confirmed) return

    setDeleting(true)
    try {
      await deletePost(post.id)
      toast.success('Postagem excluída.')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir postagem.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <article className="bg-navy-900 border border-white/[0.06] rounded-modal p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <Avatar className="w-9 h-9">
            <AvatarImage
              src={post.profiles?.avatar_url ?? undefined}
              alt={post.profiles?.full_name ?? 'Autor'}
            />
            <AvatarFallback className="bg-navy-700 text-white text-xs font-bold">
              {post.profiles?.full_name?.[0] ?? '?'}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium text-white">
              {post.profiles?.full_name ?? 'Autor'}
            </p>
            <p className="text-xs text-[#64748B]">{formatDate(post.created_at)}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-full border flex-shrink-0 ${config.color}`}>
            <Icon className="w-3 h-3" aria-hidden="true" />
            {config.label}
          </span>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <EditPostModal post={post} />
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-card border border-red-500/20 text-xs text-red-300 hover:text-red-200 hover:border-red-400/40 transition-colors disabled:opacity-50"
              >
                Excluir
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Title */}
      <h2 className="text-base font-bold text-white mb-2">{post.title}</h2>

      {/* Bible references */}
      {post.bible_references?.length > 0 && (
        <div className="space-y-1 mb-3">
          {post.bible_references.slice(0, 2).map((ref) => (
            <BibleVerseBlock key={ref} reference={ref} />
          ))}
        </div>
      )}

      {/* Content */}
      {post.content && (
        <div>
          <p className="text-sm text-[#94A3B8] leading-relaxed">
            {expanded ? post.content : preview}
            {!expanded && hasMore && '...'}
          </p>
          {hasMore && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1 text-xs text-brand mt-2 hover:text-brand-light transition-colors"
            >
              {expanded ? 'Ver menos' : 'Ver mais'}
              <ChevronDown
                className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            </button>
          )}
        </div>
      )}

      {/* Audio player */}
      {post.type === 'reflexao_audio' && post.audio_url && (
        <audio
          controls
          src={post.audio_url}
          className="w-full mt-3 h-10"
          aria-label={`Áudio: ${post.title}`}
        />
      )}

      {/* Meet link */}
      {post.meet_link && (
        <div className="mt-4 pt-4 border-t border-white/[0.04]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-brand" aria-hidden="true" />
              <span className="text-sm text-[#94A3B8]">Reunião disponível</span>
              {post.meet_date && (
                <span className="text-xs text-[#64748B]">
                  · {formatDate(post.meet_date)}
                </span>
              )}
            </div>
            <a
              href={post.meet_link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-3 py-1.5 rounded-full bg-brand/20 border border-brand/30 text-brand hover:bg-brand/30 transition-colors"
            >
              Entrar na Reunião
            </a>
          </div>
        </div>
      )}
    </article>
  )
}
