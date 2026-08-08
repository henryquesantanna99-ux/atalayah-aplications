import { ModuleHeader } from '../../_components/module-shell'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
export default function Page() { return <><ModuleHeader eyebrow="Reflexão" title="Diário" description="Registre aquilo que você não quer esquecer. Suas anotações são pessoais."/><form className="sentinela-card rounded-2xl p-6"><label htmlFor="entry" className="text-sm text-slate-400">O que marcou seu dia?</label><Textarea id="entry" className="mt-3 min-h-52 border-white/10 bg-white/5" placeholder="Escreva com liberdade…"/><Button className="mt-4 bg-amber-300 text-slate-950">Guardar no diário</Button></form></> }
