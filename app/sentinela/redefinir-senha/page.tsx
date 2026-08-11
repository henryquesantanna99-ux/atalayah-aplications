'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const [message, setMessage] = useState('')
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const password = String(new FormData(event.currentTarget).get('password') ?? '')
    const { error } = await createClient().auth.updateUser({ password })
    if (error) setMessage(error.status === 401 ? 'Sua sessão expirou. Solicite um novo link.' : 'Não foi possível alterar a senha.')
    else { setMessage('Senha alterada.'); window.setTimeout(() => window.location.assign('/sentinela/login'), 800) }
  }
  return <main className="min-h-screen bg-slate-950 text-white grid place-items-center p-6"><form onSubmit={submit} className="w-full max-w-md space-y-4 rounded-2xl bg-slate-900 p-8"><h1 className="text-2xl font-semibold">Definir nova senha</h1><input required minLength={8} name="password" type="password" autoComplete="new-password" placeholder="Nova senha" className="w-full rounded-lg bg-slate-950 border border-white/10 p-3" /><button className="w-full rounded-lg bg-cyan-400 p-3 font-semibold text-slate-950">Salvar senha</button>{message && <p role="status" className="text-sm">{message}</p>}</form></main>
}
