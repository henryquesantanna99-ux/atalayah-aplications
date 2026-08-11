import { Check, LockKeyhole, MapPin } from 'lucide-react'
import { ModuleHeader } from '../../_components/module-shell'
import { getSentinelaContext } from '../../_lib/data'
import { submitCheckpoint, submitEvidence } from '../../actions'
import { Button } from '@/components/ui/button'

import { JourneyMapLoader } from './journey-map-loader'

export default async function JornadaPage({ searchParams }: { searchParams: Promise<{ map?: string }> }) {
  const { supabase, season, membership } = await getSentinelaContext(); const show3d = (await searchParams).map === '3d'
  const [milestones, checkpoints, progress] = await Promise.all([
    supabase.from('sentinela_milestones').select('*').eq('season_id', season.id).order('position'),
    supabase.from('sentinela_checkpoints').select('*').eq('season_id', season.id).eq('status', 'published'),
    supabase.from('sentinela_checkpoint_progress').select('*').eq('membership_id', membership.id),
  ])
  const levels = new Map((progress.data ?? []).map((item) => [item.checkpoint_id, item.status]))
  return <><ModuleHeader eyebrow="Mapa da temporada" title="Sua Jornada" description="A competência avança por avaliação; concluir aulas não altera automaticamente seus marcos."/>
    <div className="mb-4"><a className="text-sm text-amber-300 underline" href={show3d ? '/sentinela/jornada' : '/sentinela/jornada?map=3d'}>{show3d ? 'Usar mapa acessível' : 'Carregar mapa 3D opcional'}</a></div>
    {show3d ? <JourneyMapLoader milestones={(milestones.data ?? []).map((item) => item.name)}/> : <section className="sentinela-card rounded-3xl p-6"><ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{(milestones.data ?? []).map((item, index) => { const checkpoint = checkpoints.data?.find((point) => point.milestone_id === item.id); const status = checkpoint ? levels.get(checkpoint.id) : undefined
      const checkpointProgress = checkpoint ? progress.data?.find((entry) => entry.checkpoint_id === checkpoint.id) : undefined
      return <li key={item.id} className="rounded-2xl border border-white/10 bg-[#0c1421]/90 p-5"><span className="text-xs text-slate-500">MARCO {String(index + 1).padStart(2, '0')}</span><div className="mt-4 flex justify-between"><h2>{item.name}</h2>{status === 'validated' ? <Check className="text-emerald-300"/> : status === 'submitted' ? <MapPin className="text-amber-300"/> : <LockKeyhole className="text-slate-600"/>}</div>{checkpoint && status !== 'validated' && <form action={submitCheckpoint} className="mt-4"><input type="hidden" name="checkpointId" value={checkpoint.id}/><Button size="sm" variant="outline">{status === 'submitted' ? 'Reenviar checkpoint' : 'Enviar checkpoint'}</Button></form>}{checkpointProgress && status !== 'validated' && <form action={submitEvidence} className="mt-4 space-y-2"><input type="hidden" name="checkpointProgressId" value={checkpointProgress.id}/><input required type="file" name="file" className="block w-full text-xs"/><input name="description" className="w-full rounded border border-white/10 bg-white/5 p-2 text-xs" placeholder="Descrição da evidência"/><Button size="sm" className="bg-amber-300 text-slate-950">Anexar evidência</Button></form>}</li> })}</ol></section>}
  </>
}
