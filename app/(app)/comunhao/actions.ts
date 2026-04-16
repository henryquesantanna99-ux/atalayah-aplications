'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type PostType = 'estudo' | 'reflexao_texto' | 'reflexao_audio'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') throw new Error('Forbidden')
  return supabase
}

export async function updatePost(
  postId: string,
  input: {
    title: string
    content: string | null
    type: PostType
    bible_references: string[]
    meet_link: string | null
    meet_date: string | null
  }
) {
  const supabase = await requireAdmin()
  const { error } = await supabase
    .from('communion_posts')
    .update(input)
    .eq('id', postId)

  if (error) throw new Error(error.message)
  revalidatePath('/comunhao')
}

export async function deletePost(postId: string) {
  const supabase = await requireAdmin()
  const { error } = await supabase
    .from('communion_posts')
    .delete()
    .eq('id', postId)

  if (error) throw new Error(error.message)
  revalidatePath('/comunhao')
}
