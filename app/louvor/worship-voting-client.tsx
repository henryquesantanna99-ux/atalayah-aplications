'use client'

import Link from 'next/link'
import { useId, useMemo, useState, useTransition } from 'react'
import { ArrowLeft, ArrowRight, Check, ExternalLink, HeartHandshake, LogIn, Music2, Search, Send, UserPlus, Vote } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { salvarIndicacao, salvarVoto } from './actions'

type Song = {
  id: string
  song_title?: string
  musica?: string
  artist?: string | null
  youtube_link?: string | null
  youtubeLink?: string | null
  category?: string | null
  categoria?: string | null
  status?: string | null
  theme?: string | null
  tema?: string | null
  worship_type?: string | null
  tipoLouvor?: string | null
}

type YouTubeOption = {
  videoId: string
  title: string
  artist: string
  thumbnail: string | null
  duration: string | null
  url: string
}

type View = 'home' | 'suggest' | 'vote'

const categories = ['Prévia', 'Celebração', 'Adoração', 'Não sei informar']
const worshipTypes = ['Necessidade / clamor / entrega', 'Resposta / direção / declaração', 'Os dois', 'Não sei informar']
const spiritualAreas = ['Arrependimento e mudança de vida', 'Fé e confiança em Deus', 'Consolo e cura interior', 'Gratidão e adoração', 'Entrega e rendição', 'Direção para uma decisão', 'Renovo espiritual', 'Não consegui perceber claramente', 'Outro']
const nextSteps = ['Orar mais sobre isso', 'Conversar com alguém da liderança', 'Buscar reconciliação com alguém', 'Voltar a congregar com mais constância', 'Servir em alguma área', 'Estudar mais a Palavra', 'Pedir ajuda pastoral', 'Ainda não sei', 'Outro']
const wizardSteps = ['Quem indica', 'Escolha da música', 'Confirmação', 'Leitura espiritual', 'Revisão']

const emptySuggestion = {
  nome: '', tribo: '', telefone: '', faixaEtaria: '', ministerio: '', musica: '', artista: '', categoriaSugerida: '', tipoLouvor: '', motivo: '', spiritual_area: '', spiritual_area_other: '', spiritual_experience_note: '', next_step: '', next_step_other: '', youtube_video_id: '', youtube_title: '', youtube_channel: '', youtube_thumbnail: '', youtube_duration: '', youtube_url: '',
}

