import { createClient } from '@/lib/supabase/server'
import { LaiaChat } from './laia-chat'

export default async function LaiaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch message history
  const { data: history } = await supabase
    .from('laia_messages')
    .select('id, role, content, created_at')
    .eq('profile_id', user!.id)
    .order('created_at', { ascending: true })
    .limit(50)

  const initialMessages = (history ?? []).map((m) => ({
    id: m.id,
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  return <LaiaChat initialMessages={initialMessages} />
}
