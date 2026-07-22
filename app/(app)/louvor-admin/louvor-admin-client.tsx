'use client'

import { useMemo, useState, useTransition } from 'react'
import { ArrowDown, ArrowUp, BarChart3, CalendarPlus, CheckCircle2, ExternalLink, Folder, LayoutGrid, List, Music2, Plus, RefreshCw, Sparkles, Vote } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { adicionarIndicacaoAoRepertorio, adicionarSugestaoRepertorioNaProximaEscala, atualizarMusicaVotacao, atualizarStatusIndicacao, criarSugestaoRepertorio, enviarMusicaParaVotacao } from './actions'
import { gerarAnaliseEspiritualDoDia } from './spiritual-intelligence-actions'

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
  youtube_url?: string | null
  youtube_thumbnail?: string | null
  age_range?: string | null
  ministry?: string | null
  region?: string | null
  conversion_time?: string | null
  participation_time?: string | null
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

type RepertoireSuggestion = {
  id: string
  title: string
  pastoral_direction: string | null
  suggested_setlist: DraftSetlistSong[] | null
  status: string | null
  created_at: string
}

type DraftSetlistSong = {
  title?: string
  artist?: string | null
  moment?: string | null
  reason?: string
  youtube_url?: string | null
}

type UpcomingEvent = {
  id: string
  title: string
  date: string
}

type SpiritualSummary = {
  id: string
  run_id: string
  analysis_date: string
  quantification: { themes?: MetricCount[]; needs?: MetricCount[]; emotions?: MetricCount[]; nextSteps?: MetricCount[] }
  segmentation: Array<{ segment: string; value: string; total: number; topThemes?: MetricCount[] }>
  associations: Array<{ source: string; target: string; count: number; description: string }>
  evolution: {
    note?: string
    comparedDays?: number
    growing?: SpiritualTrend[]
    declining?: SpiritualTrend[]
    emerging?: SpiritualTrend[]
  }
  discernment: string[]
  recommendations: string[]
  created_at: string
}

type MetricCount = { label: string; count: number; percentage: number }
type SpiritualTrend = { category: 'themes' | 'needs' | 'emotions' | 'nextSteps'; label: string; current: number; previous: number; delta: number }

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
const suggestionStatuses = ['Sugerida', 'Em análise', 'Analisada coletivamente', 'Analisada', 'Aprovada', 'Em teste', 'Repertório oficial', 'Pausada', 'Reprovada', 'Necessita validação pastoral']
type AdminSection = 'votacao' | 'indicacoes' | 'inteligencia' | 'repertorios'

