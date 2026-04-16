/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/page-header'
import { ChatRoom } from './chat-room'

interface ChatPageProps {
  searchParams: { draft?: string }
}

export default async function ChatPage({ searchParams }: ChatPageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Last 50 messages with author profiles
  const { data: messages } = await supabase
    .from('chat_messages')
    .select('*, profiles(id, full_name, avatar_url)')
    .order('created_at', { ascending: true })
    .limit(50)

  const messageIds = ((messages ?? []) as any[]).map((message) => message.id)
  const { data: reads } = messageIds.length > 0
    ? await supabase
        .from('chat_message_reads')
        .select('*')
        .in('message_id', messageIds)
    : { data: [] }

  // Get Laia usage for today
  const today = new Date().toISOString().split('T')[0]
  const { data: laiaUsage } = await supabase
    .from('laia_usage')
    .select('count')
    .eq('profile_id', user!.id)
    .eq('used_at', today)
    .single()

  const laiaCallsUsed = laiaUsage?.count ?? 0

  return (
    <>
      <PageHeader title="Chat do Grupo" subtitle="AtalaYah — Louvor" />
      <ChatRoom
        initialMessages={(messages ?? []) as any[]}
        initialReads={(reads ?? []) as any[]}
        userId={user!.id}
        laiaCallsUsed={laiaCallsUsed}
        initialDraft={searchParams.draft ?? ''}
      />
    </>
  )
}
