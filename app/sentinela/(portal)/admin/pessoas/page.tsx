import { ModuleHeader } from '../../../_components/module-shell'
import { getSentinelaContext } from '../../../_lib/data'

export default async function Page() {
  const { supabase, season } = await getSentinelaContext()
  const { data } = await supabase.from('sentinela_memberships').select('id,user_id,role,status,joined_at').eq('season_id', season.id).order('joined_at')
  return <><ModuleHeader eyebrow="Acesso por temporada" title="Pessoas" description="Participantes, mentores e administradores da temporada ativa."/><div className="sentinela-card overflow-x-auto rounded-2xl p-6"><table className="w-full text-left text-sm"><thead><tr className="text-slate-500"><th className="pb-3">Pessoa</th><th>Papel</th><th>Estado</th><th>Entrada</th></tr></thead><tbody>{data?.map((item) => <tr className="border-t border-white/10" key={item.id}><td className="py-3 font-mono text-xs">{item.user_id}</td><td>{item.role}</td><td>{item.status}</td><td>{item.joined_at ? new Date(item.joined_at).toLocaleDateString('pt-BR') : '—'}</td></tr>)}</tbody></table></div></>
}
