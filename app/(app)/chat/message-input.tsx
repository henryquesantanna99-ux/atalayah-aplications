'use client'

import React, { useEffect, useState, useRef } from 'react'
import { Mic, Send, Sparkles, Square, X } from 'lucide-react'
import { toast } from 'sonner'
import type { ChatMessageWithAuthor } from '@/types/database'

interface MessageInputProps {
  onSend: (content: string) => Promise<void>
  onSendAudio: (blob: Blob) => Promise<void>
  onLaiaCall: (question: string) => Promise<void>
  laiaCallsRemaining: number
  userId: string
  initialText?: string
  replyTo: ChatMessageWithAuthor | null
  onCancelReply: () => void
}

export function MessageInput({
  onSend,
  onSendAudio,
  onLaiaCall,
  laiaCallsRemaining,
  initialText = '',
  replyTo,
  onCancelReply,
}: MessageInputProps) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [recording, setRecording] = useState(false)
  const [showLaiaInput, setShowLaiaInput] = useState(false)
  const [laiaQuestion, setLaiaQuestion] = useState('')
  const [callingLaia, setCallingLaia] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  useEffect(() => {
    if (!initialText) return
    setText(initialText)
    textareaRef.current?.focus()
  }, [initialText])

  async function handleSend() {
    const content = text.trim()
    if (!content || sending) return

    setSending(true)
    setText('')
    try {
      await onSend(content)
    } catch {
      toast.error('Erro ao enviar mensagem.')
      setText(content)
    } finally {
      setSending(false)
    }
  }

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error('Gravação de áudio não suportada neste navegador.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop())
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        if (blob.size === 0) return

        setSending(true)
        try {
          await onSendAudio(blob)
        } catch {
          toast.error('Erro ao enviar áudio.')
        } finally {
          setSending(false)
        }
      }

      recorder.start()
      setRecording(true)
    } catch {
      toast.error('Não foi possível acessar o microfone.')
    }
  }

  function stopRecording() {
    recorderRef.current?.stop()
    recorderRef.current = null
    setRecording(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  async function handleLaiaSubmit() {
    const question = laiaQuestion.trim()
    if (!question) return

    if (laiaCallsRemaining <= 0) {
      toast.error('Você já usou suas 2 chamadas diárias à Laia. Tente amanhã.')
      return
    }

    setCallingLaia(true)
    setLaiaQuestion('')
    setShowLaiaInput(false)
    try {
      await onLaiaCall(question)
    } catch {
      toast.error('Erro ao chamar a Laia.')
    } finally {
      setCallingLaia(false)
    }
  }

  return (
    <div className="space-y-2">
      {replyTo && (
        <div className="flex items-start justify-between gap-3 rounded-card border border-brand/30 bg-brand/10 px-3 py-2 text-sm">
          <div className="min-w-0">
            <p className="text-xs font-medium text-brand">Respondendo</p>
            <p className="truncate text-[#94A3B8]">
              {replyTo.type === 'audio' ? 'Mensagem de áudio' : replyTo.content}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            aria-label="Cancelar resposta"
            className="p-1 text-[#64748B] hover:text-white transition-colors"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Laia call input */}
      {showLaiaInput && (
        <div className="flex gap-2 bg-navy-800 border border-brand/30 rounded-card p-2">
          <input
            type="text"
            value={laiaQuestion}
            onChange={(e) => setLaiaQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLaiaSubmit()}
            placeholder="Faça uma pergunta à Laia..."
            className="flex-1 bg-transparent text-sm text-white placeholder-[#64748B] focus:outline-none"
            autoFocus
            aria-label="Pergunta para a Laia"
          />
          <button
            onClick={handleLaiaSubmit}
            disabled={callingLaia || !laiaQuestion.trim()}
            aria-label="Enviar pergunta"
            className="px-3 py-1 rounded bg-brand text-white text-xs font-medium hover:bg-brand-light transition-colors disabled:opacity-50"
          >
            {callingLaia ? 'Chamando...' : 'Perguntar'}
          </button>
          <button
            onClick={() => setShowLaiaInput(false)}
            aria-label="Cancelar"
            className="px-2 py-1 text-[#64748B] hover:text-white text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main input row */}
      <div className="flex items-end gap-2">
        <div className="flex-1 bg-navy-800 border border-white/[0.08] rounded-xl overflow-hidden focus-within:border-brand/40 transition-colors">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite uma mensagem..."
            rows={1}
            aria-label="Campo de mensagem"
            className="w-full px-4 py-3 bg-transparent text-sm text-white placeholder-[#64748B] focus:outline-none resize-none max-h-32"
            style={{ fieldSizing: 'content' } as React.CSSProperties}
          />
        </div>

        {/* Laia button */}
        <button
          onClick={recording ? stopRecording : startRecording}
          disabled={sending}
          aria-label={recording ? 'Parar gravação' : 'Gravar áudio'}
          className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-colors disabled:opacity-40 ${
            recording
              ? 'bg-red-500/20 border-red-500/40 text-red-300'
              : 'bg-navy-800 border-white/[0.08] text-[#64748B] hover:text-brand hover:border-brand/30'
          }`}
        >
          {recording ? <Square className="w-4 h-4" aria-hidden="true" /> : <Mic className="w-4 h-4" aria-hidden="true" />}
        </button>

        <button
          onClick={() => {
            if (laiaCallsRemaining <= 0) {
              toast.error('Você já usou suas 2 chamadas diárias à Laia. Tente amanhã.')
              return
            }
            setShowLaiaInput((v) => !v)
          }}
          aria-label={`Chamar Laia (${laiaCallsRemaining}/2 chamadas restantes hoje)`}
          className="flex flex-col items-center justify-center w-10 h-10 rounded-xl bg-navy-800 border border-white/[0.08] text-[#64748B] hover:text-brand hover:border-brand/30 transition-colors"
        >
          <Sparkles className="w-4 h-4" aria-hidden="true" />
          <span className="text-[8px] leading-none">{laiaCallsRemaining}/2</span>
        </button>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          aria-label="Enviar mensagem"
          className="w-10 h-10 rounded-xl bg-brand text-white flex items-center justify-center hover:bg-brand-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
        >
          <Send className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
