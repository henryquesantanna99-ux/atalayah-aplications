'use client'
import { Button } from '@/components/ui/button'
export default function ErrorState({ reset }: { reset: () => void }) { return <main className="grid min-h-[60vh] place-items-center text-center"><div><p className="text-sm uppercase tracking-widest text-amber-300">Algo interrompeu o caminho</p><h1 className="mt-3 text-3xl">Não foi possível carregar este módulo.</h1><p className="mt-2 text-slate-400">Sua jornada continua segura. Tente novamente.</p><Button onClick={reset} className="mt-6 bg-amber-300 text-slate-950">Tentar novamente</Button></div></main> }
