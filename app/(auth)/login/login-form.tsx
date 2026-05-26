'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export function LoginForm() {
  const [emailLoading, setEmailLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [isRegisterMode, setIsRegisterMode] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const supabase = createClient()

  const anyLoading = emailLoading || googleLoading

  async function handleGoogleLogin() {
    if (anyLoading) return

    setGoogleLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      toast.error('Erro ao iniciar login com Google. Tente novamente.')
      setGoogleLoading(false)
    }
  }

  async function handleEmailAuth(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (anyLoading) return

    setEmailLoading(true)

    try {
      const normalizedEmail = email.trim().toLowerCase()
      const normalizedPassword = password.trim()

      if (!normalizedEmail || !normalizedPassword) {
        toast.error('Informe e-mail e senha.')
        return
      }

      if (isRegisterMode) {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: normalizedEmail,
            password: normalizedPassword,
            fullName: fullName.trim() || null,
          }),
        })

        let result: { error?: string } = {}
        try {
          result = await response.json()
        } catch {
          // resposta não-JSON
        }

        if (!response.ok) {
          toast.error(result.error ?? 'Erro ao criar conta. Verifique as configurações do servidor.')
          return
        }

        toast.success('Conta criada com sucesso. Entrando...')
      }

      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: normalizedPassword,
      })

      if (loginError) {
        toast.error(loginError.message)
        return
      }

      window.location.href = '/dashboard'
    } catch {
      toast.error('Falha de conexão ao criar/entrar. Tente novamente.')
    } finally {
      setEmailLoading(false)
    }
  }

  return (
    <div className="bg-navy-900 border border-white/[0.06] rounded-modal p-8 space-y-6">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-white">Entrar na plataforma</h2>
        <p className="text-sm text-[#94A3B8] mt-1">Use seu acesso do ministério</p>
      </div>

      <form className="space-y-3" onSubmit={handleEmailAuth}>
        {isRegisterMode && (
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Nome completo (opcional)"
            className="w-full px-3 py-2 rounded-card bg-black/40 border border-white/10 text-white text-sm placeholder:text-[#64748B] focus:outline-none focus:border-brand/60"
          />
        )}

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Seu e-mail"
          autoComplete="email"
          className="w-full px-3 py-2 rounded-card bg-black/40 border border-white/10 text-white text-sm placeholder:text-[#64748B] focus:outline-none focus:border-brand/60"
        />

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Sua senha"
          autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
          className="w-full px-3 py-2 rounded-card bg-black/40 border border-white/10 text-white text-sm placeholder:text-[#64748B] focus:outline-none focus:border-brand/60"
        />

        <button
          type="submit"
          disabled={anyLoading}
          className="w-full px-4 py-3 rounded-card bg-brand text-black font-semibold text-sm transition-all duration-200 hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {emailLoading
            ? 'Processando...'
            : isRegisterMode
              ? 'Criar conta e entrar'
              : 'Entrar com e-mail'}
        </button>
      </form>

      <div className="flex items-center gap-3 text-xs text-[#64748B]">
        <div className="h-px bg-white/10 flex-1" />
        ou
        <div className="h-px bg-white/10 flex-1" />
      </div>

      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={anyLoading}
        aria-label="Entrar com Google"
        className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-card bg-white text-gray-900 font-medium text-sm transition-all duration-200 hover:bg-gray-100 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {googleLoading ? (
          <div className="w-5 h-5 border-2 border-gray-400 border-t-gray-900 rounded-full animate-spin" />
        ) : (
          <span>G</span>
        )}
        {googleLoading ? 'Redirecionando...' : 'Entrar com Google'}
      </button>

      <button
        type="button"
        onClick={() => setIsRegisterMode((current) => !current)}
        disabled={anyLoading}
        className="w-full text-xs text-[#94A3B8] hover:text-white transition-colors disabled:opacity-60"
      >
        {isRegisterMode
          ? 'Já tenho conta. Quero entrar com senha'
          : 'Não tenho conta. Quero criar e entrar'}
      </button>
    </div>
  )
}
