import Link from 'next/link'
import { Music } from 'lucide-react'
import type { SetlistSong } from '@/types/database'

const MOMENT_COLORS: Record<string, string> = {
  'Prévia': 'bg-slate-700/50 text-slate-300',
  'Adoração': 'bg-blue-900/50 text-blue-300',
  'Palavra': 'bg-indigo-900/50 text-indigo-300',
  'Celebração': 'bg-emerald-900/50 text-emerald-300',
}

interface SetlistPreviewProps {
  songs: SetlistSong[]
}

export function SetlistPreview({ songs }: SetlistPreviewProps) {
  return (
    <div className="bg-navy-900 border border-white/[0.06] rounded-modal p-6 lg:col-span-2">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-[#94A3B8]">Músicas do Próximo Culto</h2>
        <Link
          href="/musicas"
          className="text-xs text-brand hover:text-brand-light transition-colors"
        >
          Ver setlist completo →
        </Link>
      </div>

      {songs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <Music className="w-8 h-8 text-[#64748B] mb-2" aria-hidden="true" />
          <p className="text-sm text-[#64748B]">Nenhuma música no setlist ainda.</p>
        </div>
      ) : (
        <ol className="space-y-2">
          {songs.map((song, index) => (
            <li
              key={song.id}
              className="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-0"
            >
              <span className="text-xs text-[#64748B] w-5 text-right flex-shrink-0">
                {index + 1}
              </span>
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
                {song.moment && (
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      MOMENT_COLORS[song.moment] ?? 'bg-white/10 text-white/60'
                    }`}
                  >
                    {song.moment}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
