import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAudioFileName } from '@/lib/stem-utils'
import { computeAudioHash, isStudyLevel, resolveAudioFileExtension } from '@/lib/music/study-audio'

async function requireActiveUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const { data: profile } = await supabase.from('profiles').select('status').eq('id', user.id).single()
  if (profile?.status !== 'active') {
    return { supabase, user: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { supabase, user, error: null }
}

export async function POST(request: Request) {
  const { supabase, user, error } = await requireActiveUser()
  if (error || !user) return error

  const formData = await request.formData()
  const file = formData.get('file')
  const level = String(formData.get('level') ?? '')
  const instrument = String(formData.get('instrument') ?? '').trim()

  if (!(file instanceof File) || !isAudioFileName(file.name)) {
    return NextResponse.json({ error: 'Envie um arquivo de áudio válido.' }, { status: 400 })
  }
  if (!isStudyLevel(level)) {
    return NextResponse.json({ error: 'Selecione um nível válido.' }, { status: 400 })
  }
  if (!instrument) {
    return NextResponse.json({ error: 'Informe o instrumento.' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const audioHash = computeAudioHash(buffer)

  const { data: existingVersion, error: lookupError } = await supabase
    .from('song_audio_versions')
    .select('id, song_id, status')
    .eq('audio_hash', audioHash)
    .maybeSingle()

  if (lookupError) {
    return NextResponse.json({ error: lookupError.message }, { status: 500 })
  }

  if (existingVersion) {
    const session = await upsertStudySession(supabase, {
      userId: user.id,
      versionId: existingVersion.id,
      songId: existingVersion.song_id,
      level,
      instrument,
    })
    if ('error' in session) return NextResponse.json({ error: session.error }, { status: 500 })

    return NextResponse.json({
      versionId: existingVersion.id,
      sessionId: session.id,
      reused: true,
      status: existingVersion.status,
    })
  }

  const versionId = randomUUID()
  const extension = resolveAudioFileExtension(file.name)
  const storagePath = `${versionId}/original.${extension}`

  const { error: uploadError } = await supabase.storage
    .from('study-song-audio')
    .upload(storagePath, buffer, { upsert: false, contentType: file.type || undefined })
  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { error: insertVersionError } = await supabase.from('song_audio_versions').insert({
    id: versionId,
    audio_hash: audioHash,
    storage_path: storagePath,
    file_format: extension,
    file_size_bytes: buffer.byteLength,
    first_uploaded_by: user.id,
    status: 'uploaded',
  })
  if (insertVersionError) {
    return NextResponse.json({ error: insertVersionError.message }, { status: 500 })
  }

  const { error: jobError } = await supabase.from('song_study_processing_jobs').insert({
    version_id: versionId,
    stage: 'identify',
    status: 'pending',
  })
  if (jobError) {
    return NextResponse.json({ error: jobError.message }, { status: 500 })
  }

  const session = await upsertStudySession(supabase, { userId: user.id, versionId, songId: null, level, instrument })
  if ('error' in session) return NextResponse.json({ error: session.error }, { status: 500 })

  return NextResponse.json({ versionId, sessionId: session.id, reused: false, status: 'uploaded' })
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

async function upsertStudySession(
  supabase: SupabaseServerClient,
  input: { userId: string; versionId: string; songId: string | null; level: string; instrument: string },
) {
  const { data, error } = await supabase
    .from('song_study_sessions')
    .upsert(
      {
        user_id: input.userId,
        version_id: input.versionId,
        song_id: input.songId,
        level: input.level as 'iniciante' | 'intermediario' | 'avancado',
        instrument: input.instrument,
      },
      { onConflict: 'user_id,version_id' },
    )
    .select('id')
    .single()

  if (error || !data) return { error: error?.message ?? 'Não foi possível criar a sessão de estudo.' }
  return { id: data.id }
}
