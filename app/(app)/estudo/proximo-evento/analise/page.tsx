import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/page-header'
import { calculateAnalysis, type PreparationStage } from '@/lib/repertoire-analysis'
import { RepertoireAnalysisClient, type AnalysisItem, type RepertoireOption } from './repertoire-analysis-client'

interface SongRow { id: string; song_id: string | null; song_title: string; artist: string | null }
interface AnalysisRow { setlist_song_id: string; mastery: number; complexity: number; changes: number; strategic_weight: number; preparation_stage: PreparationStage }
interface HistoryRow { song_id: string | null; song_title: string; events: { date: string } | null }

export default async function RepertoireAnalysisPage({
  searchParams,
}: {
  searchParams: { repertorio?: string }
}) {
  const supabase = await createClient()
  const today = new Date().toISOString().slice(0, 10)
  const [{ data: events }, { data: profile }] = await Promise.all([
    supabase.from('events').select('id, title, date').eq('type', 'culto').order('date', { ascending: false }),
    supabase.auth.getUser().then(async ({ data }) => data.user
      ? (await supabase.from('profiles').select('role').eq('id', data.user.id).single())
      : { data: null }),
  ])
  const repertoires = (events ?? []) as RepertoireOption[]
  const requested = searchParams.repertorio
  const selected = repertoires.some((event) => event.id === requested)
    ? requested!
    : repertoires.filter((event) => event.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0]?.id ?? repertoires[0]?.id

  if (!requested && selected) redirect(`/estudo/proximo-evento/analise?repertorio=${selected}`)

  let items: AnalysisItem[] = []
  if (selected) {
    const [{ data: songs }, { data: analyses }, { data: history }] = await Promise.all([
      supabase.from('setlist_songs').select('id, song_id, song_title, artist').eq('event_id', selected).order('order_index'),
      supabase.from('repertoire_item_analyses' as never).select('*'),
      supabase.from('setlist_songs').select('song_id, song_title, events!inner(date)').neq('event_id', selected),
    ])
    const analysisRows = (analyses ?? []) as unknown as AnalysisRow[]
    const songRows = (songs ?? []) as unknown as SongRow[]
    const historyRows = (history ?? []) as unknown as HistoryRow[]
    const analysisBySong = new Map(analysisRows.map((row) => [row.setlist_song_id, row]))
    items = songRows.map((song) => {
      const analysis = analysisBySong.get(song.id)
      const previous = historyRows.filter((entry) => song.song_id ? entry.song_id === song.song_id : entry.song_title === song.song_title)
      const lastDate = previous.map((entry) => entry.events?.date).filter((date): date is string => Boolean(date)).sort().at(-1)
      const days = lastDate ? Math.max(0, (Date.now() - new Date(`${lastDate}T00:00:00Z`).getTime()) / 86400000) : 365
      const recency = Math.min(10, Math.round((days / 36.5) * 10) / 10)
      const rotation = Math.min(10, previous.length)
      const manual = {
        mastery: Number(analysis?.mastery ?? 5), complexity: Number(analysis?.complexity ?? 5),
        changes: Number(analysis?.changes ?? 0), strategicWeight: Number(analysis?.strategic_weight ?? 5),
      }
      return {
        id: song.id, title: song.song_title, artist: song.artist, recency, rotation, ...manual,
        stage: (analysis?.preparation_stage ?? 'escuta') as PreparationStage,
        ...calculateAnalysis({ recency, rotation, ...manual }),
      }
    })
  }

  return <>
    <PageHeader title="Análise de Repertório" subtitle="Prioridade e fluxo de preparação por evento" />
    <RepertoireAnalysisClient repertoires={repertoires} selectedId={selected ?? ''} initialItems={items} isAdmin={profile?.role === 'admin'} />
  </>
}
