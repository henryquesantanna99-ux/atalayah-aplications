'use client'

import { useMemo, useRef, useEffect, useState } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { Send } from 'lucide-react'
import { LaiaAvatar } from '@/components/laia/laia-avatar'

interface LaiaChatProps {
  initialMessages: { id: string; role: 'user' | 'assistant'; content: string }[]
}

export function LaiaChat({ initialMessages }: LaiaChatProps) {
  const [input, setInput] = useState('')
  const transport = useMemo(() => new DefaultChatTransport({ api: '/api/laia/chat' }), [])
  const chatInitialMessages = useMemo<UIMessage[]>(
    () =>
      initialMessages.map((message) => ({
        id: message.id,
        role: message.role,
        parts: [{ type: 'text', text: message.content }],
      })),
    [initialMessages]
  )
  const { messages, sendMessage, status } = useChat({
    transport,
    messages: chatInitialMessages,
  })
  const isLoading = status === 'submitted' || status === 'streaming'

  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex flex-col h-[calc(100vh-0px)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-white/[0.06] bg-black/50 backdrop-blur-sm sticky top-0 z-10">
        <LaiaAvatar size="md" />
        <div>
          <h1 className="text-base font-semibold text-white">Laia</h1>
          <p className="text-xs text-[#64748B]">Assistente AtalaYah · IA</p>
        </div>
        <span className="ml-auto text-[10px] font-medium px-2 py-1 rounded-full bg-brand/20 border border-brand/30 text-brand">
          gpt-4o
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4">
            <LaiaAvatar size="lg" />
            <div>
              <h2 className="text-lg font-bold text-white mb-2">Olá! Sou a Laia</h2>
              <p className="text-sm text-[#94A3B8] max-w-xs leading-relaxed">
                Posso ajudar com dúvidas sobre escalas, músicas, estudos bíblicos
                e qualquer coisa sobre o ministério AtalaYah.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {[
                'Quais músicas estão no próximo culto?',
                'Quando é o próximo ensaio?',
                'Me dê um versículo de encorajamento',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  className="text-xs px-3 py-1.5 rounded-full border border-white/[0.08] text-[#94A3B8] hover:border-brand/30 hover:text-brand transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => {
          const isUser = message.role === 'user'
          const content = message.parts
            .filter((part) => part.type === 'text')
            .map((part) => part.text)
            .join('')

          return (
            <div
              key={message.id}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {!isUser && <LaiaAvatar size="sm" pulse={false} />}

              <div
                className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  isUser
                    ? 'bg-navy-800 text-white rounded-br-sm'
                    : 'bg-navy-900 border border-white/[0.06] text-white rounded-bl-sm'
                }`}
              >
                {content}
              </div>
            </div>
          )
        })}

        {isLoading && (
          <div className="flex items-start gap-3">
            <LaiaAvatar size="sm" pulse />
            <div className="bg-navy-900 border border-white/[0.06] px-4 py-3 rounded-2xl rounded-bl-sm">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-brand/60 animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-white/[0.06] bg-black/50 backdrop-blur-sm px-4 py-3 pb-safe">
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            const trimmedInput = input.trim()
            if (!trimmedInput) return
            setInput('')
            await sendMessage({ text: trimmedInput })
          }}
          className="flex items-end gap-2"
        >
          <div className="flex-1 bg-navy-800 border border-white/[0.08] rounded-xl focus-within:border-brand/40 transition-colors overflow-hidden">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  e.currentTarget.form?.requestSubmit()
                }
              }}
              placeholder="Pergunte algo à Laia..."
              rows={1}
              aria-label="Mensagem para Laia"
              className="w-full px-4 py-3 bg-transparent text-sm text-white placeholder-[#64748B] focus:outline-none resize-none max-h-32"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            aria-label="Enviar mensagem"
            className="w-10 h-10 rounded-xl bg-brand text-white flex items-center justify-center hover:bg-brand-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
          >
            <Send className="w-4 h-4" aria-hidden="true" />
          </button>
        </form>
      </div>
    </div>
  )
}
