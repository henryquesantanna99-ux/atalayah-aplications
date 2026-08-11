import { ModuleHeader } from '../../../_components/module-shell'
import { getSentinelaContext } from '../../../_lib/data'

export default async function Page() {
  const { supabase, season } = await getSentinelaContext()
  const [squads, members] = await Promise.all([supabase.from('sentinela_squads').select('*').eq('season_id', season.id).order('name'), supabase.from('sentinela_squad_members').select('id,squad_id,membership_id,responsibility_id').eq('season_id', season.id).is('ends_at', null)])
  return <><ModuleHeader eyebrow="Comunidade" title="Squads" description="Composição e responsabilidades válidas somente nesta temporada."/><div className="grid gap-4 md:grid-cols-2">{squads.data?.map((squad) => { const roster = members.data?.filter((item) => item.squad_id === squad.id) ?? []; return <section className="sentinela-card rounded-2xl p-6" key={squad.id}><div className="flex justify-between"><h2>{squad.name}</h2><span className="text-xs text-slate-500">{squad.status}</span></div><p className="mt-3 text-sm">{roster.length} integrante(s)</p><ul className="mt-2 space-y-1 font-mono text-xs text-slate-500">{roster.map((item) => <li key={item.id}>{item.membership_id}</li>)}</ul></section>})}</div></>
}
