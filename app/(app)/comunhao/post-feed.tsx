import { BookOpen } from 'lucide-react'
import { PostCard } from './post-card'
import type { CommunionPostWithAuthor } from '@/types/database'

interface PostFeedProps {
  posts: CommunionPostWithAuthor[]
  userId: string
}

export function PostFeed({ posts }: PostFeedProps) {
  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <BookOpen className="w-10 h-10 text-[#64748B] mb-3" aria-hidden="true" />
        <p className="text-[#94A3B8] font-medium mb-1">Nenhuma postagem ainda</p>
        <p className="text-sm text-[#64748B]">
          O admin pode criar estudos e reflexões para o grupo.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  )
}
