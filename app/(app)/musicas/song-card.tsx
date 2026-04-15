'use client'

import { useState } from 'react'
import { ChevronDown, Trash2 } from 'lucide-react'
import { MomentBadge } from '@/components/ui/moment-badge'
import type { SetlistSong } from '@/types/database'

interface Profile {
  id: string
  full_name: string | null
}

interface SongCardProps {
  song: SetlistSong & { profiles?: Profile | null }
  index: number
  isAdmin: boolean
  profiles: Profile[]
  onUpdate: (updates: Partial<SetlistSong>) => void
  onDelete: () => void
}

export function SongCard({ song, index, isAdmin, onDelete }: SongCardProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-navy-900 border border-white/[0.06] rounded-card overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 p-4 text-left"
        aria-expanded={expanded}
      >
        <span className="text-xs text-[#64748B] w-5 flex-shrink-0">{index + 1}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{song.song_title}</p>
          {song.artist && (
            <p className="text-xs text-[#64748B] truncate">{song.artist}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {song.key_note && (
            <span className="text-xs font-mono text-[#94A3B8] bg-white/[0.06] px-1.5 py-0.5 rounded">
              {song.key_note}
            </span>
          )}
          <MomentBadge moment={song.moment} />
          <ChevronDown
            className={`w-4 h-4 text-[#64748B] transition-transform ${expanded ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-white/[0.04] space-y-2">
          {song.version && (
            <p className="text-xs text-[#94A3B8]">Versão: {song.version}</p>
          )}
          {song.reference_link && (
            <a
              href={song.reference_link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-brand hover:text-brand-light"
            >
              Link de referência →
            </a>
          )}
          {song.playlist_link && (
            <a
              href={song.playlist_link}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-xs text-brand hover:text-brand-light"
            >
              Playlist →
            </a>
          )}
          {isAdmin && (
            <div className="flex gap-2 pt-2">
              <button
                onClick={onDelete}
                aria-label={`Excluir ${song.song_title}`}
                className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                <Trash2 className="w-3 h-3" aria-hidden="true" />
                Excluir
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
