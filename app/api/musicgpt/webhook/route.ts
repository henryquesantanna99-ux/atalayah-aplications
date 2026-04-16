import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

interface MusicGptWebhookPayload {
  success?: boolean
  task_id?: string
  conversion_id?: string
  audio_url?: string
  audio_url_wav?: string
  conversion_cost?: string
}

function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) return null

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })
}

function parseAudioMap(value: string | undefined) {
  if (!value) return {}

  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object'
      ? parsed as Record<string, string>
      : {}
  } catch {
    return {}
  }
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret') ?? request.headers.get('x-atalayah-webhook-secret')
  const jobId = searchParams.get('jobId')

  if (!process.env.MUSICGPT_WEBHOOK_SECRET || secret !== process.env.MUSICGPT_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!jobId) {
    return NextResponse.json({ error: 'jobId is required' }, { status: 400 })
  }

  const supabase = createServiceClient()
  if (!supabase) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY is not configured.' },
      { status: 428 }
    )
  }

  const payload = await request.json() as MusicGptWebhookPayload

  const { data: job, error: jobError } = await supabase
    .from('song_stem_jobs')
    .select('id, song_id, setlist_song_id')
    .eq('id', jobId)
    .single()

  if (jobError || !job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  if (!payload.success) {
    await supabase
      .from('song_stem_jobs')
      .update({
        status: 'failed',
        error_message: 'MusicGPT retornou falha no processamento.',
      })
      .eq('id', job.id)

    return NextResponse.json({ success: true })
  }

  const mp3Urls = parseAudioMap(payload.audio_url)
  const wavUrls = parseAudioMap(payload.audio_url_wav)
  const stems = Object.entries(mp3Urls)

  if (stems.length === 0) {
    await supabase
      .from('song_stem_jobs')
      .update({
        status: 'failed',
        error_message: 'MusicGPT concluiu sem enviar URLs de stems.',
      })
      .eq('id', job.id)

    return NextResponse.json({ success: true })
  }

  await supabase
    .from('song_stems')
    .delete()
    .eq('job_id', job.id)

  const { error: stemsError } = await supabase
    .from('song_stems')
    .insert(
      stems.map(([stemType, audioUrl]) => ({
        song_id: job.song_id,
        setlist_song_id: job.setlist_song_id,
        job_id: job.id,
        stem_type: stemType,
        audio_url: audioUrl,
        wav_url: wavUrls[stemType] ?? null,
      }))
    )

  if (stemsError) {
    await supabase
      .from('song_stem_jobs')
      .update({
        status: 'failed',
        error_message: stemsError.message,
      })
      .eq('id', job.id)

    return NextResponse.json({ error: stemsError.message }, { status: 500 })
  }

  await supabase
    .from('song_stem_jobs')
    .update({
      status: 'completed',
      musicgpt_task_id: payload.task_id,
      musicgpt_conversion_id: payload.conversion_id,
      credit_estimate: payload.conversion_cost ? Number(payload.conversion_cost) : null,
      error_message: null,
    })
    .eq('id', job.id)

  return NextResponse.json({ success: true })
}
