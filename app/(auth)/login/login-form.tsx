'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

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

  async function signInWithRetry(userEmail: string, userPassword: string) {
    let lastError: string | null = null

    for (let attempt = 0; attempt < 4; attempt++) {
      const { error } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: userPassword,
      })

      if (!error) {
        return null
      }

      lastError = error.message
      await wait(700)
    }

    return lastError
  }

  async function handleEmailAuth(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (anyLoading) return

    setEmailLoading(true)

    try {
      const normalizedEmail = email.trim().toLowerCase()
      const normalizedPassword = password

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
          // resposta não-json
        }

        if (!response.ok) {
          toast.error(result.error ?? 'Erro ao criar conta.')
          return
        }

        toast.success('Conta criada com sucesso. Entrando...')
      }

      const loginError = await signInWithRetry(normalizedEmail, normalizedPassword)

      if (loginError) {
        toast.error(`Conta criada, mas o login falhou: ${loginError}`)
        return
      }

      window.location.href = '/dashboard'
    } catch {
      toast.error('Falha de conexão. Tente novamente.')
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
          <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
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
