import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AUDIO_EXTENSIONS, buildStemStoragePath, detectStemType } from '@/lib/stem-utils'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const setlistSongId = String(formData.get('setlistSongId') ?? '')
  const songId = String(formData.get('songId') ?? '')
  const files = formData.getAll('files').filter((file): file is File => file instanceof File)

  if ((!setlistSongId && !songId) || files.length === 0) {
    return NextResponse.json({ error: 'setlistSongId or songId and files are required.' }, { status: 400 })
  }

  const ownerId = setlistSongId || songId
  const uploads: Array<{ stem_type: string; audio_url: string; storage_path: string; original_file_name: string }> = []

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index]
    if (!file) continue

    const fileName = file.name.toLowerCase()
    if (!AUDIO_EXTENSIONS.some((ext) => fileName.endsWith(ext))) continue

    const path = buildStemStoragePath(ownerId, index, file.name)

    const { error: uploadError } = await supabase.storage
      .from('song-stems')
      .upload(path, file, { upsert: false, contentType: file.type || undefined })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: urlData } = supabase.storage.from('song-stems').getPublicUrl(path)

    uploads.push({
      stem_type: detectStemType(file.name),
      audio_url: urlData.publicUrl,
      storage_path: path,
      original_file_name: file.name,
    })
  }

  if (uploads.length === 0) {
    return NextResponse.json({ error: 'Nenhum áudio válido para upload.' }, { status: 400 })
  }

  const { error: insertError } = await supabase.from('song_stems').insert(
    uploads.map((item) => ({
      ...item,
      setlist_song_id: setlistSongId || null,
      song_id: songId || null,
    }))
  )

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, uploaded: uploads.length })
}
