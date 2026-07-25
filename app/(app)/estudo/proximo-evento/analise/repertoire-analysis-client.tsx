'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { calculateAnalysis, PREPARATION_STAGES, type PreparationStage } from '@/lib/repertoire-analysis'
import { updateManualAnalysis, updatePreparationStage } from './actions'

export interface RepertoireOption { id: string; title: string; date: string }
export interface AnalysisItem {
  id: string; title: string; artist: string | null; recency: number; mastery: number; rotation: number
  complexity: number; changes: number; strategicWeight: number; ici: number; ico: number; ip: number
  preparationLevel: string; stage: PreparationStage
}

const stageLabels: Record<PreparationStage, string> = {
  escuta: 'Escuta', mapeamento_escrita: 'Mapeamento e Escrita',
  memorizacao_tecnica: 'Memorização Técnica', ensaio_passagem: 'Ensaio e Passagem',
  pronta_ministracao: 'Pronta para Ministração',
}
const manualFields = [
  ['mastery', 'Domínio'], ['complexity', 'Complexidade'], ['changes', 'Mudanças'], ['strategicWeight', 'Peso estratégico'],
] as const

export function RepertoireAnalysisClient({ repertoires, selectedId, initialItems, isAdmin }: {
  repertoires: RepertoireOption[]; selectedId: string; initialItems: AnalysisItem[]; isAdmin: boolean
}) {
  const router = useRouter()
  const [items, setItems] = useState(initialItems)
  const [pending, startTransition] = useTransition()
  useEffect(() => setItems(initialItems), [selectedId, initialItems])

  function chooseRepertoire(id: string) {
    startTransition(() => router.push(`/estudo/proximo-evento/analise?repertorio=${id}`))
  }

  async function saveManual(item: AnalysisItem, field: typeof manualFields[number][0], value: number) {
    if (!Number.isFinite(value) || value < 0 || value > 10) return toast.error('Use um valor entre 0 e 10.')
    const updated = { ...item, [field]: value }
    try {
      await updateManualAnalysis({
        setlistSongId: item.id, mastery: updated.mastery, complexity: updated.complexity,
        changes: updated.changes, strategicWeight: updated.strategicWeight,
      })
      setItems((current) => current.map((entry) => entry.id === item.id
        ? { ...updated, ...calculateAnalysis(updated) } : entry))
      toast.success('Análise atualizada.')
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível salvar.') }
  }

  async function move(item: AnalysisItem, stage: PreparationStage) {
    if (stage === item.stage || !isAdmin) return
    try {
      await updatePreparationStage(item.id, stage)
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, stage } : entry))
      toast.success(`${item.title} movida para ${stageLabels[stage]}.`)
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível mover.') }
  }

  return <main className="space-y-8 p-4 sm:p-6">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-[260px] flex-1 sm:max-w-xl">
        <label htmlFor="repertoire" className="mb-2 block text-sm font-semibold text-slate-200">Repertório</label>
        <select id="repertoire" value={selectedId} onChange={(event) => chooseRepertoire(event.target.value)}
          className="h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-sm text-white focus:border-cyan-400 focus:outline-none">
          {repertoires.length === 0 && <option value="">Nenhum repertório disponível</option>}
          {repertoires.map((event) => <option key={event.id} value={event.id}>
            {event.title} — {new Date(`${event.date}T00:00:00`).toLocaleDateString('pt-BR')}
          </option>)}
        </select>
      </div>
      <Link href="/estudo/proximo-evento" className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/10 px-4 text-sm text-slate-300 hover:text-white">
        <ChevronLeft className="h-4 w-4" /> Voltar ao evento
      </Link>
    </div>

    {pending ? <div className="flex justify-center py-20"><Loader2 className="h-7 w-7 animate-spin text-cyan-300" aria-label="Carregando repertório" /></div> : <>
      <section aria-labelledby="analysis-heading" className="overflow-hidden rounded-2xl border border-white/[0.08] bg-slate-950/70">
        <div className="border-b border-white/[0.08] p-4"><h2 id="analysis-heading" className="font-bold text-white">Indicadores de preparação</h2>
          <p className="mt-1 text-xs text-slate-400">Campos com ✎ são manuais (0–10). Recência, rotatividade e índices são calculados automaticamente.</p></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[1250px] text-left text-sm">
          <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400"><tr>
            {['Música', 'Recência', 'Domínio ✎', 'Rotatividade', 'Complexidade ✎', 'Mudanças ✎', 'Peso estratégico ✎', 'ICI', 'ICO', 'IP', 'Nível de preparação'].map((label) => <th key={label} className="px-3 py-3">{label}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-white/[0.06]">{items.map((item) => <tr key={item.id} className="text-slate-200">
            <td className="px-3 py-3"><strong className="block text-white">{item.title}</strong><span className="text-xs text-slate-500">{item.artist}</span></td>
            <Metric value={item.recency} /><Editable item={item} field="mastery" disabled={!isAdmin} save={saveManual} />
            <Metric value={item.rotation} /><Editable item={item} field="complexity" disabled={!isAdmin} save={saveManual} />
            <Editable item={item} field="changes" disabled={!isAdmin} save={saveManual} /><Editable item={item} field="strategicWeight" disabled={!isAdmin} save={saveManual} />
            <Metric value={item.ici} /><Metric value={item.ico} /><td className="px-3 py-3 font-bold text-cyan-300">{item.ip.toFixed(1)}</td>
            <td className="px-3 py-3"><span className="rounded-full bg-white/[0.07] px-2.5 py-1 text-xs">{item.preparationLevel}</span></td>
          </tr>)}</tbody>
        </table></div>
        {items.length === 0 && <p className="p-10 text-center text-slate-400">Este repertório ainda não possui músicas.</p>}
      </section>

      <section aria-labelledby="kanban-heading"><div className="mb-4"><h2 id="kanban-heading" className="text-lg font-bold text-white">Fluxo de preparação</h2>
        <p className="text-sm text-slate-400">Use os botões anterior/próximo ou o menu de estágio em cada card.</p></div>
        <div className="grid gap-4 xl:grid-cols-5">{PREPARATION_STAGES.map((stage) => <div key={stage} className="min-h-48 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3">
          <h3 className="mb-3 text-sm font-bold text-slate-200">{stageLabels[stage]} <span className="text-slate-500">({items.filter((item) => item.stage === stage).length})</span></h3>
          <div className="space-y-3">{items.filter((item) => item.stage === stage).map((item) => {
            const index = PREPARATION_STAGES.indexOf(stage)
            return <article key={item.id} className="rounded-xl border border-white/[0.08] bg-slate-950 p-3 shadow-lg">
              <h4 className="font-semibold text-white">{item.title}</h4>
              <div className="my-3 flex gap-2 text-xs"><Badge label="IP" value={item.ip} /><Badge label="ICI" value={item.ici} /><Badge label="ICO" value={item.ico} /></div>
              <label className="sr-only" htmlFor={`stage-${item.id}`}>Estágio de {item.title}</label>
              <select id={`stage-${item.id}`} value={stage} disabled={!isAdmin} onChange={(event) => move(item, event.target.value as PreparationStage)} className="w-full rounded-lg border border-white/10 bg-slate-900 p-2 text-xs text-slate-200 disabled:opacity-60">
                {PREPARATION_STAGES.map((option) => <option key={option} value={option}>{stageLabels[option]}</option>)}
              </select>
              <div className="mt-2 flex justify-between">
                <button disabled={!isAdmin || index === 0} onClick={() => move(item, PREPARATION_STAGES[index - 1])} aria-label={`Mover ${item.title} para o estágio anterior`} className="rounded-lg p-2 text-slate-400 hover:bg-white/10 disabled:opacity-20"><ChevronLeft className="h-4 w-4" /></button>
                <button disabled={!isAdmin || index === PREPARATION_STAGES.length - 1} onClick={() => move(item, PREPARATION_STAGES[index + 1])} aria-label={`Mover ${item.title} para o próximo estágio`} className="rounded-lg p-2 text-slate-400 hover:bg-white/10 disabled:opacity-20"><ChevronRight className="h-4 w-4" /></button>
              </div>
            </article>
          })}</div>
        </div>)}</div>
      </section>
    </>}
  </main>
}

function Metric({ value }: { value: number }) { return <td className="px-3 py-3 font-mono">{value.toFixed(1)}</td> }
function Badge({ label, value }: { label: string; value: number }) { return <span className="rounded-md bg-cyan-300/10 px-2 py-1 text-cyan-200">{label} {value.toFixed(1)}</span> }
function Editable({ item, field, disabled, save }: { item: AnalysisItem; field: typeof manualFields[number][0]; disabled: boolean; save: (item: AnalysisItem, field: typeof manualFields[number][0], value: number) => void }) {
  return <td className="px-3 py-3"><input aria-label={`${manualFields.find(([key]) => key === field)?.[1]} de ${item.title}`} type="number" min="0" max="10" step="0.5" defaultValue={item[field]} disabled={disabled} onBlur={(event) => save(item, field, event.currentTarget.valueAsNumber)} className="w-16 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 font-mono text-white focus:border-cyan-400 focus:outline-none disabled:border-transparent disabled:bg-transparent" /></td>
}