export function LouvorAdminClient({
  suggestions,
  votingSongs,
  catalog,
  repertoireSuggestions,
  upcomingEvents,
  spiritualSummaries = [],
}: {
  suggestions: Suggestion[]
  votingSongs: VotingSong[]
  catalog: CatalogSong[]
  repertoireSuggestions: RepertoireSuggestion[]
  upcomingEvents: UpcomingEvent[]
  spiritualSummaries?: SpiritualSummary[]
}) {
  const [isPending, startTransition] = useTransition()
  const [selectedCatalogId, setSelectedCatalogId] = useState('manual')
  const selectedCatalog = useMemo(() => catalog.find((song) => song.id === selectedCatalogId), [catalog, selectedCatalogId])
  const [form, setForm] = useState({ songTitle: '', artist: '', youtubeLink: '', category: 'Adoração', worshipType: 'Ambos', theme: '' })
  const [activeSection, setActiveSection] = useState<AdminSection>('indicacoes')
  const [suggestionView, setSuggestionView] = useState<'boards' | 'list'>('boards')
  const [selectedSuggestionDate, setSelectedSuggestionDate] = useState('')
  const [selectedEventByRepertoire, setSelectedEventByRepertoire] = useState<Record<string, string>>({})
  const [draftSetlistByRepertoire, setDraftSetlistByRepertoire] = useState<Record<string, DraftSetlistSong[]>>({})
  const [selectedRepertoireSummaryId, setSelectedRepertoireSummaryId] = useState(spiritualSummaries[0]?.id ?? '')
  const selectedRepertoireSummary = spiritualSummaries.find((summary) => summary.id === selectedRepertoireSummaryId)
  const groupedSuggestions = useMemo(() => groupSuggestionsByDate(suggestions), [suggestions])
  const activeSuggestionGroup = groupedSuggestions.find((group) => group.dateKey === selectedSuggestionDate) ?? groupedSuggestions[0]
  const activeSuggestionDate = activeSuggestionGroup?.dateKey ?? ''

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

  function runDailySpiritualAnalysis(dateKey: string) {
    startTransition(async () => {
      const response = await gerarAnaliseEspiritualDoDia(dateKey)
      if (response.success) toast.success(response.message)
      else toast.error(response.message)
    })
  }

  function createRepertoireSuggestion() {
    startTransition(async () => {
      const response = await criarSugestaoRepertorio(selectedRepertoireSummaryId)
      if (response.success) toast.success(response.message)
      else toast.error(response.message)
    })
  }

  function addSuggestionToCatalog(id: string) {
    startTransition(async () => {
      const response = await adicionarIndicacaoAoRepertorio(id)
      if (response.success) toast.success(response.message)
      else toast.error(response.message)
    })
  }

  function addRepertoireToNextScale(id: string) {
    startTransition(async () => {
      const response = await adicionarSugestaoRepertorioNaProximaEscala(id, selectedEventByRepertoire[id] || null, draftSetlistByRepertoire[id])
      if (response.success) toast.success(response.message)
      else toast.error(response.message)
    })
  }

  function getDraftSetlist(item: RepertoireSuggestion) {
    return draftSetlistByRepertoire[item.id] ?? item.suggested_setlist ?? []
  }

  function moveDraftSong(item: RepertoireSuggestion, fromIndex: number, direction: -1 | 1) {
    const current = getDraftSetlist(item)
    const toIndex = fromIndex + direction
    if (toIndex < 0 || toIndex >= current.length) return
    const next = [...current]
    const [moved] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, moved)
    setDraftSetlistByRepertoire((drafts) => ({ ...drafts, [item.id]: next }))
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
    <section className="rounded-2xl border border-white/[0.08] bg-navy-900 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div><Badge className="bg-brand/15 text-brand border-brand/20 hover:bg-brand/15">Louvor Admin</Badge><h1 className="mt-2 text-2xl font-bold text-white">Gestão de louvor</h1><p className="text-sm text-[#94A3B8]">Votação, indicações, inteligência espiritual e repertórios agora ficam separados por menus internos.</p></div>
        <div className="grid gap-2 sm:grid-cols-4">
          <AdminTab active={activeSection === 'votacao'} icon={<Vote />} label="Votação" onClick={() => setActiveSection('votacao')} />
          <AdminTab active={activeSection === 'indicacoes'} icon={<Folder />} label="Indicações" onClick={() => setActiveSection('indicacoes')} />
          <AdminTab active={activeSection === 'inteligencia'} icon={<BarChart3 />} label="Inteligência" onClick={() => setActiveSection('inteligencia')} />
          <AdminTab active={activeSection === 'repertorios'} icon={<Sparkles />} label="Repertórios" onClick={() => setActiveSection('repertorios')} />
        </div>
      </div>
    </section>

    {activeSection === 'repertorios' && <section className="rounded-2xl border border-brand/20 bg-gradient-to-br from-brand/15 to-navy-900 p-5">
      <div className="grid gap-5 lg:grid-cols-[1fr,360px] lg:items-end">
        <div>
          <Badge className="bg-brand/15 text-brand border-brand/20 hover:bg-brand/15">Análise ministerial</Badge>
          <h2 className="mt-3 text-xl font-bold text-white">Sugestão de repertório por análise</h2>
          <p className="mt-1 max-w-3xl text-sm text-[#CBD5E1]">Crie rascunhos de repertório a partir das análises coletivas e ajuste a ordem antes de enviar para uma escala.</p>
        </div>
        <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-4">
          <div><Label htmlFor="repertoire-source-analysis">Análise coletiva de origem</Label><Select value={selectedRepertoireSummaryId} onValueChange={setSelectedRepertoireSummaryId}><SelectTrigger id="repertoire-source-analysis" className="mt-2 border-white/10 bg-black/20 text-white"><SelectValue placeholder="Selecione uma análise" /></SelectTrigger><SelectContent>{spiritualSummaries.map((summary) => <SelectItem key={summary.id} value={summary.id}>{new Date(`${summary.analysis_date}T00:00:00`).toLocaleDateString('pt-BR')}</SelectItem>)}</SelectContent></Select></div>
          {selectedRepertoireSummary && <p className="text-xs text-[#94A3B8]">Temas observados: {selectedRepertoireSummary.quantification?.themes?.slice(0, 3).map((theme) => theme.label).join(', ') || 'sem temas quantificados'}.</p>}
          <Button disabled={isPending || !selectedRepertoireSummaryId} onClick={createRepertoireSuggestion} className="h-11 w-full bg-brand hover:bg-brand/90"><Sparkles className="h-4 w-4" />Criar rascunho recomendado</Button>
        </div>
      </div>
      {repertoireSuggestions.length > 0 && <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {repertoireSuggestions.map((item) => <article key={item.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-white">{item.title}</h3><p className="mt-1 text-sm text-[#94A3B8]">{item.pastoral_direction || 'Direção pastoral não informada'}</p></div><Badge variant="outline" className="border-white/10 text-[#CBD5E1]">{item.status || 'draft'}</Badge></div>
          <div className="mt-3 space-y-2">{getDraftSetlist(item).slice(0, 5).map((song, index) => <div key={`${item.id}-${index}-${song.title}`} className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 p-2 text-sm text-[#CBD5E1]"><div className="flex min-w-0 flex-1 flex-col"><span className="truncate font-semibold text-white">{index + 1}. {song.title || 'Música sem título'}</span><span className="truncate text-xs text-[#94A3B8]">{song.artist || 'Sem artista'}{song.moment ? ` · ${song.moment}` : ''}</span></div><Button type="button" size="icon" variant="ghost" disabled={index === 0 || item.status === 'scheduled'} onClick={() => moveDraftSong(item, index, -1)} className="text-[#CBD5E1] hover:bg-white/10 hover:text-white"><ArrowUp className="h-4 w-4" /></Button><Button type="button" size="icon" variant="ghost" disabled={index === getDraftSetlist(item).length - 1 || item.status === 'scheduled'} onClick={() => moveDraftSong(item, index, 1)} className="text-[#CBD5E1] hover:bg-white/10 hover:text-white"><ArrowDown className="h-4 w-4" /></Button></div>)}</div>
          <div className="mt-4 grid gap-2 sm:grid-cols-[1fr,auto]">
            <Select value={selectedEventByRepertoire[item.id] ?? 'auto'} onValueChange={(eventId) => setSelectedEventByRepertoire((current) => ({ ...current, [item.id]: eventId === 'auto' ? '' : eventId }))}>
              <SelectTrigger className="border-white/10 bg-black/20 text-white"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="auto">Próximo culto automático</SelectItem>{upcomingEvents.map((event) => <SelectItem key={event.id} value={event.id}>{event.title} — {new Date(`${event.date}T00:00:00`).toLocaleDateString('pt-BR')}</SelectItem>)}</SelectContent>
            </Select>
            <Button type="button" disabled={isPending || item.status === 'scheduled'} onClick={() => addRepertoireToNextScale(item.id)} className="bg-brand hover:bg-brand/90"><CalendarPlus className="h-4 w-4" />Adicionar</Button>
          </div>
        </article>)}
      </div>}
    </section>}
    {activeSection === 'votacao' && <section className="rounded-2xl border border-white/[0.08] bg-navy-900 p-5">
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
      <div className="mt-6"><h2 className="text-xl font-bold text-white">Músicas configuradas para votação</h2>
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
      </div></div>
    </section>}

    {activeSection === 'indicacoes' && <section className="rounded-2xl border border-white/[0.08] bg-navy-900 p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Indicações recebidas</h2>
          <p className="mt-1 text-sm text-[#94A3B8]">Abra uma pasta por dia para revisar as músicas indicadas e seus parâmetros de análise.</p>
        </div>
        <div className="flex rounded-xl border border-white/10 bg-black/20 p-1">
          <Button type="button" size="sm" variant={suggestionView === 'boards' ? 'default' : 'ghost'} className={suggestionView === 'boards' ? 'bg-brand text-white hover:bg-brand/90' : 'text-[#CBD5E1] hover:bg-white/10 hover:text-white'} onClick={() => setSuggestionView('boards')}><LayoutGrid className="h-4 w-4" />Quadros</Button>
          <Button type="button" size="sm" variant={suggestionView === 'list' ? 'default' : 'ghost'} className={suggestionView === 'list' ? 'bg-brand text-white hover:bg-brand/90' : 'text-[#CBD5E1] hover:bg-white/10 hover:text-white'} onClick={() => setSuggestionView('list')}><List className="h-4 w-4" />Lista</Button>
        </div>
      </div>

      {groupedSuggestions.length > 0 ? <div className="mt-5 grid gap-4 lg:grid-cols-[280px,1fr]">
        <div className={suggestionView === 'boards' ? 'grid max-h-[520px] auto-rows-min gap-3 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-1' : 'max-h-[520px] space-y-2 overflow-y-auto pr-1'}>
          {groupedSuggestions.map((group) => <button key={group.dateKey} type="button" onClick={() => setSelectedSuggestionDate(group.dateKey)} className={`rounded-xl border p-4 text-left transition ${group.dateKey === activeSuggestionDate ? 'border-brand/50 bg-brand/10' : 'border-white/[0.08] bg-black/20 hover:border-brand/30'}`}>
            <div className="flex items-center gap-3"><Folder className="h-5 w-5 text-brand" /><span className="font-semibold text-white">{group.label}</span></div>
            <p className="mt-2 text-sm text-[#94A3B8]">{group.suggestions.length} indicação{group.suggestions.length === 1 ? '' : 'ões'}</p>
          </button>)}
        </div>
        <div className="max-h-[620px] overflow-y-auto pr-1">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#94A3B8]">{activeSuggestionGroup?.label ?? 'Selecione uma pasta'}</h3>
          <div className={suggestionView === 'boards' ? 'grid gap-3 xl:grid-cols-2' : 'grid gap-3'}>
            {(activeSuggestionGroup?.suggestions ?? []).map((suggestion) => <SuggestionCard key={suggestion.id} suggestion={suggestion} isPending={isPending} onAddToCatalog={addSuggestionToCatalog} onStatusChange={updateSuggestion} />)}
          </div>
        </div>
      </div> : <p className="mt-4 text-sm text-[#94A3B8]">Nenhuma indicação recebida ainda.</p>}
    </section>}

    {activeSection === 'inteligencia' && <SpiritualIntelligencePanel groups={groupedSuggestions} summaries={spiritualSummaries} activeDate={activeSuggestionDate} isPending={isPending} onSelectDate={setSelectedSuggestionDate} onRunAnalysis={runDailySpiritualAnalysis} />}
  </div>
}


function AdminTab({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return <Button type="button" variant={active ? 'default' : 'outline'} onClick={onClick} className={active ? 'justify-start bg-brand text-white hover:bg-brand/90' : 'justify-start border-white/10 bg-transparent text-white hover:bg-white/10'}><span className="[&_svg]:h-4 [&_svg]:w-4">{icon}</span>{label}</Button>
}

function SpiritualIntelligencePanel({ groups, summaries, activeDate, isPending, onSelectDate, onRunAnalysis }: { groups: ReturnType<typeof groupSuggestionsByDate>; summaries: SpiritualSummary[]; activeDate: string; isPending: boolean; onSelectDate: (date: string) => void; onRunAnalysis: (date: string) => void }) {
  const [activeView, setActiveView] = useState<'panorama' | 'segmentacao' | 'associacoes' | 'evolucao'>('panorama')
  const activeGroup = groups.find((group) => group.dateKey === activeDate) ?? groups[0]
  const summary = summaries.find((item) => item.analysis_date === activeGroup?.dateKey)
  return <section className="grid gap-5 xl:grid-cols-[300px,1fr]">
    <aside className="rounded-2xl border border-white/[0.08] bg-navy-900 p-4"><Badge className="bg-brand/15 text-brand border-brand/20 hover:bg-brand/15">Análises por dia</Badge><h2 className="mt-3 text-xl font-bold text-white">Inteligência Espiritual</h2><p className="mt-1 text-sm text-[#94A3B8]">Uma análise coletiva por data. O sistema organiza evidências; o discernimento pertence à liderança.</p><div className="mt-4 grid gap-2">{groups.map((group) => <button key={group.dateKey} type="button" onClick={() => onSelectDate(group.dateKey)} className={`rounded-xl border p-3 text-left transition ${activeGroup?.dateKey === group.dateKey ? 'border-brand/50 bg-brand/10' : 'border-white/10 bg-black/20 hover:border-brand/30'}`}><p className="font-semibold text-white">{group.label}</p><p className="text-sm text-[#94A3B8]">{group.suggestions.length} indicação{group.suggestions.length === 1 ? '' : 'ões'}</p></button>)}</div></aside>
    <div className="space-y-5"><section className="rounded-2xl border border-white/[0.08] bg-navy-900 p-5"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-xl font-bold text-white">{activeGroup?.label ?? 'Sem data selecionada'}</h3><Badge variant="outline" className={summary ? 'border-emerald-400/30 text-emerald-200' : 'border-amber-400/30 text-amber-200'}>{summary ? 'Análise disponível' : 'Pendente'}</Badge></div><p className="mt-1 text-sm text-[#94A3B8]">Fluxo: letra da música + motivo + área trabalhada + próximo passo de todas as indicações do dia.</p></div><Button type="button" disabled={isPending || !activeGroup || activeGroup.dateKey === 'sem-data'} onClick={() => activeGroup && onRunAnalysis(activeGroup.dateKey)} className="bg-brand hover:bg-brand/90"><Sparkles className="h-4 w-4" />{summary ? 'Regerar análise coletiva' : 'Gerar análise coletiva do dia'}</Button></div></section>{summary ? <><div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/[0.08] bg-navy-900 p-2 sm:grid-cols-4">{([['panorama', 'Panorama'], ['segmentacao', 'Segmentação'], ['associacoes', 'Associações'], ['evolucao', 'Evolução']] as const).map(([view, label]) => <Button key={view} type="button" size="sm" variant={activeView === view ? 'default' : 'ghost'} onClick={() => setActiveView(view)} className={activeView === view ? 'bg-brand text-white hover:bg-brand/90' : 'text-[#CBD5E1] hover:bg-white/10 hover:text-white'}>{label}</Button>)}</div><DailySummary summary={summary} activeView={activeView} /></> : <p className="rounded-2xl border border-white/[0.08] bg-navy-900 p-5 text-sm text-[#94A3B8]">Ainda não há análise coletiva salva para esta data. Clique no botão acima para gerar o panorama do dia.</p>}</div>
  </section>
}

function DailySummary({ summary, activeView }: { summary: SpiritualSummary; activeView: 'panorama' | 'segmentacao' | 'associacoes' | 'evolucao' }) {
  if (activeView === 'segmentacao') return <SegmentSummaryPanel items={summary.segmentation ?? []} />
  if (activeView === 'associacoes') return <AssociationSummaryPanel items={summary.associations ?? []} />
  if (activeView === 'evolucao') return <EvolutionSummaryPanel evolution={summary.evolution} />
  return <div className="space-y-5"><section className="grid gap-4 lg:grid-cols-2"><MetricChart title="Temas espirituais" items={summary.quantification?.themes ?? []} /><MetricChart title="Necessidades" items={summary.quantification?.needs ?? []} /><MetricChart title="Emoções recorrentes" items={summary.quantification?.emotions ?? []} /><MetricChart title="Próximos passos" items={summary.quantification?.nextSteps ?? []} /></section><section className="rounded-2xl border border-white/[0.08] bg-navy-900 p-5"><h3 className="text-lg font-bold text-white">Discernimento e resposta ministerial</h3><p className="mt-2 text-sm text-[#94A3B8]">O sistema organiza evidências coletivas; a interpretação e a decisão permanecem com a liderança.</p><div className="mt-4 grid gap-3 lg:grid-cols-2"><div>{summary.discernment?.map((item) => <p key={item} className="mb-2 rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-[#CBD5E1]">{item}</p>)}</div><div>{summary.recommendations?.map((item) => <p key={item} className="mb-2 rounded-xl border border-brand/20 bg-brand/10 p-3 text-sm text-[#CBD5E1]">{item}</p>)}</div></div></section></div>
}

function SegmentSummaryPanel({ items }: { items: SpiritualSummary['segmentation'] }) {
  return <section className="rounded-2xl border border-white/[0.08] bg-navy-900 p-5"><h3 className="text-lg font-bold text-white">Distribuição dos padrões por grupo</h3><p className="mt-1 text-sm text-[#94A3B8]">A segmentação ajuda a localizar recorrências coletivas sem avaliar pessoas individualmente.</p><div className="mt-4 grid gap-3 md:grid-cols-2">{items.length > 0 ? items.map((item) => <div key={`${item.segment}-${item.value}`} className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="flex items-center justify-between gap-3"><p className="font-semibold capitalize text-white">{item.segment}: {item.value}</p><Badge variant="outline" className="border-white/10 text-[#CBD5E1]">{item.total}</Badge></div><p className="mt-2 text-xs text-[#CBD5E1]">{item.topThemes?.map((theme) => `${theme.label} (${theme.percentage}%)`).join(', ') || 'Sem tema recorrente'}</p></div>) : <p className="text-sm text-[#94A3B8]">Sem dados de segmentação para esta data.</p>}</div></section>
}

function AssociationSummaryPanel({ items }: { items: SpiritualSummary['associations'] }) {
  return <section className="rounded-2xl border border-white/[0.08] bg-navy-900 p-5"><h3 className="text-lg font-bold text-white">Associações sem causalidade</h3><p className="mt-1 text-sm text-[#94A3B8]">Estas combinações apareceram juntas; o sistema não afirma que uma causa a outra.</p><div className="mt-4 grid gap-3 md:grid-cols-2">{items.length > 0 ? items.map((item) => <div key={`${item.source}-${item.target}`} className="rounded-xl border border-white/10 bg-black/20 p-4"><p className="font-semibold text-white">{item.source} + {item.target}</p><p className="mt-2 text-sm text-[#CBD5E1]">{item.description}</p></div>) : <p className="text-sm text-[#94A3B8]">Sem associações recorrentes para esta data.</p>}</div></section>
}

function EvolutionSummaryPanel({ evolution }: { evolution: SpiritualSummary['evolution'] }) {
  const groups = [{ title: 'Em crescimento', items: evolution.growing ?? [], tone: 'text-emerald-200' }, { title: 'Novos padrões', items: evolution.emerging ?? [], tone: 'text-brand' }, { title: 'Em redução', items: evolution.declining ?? [], tone: 'text-amber-200' }]
  return <section className="rounded-2xl border border-white/[0.08] bg-navy-900 p-5"><h3 className="text-lg font-bold text-white">Evolução entre coletas</h3><p className="mt-1 text-sm text-[#94A3B8]">{evolution.note || 'Ainda não há histórico suficiente para comparar tendências.'}</p><div className="mt-5 grid gap-4 lg:grid-cols-3">{groups.map((group) => <article key={group.title} className="rounded-xl border border-white/10 bg-black/20 p-4"><h4 className={`font-semibold ${group.tone}`}>{group.title}</h4><div className="mt-3 space-y-2">{group.items.length > 0 ? group.items.map((item) => <div key={`${item.category}-${item.label}`} className="rounded-lg bg-white/[0.04] p-3"><p className="text-sm font-medium text-white">{item.label}</p><p className="mt-1 text-xs text-[#94A3B8]">{item.previous}% → {item.current}% ({item.delta > 0 ? '+' : ''}{item.delta} p.p.)</p></div>) : <p className="text-sm text-[#94A3B8]">Nenhuma variação relevante.</p>}</div></article>)}</div></section>
}

function MetricChart({ title, items }: { title: string; items: MetricCount[] }) {
  return <article className="rounded-2xl border border-white/[0.08] bg-navy-900 p-5"><h3 className="font-bold text-white">{title}</h3><div className="mt-4 space-y-3">{items.length > 0 ? items.slice(0, 6).map((item) => <div key={item.label}><div className="mb-1 flex justify-between gap-3 text-sm"><span className="truncate text-[#CBD5E1]">{item.label}</span><span className="text-white">{item.count} · {item.percentage}%</span></div><div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(item.percentage, 6)}%` }} /></div></div>) : <p className="text-sm text-[#94A3B8]">Sem dados ainda.</p>}</div></article>
}

function groupSuggestionsByDate(suggestions: Suggestion[]) {
  const formatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const groups = new Map<string, Suggestion[]>()

  suggestions.forEach((suggestion) => {
    const date = new Date(suggestion.created_at)
    const dateKey = Number.isNaN(date.getTime()) ? 'sem-data' : date.toISOString().slice(0, 10)
    groups.set(dateKey, [...(groups.get(dateKey) ?? []), suggestion])
  })

  return Array.from(groups.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dateKey, groupSuggestions]) => ({
      dateKey,
      label: dateKey === 'sem-data' ? 'Sem data' : formatter.format(new Date(`${dateKey}T00:00:00`)),
      suggestions: groupSuggestions,
    }))
}

function SuggestionCard({ suggestion, isPending, onAddToCatalog, onStatusChange }: { suggestion: Suggestion; isPending: boolean; onAddToCatalog: (id: string) => void; onStatusChange: (id: string, status: string) => void }) {
  return (
    <article className="rounded-xl border border-white/[0.08] bg-black/20 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1"><h3 className="font-semibold text-white"><Music2 className="mr-2 inline h-4 w-4 text-brand" />{suggestion.song_title}</h3><p className="break-words text-sm text-[#94A3B8]">{suggestion.artist || 'Sem artista'} · indicado por {suggestion.name} ({suggestion.tribe}){suggestion.phone ? ` · ${suggestion.phone}` : ''}</p><SuggestionAnalysis suggestion={suggestion} />{(suggestion.age_range || suggestion.ministry) && <p className="mt-2 text-xs text-[#94A3B8]">{suggestion.age_range || 'Faixa não informada'}{suggestion.ministry ? ` · ${suggestion.ministry}` : ''}</p>}{suggestion.reason && <p className="mt-2 break-words text-sm text-[#CBD5E1]">{suggestion.reason}</p>}<SpiritualResponse suggestion={suggestion} /></div>
        <div className="flex flex-col gap-2 sm:flex-row"><Button type="button" disabled={isPending || suggestion.status === 'Repertório oficial'} onClick={() => onAddToCatalog(suggestion.id)} variant="outline" className="border-brand/30 bg-transparent text-brand hover:bg-brand/10"><Plus className="h-4 w-4" />Repertório</Button>{(suggestion.youtube_url || suggestion.youtube_link) && <Button variant="outline" className="border-white/10 bg-transparent text-white hover:bg-white/10" asChild><a href={suggestion.youtube_url || suggestion.youtube_link || '#'} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" />YouTube</a></Button>}<Select value={suggestion.status} onValueChange={(status) => onStatusChange(suggestion.id, status)}><SelectTrigger className="w-full sm:w-[220px] bg-black/20 border-white/10 text-white"><SelectValue /></SelectTrigger><SelectContent>{suggestionStatuses.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
      </div>
    </article>
  )
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
