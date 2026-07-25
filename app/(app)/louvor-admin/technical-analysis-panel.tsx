'use client'

import { useMemo, useState, useTransition } from 'react'
import { CheckCircle2, Info, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { calculateICI, MUSICAL_DIMENSIONS, type MusicalDimension, type MusicalScores } from '@/lib/worship-musical-analysis'
import { revisarAnaliseTecnica, salvarAnaliseTecnica } from './technical-analysis-actions'

type CatalogSong = { songId: string; title: string; artist: string | null }
type Analysis = { id: string; song_id: string; version: number; status: string; scores: MusicalScores; ici_score: number; ico_score: number; created_at: string; reviewed_at: string | null }
const details: Record<MusicalDimension, { label: string; hint: string }> = {
  melodic: { label: 'Melódica', hint: 'Extensão, saltos e previsibilidade da linha.' },
  harmonic: { label: 'Harmônica', hint: 'Acordes, modulações e condução de vozes.' },
  rhythmic: { label: 'Rítmica', hint: 'Síncopes, subdivisões e estabilidade do pulso.' },
  technical: { label: 'Técnica', hint: 'Execução instrumental e vocal exigida.' },
  structural: { label: 'Estrutural', hint: 'Seções, transições e forma da música.' },
  interpretative: { label: 'Interpretativa', hint: 'Dinâmica, intenção e nuances.' },
  collective: { label: 'Coletiva', hint: 'Encaixe, comunicação e coordenação da equipe.' },
}
const initialScores = Object.fromEntries(MUSICAL_DIMENSIONS.map((key) => [key, 1])) as MusicalScores

export function TechnicalAnalysisPanel({ catalog, analyses }: { catalog: CatalogSong[]; analyses: Analysis[] }) {
  const canonicalCatalog = useMemo(() => Array.from(new Map(catalog.map((song) => [song.songId, song])).values()), [catalog])
  const [songId, setSongId] = useState(canonicalCatalog[0]?.songId ?? '')
  const [scores, setScores] = useState<MusicalScores>(initialScores)
  const [isPending, startTransition] = useTransition()
  const history = analyses.filter((item) => item.song_id === songId)
  const previewICI = calculateICI(scores)

  function save() {
    startTransition(async () => {
      const response = await salvarAnaliseTecnica({ songId, scores })
      if (response.success) toast.success(response.message)
      else toast.error(response.message)
    })
  }
  function review(id: string) {
    startTransition(async () => {
      const response = await revisarAnaliseTecnica(id)
      if (response.success) toast.success(response.message)
      else toast.error(response.message)
    })
  }

  return <section className="space-y-5">
    <div className="rounded-2xl border border-white/[0.08] bg-navy-900 p-5">
      <Badge className="border-brand/20 bg-brand/15 text-brand hover:bg-brand/15">Análise Técnica</Badge>
      <h2 className="mt-3 text-xl font-bold text-white">Complexidade musical e prontidão da equipe</h2>
      <p className="mt-1 text-sm text-[#94A3B8]">Avalie a música canônica. 1 indica baixa exigência; 3, alta exigência.</p>
      <div className="mt-5"><Label>Música do catálogo</Label><Select value={songId} onValueChange={setSongId}><SelectTrigger className="mt-2 h-11 border-white/10 bg-black/20 text-white"><SelectValue placeholder="Selecione uma música" /></SelectTrigger><SelectContent>{canonicalCatalog.map((song) => <SelectItem key={song.songId} value={song.songId}>{song.title}{song.artist ? ` — ${song.artist}` : ''}</SelectItem>)}</SelectContent></Select></div>
    </div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {MUSICAL_DIMENSIONS.map((dimension) => <article key={dimension} className="rounded-xl border border-white/[0.08] bg-navy-900 p-4">
        <div className="flex items-center gap-2"><h3 className="font-semibold text-white">{details[dimension].label}</h3><span title={details[dimension].hint} aria-label={details[dimension].hint}><Info className="h-4 w-4 text-[#94A3B8]" /></span></div>
        <p className="mt-1 text-xs text-[#94A3B8]">{details[dimension].hint}</p>
        <div className="mt-4 grid grid-cols-3 gap-2">{[1, 2, 3].map((value) => <Button key={value} type="button" variant={scores[dimension] === value ? 'default' : 'outline'} onClick={() => setScores((current) => ({ ...current, [dimension]: value }))} className={scores[dimension] === value ? 'bg-brand hover:bg-brand/90' : 'border-white/10 bg-transparent text-white hover:bg-white/10'}>{value}</Button>)}</div>
      </article>)}
    </div>
    <div className="flex flex-col gap-4 rounded-2xl border border-brand/20 bg-brand/10 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div><p className="text-sm text-[#CBD5E1]">ICI preliminar</p><p className="text-3xl font-bold text-white">{previewICI}<span className="text-base text-[#94A3B8]">/100</span></p><p className="mt-1 text-xs text-[#94A3B8]">O ICO (0–100) será calculado com o perfil técnico vigente da equipe.</p></div>
      <Button disabled={isPending || !songId} onClick={save} className="bg-brand hover:bg-brand/90"><Save className="h-4 w-4" />Salvar nova versão</Button>
    </div>
    <div className="rounded-2xl border border-white/[0.08] bg-navy-900 p-5"><h3 className="font-bold text-white">Histórico de versões</h3><div className="mt-3 space-y-2">{history.map((item) => <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-white/10 bg-black/20 p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-white">Versão {item.version} · ICI {item.ici_score}/100 · ICO {item.ico_score}/100</p><p className="text-xs text-[#94A3B8]">{new Date(item.created_at).toLocaleString('pt-BR')} · {item.status === 'reviewed' ? 'Revisada' : 'Rascunho'}</p></div>{item.status === 'draft' && <Button size="sm" variant="outline" disabled={isPending} onClick={() => review(item.id)} className="border-white/10 bg-transparent text-white hover:bg-white/10"><CheckCircle2 className="h-4 w-4" />Revisar</Button>}</div>)}{history.length === 0 && <p className="text-sm text-[#94A3B8]">Nenhuma versão para esta música.</p>}</div></div>
  </section>
}
