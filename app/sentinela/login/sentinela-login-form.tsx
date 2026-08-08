'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { publicAuthMessage } from '@/lib/sentinela/auth'

export function SentinelaLoginForm() {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true)
    const form = new FormData(event.currentTarget)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: String(form.get('email') ?? '').trim().toLowerCase(), password: String(form.get('password') ?? ''),
    })
    if (error) setMessage(publicAuthMessage('login'))
    else {
      const { error: provisionError } = await supabase.rpc('complete_sentinela_signup')
      if (provisionError) setMessage('Sua sessão expirou. Entre novamente.')
      else window.location.assign('/sentinela/onboarding')
    }
    setLoading(false)
  }
  return <section className="w-full max-w-md space-y-5 rounded-2xl border border-white/10 bg-slate-900 p-8">
    <h1 className="text-2xl font-semibold">Entrar no Sentinela</h1>
    <form onSubmit={submit} className="space-y-4">
      <input required name="email" type="email" autoComplete="email" placeholder="E-mail" className="w-full rounded-lg bg-slate-950 border border-white/10 p-3" />
      <input required name="password" type="password" autoComplete="current-password" placeholder="Senha" className="w-full rounded-lg bg-slate-950 border border-white/10 p-3" />
      <button disabled={loading} className="w-full rounded-lg bg-cyan-400 p-3 font-semibold text-slate-950 disabled:opacity-60">{loading ? 'Entrando…' : 'Entrar'}</button>
    </form>
    {message && <p role="alert" className="text-sm">{message}</p>}
    <div className="flex justify-between text-sm text-cyan-300"><Link href="/sentinela/criar-conta">Criar conta</Link><Link href="/sentinela/recuperar-senha">Esqueci a senha</Link></div>
  </section>
}
