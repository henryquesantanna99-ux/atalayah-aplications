'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { publicAuthMessage, sentinelaReturnUrl } from '@/lib/sentinela/auth'

export default function RecoverPasswordPage() {
  const [message, setMessage] = useState('')
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const email = String(new FormData(event.currentTarget).get('email') ?? '').trim().toLowerCase()
    await createClient().auth.resetPasswordForEmail(email, { redirectTo: sentinelaReturnUrl(window.location.origin, 'recovery') })
    setMessage(publicAuthMessage('recovery'))
  }
  return <main className="min-h-screen bg-slate-950 text-white grid place-items-center p-6"><form onSubmit={submit} className="w-full max-w-md space-y-4 rounded-2xl bg-slate-900 p-8"><h1 className="text-2xl font-semibold">Recuperar senha</h1><input required name="email" type="email" autoComplete="email" placeholder="E-mail" className="w-full rounded-lg bg-slate-950 border border-white/10 p-3" /><button className="w-full rounded-lg bg-cyan-400 p-3 font-semibold text-slate-950">Enviar instruções</button>{message && <p role="status" className="text-sm">{message}</p>}</form></main>
}
