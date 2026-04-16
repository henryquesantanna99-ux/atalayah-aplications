/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LaiaAvatar } from '@/components/laia/laia-avatar'
import { MessageInput } from './message-input'
import type { ChatMessageRead, ChatMessageWithAuthor } from '@/types/database'

interface ChatRoomProps {
  initialMessages: ChatMessageWithAuthor[]
  initialReads: ChatMessageRead[]
  userId: string
  laiaCallsUsed: number
  initialDraft?: string
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ChatRoom({
  initialMessages,
  initialReads,
  userId,
  laiaCallsUsed,
  initialDraft = '',
}: ChatRoomProps) {
  const supabase = createClient()
  const [messages, setMessages] = useState<ChatMessageWithAuthor[]>(initialMessages)
  const [reads, setReads] = useState<ChatMessageRead[]>(initialReads)
  const [replyTo, setReplyTo] = useState<ChatMessageWithAuthor | null>(null)
  const [laiaUsed, setLaiaUsed] = useState(laiaCallsUsed)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const unreadMessages = messages.filter((message) =>
      message.author_id !== userId && !message.is_laia
    )

    if (unreadMessages.length === 0) return

    const now = new Date().toISOString()
    supabase
      .from('chat_message_reads')
      .upsert(
        unreadMessages.map((message) => ({
          message_id: message.id,
          profile_id: userId,
          delivered_at: now,
          read_at: now,
        })),
        { onConflict: 'message_id,profile_id' }
      )
      .then(() => {
        setReads((current) => {
          const existing = new Set(current.map((read) => `${read.message_id}:${read.profile_id}`))
          const additions = unreadMessages
            .filter((message) => !existing.has(`${message.id}:${userId}`))
            .map((message) => ({
              id: `${message.id}:${userId}`,
              message_id: message.id,
              profile_id: userId,
              delivered_at: now,
              read_at: now,
            }))
          return [...current, ...additions]
        })
      })
  }, [messages, supabase, userId])

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

  useEffect(() => {
    const channel = supabase
      .channel('chat_reads_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_message_reads' },
        (payload) => {
          const read = payload.new as ChatMessageRead
          setReads((current) => {
            const others = current.filter((item) => item.id !== read.id)
            return [...others, read]
          })
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
    return messages[index].author_id !== messages[index - 1].author_id ||
      messages[index].is_laia !== messages[index - 1].is_laia
  }

  function findReply(messageId: string | null) {
    if (!messageId) return null
    return messages.find((message) => message.id === messageId) ?? null
  }

  function getMessageStatus(message: ChatMessageWithAuthor) {
    if (message.author_id !== userId || message.is_laia) return null
    const messageReads = reads.filter((read) => read.message_id === message.id && read.profile_id !== userId)
    if (messageReads.some((read) => read.read_at)) return 'visto'
    if (messageReads.some((read) => read.delivered_at)) return 'entregue'
    return 'enviado'
  }

  async function handleSend(content: string) {
    await supabase.from('chat_messages').insert({
      author_id: userId,
      content,
      type: 'text',
      is_laia: false,
      reply_to: replyTo?.id ?? null,
    })
    setReplyTo(null)
  }

  async function handleSendAudio(blob: Blob) {
    const extension = blob.type.includes('mp4') ? 'mp4' : 'webm'
    const path = `${userId}/${Date.now()}.${extension}`
    const { error: uploadError } = await supabase.storage
      .from('chat-audio')
      .upload(path, blob, { contentType: blob.type || 'audio/webm' })

    if (uploadError) throw uploadError

    const { data } = supabase.storage.from('chat-audio').getPublicUrl(path)
    await supabase.from('chat_messages').insert({
      author_id: userId,
      content: 'Mensagem de áudio',
      type: 'audio',
      audio_url: data.publicUrl,
      is_laia: false,
      reply_to: replyTo?.id ?? null,
    })
    setReplyTo(null)
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
          const isLaia = message.is_laia
          const isOwn = message.author_id === userId && !isLaia
          const showAvatar = shouldShowAvatar(index)
          const repliedMessage = findReply(message.reply_to)
          const status = getMessageStatus(message)

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
                      ? 'bg-brand/15 border border-brand/40 text-white rounded-bl-sm'
                      : isOwn
                      ? 'bg-navy-950 border border-white/[0.06] text-white rounded-br-sm'
                      : 'bg-navy-800 border border-white/[0.06] text-white rounded-bl-sm'
                  }`}
                >
                  {repliedMessage && (
                    <div className="mb-2 rounded-card border-l-2 border-brand/60 bg-black/20 px-2 py-1 text-xs text-[#94A3B8]">
                      <p className="font-medium text-white">
                        {repliedMessage.is_laia
                          ? 'Laia IA'
                          : repliedMessage.author_id === userId
                          ? 'Você'
                          : (repliedMessage as any).profiles?.full_name ?? 'Integrante'}
                      </p>
                      <p className="line-clamp-2">
                        {repliedMessage.type === 'audio' ? 'Mensagem de áudio' : repliedMessage.content}
                      </p>
                    </div>
                  )}
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

                <div className="flex items-center gap-2 px-1">
                  <span className="text-[10px] text-[#64748B]">
                    {formatTime(message.created_at)}
                  </span>
                  {status && (
                    <span className="text-[10px] text-[#64748B]">{status}</span>
                  )}
                  <button
                    type="button"
                    onClick={() => setReplyTo(message)}
                    className="text-[10px] text-[#64748B] hover:text-brand transition-colors"
                  >
                    Responder
                  </button>
                </div>
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
          onSendAudio={handleSendAudio}
          onLaiaCall={handleLaiaCall}
          laiaCallsRemaining={2 - laiaUsed}
          userId={userId}
          initialText={initialDraft}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
        />
      </div>
    </div>
  )
}
