/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LaiaAvatar } from '@/components/laia/laia-avatar'
import { MessageInput } from './message-input'
import type { ChatMessageWithAuthor } from '@/types/database'

interface ChatRoomProps {
  initialMessages: ChatMessageWithAuthor[]
  userId: string
  laiaCallsUsed: number
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ChatRoom({
  initialMessages,
  userId,
  laiaCallsUsed,
}: ChatRoomProps) {
  const supabase = createClient()
  const [messages, setMessages] = useState<ChatMessageWithAuthor[]>(initialMessages)
  const [laiaUsed, setLaiaUsed] = useState(laiaCallsUsed)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Supabase Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('chat_messages_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        async (payload) => {
          // Fetch the full message with profile
          const { data } = await supabase
            .from('chat_messages')
            .select('*, profiles(id, full_name, avatar_url)')
            .eq('id', payload.new.id)
            .single()

          if (data) {
            setMessages((prev) => [...prev, data as unknown as ChatMessageWithAuthor])
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  // Group consecutive messages from the same sender
  function shouldShowAvatar(index: number) {
    if (index === 0) return true
    return messages[index].author_id !== messages[index - 1].author_id
  }

  async function handleSend(content: string) {
    await supabase.from('chat_messages').insert({
      author_id: userId,
      content,
      type: 'text',
      is_laia: false,
    })
  }

  async function handleLaiaCall(question: string) {
    if (laiaUsed >= 2) return

    // Insert user message first
    await supabase.from('chat_messages').insert({
      author_id: userId,
      content: `@Laia ${question}`,
      type: 'text',
      is_laia: false,
    })

    // Call the API route
    const response = await fetch('/api/laia/group', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    })

    if (response.ok) {
      setLaiaUsed((prev) => prev + 1)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] lg:h-[calc(100vh-5rem)]">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {messages.map((message, index) => {
          const isOwn = message.author_id === userId
          const isLaia = message.is_laia
          const showAvatar = shouldShowAvatar(index)

          return (
            <div
              key={message.id}
              className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar (only on first message in group) */}
              <div className="w-7 flex-shrink-0">
                {showAvatar && !isOwn && (
                  isLaia ? (
                    <LaiaAvatar size="sm" pulse={false} />
                  ) : (
                    <Avatar className="w-7 h-7">
                      <AvatarImage
                        src={(message as any).profiles?.avatar_url}
                        alt={(message as any).profiles?.full_name}
                      />
                      <AvatarFallback className="bg-navy-700 text-white text-[10px]">
                        {(message as any).profiles?.full_name?.[0] ?? '?'}
                      </AvatarFallback>
                    </Avatar>
                  )
                )}
              </div>

              <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                {/* Sender name on first in group */}
                {showAvatar && !isOwn && (
                  <span className="text-xs text-[#64748B] px-1">
                    {isLaia ? 'Laia IA' : (message as any).profiles?.full_name}
                  </span>
                )}

                {/* Bubble */}
                <div
                  className={`px-3 py-2 rounded-xl text-sm leading-relaxed ${
                    isLaia
                      ? 'bg-navy-800 border border-brand/30 text-white rounded-bl-sm'
                      : isOwn
                      ? 'bg-navy-800 text-white rounded-br-sm'
                      : 'bg-navy-900 border border-white/[0.06] text-white rounded-bl-sm'
                  }`}
                >
                  {message.type === 'audio' && message.audio_url ? (
                    <audio
                      controls
                      src={message.audio_url}
                      className="h-8 w-48"
                      aria-label="Mensagem de áudio"
                    />
                  ) : (
                    message.content
                  )}
                </div>

                <span className="text-[10px] text-[#64748B] px-1">
                  {formatTime(message.created_at)}
                </span>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Message input */}
      <div className="border-t border-white/[0.06] bg-black/50 backdrop-blur-sm px-4 py-3">
        <MessageInput
          onSend={handleSend}
          onLaiaCall={handleLaiaCall}
          laiaCallsRemaining={2 - laiaUsed}
          userId={userId}
        />
      </div>
    </div>
  )
}
