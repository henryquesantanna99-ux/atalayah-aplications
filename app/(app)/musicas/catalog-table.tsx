'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { ChevronDown, ExternalLink, Music, SlidersHorizontal, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { getMusicCompleteness } from '@/lib/music/completeness'
import type { TeamMastery } from '@/types/database'
import { AddCatalogSongModal } from './add-catalog-song-modal'
import { deleteCatalogSong, updateTeamMastery } from './catalog-actions'
import { calculateRepertoireReadiness, TEAM_MASTERY_OPTIONS } from './catalog-team-mastery'
import type { CatalogSong } from './catalog-types'
import { ResolveSongModal } from './resolve-song-modal'

export function CatalogTable({ variations: songs, isEditor }: { variations: CatalogSong[]; isEditor: boolean }) {
  const [filters, setFilters] = useState({ title: '', artist: '', version: '' })
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState<string | null>(null)
  const filtered = useMemo(() => songs.filter((song) => song.title.toLowerCase().includes(filters.title.toLowerCase()) &&
    (song.artist ?? '').toLowerCase().includes(filters.artist.toLowerCase()) && (song.version ?? '').toLowerCase().includes(filters.version.toLowerCase())), [songs, filters])
  const inputClass = 'w-full rounded bg-navy-800 border border-white/[0.06] px-2 py-1.5 text-xs text-white focus:outline-none focus:border-brand placeholder-[#64748B]'

  function toggle(id: string) { setExpanded((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next }) }
  function rowClick(event: React.MouseEvent, id: string) { if (!(event.target as HTMLElement).closest('button,a,input,select,textarea')) toggle(id) }
  async function remove(song: CatalogSong) {
    if (!confirm(`Remover "${song.title}" do catálogo?`)) return
    setDeleting(song.songId)
    try { await deleteCatalogSong(song.songId); toast.success('Música removida do catálogo.') }
    catch { toast.error('Erro ao remover música.') } finally { setDeleting(null) }
  }

  return <div className="space-y-4">
    <div className="grid gap-2 sm:grid-cols-3 lg:hidden">
      <input className={inputClass} placeholder="Filtrar música..." value={filters.title} onChange={(e) => setFilters((f) => ({ ...f, title: e.target.value }))} />
      <input className={inputClass} placeholder="Filtrar artista..." value={filters.artist} onChange={(e) => setFilters((f) => ({ ...f, artist: e.target.value }))} />
      <input className={inputClass} placeholder="Filtrar versão..." value={filters.version} onChange={(e) => setFilters((f) => ({ ...f, version: e.target.value }))} />
    </div>
    <div className="overflow-hidden rounded-modal border border-white/[0.06]">
      <table className="w-full text-sm">
        <thead className="hidden border-b border-white/[0.06] bg-navy-900 lg:table-header-group"><tr>
          <FilterHead label="Música" value={filters.title} onChange={(title) => setFilters((f) => ({ ...f, title }))} inputClass={inputClass} />
          <FilterHead label="Artista" value={filters.artist} onChange={(artist) => setFilters((f) => ({ ...f, artist }))} inputClass={inputClass} />
          <FilterHead label="Versão" value={filters.version} onChange={(version) => setFilters((f) => ({ ...f, version }))} inputClass={inputClass} />
          <th className="px-4 py-3 text-left text-xs font-medium text-[#64748B]">Domínio / análise</th><th className="w-56" />
        </tr></thead>
        <tbody>{filtered.length === 0 ? <tr><td colSpan={5}><EmptyState isEditor={isEditor} /></td></tr> : filtered.map((song) => {
          const isOpen = expanded.has(song.id)
          const completeness = getMusicCompleteness({ artist: song.artist, youtubeUrl: song.youtubeUrl, youtubeVideoId: song.youtubeVideoId, youtubeThumbnail: song.youtubeThumbnail, youtubeDuration: song.youtubeDuration, bpm: song.bpm, albumName: song.albumName, lyricsPlain: song.lyricsPlain, lyricsSynced: song.lyricsSynced, metadataSource: song.metadataSource, metadataPayload: song.metadataPayload, stems: song.stems })
          return <SongRows key={song.id} song={song} completeness={completeness} isOpen={isOpen} isEditor={isEditor} deleting={deleting === song.songId} onToggle={() => toggle(song.id)} onClick={(e) => rowClick(e, song.id)} onDelete={() => void remove(song)} />
        })}</tbody>
      </table>
    </div>
    <p className="text-right text-xs text-[#64748B]">{filtered.length} {filtered.length === 1 ? 'música encontrada' : 'músicas encontradas'}{filtered.length !== songs.length && ` de ${songs.length} no catálogo`}</p>
  </div>
}

