'use client'

import { useId, useMemo, useState, useTransition } from 'react'
import { ArrowLeft, ExternalLink, HeartHandshake, Music2, Search, Send, Vote } from 'lucide-react'
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

type View = 'home' | 'suggest' | 'vote'

const categories = ['Prévia', 'Celebração', 'Adoração', 'Não sei informar']
const worshipTypes = ['Necessidade / clamor / entrega', 'Resposta / direção / declaração', 'Os dois', 'Não sei informar']
const spiritualAreas = [
  'Arrependimento e mudança de vida',
  'Fé e confiança em Deus',
  'Consolo e cura interior',
  'Gratidão e adoração',
  'Entrega e rendição',
  'Direção para uma decisão',
  'Renovo espiritual',
  'Não consegui perceber claramente',
  'Outro',
]
const nextSteps = [
  'Orar mais sobre isso',
  'Conversar com alguém da liderança',
  'Buscar reconciliação com alguém',
  'Voltar a congregar com mais constância',
  'Servir em alguma área',
  'Estudar mais a Palavra',
  'Pedir ajuda pastoral',
  'Ainda não sei',
  'Outro',
]

const emptySuggestion = {
  nome: '',
  tribo: '',
  telefone: '',
  musica: '',
  artista: '',
  categoriaSugerida: '',
  tipoLouvor: '',
  motivo: '',
  spiritual_area: '',
  spiritual_area_other: '',
  spiritual_experience_note: '',
  next_step: '',
  next_step_other: '',
}