export function WorshipVotingClient({ songs }: { songs: Song[] }) {
  const [view, setView] = useState<View>('home')
  const [isPending, startTransition] = useTransition()
  const [suggestion, setSuggestion] = useState(emptySuggestion)
  const [step, setStep] = useState(0)
  const [youtubeQuery, setYoutubeQuery] = useState('')
  const [youtubeResults, setYoutubeResults] = useState<YouTubeOption[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [filters, setFilters] = useState({ search: '', category: 'Todas', type: 'Todos' })
  const [voteSong, setVoteSong] = useState<Song | null>(null)
  const [voteForm, setVoteForm] = useState({ nome: '', telefone: '', tribo: '', conheceMusica: 'Sim', ajudaACantar: 'Sim', nota: '5' })

  const filteredSongs = useMemo(() => songs.filter((song) => {
    const title = getTitle(song).toLowerCase()
    const category = getCategory(song)
    const type = getType(song)
    return title.includes(filters.search.toLowerCase()) && (filters.category === 'Todas' || category === filters.category) && (filters.type === 'Todos' || type === filters.type)
  }), [songs, filters])

  const canAdvance = useMemo(() => {
    if (step === 0) return Boolean(suggestion.nome.trim() && suggestion.tribo.trim() && suggestion.telefone.trim())
    if (step === 1) return Boolean(suggestion.youtube_video_id || suggestion.musica.trim())
    if (step === 2) return Boolean(suggestion.musica.trim())
    if (step === 3) return Boolean(suggestion.spiritual_area && suggestion.next_step)
    return true
  }, [step, suggestion])

  async function searchYoutube() {
    const query = youtubeQuery.trim() || [suggestion.musica, suggestion.artista].filter(Boolean).join(' ')
    if (!query) return toast.error('Digite o nome da música para buscar.')
    setIsSearching(true)
    try {
      const response = await fetch(`/api/louvor/youtube/search?q=${encodeURIComponent(query)}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Não foi possível buscar no YouTube.')
      setYoutubeResults(data.results ?? [])
      if ((data.results ?? []).length === 0) toast.message('Nenhum resultado encontrado. Você ainda pode informar a música manualmente.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível buscar no YouTube.')
    } finally {
      setIsSearching(false)
    }
  }

  function selectYoutube(result: YouTubeOption) {
    setSuggestion({ ...suggestion, musica: result.title, artista: result.artist, youtube_video_id: result.videoId, youtube_title: result.title, youtube_channel: result.artist, youtube_thumbnail: result.thumbnail ?? '', youtube_duration: result.duration ?? '', youtube_url: result.url })
    setStep(2)
  }

  function submitSuggestion() {
    startTransition(async () => {
      const response = await salvarIndicacao(suggestion)
      if (response.success) {
        toast.success(response.message)
        setSuggestion(emptySuggestion)
        setYoutubeResults([])
        setYoutubeQuery('')
        setStep(0)
        setView('home')
      } else toast.error(response.message)
    })
  }

  function submitVote(event: React.FormEvent) {
    event.preventDefault()
    if (!voteSong) return
    startTransition(async () => {
      const response = await salvarVoto({ musicaId: voteSong.id, musica: getTitle(voteSong), ...voteForm, nota: Number(voteForm.nota), userAgent: navigator.userAgent })
      if (response.success) { toast.success(response.message); setVoteSong(null); setVoteForm({ nome: '', telefone: '', tribo: '', conheceMusica: 'Sim', ajudaACantar: 'Sim', nota: '5' }) } else toast.error(response.message)
    })
  }

  if (view === 'suggest') {
    return <section className="max-w-4xl mx-auto rounded-3xl border border-white/[0.08] bg-navy-900 p-5 shadow-2xl shadow-black/30 sm:p-6">
      <BackButton onClick={() => setView('home')} />
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div><Badge className="bg-brand/15 text-brand border-brand/20 hover:bg-brand/15">Wizard de indicação</Badge><h2 className="mt-3 text-2xl font-bold text-white">Indicar uma música</h2><p className="mt-1 text-sm text-[#94A3B8]">Avance etapa por etapa. A letra e os metadados serão preparados para análise temática e musical.</p></div>
        <p className="text-sm text-[#CBD5E1]">Etapa {step + 1} de {wizardSteps.length}</p>
      </div>
      <WizardProgress activeStep={step} />
      <div className="mt-7 rounded-2xl border border-white/10 bg-black/20 p-4 transition-all duration-300 sm:p-5">
        {step === 0 && <div className="grid gap-4 sm:grid-cols-2"><Field label="Nome completo *" value={suggestion.nome} onChange={(nome) => setSuggestion({ ...suggestion, nome })} /><Field label="Tribo / Grupo / Ministério *" value={suggestion.tribo} onChange={(tribo) => setSuggestion({ ...suggestion, tribo })} /><Field label="Telefone / WhatsApp *" value={suggestion.telefone} onChange={(telefone) => setSuggestion({ ...suggestion, telefone })} inputMode="tel" /><SelectField label="Faixa etária" value={suggestion.faixaEtaria} options={['Até 17 anos', '18 a 25 anos', '26 a 35 anos', '36 a 50 anos', 'Acima de 50 anos']} onChange={(faixaEtaria) => setSuggestion({ ...suggestion, faixaEtaria })} /><Field label="Ministério em que serve, se houver" value={suggestion.ministerio} onChange={(ministerio) => setSuggestion({ ...suggestion, ministerio })} /></div>}
        {step === 1 && <div className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><Field label="Nome da música" value={suggestion.musica} onChange={(musica) => setSuggestion({ ...suggestion, musica })} /><Field label="Artista / Ministério / Referência" value={suggestion.artista} onChange={(artista) => setSuggestion({ ...suggestion, artista })} /></div><div className="flex flex-col gap-3 sm:flex-row"><Input className="h-12 border-white/10 bg-black/20 text-white" placeholder="Buscar no YouTube" value={youtubeQuery} onChange={(e) => setYoutubeQuery(e.target.value)} /><Button type="button" disabled={isSearching} onClick={searchYoutube} className="h-12 bg-brand hover:bg-brand/90"><Search className="h-4 w-4" />{isSearching ? 'Buscando...' : 'Buscar opções'}</Button></div><div className="grid gap-3">{youtubeResults.map((result) => <button key={result.videoId} type="button" onClick={() => selectYoutube(result)} className="flex gap-3 rounded-xl border border-white/10 bg-navy-800/60 p-3 text-left transition hover:border-brand/50">{result.thumbnail && <img src={result.thumbnail} alt="" className="h-20 w-28 rounded-lg object-cover" />}<span className="min-w-0"><span className="block font-semibold text-white">{result.title}</span><span className="block text-sm text-[#94A3B8]">{result.artist}{result.duration ? ` · ${result.duration}` : ''}</span></span></button>)}</div></div>}
        {step === 2 && <div className="space-y-4"><div className="rounded-2xl border border-brand/30 bg-brand/10 p-4"><p className="text-sm text-brand">Música selecionada</p><h3 className="mt-2 text-xl font-bold text-white">{suggestion.musica || 'Informe a música manualmente'}</h3><p className="text-[#CBD5E1]">{suggestion.artista || 'Artista não informado'}</p>{suggestion.youtube_url && <a href={suggestion.youtube_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm text-brand"><ExternalLink className="h-4 w-4" />Abrir referência</a>}</div><div className="grid gap-4 sm:grid-cols-2"><SelectField label="Categoria sugerida" value={suggestion.categoriaSugerida} options={categories} onChange={(categoriaSugerida) => setSuggestion({ ...suggestion, categoriaSugerida })} /><SelectField label="Expressa mais" value={suggestion.tipoLouvor} options={worshipTypes} onChange={(tipoLouvor) => setSuggestion({ ...suggestion, tipoLouvor })} /></div></div>}
        {step === 3 && <div className="grid gap-4"><TextareaField label="Por que você está indicando essa música?" value={suggestion.motivo} onChange={(motivo) => setSuggestion({ ...suggestion, motivo })} /><SelectField label="Durante o louvor e a ministração, em qual área você percebeu que Deus mais trabalhou no seu coração hoje?" value={suggestion.spiritual_area} options={spiritualAreas} onChange={(spiritual_area) => setSuggestion({ ...suggestion, spiritual_area, spiritual_area_other: spiritual_area === 'Outro' ? suggestion.spiritual_area_other : '' })} />{suggestion.spiritual_area === 'Outro' && <Field label="Conte em qual área Deus trabalhou" value={suggestion.spiritual_area_other} onChange={(spiritual_area_other) => setSuggestion({ ...suggestion, spiritual_area_other })} />}<TextareaField label="Se quiser, conte brevemente o que aconteceu no seu coração." value={suggestion.spiritual_experience_note} onChange={(spiritual_experience_note) => setSuggestion({ ...suggestion, spiritual_experience_note })} /><SelectField label="Qual próximo passo você sente que precisa dar depois do culto de hoje?" value={suggestion.next_step} options={nextSteps} onChange={(next_step) => setSuggestion({ ...suggestion, next_step, next_step_other: next_step === 'Outro' ? suggestion.next_step_other : '' })} />{suggestion.next_step === 'Outro' && <Field label="Descreva o próximo passo" value={suggestion.next_step_other} onChange={(next_step_other) => setSuggestion({ ...suggestion, next_step_other })} />}</div>}
        {step === 4 && <Review suggestion={suggestion} />}
      </div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between"><Button type="button" variant="outline" disabled={step === 0} onClick={() => setStep((current) => Math.max(0, current - 1))} className="border-white/10 bg-transparent text-white hover:bg-white/10"><ArrowLeft className="h-4 w-4" />Voltar etapa</Button>{step < 4 ? <Button type="button" disabled={!canAdvance} onClick={() => setStep((current) => Math.min(4, current + 1))} className="bg-brand hover:bg-brand/90">Avançar<ArrowRight className="h-4 w-4" /></Button> : <Button type="button" disabled={isPending} onClick={submitSuggestion} className="bg-brand hover:bg-brand/90"><Send className="h-4 w-4" />{isPending ? 'Enviando...' : 'Enviar indicação'}</Button>}</div>
    </section>
  }

  if (view === 'vote') {
    return <section className="space-y-5"><BackButton onClick={() => setView('home')} /><div className="rounded-2xl border border-white/[0.08] bg-navy-900 p-5"><h2 className="text-2xl font-bold text-white">Votar em músicas</h2><p className="mt-2 text-sm text-[#94A3B8]">Seu voto é um termômetro da igreja. A aprovação final considera coerência teológica, pastoreio, viabilidade técnica e momento do culto.</p><div className="mt-5 grid gap-3 md:grid-cols-3"><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-[#64748B]" /><Input className="h-11 border-white/10 bg-black/20 pl-9 text-white" placeholder="Buscar música" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} /></div><Select value={filters.category} onValueChange={(category) => setFilters({ ...filters, category })}><SelectTrigger className="h-11 border-white/10 bg-black/20 text-white"><SelectValue /></SelectTrigger><SelectContent>{['Todas', 'Prévia', 'Celebração', 'Adoração'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select><Select value={filters.type} onValueChange={(type) => setFilters({ ...filters, type })}><SelectTrigger className="h-11 border-white/10 bg-black/20 text-white"><SelectValue /></SelectTrigger><SelectContent>{['Todos', 'Sacerdotal', 'Profético', 'Ambos'].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div></div><div className="grid gap-4 lg:grid-cols-2">{filteredSongs.map((song) => <SongCard key={song.id} song={song} onVote={() => setVoteSong(song)} />)}</div>{filteredSongs.length === 0 && <p className="rounded-2xl border border-white/[0.08] bg-navy-900 p-6 text-[#94A3B8]">Nenhuma música disponível com esses filtros.</p>}{voteSong && <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 p-4"><form onSubmit={submitVote} className="mx-auto mt-8 max-w-lg space-y-4 rounded-2xl border border-white/10 bg-navy-900 p-5"><BackButton onClick={() => setVoteSong(null)} /><h3 className="text-xl font-bold text-white">Votar em {getTitle(voteSong)}</h3><Field label="Nome completo *" value={voteForm.nome} onChange={(nome) => setVoteForm({ ...voteForm, nome })} /><Field label="Telefone / WhatsApp *" value={voteForm.telefone} onChange={(telefone) => setVoteForm({ ...voteForm, telefone })} inputMode="tel" /><Field label="Tribo / Grupo / Ministério" value={voteForm.tribo} onChange={(tribo) => setVoteForm({ ...voteForm, tribo })} /><SelectField label="Você conhece essa música?" value={voteForm.conheceMusica} options={['Sim', 'Não']} onChange={(conheceMusica) => setVoteForm({ ...voteForm, conheceMusica })} /><SelectField label="Essa música ajuda você a cantar junto no culto?" value={voteForm.ajudaACantar} options={['Sim', 'Não', 'Não sei']} onChange={(ajudaACantar) => setVoteForm({ ...voteForm, ajudaACantar })} /><SelectField label="Nota" value={voteForm.nota} options={['1', '2', '3', '4', '5']} onChange={(nota) => setVoteForm({ ...voteForm, nota })} /><Button disabled={isPending} className="h-12 w-full bg-brand hover:bg-brand/90"><Vote className="h-4 w-4" />{isPending ? 'Registrando...' : 'Registrar voto'}</Button></form></div>}</section>
  }

  return <section className="mx-auto max-w-5xl space-y-6"><MemberLoginBar /><div className="rounded-3xl border border-white/[0.08] bg-gradient-to-br from-navy-900 to-black p-6 sm:p-8"><Badge className="bg-brand/15 text-brand border-brand/20 hover:bg-brand/15">Termômetro da igreja</Badge><h1 className="mt-4 text-3xl font-bold text-white sm:text-4xl">Indicação e Votação de Louvor</h1><p className="mt-4 max-w-3xl text-[#CBD5E1]">As indicações passam por busca de letra, metadados, análise temática, análise musical e discernimento da liderança. Você pode entrar como membro ou seguir sem login.</p></div><div className="grid gap-4 md:grid-cols-2"><HomeCard icon={<Music2 />} title="Indicar uma música" description="Envie uma sugestão em um wizard guiado para análise ministerial." cta="Clique aqui para indicar" onClick={() => setView('suggest')} /><HomeCard icon={<HeartHandshake />} title="Votar em músicas" description="A votação pública estará disponível em breve." cta="Clique aqui para votar" disabled badge="Em breve" onClick={() => setView('vote')} /></div></section>
}

function MemberLoginBar() { return <div className="sticky top-3 z-20 flex flex-col gap-3 rounded-2xl border border-white/10 bg-navy-900/95 p-3 shadow-xl shadow-black/30 backdrop-blur sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-white">Área de membros da igreja</p><p className="text-sm text-[#94A3B8]">Entre para acompanhar seu histórico, ou role a tela e indique sem login.</p></div><div className="flex gap-2"><Button asChild variant="outline" className="border-white/10 bg-transparent text-white hover:bg-white/10"><Link href="/login"><LogIn className="h-4 w-4" />Entrar</Link></Button><Button asChild className="bg-brand hover:bg-brand/90"><Link href="/login?mode=register"><UserPlus className="h-4 w-4" />Criar conta</Link></Button></div></div> }
function WizardProgress({ activeStep }: { activeStep: number }) { return <ol className="grid gap-2 sm:grid-cols-5">{wizardSteps.map((item, index) => <li key={item} className={`rounded-xl border p-3 text-xs transition ${index === activeStep ? 'border-brand/60 bg-brand/15 text-white' : index < activeStep ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200' : 'border-white/10 bg-black/20 text-[#94A3B8]'}`}><span className="mb-1 flex h-6 w-6 items-center justify-center rounded-full bg-white/10">{index < activeStep ? <Check className="h-3 w-3" /> : index + 1}</span>{item}</li>)}</ol> }
function Review({ suggestion }: { suggestion: typeof emptySuggestion }) { const rows = [['Nome', suggestion.nome], ['Tribo', suggestion.tribo], ['Telefone', suggestion.telefone], ['Música', suggestion.musica], ['Artista/canal', suggestion.artista], ['Área percebida', suggestion.spiritual_area], ['Próximo passo', suggestion.next_step]]; return <div className="space-y-3"><h3 className="text-xl font-bold text-white">Revise sua indicação</h3>{rows.map(([label, value]) => <p key={label} className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-[#CBD5E1]"><span className="font-semibold text-white">{label}:</span> {value || 'Não informado'}</p>)}<p className="text-sm text-[#94A3B8]">Depois do envio, a equipe poderá cruzar letra, metadados e respostas com a visão ministerial para sugerir repertório.</p></div> }
function getTitle(song: Song) { return song.song_title ?? song.musica ?? 'Música sem título' }
function getCategory(song: Song) { return song.category ?? song.categoria ?? 'Não informada' }
function getType(song: Song) { const type = song.worship_type ?? song.tipoLouvor ?? 'Ambos'; return type === 'Os dois' ? 'Ambos' : type }
function BackButton({ onClick }: { onClick: () => void }) { return <button type="button" onClick={onClick} className="mb-4 inline-flex items-center gap-2 text-sm text-[#94A3B8] hover:text-white"><ArrowLeft className="h-4 w-4" />Voltar</button> }
function HomeCard({ icon, title, description, cta, onClick, disabled = false, badge }: { icon: React.ReactNode; title: string; description: string; cta: string; onClick: () => void; disabled?: boolean; badge?: string }) { return <button type="button" disabled={disabled} aria-disabled={disabled} onClick={onClick} className={`relative rounded-2xl border border-white/[0.08] bg-navy-900 p-6 text-left transition ${disabled ? 'cursor-not-allowed opacity-45 grayscale' : 'hover:-translate-y-0.5 hover:border-brand/40'}`}>{badge && <span className="absolute right-4 top-4 rounded-full bg-amber-400 px-3 py-1 text-xs font-bold uppercase tracking-wide text-black">{badge}</span>}<div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/15 text-brand [&_svg]:h-6 [&_svg]:w-6">{icon}</div><h2 className="mt-5 text-xl font-bold text-white">{title}</h2><p className="mt-2 text-[#94A3B8]">{description}</p><p className="mt-4 font-semibold text-brand">{cta}</p></button> }
function Field({ label, value, onChange, ...props }: { label: string; value: string; onChange: (value: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) { const id = useId(); return <div><Label htmlFor={id}>{label}</Label><Input id={id} {...props} className="mt-2 h-11 border-white/10 bg-black/20 text-white" value={value} onChange={(e) => onChange(e.target.value)} /></div> }
function TextareaField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { const id = useId(); return <div><Label htmlFor={id}>{label}</Label><Textarea id={id} className="mt-2 min-h-28 w-full border-white/10 bg-black/20 text-white" value={value} onChange={(e) => onChange(e.target.value)} /></div> }
function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) { const id = useId(); return <div><Label htmlFor={id}>{label}</Label><Select value={value} onValueChange={onChange}><SelectTrigger id={id} className="mt-2 min-h-11 border-white/10 bg-black/20 text-left text-white"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></div> }
function SongCard({ song, onVote }: { song: Song; onVote: () => void }) { const youtube = song.youtube_link ?? song.youtubeLink; return <article className="rounded-2xl border border-white/[0.08] bg-navy-900 p-5"><div className="flex flex-wrap gap-2"><Badge variant="outline" className="border-brand/30 text-brand">{getCategory(song)}</Badge><Badge variant="outline" className="border-white/10 text-[#CBD5E1]">{getType(song)}</Badge></div><h3 className="mt-4 text-xl font-bold text-white">{getTitle(song)}</h3><p className="text-[#94A3B8]">{song.artist || 'Referência não informada'}</p>{(song.theme ?? song.tema) && <p className="mt-2 text-sm text-[#CBD5E1]">Tema: {song.theme ?? song.tema}</p>}<div className="mt-5 flex flex-col gap-2 sm:flex-row">{youtube && <Button type="button" variant="outline" className="border-white/10 bg-transparent text-white hover:bg-white/10" asChild><a href={youtube} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" />YouTube</a></Button>}<Button type="button" onClick={onVote} className="bg-brand hover:bg-brand/90"><Vote className="h-4 w-4" />Votar</Button></div></article> }
