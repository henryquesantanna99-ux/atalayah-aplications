import { BookOpen, CalendarDays, Check, MessageCircle, Target } from 'lucide-react'
import { ModuleHeader } from '../../_components/module-shell'
import { getOverviewData } from '../../_lib/data'

export default async function OverviewPage() {
  const data = await getOverviewData(); const today = new Date().toISOString().slice(0, 10)
  const week = data.weeks.find((item) => item.starts_on <= today && item.ends_on >= today)
  const phase = data.phases.find((item) => (!item.starts_on || item.starts_on <= today) && (!item.ends_on || item.ends_on >= today))
  const completed = new Set(data.progress.filter((item) => item.official_level_id).map((item) => item.milestone_id))
  return <><ModuleHeader eyebrow={`Temporada ${data.season.name}${week ? ` · Semana ${week.week_number}` : ''}`} title="Continue firme, Sentinela." description={`Fase atual: ${phase?.name ?? 'em preparação'}. Cada pequena escolha desenha o caminho.`}/>
    <section className="grid gap-5 md:grid-cols-2">
      <article className="sentinela-card rounded-3xl p-6"><p className="flex items-center gap-2 text-xs uppercase tracking-widest text-amber-300"><Target/> Missão atual</p><h2 className="mt-4 text-2xl">{data.mission?.title ?? 'Nenhuma missão publicada'}</h2><p className="mt-2 text-slate-400">{data.mission?.description ?? 'A próxima missão aparecerá aqui quando for publicada.'}</p></article>
      <article className="sentinela-card rounded-3xl p-6"><p className="flex items-center gap-2 text-xs text-slate-500"><CalendarDays/> Próximo ensaio</p><h2 className="mt-3 text-xl">{data.rehearsal?.title ?? 'Sem ensaio agendado'}</h2><p className="mt-2 text-sm text-slate-400">{data.rehearsal ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(data.rehearsal.starts_at)) : 'A agenda está em dia.'}</p></article>
      <article className="sentinela-card rounded-3xl p-6 md:col-span-2"><h2>Marcos da temporada</h2><ol className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{data.milestones.map((item, index) => <li className="rounded-xl border border-white/10 p-4" key={item.id}><span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-amber-300">{completed.has(item.id) ? <Check/> : index + 1}</span><span className="mt-2 block text-sm">{item.name}</span></li>)}</ol></article>
      <article className="sentinela-card rounded-2xl p-5"><p className="flex items-center gap-2 text-xs text-blue-300"><BookOpen/> Próxima aula</p><h2 className="mt-3">{data.lesson?.title ?? 'Conteúdo em preparação'}</h2><p className="mt-1 text-sm text-slate-500">{data.lesson?.duration_minutes ? `${data.lesson.duration_minutes} min` : 'Consulte a Academia'}</p></article>
      <article className="sentinela-card rounded-2xl p-5"><p className="flex items-center gap-2 text-xs text-blue-300"><MessageCircle/> Feedback</p><blockquote className="mt-3 text-slate-300">{data.feedback?.body ?? 'Seu mentor ainda não publicou um feedback.'}</blockquote></article>
    </section></>
}