export function WorshipVotingClient({ songs }: { songs: Song[] }) {
  const [view, setView] = useState<View>('home')
  const [isPending, startTransition] = useTransition()
  const [suggestion, setSuggestion] = useState(emptySuggestion)
  const [filters, setFilters] = useState({ search: '', category: 'Todas', type: 'Todos' })
  const [voteSong, setVoteSong] = useState<Song | null>(null)
  const [voteForm, setVoteForm] = useState({ nome: '', telefone: '', tribo: '', conheceMusica: 'Sim', ajudaACantar: 'Sim', nota: '5' })

  const filteredSongs = useMemo(() => songs.filter((song) => {
    const title = getTitle(song).toLowerCase()
    const category = getCategory(song)
    const type = getType(song)
    return title.includes(filters.search.toLowerCase())
      && (filters.category === 'Todas' || category === filters.category)
      && (filters.type === 'Todos' || type === filters.type)
  }), [songs, filters])

  function submitSuggestion(event: React.FormEvent) {
    event.preventDefault()
    startTransition(async () => {
      const response = await salvarIndicacao(suggestion)
      if (response.success) {
        toast.success(response.message)
        setSuggestion(emptySuggestion)
        setView('home')
      } else {
        toast.error(response.message)
      }
    })
  }

  function submitVote(event: React.FormEvent) {
    event.preventDefault()
    if (!voteSong) return
    startTransition(async () => {
      const response = await salvarVoto({
        musicaId: voteSong.id,
        musica: getTitle(voteSong),
        ...voteForm,
        nota: Number(voteForm.nota),
        userAgent: navigator.userAgent,
      })
      if (response.success) {
        toast.success(response.message)
        setVoteSong(null)
        setVoteForm({ nome: '', telefone: '', tribo: '', conheceMusica: 'Sim', ajudaACantar: 'Sim', nota: '5' })
      } else {
        toast.error(response.message)
      }
    })
  }

  if (view === 'suggest') {
    return <section className="max-w-3xl mx-auto rounded-2xl border border-white/[0.08] bg-navy-900 p-5 sm:p-6">
      <BackButton onClick={() => setView('home')} />
      <h2 className="text-2xl font-bold text-white mb-2">Indicar uma música</h2>
      <p className="text-sm text-[#94A3B8] mb-6">Envie uma sugestão para análise ministerial, pastoral, teológica e técnica.</p>
      <form onSubmit={submitSuggestion} className="grid gap-4">
        <div className="grid sm:grid-cols-2 gap-4"><Field label="Nome completo *" value={suggestion.nome} onChange={(nome) => setSuggestion({ ...suggestion, nome })} /><Field label="Tribo / Grupo / Ministério *" value={suggestion.tribo} onChange={(tribo) => setSuggestion({ ...suggestion, tribo })} /></div>
        <Field label="Telefone / WhatsApp *" value={suggestion.telefone} onChange={(telefone) => setSuggestion({ ...suggestion, telefone })} inputMode="tel" />
        <div className="grid sm:grid-cols-2 gap-4"><Field label="Nome da música *" value={suggestion.musica} onChange={(musica) => setSuggestion({ ...suggestion, musica })} /><Field label="Artista / Ministério / Referência" value={suggestion.artista} onChange={(artista) => setSuggestion({ ...suggestion, artista })} /></div>
        <div className="grid sm:grid-cols-2 gap-4">
          <SelectField label="Categoria sugerida" value={suggestion.categoriaSugerida} options={categories} onChange={(categoriaSugerida) => setSuggestion({ ...suggestion, categoriaSugerida })} />
          <SelectField label="Expressa mais" value={suggestion.tipoLouvor} options={worshipTypes} onChange={(tipoLouvor) => setSuggestion({ ...suggestion, tipoLouvor })} />
        </div>
        <TextareaField label="Por que você está indicando essa música?" value={suggestion.motivo} onChange={(motivo) => setSuggestion({ ...suggestion, motivo })} />
        <SelectField label="Durante o louvor e a ministração, em qual área você percebeu que Deus mais trabalhou no seu coração hoje?" value={suggestion.spiritual_area} options={spiritualAreas} onChange={(spiritual_area) => setSuggestion({ ...suggestion, spiritual_area, spiritual_area_other: spiritual_area === 'Outro' ? suggestion.spiritual_area_other : '' })} />
        {suggestion.spiritual_area === 'Outro' && <Field label="Conte em qual área Deus trabalhou" value={suggestion.spiritual_area_other} onChange={(spiritual_area_other) => setSuggestion({ ...suggestion, spiritual_area_other })} />}
        <TextareaField label="Se quiser, conte brevemente o que aconteceu no seu coração." value={suggestion.spiritual_experience_note} onChange={(spiritual_experience_note) => setSuggestion({ ...suggestion, spiritual_experience_note })} />
        <SelectField label="Qual próximo passo você sente que precisa dar depois do culto de hoje?" value={suggestion.next_step} options={nextSteps} onChange={(next_step) => setSuggestion({ ...suggestion, next_step, next_step_other: next_step === 'Outro' ? suggestion.next_step_other : '' })} />
        {suggestion.next_step === 'Outro' && <Field label="Descreva o próximo passo" value={suggestion.next_step_other} onChange={(next_step_other) => setSuggestion({ ...suggestion, next_step_other })} />}
        <Button disabled={isPending} className="h-12 bg-brand hover:bg-brand/90"><Send className="w-4 h-4" />{isPending ? 'Enviando...' : 'Enviar indicação'}</Button>
      </form>
    </section>
  }

  if (view === 'vote') {
    return <section className="space-y-5">
      <BackButton onClick={() => setView('home')} />
      <div className="rounded-2xl border border-white/[0.08] bg-navy-900 p-5">
        <h2 className="text-2xl font-bold text-white">Votar em músicas</h2>
        <p className="text-sm text-[#94A3B8] mt-2">Seu voto é um termômetro da igreja. A aprovação final considera coerência teológica, pastoreio, viabilidade técnica e momento do culto.</p>
        <div className="grid md:grid-cols-3 gap-3 mt-5">
          <div className="relative"><Search className="absolute left-3 top-3 w-4 h-4 text-[#64748B]" /><Input className="pl-9 h-11 bg-black/20 border-white/10 text-white" placeholder="Buscar música" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} /></div>
          <Select value={filters.category} onValueChange={(category) => setFilters({ ...filters, category })}><SelectTrigger className="h-11 bg-black/20 border-white/10 text-white"><SelectValue /></SelectTrigger><SelectContent>{['Todas', 'Prévia', 'Celebração', 'Adoração'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
          <Select value={filters.type} onValueChange={(type) => setFilters({ ...filters, type })}><SelectTrigger className="h-11 bg-black/20 border-white/10 text-white"><SelectValue /></SelectTrigger><SelectContent>{['Todos', 'Sacerdotal', 'Profético', 'Ambos'].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
        </div>
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        {filteredSongs.map((song) => <SongCard key={song.id} song={song} onVote={() => setVoteSong(song)} />)}
      </div>
      {filteredSongs.length === 0 && <p className="rounded-2xl border border-white/[0.08] bg-navy-900 p-6 text-[#94A3B8]">Nenhuma música disponível com esses filtros.</p>}
      {voteSong && <div className="fixed inset-0 z-50 bg-black/80 p-4 overflow-y-auto"><form onSubmit={submitVote} className="mx-auto mt-8 max-w-lg rounded-2xl border border-white/10 bg-navy-900 p-5 space-y-4"><BackButton onClick={() => setVoteSong(null)} /><h3 className="text-xl font-bold text-white">Votar em {getTitle(voteSong)}</h3><Field label="Nome completo *" value={voteForm.nome} onChange={(nome) => setVoteForm({ ...voteForm, nome })} /><Field label="Telefone / WhatsApp *" value={voteForm.telefone} onChange={(telefone) => setVoteForm({ ...voteForm, telefone })} inputMode="tel" /><Field label="Tribo / Grupo / Ministério" value={voteForm.tribo} onChange={(tribo) => setVoteForm({ ...voteForm, tribo })} /><SelectField label="Você conhece essa música?" value={voteForm.conheceMusica} options={['Sim', 'Não']} onChange={(conheceMusica) => setVoteForm({ ...voteForm, conheceMusica })} /><SelectField label="Essa música ajuda você a cantar junto no culto?" value={voteForm.ajudaACantar} options={['Sim', 'Não', 'Não sei']} onChange={(ajudaACantar) => setVoteForm({ ...voteForm, ajudaACantar })} /><SelectField label="Nota" value={voteForm.nota} options={['1', '2', '3', '4', '5']} onChange={(nota) => setVoteForm({ ...voteForm, nota })} /><Button disabled={isPending} className="w-full h-12 bg-brand hover:bg-brand/90"><Vote className="w-4 h-4" />{isPending ? 'Registrando...' : 'Registrar voto'}</Button></form></div>}
    </section>
  }

  return <section className="max-w-5xl mx-auto space-y-6">
    <div className="rounded-3xl border border-white/[0.08] bg-gradient-to-br from-navy-900 to-black p-6 sm:p-8">
      <Badge className="bg-brand/15 text-brand border-brand/20 hover:bg-brand/15">Termômetro da igreja</Badge>
      <h1 className="mt-4 text-3xl sm:text-4xl font-bold text-white">Indicação e Votação de Louvor</h1>
      <p className="mt-4 text-[#CBD5E1] max-w-3xl">As indicações e votações ajudam o ministério a ouvir a igreja e entender quais músicas têm edificado a congregação. A escolha final do repertório passa por avaliação ministerial, pastoral, teológica e técnica.</p>
    </div>
    <div className="grid md:grid-cols-2 gap-4">
      <HomeCard icon={<Music2 />} title="Indicar uma música" description="Envie uma sugestão de música para o ministério avaliar." cta="Clique aqui para indicar" onClick={() => setView('suggest')} />
      <HomeCard icon={<HeartHandshake />} title="Votar em músicas" description="A votação pública estará disponível em breve." cta="Clique aqui para votar" disabled badge="Em breve" onClick={() => setView('vote')} />
    </div>
  </section>
}

function getTitle(song: Song) { return song.song_title ?? song.musica ?? 'Música sem título' }
function getCategory(song: Song) { return song.category ?? song.categoria ?? 'Não informada' }
function getType(song: Song) { const type = song.worship_type ?? song.tipoLouvor ?? 'Ambos'; return type === 'Os dois' ? 'Ambos' : type }

function BackButton({ onClick }: { onClick: () => void }) { return <button type="button" onClick={onClick} className="mb-4 inline-flex items-center gap-2 text-sm text-[#94A3B8] hover:text-white"><ArrowLeft className="w-4 h-4" />Voltar</button> }
function HomeCard({ icon, title, description, cta, onClick, disabled = false, badge }: { icon: React.ReactNode; title: string; description: string; cta: string; onClick: () => void; disabled?: boolean; badge?: string }) { return <button type="button" disabled={disabled} aria-disabled={disabled} onClick={onClick} className={`relative text-left rounded-2xl border border-white/[0.08] bg-navy-900 p-6 transition ${disabled ? 'cursor-not-allowed opacity-45 grayscale' : 'hover:border-brand/40 hover:-translate-y-0.5'}`}>{badge && <span className="absolute right-4 top-4 rounded-full bg-amber-400 px-3 py-1 text-xs font-bold uppercase tracking-wide text-black">{badge}</span>}<div className="w-12 h-12 rounded-2xl bg-brand/15 text-brand flex items-center justify-center [&_svg]:w-6 [&_svg]:h-6">{icon}</div><h2 className="mt-5 text-xl font-bold text-white">{title}</h2><p className="mt-2 text-[#94A3B8]">{description}</p><p className="mt-4 font-semibold text-brand">{cta}</p></button> }
function Field({ label, value, onChange, ...props }: { label: string; value: string; onChange: (value: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) { const id = useId(); return <div><Label htmlFor={id}>{label}</Label><Input id={id} {...props} className="mt-2 h-11 bg-black/20 border-white/10 text-white" value={value} onChange={(e) => onChange(e.target.value)} /></div> }
function TextareaField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { const id = useId(); return <div><Label htmlFor={id}>{label}</Label><Textarea id={id} className="mt-2 min-h-28 w-full bg-black/20 border-white/10 text-white" value={value} onChange={(e) => onChange(e.target.value)} /></div> }
function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) { const id = useId(); return <div><Label htmlFor={id}>{label}</Label><Select value={value} onValueChange={onChange}><SelectTrigger id={id} className="mt-2 min-h-11 bg-black/20 border-white/10 text-left text-white"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></div> }
function SongCard({ song, onVote }: { song: Song; onVote: () => void }) { const youtube = song.youtube_link ?? song.youtubeLink; return <article className="rounded-2xl border border-white/[0.08] bg-navy-900 p-5"><div className="flex flex-wrap gap-2"><Badge variant="outline" className="border-brand/30 text-brand">{getCategory(song)}</Badge><Badge variant="outline" className="border-white/10 text-[#CBD5E1]">{getType(song)}</Badge></div><h3 className="mt-4 text-xl font-bold text-white">{getTitle(song)}</h3><p className="text-[#94A3B8]">{song.artist || 'Referência não informada'}</p>{(song.theme ?? song.tema) && <p className="mt-2 text-sm text-[#CBD5E1]">Tema: {song.theme ?? song.tema}</p>}<div className="mt-5 flex flex-col sm:flex-row gap-2">{youtube && <Button type="button" variant="outline" className="border-white/10 bg-transparent text-white hover:bg-white/10" asChild><a href={youtube} target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4" />YouTube</a></Button>}<Button type="button" onClick={onVote} className="bg-brand hover:bg-brand/90"><Vote className="w-4 h-4" />Votar</Button></div></article> }
