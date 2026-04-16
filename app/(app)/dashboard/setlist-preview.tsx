import Link from 'next/link'
import { Music } from 'lucide-react'
import type { SetlistSong } from '@/types/database'

interface SetlistPreviewProps {
  songs: (SetlistSong & {
    profiles?: { id: string; full_name: string | null } | null
  })[]
  eventType?: string
}

export function SetlistPreview({ songs, eventType }: SetlistPreviewProps) {
  if (eventType && eventType !== 'culto') {
    return null
  }

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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left py-2 px-2 text-xs font-medium text-[#64748B]">Música</th>
                <th className="text-left py-2 px-2 text-xs font-medium text-[#64748B]">Vocal</th>
                <th className="text-left py-2 px-2 text-xs font-medium text-[#64748B]">Tom</th>
                <th className="text-left py-2 px-2 text-xs font-medium text-[#64748B]">Referência</th>
              </tr>
            </thead>
            <tbody>
              {songs.map((song) => (
                <tr key={song.id} className="border-b border-white/[0.04] last:border-0">
                  <td className="py-2 px-2 text-white font-medium">{song.song_title}</td>
                  <td className="py-2 px-2 text-[#94A3B8]">
                    {song.profiles?.full_name ?? '—'}
                  </td>
                  <td className="py-2 px-2">
                    {song.key_note ? (
                      <span className="text-xs font-mono text-[#94A3B8] bg-white/[0.06] px-1.5 py-0.5 rounded">
                        {song.key_note}
                      </span>
                    ) : (
                      <span className="text-[#64748B]">—</span>
                    )}
                  </td>
                  <td className="py-2 px-2">
                    {song.reference_link ? (
                      <a
                        href={song.reference_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand hover:text-brand-light transition-colors"
                      >
                        Abrir
                      </a>
                    ) : (
                      <span className="text-[#64748B]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
