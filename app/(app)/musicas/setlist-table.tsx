'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { Music } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { SetlistSong, SetlistSongUpdate } from '@/types/database'
import { SortableSongRow } from './sortable-song-row'
import { SongCard } from './song-card'

interface Profile {
  id: string
  full_name: string | null
}

interface Event {
  id: string
  title: string
  date: string
  type: string
}

interface SetlistTableProps {
  songs: (SetlistSong & { profiles?: Profile | null })[]
  events: Event[]
  selectedEventId: string | null
  isAdmin: boolean
  profiles: Profile[]
}

export function SetlistTable({
  songs: initialSongs,
  events,
  selectedEventId,
  isAdmin,
  profiles,
}: SetlistTableProps) {
  const router = useRouter()
  const supabase = createClient()
  const [songs, setSongs] = useState(initialSongs)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  function handleEventChange(eventId: string) {
    router.push(`/musicas?eventId=${eventId}`)
  }

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return

      const oldIndex = songs.findIndex((s) => s.id === active.id)
      const newIndex = songs.findIndex((s) => s.id === over.id)
      const reordered = arrayMove(songs, oldIndex, newIndex)

      setSongs(reordered)
      setSaving(true)

      try {
        await Promise.all(
          reordered.map((song, index) =>
            supabase
              .from('setlist_songs')
              .update({ order_index: index })
              .eq('id', song.id)
          )
        )
      } catch {
        setSongs(initialSongs)
        toast.error('Erro ao salvar ordem. Tente novamente.')
      } finally {
        setSaving(false)
      }
    },
    [songs, initialSongs, supabase]
  )

  async function handleUpdateSong(
    id: string,
    updates: SetlistSongUpdate
  ) {
    setSongs((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    )
    const { error } = await supabase
      .from('setlist_songs')
      .update(updates)
      .eq('id', id)

    if (error) {
      setSongs(initialSongs)
      toast.error('Erro ao salvar. Tente novamente.')
    }
    setEditingId(null)
  }

  async function handleDeleteSong(id: string) {
    setSongs((prev) => prev.filter((s) => s.id !== id))
    const { error } = await supabase
      .from('setlist_songs')
      .delete()
      .eq('id', id)

    if (error) {
      setSongs(initialSongs)
      toast.error('Erro ao excluir. Tente novamente.')
    } else {
      toast.success('Música removida.')
    }
  }

  return (
    <div className="space-y-4">
      {/* Event selector */}
      {events.length > 0 && (
        <div className="flex items-center gap-3">
          <label htmlFor="event-select" className="text-sm text-[#94A3B8] flex-shrink-0">
            Evento:
          </label>
          <select
            id="event-select"
            value={selectedEventId ?? ''}
            onChange={(e) => handleEventChange(e.target.value)}
            className="flex-1 max-w-xs px-3 py-2 rounded-card bg-navy-800 border border-white/[0.08] text-white text-sm focus:outline-none focus:border-brand"
          >
            <option value="" disabled>Selecionar evento</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title} — {formatDate(event.date)}
              </option>
            ))}
          </select>
          {saving && (
            <span className="text-xs text-[#64748B] animate-pulse">Salvando...</span>
          )}
        </div>
      )}

      {songs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-white/[0.06] rounded-modal">
          <Music className="w-10 h-10 text-[#64748B] mb-3" aria-hidden="true" />
          <p className="text-[#94A3B8] font-medium mb-1">Nenhuma música no setlist</p>
          <p className="text-sm text-[#64748B]">
            {isAdmin
              ? 'Clique em "Nova Música" para adicionar.'
              : 'O admin ainda não adicionou músicas.'}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block border border-white/[0.06] rounded-modal overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] bg-navy-900">
                  {isAdmin && <th className="w-10 py-3 px-2" aria-label="Reordenar" />}
                  <th className="text-left py-3 px-4 text-xs font-medium text-[#64748B]">#</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-[#64748B]">Música</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-[#64748B]">Artista</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-[#64748B]">Tom</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-[#64748B]">Momento</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-[#64748B]">Solista</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-[#64748B]">Versão</th>
                  {isAdmin && <th className="w-20 py-3 px-4" aria-label="Ações" />}
                </tr>
              </thead>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={songs.map((s) => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <tbody>
                    {songs.map((song, index) => (
                      <SortableSongRow
                        key={song.id}
                        song={song}
                        index={index}
                        isAdmin={isAdmin}
                        isEditing={editingId === song.id}
                        profiles={profiles}
                        onEdit={() => setEditingId(song.id)}
                        onCancelEdit={() => setEditingId(null)}
                        onUpdate={(updates) => handleUpdateSong(song.id, updates)}
                        onDelete={() => handleDeleteSong(song.id)}
                      />
                    ))}
                  </tbody>
                </SortableContext>
              </DndContext>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden space-y-2">
            {songs.map((song, index) => (
              <SongCard
                key={song.id}
                song={song}
                index={index}
                isAdmin={isAdmin}
                profiles={profiles}
                onUpdate={(updates) => handleUpdateSong(song.id, updates)}
                onDelete={() => handleDeleteSong(song.id)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
  })
}
