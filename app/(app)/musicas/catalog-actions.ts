'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { canEdit } from '@/lib/permissions'

async function requireEditor() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  if (!canEdit(user.email)) throw new Error('Forbidden')
  return { supabase, user }
}

export async function addCatalogSong(input: {
  title: string
  artist: string | null
  keyNote: string | null
  moment: string | null
  soloistId: string | null
  version: string | null
  youtubeUrl: string | null
}) {
  const { supabase, user } = await requireEditor()

  // Upsert the base song record (by title + artist)
  const { data: existingSong } = await supabase
    .from('songs')
    .select('id')
    .ilike('title', input.title.trim())
    .maybeSingle()

  let songId: string

  if (existingSong?.id) {
    songId = existingSong.id
  } else {
    const { data: newSong, error: songError } = await supabase
      .from('songs')
      .insert({
        title: input.title.trim(),
        artist: input.artist || null,
        youtube_url: input.youtubeUrl || null,
        default_key: input.keyNote || null,
        created_by: user.id,
      })
      .select('id')
      .single()

    if (songError) throw new Error(songError.message)
    songId = newSong.id
  }

  // Insert a new song_variation entry
  const { error: varError } = await supabase.from('song_variations').insert({
    song_id: songId,
    artist: input.artist || null,
    key_note: input.keyNote || null,
    moment: (input.moment as 'Prévia' | 'Adoração' | 'Palavra' | 'Celebração' | null) || null,
    soloist_id: input.soloistId || null,
    version: input.version || null,
    youtube_url: input.youtubeUrl || null,
    created_by: user.id,
  })

  if (varError) throw new Error(varError.message)

  revalidatePath('/musicas')
}

export async function deleteCatalogSong(variationId: string) {
  const { supabase } = await requireEditor()
  const { error } = await supabase
    .from('song_variations')
    .delete()
    .eq('id', variationId)

  if (error) throw new Error(error.message)
  revalidatePath('/musicas')
}

export async function updateCatalogSong(
  variationId: string,
  input: {
    artist: string | null
    keyNote: string | null
    moment: string | null
    soloistId: string | null
    version: string | null
    youtubeUrl: string | null
  }
) {
  const { supabase } = await requireEditor()
  const { error } = await supabase
    .from('song_variations')
    .update({
      artist: input.artist || null,
      key_note: input.keyNote || null,
      moment: (input.moment as 'Prévia' | 'Adoração' | 'Palavra' | 'Celebração' | null) || null,
      soloist_id: input.soloistId || null,
      version: input.version || null,
      youtube_url: input.youtubeUrl || null,
    })
    .eq('id', variationId)

  if (error) throw new Error(error.message)
  revalidatePath('/musicas')
}
