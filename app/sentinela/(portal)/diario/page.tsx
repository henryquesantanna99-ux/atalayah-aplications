import { ModuleHeader } from '../../_components/module-shell'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { getSentinelaContext } from '../../_lib/data'
import { saveJournalEntry } from '../../actions'

export default async function Page() {
  const { supabase, membership } = await getSentinelaContext()
  const { data: entries } = await supabase.from('sentinela_journal_entries').select('*').eq('membership_id', membership.id).order('created_at', { ascending: false })
  return <><ModuleHeader eyebrow="Reflexão privada" title="Diário" description="Seus registros são persistidos e visíveis somente para você e para a equipe autorizada da temporada."/>
    <form action={saveJournalEntry} className="sentinela-card rounded-2xl p-6"><input name="title" className="w-full rounded-lg border border-white/10 bg-white/5 p-3" placeholder="Título (opcional)"/><Textarea name="body" required className="mt-3 min-h-40 border-white/10 bg-white/5" placeholder="Escreva com liberdade…"/><Button className="mt-4 bg-amber-300 text-slate-950">Guardar no diário</Button></form>
    <div className="mt-6 space-y-3">{entries?.map((entry) => <article key={entry.id} className="sentinela-card rounded-2xl p-5"><p className="text-xs text-slate-500">{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(entry.created_at))}</p>{entry.title && <h2 className="mt-2">{entry.title}</h2>}<p className="mt-2 whitespace-pre-wrap text-slate-300">{entry.body}</p></article>)}</div></>
}
