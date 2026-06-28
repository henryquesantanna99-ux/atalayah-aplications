'use client'

import { useMemo, useState, useTransition } from 'react'
import { CheckCircle2, ExternalLink, Music2, Plus, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { atualizarMusicaVotacao, atualizarStatusIndicacao, enviarMusicaParaVotacao } from './actions'

type Suggestion = {
  id: string
  created_at: string
  name: string
  tribe: string
  phone: string | null
  song_title: string
  artist: string | null
  youtube_link: string | null
  suggested_category: string | null
  worship_type: string | null
  reason: string | null
  spiritual_area: string | null
  spiritual_area_other: string | null
  spiritual_experience_note: string | null
  next_step: string | null
  next_step_other: string | null
  status: string
}

type VotingSong = {
  id: string
  song_title: string
  artist: string | null
  youtube_link: string | null
  category: string
  status: string
  worship_type: string
  open_for_voting: boolean
  votes: number
  average_rating: number | null
}

type CatalogSong = {
  id: string
  title: string
  artist: string | null
  youtubeLink: string | null
  moment: string | null
}

const moments = ['Prévia', 'Adoração', 'Palavra', 'Celebração']
const worshipTypes = ['Sacerdotal', 'Profético', 'Ambos']
const songStatuses = ['Aprovada', 'Em teste', 'Repertório oficial', 'Pausada', 'Reprovada', 'Em análise', 'Necessita validação pastoral']
const suggestionStatuses = ['Sugerida', 'Em análise', 'Aprovada', 'Em teste', 'Repertório oficial', 'Pausada', 'Reprovada', 'Necessita validação pastoral']

export function LouvorAdminClient({
  suggestions,
  votingSongs,
  catalog,
}: {
  suggestions: Suggestion[]
  votingSongs: VotingSong[]
  catalog: CatalogSong[]
}) {
  const [isPending, startTransition] = useTransition()
  const [selectedCatalogId, setSelectedCatalogId] = useState('manual')
  const selectedCatalog = useMemo(() => catalog.find((song) => song.id === selectedCatalogId), [catalog, selectedCatalogId])
  const [form, setForm] = useState({ songTitle: '', artist: '', youtubeLink: '', category: 'Adoração', worshipType: 'Ambos', theme: '' })

  function submitSong(event: React.FormEvent) {
    event.preventDefault()
    const source = selectedCatalog
    startTransition(async () => {
      const response = await enviarMusicaParaVotacao({
        catalogVariationId: source?.id,
        songTitle: source?.title ?? form.songTitle,
        artist: source?.artist ?? form.artist,
        youtubeLink: source?.youtubeLink ?? form.youtubeLink,
        category: form.category,
        worshipType: form.worshipType,
        theme: form.theme,
      })
      if (response.success) {
        toast.success(response.message)
      } else {
        toast.error(response.message)
      }
    })
  }

  function updateVotingSong(song: VotingSong, patch: Partial<VotingSong>) {
    startTransition(async () => {
      const next = { ...song, ...patch }
      const response = await atualizarMusicaVotacao(song.id, {
        category: next.category,
        status: next.status,
        worshipType: next.worship_type,
        openForVoting: next.open_for_voting,
      })
      if (response.success) {
        toast.success(response.message)
      } else {
        toast.error(response.message)
      }
    })
  }

  function updateSuggestion(id: string, status: string) {
    startTransition(async () => {
      const response = await atualizarStatusIndicacao(id, status)
      if (response.success) {
        toast.success(response.message)
      } else {
        toast.error(response.message)
      }
    })
  }

  return <div className="space-y-6">
    <section className="rounded-2xl border border-white/[0.08] bg-navy-900 p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-brand/15 p-3 text-brand"><Plus className="h-5 w-5" /></div>
        <div>
          <h2 className="text-xl font-bold text-white">Enviar música para votação pública</h2>
          <p className="mt-1 text-sm text-[#94A3B8]">Somente músicas liberadas aqui aparecem em /louvor. Escolha o momento do culto antes de abrir a votação.</p>
        </div>
      </div>
      <form onSubmit={submitSong} className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="lg:col-span-2"><Label>Selecionar música do catálogo</Label><Select value={selectedCatalogId} onValueChange={setSelectedCatalogId}><SelectTrigger className="mt-2 h-11 bg-black/20 border-white/10 text-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="manual">Cadastrar manualmente</SelectItem>{catalog.map((song) => <SelectItem key={song.id} value={song.id}>{song.title} {song.artist ? `— ${song.artist}` : ''}</SelectItem>)}</SelectContent></Select></div>
        {!selectedCatalog && <><Field label="Nome da música" value={form.songTitle} onChange={(songTitle) => setForm({ ...form, songTitle })} /><Field label="Artista / referência" value={form.artist} onChange={(artist) => setForm({ ...form, artist })} /><Field label="Link do YouTube" value={form.youtubeLink} onChange={(youtubeLink) => setForm({ ...form, youtubeLink })} /></>}
        <SelectField label="Momento do culto" value={form.category} options={moments} onChange={(category) => setForm({ ...form, category })} />
        <SelectField label="Tipo de louvor" value={form.worshipType} options={worshipTypes} onChange={(worshipType) => setForm({ ...form, worshipType })} />
        <Field label="Tema" value={form.theme} onChange={(theme) => setForm({ ...form, theme })} />
        <Button disabled={isPending} className="h-11 bg-brand hover:bg-brand/90 lg:self-end"><CheckCircle2 className="h-4 w-4" />Abrir para votação</Button>
      </form>
    </section>

    <section className="rounded-2xl border border-white/[0.08] bg-navy-900 p-5">
      <h2 className="text-xl font-bold text-white">Músicas configuradas para votação</h2>
      <div className="mt-4 grid gap-3">
        {votingSongs.map((song) => <article key={song.id} className="rounded-xl border border-white/[0.08] bg-black/20 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div><h3 className="font-semibold text-white">{song.song_title}</h3><p className="text-sm text-[#94A3B8]">{song.artist || 'Sem referência'} · {song.votes ?? 0} votos · nota média {song.average_rating ?? '-'}</p></div>
            <Badge className={song.open_for_voting ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20' : 'bg-white/10 text-[#CBD5E1]'}>{song.open_for_voting ? 'Aberta para votação' : 'Fechada'}</Badge>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <Select value={song.category} onValueChange={(category) => updateVotingSong(song, { category })}><SelectTrigger className="bg-black/20 border-white/10 text-white"><SelectValue /></SelectTrigger><SelectContent>{moments.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
            <Select value={song.worship_type} onValueChange={(worship_type) => updateVotingSong(song, { worship_type })}><SelectTrigger className="bg-black/20 border-white/10 text-white"><SelectValue /></SelectTrigger><SelectContent>{worshipTypes.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
            <Select value={song.status} onValueChange={(status) => updateVotingSong(song, { status })}><SelectTrigger className="bg-black/20 border-white/10 text-white"><SelectValue /></SelectTrigger><SelectContent>{songStatuses.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
            <Button type="button" variant="outline" className="border-white/10 bg-transparent text-white hover:bg-white/10" onClick={() => updateVotingSong(song, { open_for_voting: !song.open_for_voting })}><RefreshCw className="h-4 w-4" />{song.open_for_voting ? 'Fechar' : 'Abrir'}</Button>
          </div>
        </article>)}
        {votingSongs.length === 0 && <p className="text-sm text-[#94A3B8]">Nenhuma música foi enviada para votação ainda.</p>}
      </div>
    </section>

    <section className="rounded-2xl border border-white/[0.08] bg-navy-900 p-5">
      <h2 className="text-xl font-bold text-white">Indicações recebidas</h2>
      <div className="mt-4 grid gap-3">
        {suggestions.map((suggestion) => <article key={suggestion.id} className="rounded-xl border border-white/[0.08] bg-black/20 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1"><h3 className="font-semibold text-white"><Music2 className="mr-2 inline h-4 w-4 text-brand" />{suggestion.song_title}</h3><p className="break-words text-sm text-[#94A3B8]">{suggestion.artist || 'Sem artista'} · indicado por {suggestion.name} ({suggestion.tribe}){suggestion.phone ? ` · ${suggestion.phone}` : ''}</p><SuggestionAnalysis suggestion={suggestion} />{suggestion.reason && <p className="mt-2 break-words text-sm text-[#CBD5E1]">{suggestion.reason}</p>}<SpiritualResponse suggestion={suggestion} /></div>
            <div className="flex flex-col gap-2 sm:flex-row">{suggestion.youtube_link && <Button variant="outline" className="border-white/10 bg-transparent text-white hover:bg-white/10" asChild><a href={suggestion.youtube_link} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" />YouTube</a></Button>}<Select value={suggestion.status} onValueChange={(status) => updateSuggestion(suggestion.id, status)}><SelectTrigger className="w-full sm:w-[220px] bg-black/20 border-white/10 text-white"><SelectValue /></SelectTrigger><SelectContent>{suggestionStatuses.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
          </div>
        </article>)}
        {suggestions.length === 0 && <p className="text-sm text-[#94A3B8]">Nenhuma indicação recebida ainda.</p>}
      </div>
    </section>
  </div>
}

function SuggestionAnalysis({ suggestion }: { suggestion: Suggestion }) {
  const items = [
    ['Categoria', suggestion.suggested_category],
    ['Tipo', suggestion.worship_type],
    ['Status', suggestion.status],
    ['Recebida em', suggestion.created_at ? new Date(suggestion.created_at).toLocaleDateString('pt-BR') : null],
  ].filter(([, value]) => Boolean(value))

  if (items.length === 0) return null

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {items.map(([label, value]) => <Badge key={label} variant="outline" className="border-white/10 text-[#CBD5E1]">{label}: {value}</Badge>)}
    </div>
  )
}

function SpiritualResponse({ suggestion }: { suggestion: Suggestion }) {
  if (!suggestion.spiritual_area && !suggestion.spiritual_experience_note && !suggestion.next_step) return null

  return (
    <div className="mt-3 grid gap-2 rounded-xl border border-white/[0.06] bg-navy-900/70 p-3 text-sm text-[#CBD5E1]">
      {suggestion.spiritual_area && <p><span className="font-semibold text-white">Área percebida:</span> {suggestion.spiritual_area}{suggestion.spiritual_area_other ? ` — ${suggestion.spiritual_area_other}` : ''}</p>}
      {suggestion.spiritual_experience_note && <p className="break-words"><span className="font-semibold text-white">Relato:</span> {suggestion.spiritual_experience_note}</p>}
      {suggestion.next_step && <p><span className="font-semibold text-white">Próximo passo:</span> {suggestion.next_step}{suggestion.next_step_other ? ` — ${suggestion.next_step_other}` : ''}</p>}
    </div>
  )
}

function Field({ label, value, onChange, ...props }: { label: string; value: string; onChange: (value: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) { return <div><Label>{label}</Label><Input {...props} className="mt-2 h-11 bg-black/20 border-white/10 text-white" value={value} onChange={(event) => onChange(event.target.value)} /></div> }
function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) { return <div><Label>{label}</Label><Select value={value} onValueChange={onChange}><SelectTrigger className="mt-2 h-11 bg-black/20 border-white/10 text-white"><SelectValue /></SelectTrigger><SelectContent>{options.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div> }
