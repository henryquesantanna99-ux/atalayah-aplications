'use client'

import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Pencil, Trash2, Check, X, ExternalLink } from 'lucide-react'
import { MomentBadge } from '@/components/ui/moment-badge'
import type { SetlistSong } from '@/types/database'

const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
  'Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'A#m', 'Bm']
const MOMENTS = ['Prévia', 'Adoração', 'Palavra', 'Celebração'] as const

interface Profile {
  id: string
  full_name: string | null
}

interface SortableSongRowProps {
  song: SetlistSong & { profiles?: Profile | null }
  index: number
  isAdmin: boolean
  isEditing: boolean
  profiles: Profile[]
  onEdit: () => void
  onCancelEdit: () => void
  onUpdate: (updates: Partial<SetlistSong>) => void
  onDelete: () => void
}

export function SortableSongRow({
  song,
  index,
  isAdmin,
  isEditing,
  profiles,
  onEdit,
  onCancelEdit,
  onUpdate,
  onDelete,
}: SortableSongRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: song.id, disabled: !isAdmin })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const [draft, setDraft] = useState({
    song_title: song.song_title,
    artist: song.artist ?? '',
    key_note: song.key_note ?? '',
    moment: song.moment ?? '',
    soloist_id: song.soloist_id ?? '',
    version: song.version ?? '',
    reference_link: song.reference_link ?? '',
  })

  function handleSave() {
    onUpdate({
      song_title: draft.song_title,
      artist: draft.artist || null,
      key_note: draft.key_note || null,
      moment: (draft.moment as SetlistSong['moment']) || null,
      soloist_id: draft.soloist_id || null,
      version: draft.version || null,
      reference_link: draft.reference_link || null,
    })
  }

  const soloist = profiles.find((p) => p.id === song.soloist_id)

  if (isEditing) {
    return (
      <tr
        ref={setNodeRef}
        style={style}
        className="bg-navy-800 border-b border-white/[0.06]"
      >
        {isAdmin && <td className="py-2 px-2" />}
        <td className="py-2 px-4 text-xs text-[#64748B]">{index + 1}</td>
        <td className="py-2 px-4">
          <input
            value={draft.song_title}
            onChange={(e) => setDraft((d) => ({ ...d, song_title: e.target.value }))}
            className="w-full bg-navy-700 border border-brand/40 rounded px-2 py-1 text-sm text-white focus:outline-none"
            autoFocus
            aria-label="Título da música"
          />
        </td>
        <td className="py-2 px-4">
          <input
            value={draft.artist}
            onChange={(e) => setDraft((d) => ({ ...d, artist: e.target.value }))}
            className="w-full bg-navy-700 border border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-brand/40"
            aria-label="Artista"
          />
        </td>
        <td className="py-2 px-4">
          <select
            value={draft.key_note}
            onChange={(e) => setDraft((d) => ({ ...d, key_note: e.target.value }))}
            className="bg-navy-700 border border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-brand/40"
            aria-label="Tom"
          >
            <option value="">—</option>
            {KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </td>
        <td className="py-2 px-4">
          <select
            value={draft.moment}
            onChange={(e) => setDraft((d) => ({ ...d, moment: e.target.value }))}
            className="bg-navy-700 border border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-brand/40"
            aria-label="Momento"
          >
            <option value="">—</option>
            {MOMENTS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </td>
        <td className="py-2 px-4">
          <select
            value={draft.soloist_id}
            onChange={(e) => setDraft((d) => ({ ...d, soloist_id: e.target.value }))}
            className="bg-navy-700 border border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-brand/40"
            aria-label="Solista"
          >
            <option value="">—</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>{p.full_name}</option>
            ))}
          </select>
        </td>
        <td className="py-2 px-4">
          <input
            value={draft.version}
            onChange={(e) => setDraft((d) => ({ ...d, version: e.target.value }))}
            className="w-full bg-navy-700 border border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-brand/40"
            aria-label="Versão"
          />
        </td>
        <td className="py-2 px-4">
          <div className="flex items-center gap-1">
            <button
              onClick={handleSave}
              aria-label="Salvar"
              className="p-1.5 rounded text-emerald-400 hover:bg-emerald-400/10 transition-colors"
            >
              <Check className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              onClick={onCancelEdit}
              aria-label="Cancelar"
              className="p-1.5 rounded text-[#64748B] hover:bg-white/[0.06] transition-colors"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors group"
    >
      {isAdmin && (
        <td className="py-3 px-2">
          <button
            {...attributes}
            {...listeners}
            aria-label="Arrastar para reordenar"
            className="cursor-grab active:cursor-grabbing p-1 text-[#64748B] hover:text-[#94A3B8] opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <GripVertical className="w-4 h-4" aria-hidden="true" />
          </button>
        </td>
      )}
      <td className="py-3 px-4 text-xs text-[#64748B]">{index + 1}</td>
      <td className="py-3 px-4">
        <div>
          <p className="text-sm font-medium text-white">{song.song_title}</p>
          {song.reference_link && (
            <a
              href={song.reference_link}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Link de referência"
              className="inline-flex items-center gap-1 text-xs text-brand hover:text-brand-light mt-0.5"
            >
              <ExternalLink className="w-3 h-3" aria-hidden="true" />
              Referência
            </a>
          )}
        </div>
      </td>
      <td className="py-3 px-4 text-sm text-[#94A3B8]">{song.artist ?? '—'}</td>
      <td className="py-3 px-4">
        {song.key_note ? (
          <span className="text-xs font-mono text-[#94A3B8] bg-white/[0.06] px-1.5 py-0.5 rounded">
            {song.key_note}
          </span>
        ) : (
          <span className="text-[#64748B]">—</span>
        )}
      </td>
      <td className="py-3 px-4">
        <MomentBadge moment={song.moment} />
      </td>
      <td className="py-3 px-4 text-sm text-[#94A3B8]">
        {soloist?.full_name ?? '—'}
      </td>
      <td className="py-3 px-4 text-sm text-[#94A3B8]">{song.version ?? '—'}</td>
      {isAdmin && (
        <td className="py-3 px-4">
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onEdit}
              aria-label={`Editar ${song.song_title}`}
              className="p-1.5 rounded text-[#64748B] hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <button
              onClick={onDelete}
              aria-label={`Excluir ${song.song_title}`}
              className="p-1.5 rounded text-[#64748B] hover:text-red-400 hover:bg-red-400/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </td>
      )}
    </tr>
  )
}
