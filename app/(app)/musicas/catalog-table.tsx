'use client'

import { useState, useMemo } from 'react'
import { Music, Trash2, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { MomentBadge } from '@/components/ui/moment-badge'
import type { SongVariationWithDetails } from '@/types/database'
import { deleteCatalogSong } from './catalog-actions'

interface CatalogTableProps {
  variations: SongVariationWithDetails[]
  isEditor: boolean
}

export function CatalogTable({ variations, isEditor }: CatalogTableProps) {
  const [filters, setFilters] = useState({
    title: '',
    artist: '',
    key_note: '',
    moment: '',
    soloist: '',
    version: '',
  })
  const [deleting, setDeleting] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return variations.filter((v) => {
      const title = v.songs?.title?.toLowerCase() ?? ''
      const artist = (v.artist ?? v.songs?.artist ?? '').toLowerCase()
      const keyNote = (v.key_note ?? '').toLowerCase()
      const moment = (v.moment ?? '').toLowerCase()
      const soloist = (v.profiles?.full_name ?? '').toLowerCase()
      const version = (v.version ?? '').toLowerCase()

      return (
        title.includes(filters.title.toLowerCase()) &&
        artist.includes(filters.artist.toLowerCase()) &&
        keyNote.includes(filters.key_note.toLowerCase()) &&
        moment.includes(filters.moment.toLowerCase()) &&
        soloist.includes(filters.soloist.toLowerCase()) &&
        version.includes(filters.version.toLowerCase())
      )
    })
  }, [variations, filters])

  function setFilter(key: keyof typeof filters, value: string) {
    setFilters((f) => ({ ...f, [key]: value }))
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Remover "${title}" do catálogo?`)) return
    setDeleting(id)
    try {
      await deleteCatalogSong(id)
      toast.success('Música removida do catálogo.')
    } catch {
      toast.error('Erro ao remover música.')
    } finally {
      setDeleting(null)
    }
  }

  const inputClass =
    'w-full px-2 py-1.5 rounded bg-navy-800 border border-white/[0.06] text-white text-xs focus:outline-none focus:border-brand placeholder-[#64748B]'

  return (
    <div className="space-y-4">
      {/* Mobile cards */}
      <div className="lg:hidden space-y-2">
        {/* Mobile filters */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <input className={inputClass} placeholder="Filtrar música..." value={filters.title} onChange={(e) => setFilter('title', e.target.value)} />
          <input className={inputClass} placeholder="Filtrar artista..." value={filters.artist} onChange={(e) => setFilter('artist', e.target.value)} />
          <input className={inputClass} placeholder="Filtrar tom..." value={filters.key_note} onChange={(e) => setFilter('key_note', e.target.value)} />
          <input className={inputClass} placeholder="Filtrar momento..." value={filters.moment} onChange={(e) => setFilter('moment', e.target.value)} />
        </div>

        {filtered.length === 0 ? (
          <EmptyState isEditor={isEditor} />
        ) : (
          filtered.map((v) => (
            <div key={v.id} className="rounded-modal border border-white/[0.06] bg-navy-900 p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-white">{v.songs?.title}</p>
                  <p className="text-xs text-[#94A3B8]">{v.artist ?? v.songs?.artist ?? '—'}</p>
                </div>
                {isEditor && (
                  <button
                    onClick={() => handleDelete(v.id, v.songs?.title ?? '')}
                    disabled={deleting === v.id}
                    className="p-1.5 rounded text-[#64748B] hover:text-red-400 hover:bg-red-400/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {v.key_note && (
                  <span className="text-xs font-mono bg-white/[0.06] px-1.5 py-0.5 rounded text-[#94A3B8]">{v.key_note}</span>
                )}
                <MomentBadge moment={v.moment} />
                {v.profiles?.full_name && (
                  <span className="text-xs text-[#94A3B8]">{v.profiles.full_name}</span>
                )}
                {v.version && (
                  <span className="text-xs text-[#64748B]">{v.version}</span>
                )}
              </div>
              {v.youtube_url && (
                <a href={v.youtube_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-brand hover:text-brand-light">
                  <ExternalLink className="w-3 h-3" />
                  Referência
                </a>
              )}
            </div>
          ))
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block border border-white/[0.06] rounded-modal overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] bg-navy-900">
              <th className="text-left py-3 px-4 text-xs font-medium text-[#64748B]">
                <div className="space-y-1">
                  <span>Música</span>
                  <input className={inputClass} placeholder="Filtrar..." value={filters.title} onChange={(e) => setFilter('title', e.target.value)} />
                </div>
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium text-[#64748B]">
                <div className="space-y-1">
                  <span>Artista</span>
                  <input className={inputClass} placeholder="Filtrar..." value={filters.artist} onChange={(e) => setFilter('artist', e.target.value)} />
                </div>
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium text-[#64748B]">
                <div className="space-y-1">
                  <span>Tom</span>
                  <input className={inputClass} placeholder="Filtrar..." value={filters.key_note} onChange={(e) => setFilter('key_note', e.target.value)} />
                </div>
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium text-[#64748B]">
                <div className="space-y-1">
                  <span>Momento</span>
                  <input className={inputClass} placeholder="Filtrar..." value={filters.moment} onChange={(e) => setFilter('moment', e.target.value)} />
                </div>
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium text-[#64748B]">
                <div className="space-y-1">
                  <span>Solista</span>
                  <input className={inputClass} placeholder="Filtrar..." value={filters.soloist} onChange={(e) => setFilter('soloist', e.target.value)} />
                </div>
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium text-[#64748B]">
                <div className="space-y-1">
                  <span>Versão</span>
                  <input className={inputClass} placeholder="Filtrar..." value={filters.version} onChange={(e) => setFilter('version', e.target.value)} />
                </div>
              </th>
              {isEditor && <th className="w-16 py-3 px-4" />}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={isEditor ? 7 : 6} className="py-16">
                  <EmptyState isEditor={isEditor} />
                </td>
              </tr>
            ) : (
              filtered.map((v) => (
                <tr key={v.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors group">
                  <td className="py-3 px-4">
                    <p className="text-sm font-medium text-white">{v.songs?.title}</p>
                    {v.youtube_url && (
                      <a href={v.youtube_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-brand hover:text-brand-light mt-0.5">
                        <ExternalLink className="w-3 h-3" />
                        Referência
                      </a>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-[#94A3B8]">
                    {v.artist ?? v.songs?.artist ?? '—'}
                  </td>
                  <td className="py-3 px-4">
                    {v.key_note ? (
                      <span className="text-xs font-mono text-[#94A3B8] bg-white/[0.06] px-1.5 py-0.5 rounded">{v.key_note}</span>
                    ) : (
                      <span className="text-[#64748B]">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <MomentBadge moment={v.moment} />
                  </td>
                  <td className="py-3 px-4 text-sm text-[#94A3B8]">
                    {v.profiles?.full_name ?? '—'}
                  </td>
                  <td className="py-3 px-4 text-sm text-[#94A3B8]">
                    {v.version ?? '—'}
                  </td>
                  {isEditor && (
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleDelete(v.id, v.songs?.title ?? '')}
                        disabled={deleting === v.id}
                        aria-label="Remover do catálogo"
                        className="p-1.5 rounded text-[#64748B] hover:text-red-400 hover:bg-red-400/10 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-40"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-[#64748B] text-right">
        {filtered.length} {filtered.length === 1 ? 'variação' : 'variações'} encontradas
        {filtered.length !== variations.length && ` de ${variations.length} no catálogo`}
      </p>
    </div>
  )
}

function EmptyState({ isEditor }: { isEditor: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Music className="w-10 h-10 text-[#64748B] mb-3" />
      <p className="text-[#94A3B8] font-medium mb-1">Nenhuma música no catálogo</p>
      <p className="text-sm text-[#64748B]">
        {isEditor
          ? 'Clique em "Adicionar Nova Música" para começar.'
          : 'O administrador ainda não adicionou músicas ao catálogo.'}
      </p>
    </div>
  )
}
