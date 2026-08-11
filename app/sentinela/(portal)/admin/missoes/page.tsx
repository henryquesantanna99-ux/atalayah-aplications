import { ModuleHeader } from '../../../_components/module-shell'
import { getSentinelaContext } from '../../../_lib/data'

export default async function Page() {
  const { supabase, season } = await getSentinelaContext()
  const [missions, assignments] = await Promise.all([supabase.from('sentinela_missions').select('*').eq('season_id', season.id).order('due_at'), supabase.from('sentinela_mission_assignments').select('mission_id,status').eq('season_id', season.id)])
  return <><ModuleHeader eyebrow="Prática" title="Missões" description="Publicação, prazo e entregas da temporada."/><div className="space-y-3">{missions.data?.map((mission) => { const delivery = assignments.data?.filter((item) => item.mission_id === mission.id) ?? []; return <article className="sentinela-card rounded-2xl p-5" key={mission.id}><div className="flex flex-wrap justify-between gap-2"><h2>{mission.title}</h2><span className="text-xs text-slate-500">{mission.status} · {mission.assignment_mode}</span></div><p className="mt-2 text-sm text-slate-400">{mission.description}</p><p className="mt-3 text-xs">{delivery.filter((item) => ['submitted','completed'].includes(item.status)).length}/{delivery.length} entregas · prazo {mission.due_at ? new Date(mission.due_at).toLocaleDateString('pt-BR') : 'aberto'}</p></article>})}</div></>
}