function SongRows({ song, completeness, isOpen, isEditor, deleting, onToggle, onClick, onDelete }: { song: CatalogSong; completeness: ReturnType<typeof getMusicCompleteness>; isOpen: boolean; isEditor: boolean; deleting: boolean; onToggle(): void; onClick(e: React.MouseEvent): void; onDelete(): void }) {
  return <>
    <tr tabIndex={0} aria-expanded={isOpen} aria-controls={`details-${song.id}`} onClick={onClick} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle() } }} className="group cursor-pointer border-b border-white/[0.04] bg-navy-950 hover:bg-white/[0.02] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand">
      <td className="block px-4 pb-2 pt-4 lg:table-cell lg:py-3"><div className="flex items-start gap-2"><ChevronDown className={`mt-0.5 h-4 w-4 shrink-0 text-[#64748B] transition-transform ${isOpen ? 'rotate-180' : ''}`} /><div>{!completeness.complete && <div className="mb-1"><p className="text-xs font-semibold text-amber-200">Informações pendentes</p><p className="text-[11px] text-amber-200/70">Faltam: {completeness.missing.join(', ')}</p></div>}<p className="font-medium text-white">{song.title}</p></div></div></td>
      <td className="block px-10 py-1 text-[#94A3B8] lg:table-cell lg:px-4 lg:py-3">{song.artist ?? '—'}</td>
      <td className="block px-10 py-1 text-[#94A3B8] lg:table-cell lg:px-4 lg:py-3">{song.version ?? '—'}</td>
      <td className="block px-10 py-2 lg:table-cell lg:px-4 lg:py-3"><MasteryAnalysis songId={song.songId} value={song.teamMastery} editable={isEditor} /></td>
      <td className="block px-10 pb-4 lg:table-cell lg:px-4 lg:py-3"><div className="flex flex-wrap items-center gap-2">{!completeness.complete && isEditor && <ResolveSongModal song={song} />}{isEditor && <><AddCatalogSongModal song={{ songId: song.songId, variationId: song.variationId, title: song.title, artist: song.artist, version: song.version, youtubeUrl: song.youtubeUrl, youtubeVideoId: song.youtubeVideoId, youtubeThumbnail: song.youtubeThumbnail, youtubeDuration: song.youtubeDuration, bpm: song.bpm, lyricsPlain: song.lyricsPlain, lyricsSynced: song.lyricsSynced, albumName: song.albumName, metadataSource: song.metadataSource, metadataPayload: song.metadataPayload, teamMastery: song.teamMastery }} /><button onClick={onDelete} disabled={deleting} aria-label={`Remover ${song.title} do catálogo`} className="rounded p-1.5 text-[#64748B] hover:bg-red-400/10 hover:text-red-400 disabled:opacity-40"><Trash2 className="h-3.5 w-3.5" /></button></>}</div></td>
    </tr>
    {isOpen && <tr id={`details-${song.id}`} className="border-b border-white/[0.06] bg-navy-900/70"><td colSpan={5} className="p-5"><ExpandedSong song={song} /></td></tr>}
  </>
}

