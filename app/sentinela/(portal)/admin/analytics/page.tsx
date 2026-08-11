import { ModuleHeader } from '../../../_components/module-shell'
import { getSentinelaContext } from '../../../_lib/data'

export default async function Page() {
  const { supabase, season } = await getSentinelaContext()
  const [people, lessons, checkpoints, missions] = await Promise.all([supabase.from('sentinela_memberships').select('id', { count: 'exact', head: true }).eq('season_id', season.id).eq('status', 'active'), supabase.from('sentinela_education_progress').select('status').eq('season_id', season.id), supabase.from('sentinela_checkpoint_progress').select('status').eq('season_id', season.id), supabase.from('sentinela_mission_assignments').select('status').eq('season_id', season.id)])
  const cards = [['Pessoas ativas', people.count ?? 0], ['Aulas concluídas', lessons.data?.filter((item) => item.status === 'completed').length ?? 0], ['Checkpoints validados', checkpoints.data?.filter((item) => item.status === 'validated').length ?? 0], ['Missões concluídas', missions.data?.filter((item) => item.status === 'completed').length ?? 0]]
  return <><ModuleHeader eyebrow="Indicadores" title="Analytics" description="Leitura operacional agregada e restrita à temporada ativa."/><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{cards.map(([label, value]) => <article className="sentinela-card rounded-2xl p-6" key={label}><p className="text-sm text-slate-500">{label}</p><strong className="mt-2 block text-3xl text-amber-300">{value}</strong></article>)}</div></>
}
