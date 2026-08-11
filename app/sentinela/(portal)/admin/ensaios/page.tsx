import { ModuleHeader } from '../../../_components/module-shell'
import { getSentinelaContext } from '../../../_lib/data'

export default async function Page() {
  const { supabase, season } = await getSentinelaContext()
  const [rehearsals, attendance] = await Promise.all([supabase.from('sentinela_rehearsals').select('*').eq('season_id', season.id).order('starts_at'), supabase.from('sentinela_attendance').select('rehearsal_id,status').eq('season_id', season.id)])
  return <><ModuleHeader eyebrow="Cantata" title="Ensaios" description="Agenda e presença dos ensaios da temporada."/><div className="space-y-3">{rehearsals.data?.map((rehearsal) => { const roll = attendance.data?.filter((item) => item.rehearsal_id === rehearsal.id) ?? []; return <article className="sentinela-card rounded-2xl p-5" key={rehearsal.id}><div className="flex justify-between gap-3"><h2>{rehearsal.title}</h2><span className="text-xs text-slate-500">{rehearsal.status}</span></div><p className="mt-2 text-sm">{new Date(rehearsal.starts_at).toLocaleString('pt-BR')} · {rehearsal.location ?? 'Local a definir'}</p><p className="mt-2 text-xs text-slate-500">{roll.filter((item) => ['present','late'].includes(item.status)).length}/{roll.length} presenças</p></article>})}</div></>
}