function ExpandedSong({ song }: { song: CatalogSong }) { return <div className="grid gap-5 lg:grid-cols-[240px_1fr_1fr]">
  <div>{song.youtubeThumbnail ? <Image src={song.youtubeThumbnail} alt={`Thumbnail de ${song.title}`} width={320} height={180} className="w-full rounded-card object-cover" /> : <div className="flex aspect-video items-center justify-center rounded-card bg-white/[0.04]"><Music className="h-8 w-8 text-[#64748B]" /></div>}{song.youtubeUrl && <a href={song.youtubeUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-brand"><ExternalLink className="h-3 w-3" />Abrir no YouTube</a>}<dl className="mt-3 space-y-1 text-xs text-[#94A3B8]"><div><dt className="inline text-white">Álbum: </dt><dd className="inline">{song.albumName ?? '—'}</dd></div><div><dt className="inline text-white">Duração / BPM: </dt><dd className="inline">{song.youtubeDuration ?? '—'} / {song.bpm ?? '—'}</dd></div><div><dt className="inline text-white">Fonte: </dt><dd className="inline">{song.metadataSource ?? 'cadastro manual'}</dd></div></dl></div>
  <div className="space-y-3"><TextBlock title="Letra simples" text={song.lyricsPlain} /><TextBlock title="Letra sincronizada" text={song.lyricsSynced} /></div>
  <div><h3 className="text-xs font-semibold uppercase tracking-wide text-white">Stems</h3>{song.stems.length ? <ul className="mt-2 space-y-1">{song.stems.map((stem) => <li key={stem.id} className="flex items-center gap-2 rounded bg-white/[0.04] px-2 py-1.5 text-xs text-[#CBD5E1]"><SlidersHorizontal className="h-3 w-3 text-emerald-300" /><span>{stem.original_file_name ?? 'Arquivo sem nome'}</span><span className="ml-auto text-[#64748B]">{stem.stem_type}</span></li>)}</ul> : <p className="mt-2 text-xs text-[#64748B]">Nenhuma stem cadastrada.</p>}<h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-white">Payload relevante</h3><pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap rounded bg-black/20 p-3 text-[11px] text-[#94A3B8]">{JSON.stringify(song.metadataPayload, null, 2) || '{}'}</pre></div>
</div> }
function TextBlock({ title, text }: { title: string; text: string | null }) { return <section><h3 className="text-xs font-semibold uppercase tracking-wide text-white">{title}</h3><p className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap rounded bg-black/20 p-3 text-xs text-[#CBD5E1]">{text || 'Não disponível.'}</p></section> }
function FilterHead({ label, value, onChange, inputClass }: { label: string; value: string; onChange(v: string): void; inputClass: string }) { return <th className="px-4 py-3 text-left text-xs font-medium text-[#64748B]"><div className="space-y-1"><span>{label}</span><input className={inputClass} placeholder="Filtrar..." value={value} onChange={(e) => onChange(e.target.value)} /></div></th> }
function MasteryAnalysis({ songId, value, editable }: { songId: string; value: TeamMastery; editable: boolean }) { const [mastery, setMastery] = useState(value); const [saving, setSaving] = useState(false); const readiness = calculateRepertoireReadiness(mastery); async function change(next: TeamMastery) { const previous = mastery; setMastery(next); setSaving(true); try { const result = await updateTeamMastery(songId, next); toast.success(`Domínio atualizado · IP ${result.ip}`) } catch (error) { setMastery(previous); toast.error(error instanceof Error ? error.message : 'Não foi possível atualizar o domínio.') } finally { setSaving(false) } } return <div className="min-w-40 space-y-1">{editable ? <select aria-label="Qual nível de domínio da equipe?" value={mastery} disabled={saving} onChange={(e) => void change(e.target.value as TeamMastery)} className="max-w-44 rounded border border-white/[0.08] bg-navy-800 px-2 py-1 text-xs text-white">{TEAM_MASTERY_OPTIONS.map((option) => <option key={option}>{option}</option>)}</select> : <p className="text-xs text-white">{mastery}</p>}<p className="text-[11px] text-[#64748B]">IP {readiness.readinessIndex} · {readiness.readinessLevel} · {readiness.suggestedStage}</p></div> }
function EmptyState({ isEditor }: { isEditor: boolean }) { return <div className="flex flex-col items-center py-16 text-center"><Music className="mb-3 h-10 w-10 text-[#64748B]" /><p className="font-medium text-[#94A3B8]">Nenhuma música no catálogo</p><p className="text-sm text-[#64748B]">{isEditor ? 'Adicione uma nova música para começar.' : 'O administrador ainda não adicionou músicas.'}</p></div> }
