import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg', '.aiff', '.aif', '.wma']

function normalizeFileName(fileName: string) {
  return fileName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_\-.]+/g, ' ')
}

function detectStemType(fileName: string) {
  const normalized = normalizeFileName(fileName)
  const rules: Array<{ stem: string; aliases: string[] }> = [
    { stem: 'voice_guide', aliases: ['voz guia', 'lead vocal guia', 'guia'] },
    { stem: 'back_vocal', aliases: ['back vocal', 'background vocal', 'backing vocal', 'backing vox', 'b vocal', 'bv', 'choir', 'coro'] },
    { stem: 'vocals', aliases: ['vocal', 'vocals', 'vox', 'voz', 'lead vox', 'lead vocal'] },
    { stem: 'drums', aliases: ['drum', 'drums', 'bateria', 'kick', 'bumbo', 'snare', 'caixa', 'hihat', 'hi hat', 'tom', 'overhead', 'oh '] },
    { stem: 'bass', aliases: ['bass', 'baixo', 'sub bass', 'contrabaixo'] },
    { stem: 'acoustic_guitar', aliases: ['acoustic guitar', 'acoustic', 'violao', 'nylon', 'aco', 'steel guitar'] },
    { stem: 'guitar', aliases: ['electric guitar', 'gtr', 'guitar', 'guitarra', 'eguitar', 'lead guitar'] },
    { stem: 'piano', aliases: ['piano', 'keys', 'teclado', 'pad', 'synth', 'organ', 'orgao', 'rhodes', 'string pad'] },
    { stem: 'percussion', aliases: ['perc', 'percussion', 'percussao', 'conga', 'shaker', 'tamb', 'tambourine', 'pandeiro'] },
    { stem: 'strings', aliases: ['strings', 'cordas', 'violin', 'violino', 'cello', 'orchestra'] },
    { stem: 'brass', aliases: ['brass', 'sopro', 'sopros', 'trumpet', 'trompete', 'sax', 'horn'] },
    { stem: 'click', aliases: ['click', 'metronome', 'metronomo', 'cue'] },
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

  const uploads: Array<{ stem_type: string; audio_url: string; storage_path: string; original_file_name: string }> = []

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index]
    if (!file) continue

    const fileName = file.name.toLowerCase()
    if (!AUDIO_EXTENSIONS.some((ext) => fileName.endsWith(ext))) continue

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${setlistSongId}/${Date.now()}-${index}-${safeName}`

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
    uploads.map((item) => ({ ...item, setlist_song_id: setlistSongId }))
  )

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, uploaded: uploads.length })
}
