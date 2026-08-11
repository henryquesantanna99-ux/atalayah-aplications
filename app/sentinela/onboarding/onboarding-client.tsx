'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AvatarEditor } from '../_components/avatar-editor'
import { onboardingScenes } from '../_lib/onboarding-scenes'

const STORAGE_KEY = 'sentinela:onboarding-scene'
function useReducedMotion() { const [reduced, setReduced] = useState(false); useEffect(() => { const media = matchMedia('(prefers-reduced-motion: reduce)'); const change = () => setReduced(media.matches); change(); media.addEventListener('change', change); return () => media.removeEventListener('change', change) }, []); return reduced }

export function OnboardingClient() {
  const router = useRouter(); const reduced = useReducedMotion(); const [index, setIndex] = useState(0); const [characters, setCharacters] = useState(0)
  const scene = onboardingScenes[index]; const complete = characters >= scene.speech.length
  useEffect(() => { const stored = Number(localStorage.getItem(STORAGE_KEY)); if (Number.isInteger(stored) && stored >= 0 && stored < onboardingScenes.length) setIndex(stored) }, [])
  useEffect(() => { localStorage.setItem(STORAGE_KEY, String(index)); setCharacters(reduced ? scene.speech.length : 0) }, [index, reduced, scene.speech])
  useEffect(() => { if (complete) return; const timer = setTimeout(() => setCharacters((n) => n + 1), 26); return () => clearTimeout(timer) }, [characters, complete])
  const progress = useMemo(() => ((index + 1) / onboardingScenes.length) * 100, [index])
  const advance = () => { if (!complete) return setCharacters(scene.speech.length); if (index < onboardingScenes.length - 1) setIndex(index + 1); else { localStorage.removeItem(STORAGE_KEY); router.push('/sentinela/overview') } }
  return <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-5 py-6"><header className="flex items-center gap-4"><span className="text-xs font-semibold tracking-[.25em]">SENTINELA</span><div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label="Progresso do onboarding" aria-valuemin={1} aria-valuemax={onboardingScenes.length} aria-valuenow={index + 1}><div className="h-full bg-amber-300 transition-[width]" style={{ width: `${progress}%` }} /></div><span className="text-xs text-slate-400">{index + 1}/{onboardingScenes.length}</span></header>
    <section className="m-auto w-full max-w-3xl py-12"><scene.icon className="h-9 w-9 text-amber-300"/><p className="mt-6 text-xs uppercase tracking-[.2em] text-blue-300">{scene.step}</p><h1 className="mt-2 text-4xl font-semibold">{scene.title}</h1>
      <button type="button" onClick={() => setCharacters(scene.speech.length)} className="sentinela-focus mt-7 min-h-24 w-full text-left text-xl leading-relaxed text-slate-300" aria-label="Concluir fala"><span aria-hidden="true">{scene.speech.slice(0, characters)}{!complete && <span className="animate-pulse text-amber-300">|</span>}</span><span className="sr-only" aria-live="polite">{scene.speech}</span></button>
      {scene.step === 'registro' && <Input aria-label="Como você quer ser chamado?" placeholder="Seu nome" className="mt-5 h-12 border-white/10 bg-white/5" />}
      {scene.step === 'avatar' && <div className="sentinela-card mt-6 rounded-2xl p-5"><AvatarEditor /></div>}
      {scene.step === 'diagnostico' && <fieldset className="mt-6 grid gap-3 sm:grid-cols-2"><legend className="sr-only">Área a fortalecer</legend>{['Vida com Deus', 'Relacionamentos', 'Serviço e liderança', 'Disciplina e constância'].map((answer) => <label key={answer} className="sentinela-card flex cursor-pointer gap-3 rounded-xl p-4"><input type="radio" name="diagnostico" value={answer}/><span>{answer}</span></label>)}</fieldset>}
    </section><footer className="flex items-center justify-between"><Button variant="ghost" onClick={() => setIndex(Math.max(0, index - 1))} disabled={!index}><ArrowLeft/> Voltar</Button><button className="text-sm text-slate-500 underline" onClick={() => router.push('/sentinela/overview')}>Pular introdução</button><Button onClick={advance} className="bg-amber-300 text-slate-950 hover:bg-amber-200">{complete ? scene.action : 'Mostrar fala'} <ArrowRight/></Button></footer>
  </main>
}
