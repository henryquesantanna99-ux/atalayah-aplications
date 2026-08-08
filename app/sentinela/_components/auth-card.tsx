import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const copy = {
  entrar: { eyebrow: 'Bem-vindo de volta', title: 'Retome sua jornada', description: 'Entre para continuar de onde parou.', submit: 'Entrar no Sentinela' },
  criar: { eyebrow: 'Seu chamado começa aqui', title: 'Crie sua conta', description: 'Prepare seu perfil para viver esta temporada.', submit: 'Responder ao chamado' },
  esqueci: { eyebrow: 'Recupere seu acesso', title: 'Esqueci minha senha', description: 'Enviaremos um caminho seguro para o seu e-mail.', submit: 'Enviar link' },
  redefinir: { eyebrow: 'Um novo começo', title: 'Redefina sua senha', description: 'Escolha uma senha forte para proteger sua jornada.', submit: 'Salvar nova senha' },
} as const

export function AuthCard({ mode }: { mode: keyof typeof copy }) {
  const item = copy[mode]; const password = mode === 'entrar' || mode === 'criar' || mode === 'redefinir'
  return <main className="grid min-h-screen place-items-center px-5 py-12"><section className="sentinela-card w-full max-w-md rounded-3xl p-7 sm:p-10">
    <Link href="/sentinela" className="text-xs font-semibold uppercase tracking-[.3em] text-amber-300">Sentinela</Link>
    <p className="mt-10 text-xs uppercase tracking-[.2em] text-[var(--sentinela-blue)]">{item.eyebrow}</p><h1 className="mt-3 text-3xl font-semibold">{item.title}</h1><p className="mt-2 text-sm text-[var(--sentinela-muted)]">{item.description}</p>
    <form className="mt-8 space-y-5"><div><Label htmlFor="email">E-mail</Label><Input id="email" type="email" required autoComplete="email" className="mt-2 border-white/10 bg-white/5" /></div>{password && <div><Label htmlFor="password">Senha</Label><Input id="password" type="password" required autoComplete={mode === 'entrar' ? 'current-password' : 'new-password'} className="mt-2 border-white/10 bg-white/5" /></div>}<Button className="sentinela-focus h-11 w-full bg-amber-300 text-slate-950 hover:bg-amber-200">{item.submit}</Button></form>
    <div className="mt-6 flex justify-between text-sm text-slate-400">{mode === 'entrar' ? <><Link href="/sentinela/esqueci-senha">Esqueci a senha</Link><Link href="/sentinela/criar-conta">Criar conta</Link></> : <Link href="/sentinela/entrar">Voltar para entrar</Link>}</div>
  </section></main>
}
