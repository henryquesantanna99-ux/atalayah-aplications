'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { publicAuthMessage, sentinelaReturnUrl } from '@/lib/sentinela/auth'

export function SentinelaSignupForm() {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    const form = new FormData(event.currentTarget)
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email: String(form.get('email') ?? '').trim().toLowerCase(),
      password: String(form.get('password') ?? ''),
      options: { emailRedirectTo: sentinelaReturnUrl(window.location.origin, 'signup') },
    })

    if (!error && data.session) {
      const { error: provisionError } = await supabase.rpc('complete_sentinela_signup')
      if (!provisionError) window.location.assign('/sentinela/onboarding')
      else setMessage('Não foi possível concluir o cadastro. Entre novamente para continuar.')
    } else {
      // The same response covers confirmation-required and existing-email cases.
      setMessage(error?.status === 422 && /password/i.test(error.message)
        ? 'A senha não atende aos requisitos de segurança.'
        : publicAuthMessage('signup'))
    }
    setLoading(false)
  }

  return <section className="w-full max-w-md space-y-5 rounded-2xl border border-white/10 bg-slate-900 p-8">
    <h1 className="text-2xl font-semibold">Criar conta Sentinela</h1>
    <p className="text-sm text-slate-300">Cadastro seguro com e-mail e senha.</p>
    <form onSubmit={submit} className="space-y-4">
      <input required name="email" type="email" autoComplete="email" placeholder="E-mail" className="w-full rounded-lg bg-slate-950 border border-white/10 p-3" />
      <input required minLength={8} name="password" type="password" autoComplete="new-password" placeholder="Senha" className="w-full rounded-lg bg-slate-950 border border-white/10 p-3" />
      <button disabled={loading} className="w-full rounded-lg bg-cyan-400 p-3 font-semibold text-slate-950 disabled:opacity-60">{loading ? 'Criando…' : 'Criar conta'}</button>
    </form>
    {message && <p role="status" className="text-sm text-slate-200">{message}</p>}
    <Link href="/sentinela/login" className="block text-sm text-cyan-300">Já tenho uma conta</Link>
  </section>
}
