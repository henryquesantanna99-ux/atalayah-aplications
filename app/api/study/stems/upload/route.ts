import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg']

function detectStemType(fileName: string) {
  const normalized = fileName.toLowerCase()
  const rules: Array<{ stem: string; aliases: string[] }> = [
    { stem: 'vocals', aliases: ['voc', 'vocal', 'voz', 'lead vox'] },
    { stem: 'back_vocal', aliases: ['back', 'bv'] },
    { stem: 'drums', aliases: ['drum', 'kick', 'snare', 'hihat', 'tom', 'oh'] },
    { stem: 'bass', aliases: ['bass', 'baixo'] },
    { stem: 'guitar', aliases: ['gtr', 'guitar', 'guitarra'] },
    { stem: 'acoustic_guitar', aliases: ['acoustic', 'violao', 'nylon'] },
    { stem: 'piano', aliases: ['piano', 'keys', 'pad', 'synth', 'organ'] },
    { stem: 'percussion', aliases: ['perc', 'conga', 'shaker', 'tamb'] },
    { stem: 'click', aliases: ['click', 'metronome'] },
  ]

  return rules.find((rule) => rule.aliases.some((alias) => normalized.includes(alias)))?.stem ?? 'other'
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const setlistSongId = String(formData.get('setlistSongId') ?? '')
  const files = formData.getAll('files').filter((file): file is File => file instanceof File)

  if (!setlistSongId || files.length === 0) {
    return NextResponse.json({ error: 'setlistSongId and files are required.' }, { status: 400 })
  }

  const uploads: Array<{ stem_type: string; audio_url: string; storage_path: string }> = []

  for (const file of files) {
    const fileName = file.name.toLowerCase()
    if (!AUDIO_EXTENSIONS.some((ext) => fileName.endsWith(ext))) continue

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${setlistSongId}/${Date.now()}-${safeName}`

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
    })
  }

  if (uploads.length === 0) {
    return NextResponse.json({ error: 'Nenhum áudio válido para upload.' }, { status: 400 })
  }

  const { error: insertError } = await supabase.from('song_stems').insert(
    uploads.map((item) => ({ ...item, setlist_song_id: setlistSongId }))
  )

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, uploaded: uploads.length })
}
