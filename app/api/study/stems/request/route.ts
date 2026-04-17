import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const DEFAULT_STEMS = [
  'vocals',
  'back_vocal',
  'drums',
  'bass',
  'guitar',
  'piano',
  'instrumental',
]

interface YtdlResponse {
  success?: boolean
  audio_url?: string
  url?: string
  file?: string
  downloadUrl?: string
  error?: string
}

interface MusicGptResponse {
  success?: boolean
  task_id?: string
  conversion_id?: string
  eta?: number
  credit_estimate?: number
  message?: string
  status?: string
  error?: string
}

interface SetlistSongForStemRequest {
  id: string
  song_id: string | null
  song_title: string
  reference_link: string | null
  songs: { id: string; youtube_url: string | null } | { id: string; youtube_url: string | null }[] | null
}

async function requireActiveUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { supabase, user: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('status')
    .eq('id', user.id)
    .single()

  if (profile?.status !== 'active') {
    return { supabase, user, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { supabase, user, error: null }
}

function getWebhookUrl(jobId: string) {
  const secret = process.env.MUSICGPT_WEBHOOK_SECRET
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)

  if (!secret || !baseUrl) return null

  const url = new URL('/api/musicgpt/webhook', baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`)
  url.searchParams.set('jobId', jobId)
  url.searchParams.set('secret', secret)
  return url.toString()
}

function extractAudioUrl(data: YtdlResponse) {
  return data.audio_url ?? data.url ?? data.file ?? data.downloadUrl ?? null
}

export async function POST(request: Request) {
  const { supabase, user, error } = await requireActiveUser()
  if (error) return error

  const missing = [
    !process.env.YTDL_SERVICE_URL ? 'YTDL_SERVICE_URL' : null,
    !process.env.YTDL_SERVICE_TOKEN ? 'YTDL_SERVICE_TOKEN' : null,
    !process.env.MUSICGPT_API_KEY ? 'MUSICGPT_API_KEY' : null,
    !process.env.MUSICGPT_WEBHOOK_SECRET ? 'MUSICGPT_WEBHOOK_SECRET' : null,
  ].filter(Boolean)

  if (missing.length > 0) {
    return NextResponse.json(
      { error: 'Stem extraction is not configured.', missing },
      { status: 428 }
    )
  }

  const body = await request.json()
  const setlistSongId = body.setlistSongId as string | undefined
  const requestedStems = Array.isArray(body.stems) && body.stems.length > 0
    ? body.stems
    : DEFAULT_STEMS
  const preprocessingOptions = Array.isArray(body.preprocessingOptions)
    ? body.preprocessingOptions
    : ['Denoise']

  if (!setlistSongId) {
    return NextResponse.json({ error: 'setlistSongId is required' }, { status: 400 })
  }

  const { data: setlistSong, error: songError } = await supabase
    .from('setlist_songs')
    .select('id, song_id, song_title, reference_link, songs(id, youtube_url)')
    .eq('id', setlistSongId)
    .single()

  if (songError || !setlistSong) {
    return NextResponse.json({ error: 'Setlist song not found' }, { status: 404 })
  }

  const typedSetlistSong = setlistSong as unknown as SetlistSongForStemRequest
  const song = Array.isArray(typedSetlistSong.songs)
    ? typedSetlistSong.songs[0]
    : typedSetlistSong.songs
  const youtubeUrl = song?.youtube_url ?? typedSetlistSong.reference_link

  if (!youtubeUrl) {
    return NextResponse.json(
      { error: 'Esta música não tem link do YouTube para processar.' },
      { status: 422 }
    )
  }

  const { data: job, error: jobError } = await supabase
    .from('song_stem_jobs')
    .insert({
      song_id: typedSetlistSong.song_id,
      setlist_song_id: typedSetlistSong.id,
      requested_by: user!.id,
      status: 'pending',
      stems_requested: requestedStems,
      preprocessing_options: preprocessingOptions,
    })
    .select('id')
    .single()

  if (jobError || !job) {
    return NextResponse.json({ error: jobError?.message ?? 'Could not create job.' }, { status: 500 })
  }

  const ytdlBaseUrl = process.env.YTDL_SERVICE_URL!.trim()
  const ytdlUrl = new URL('/audio', ytdlBaseUrl)
  ytdlUrl.searchParams.set('url', youtubeUrl)

  const ytdlResponse = await fetch(ytdlUrl, {
    headers: {
      Authorization: `Bearer ${process.env.YTDL_SERVICE_TOKEN!.trim()}`,
      accept: 'application/json',
    },
  })
  const ytdlJson = await ytdlResponse.json().catch(() => null) as YtdlResponse | null
  const audioUrl = ytdlJson ? extractAudioUrl(ytdlJson) : null

  if (!ytdlResponse.ok || !audioUrl) {
    const errorMessage =
      ytdlJson?.error ??
      `Serviço de áudio retornou HTTP ${ytdlResponse.status}.`

    console.error('YTDL audio preparation failed', {
      status: ytdlResponse.status,
      error: errorMessage,
      setlistSongId: typedSetlistSong.id,
    })

    await supabase
      .from('song_stem_jobs')
      .update({
        status: 'failed',
        error_message: errorMessage,
      })
      .eq('id', job.id)

    return NextResponse.json(
      { error: `Não foi possível preparar o áudio do YouTube: ${errorMessage}` },
      { status: 502 }
    )
  }

  const webhookUrl = getWebhookUrl(job.id)
  if (!webhookUrl) {
    return NextResponse.json(
      { error: 'Webhook URL could not be built.' },
      { status: 428 }
    )
  }

  const formData = new FormData()
  formData.set('audio_url', audioUrl)
  formData.set('stems', JSON.stringify(requestedStems))
  formData.set('preprocessing_options', JSON.stringify(preprocessingOptions))
  formData.set('webhook_url', webhookUrl)

  const musicGptResponse = await fetch('https://api.musicgpt.com/api/public/v1/Extraction', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      Authorization: process.env.MUSICGPT_API_KEY!,
    },
    body: formData,
  })
  const musicGptJson = await musicGptResponse.json().catch(() => null) as MusicGptResponse | null

  if (!musicGptResponse.ok || !musicGptJson?.success) {
    const errorMessage = musicGptJson?.error ?? musicGptJson?.message ?? 'MusicGPT não iniciou a separação.'
    await supabase
      .from('song_stem_jobs')
      .update({ status: 'failed', error_message: errorMessage })
      .eq('id', job.id)

    return NextResponse.json({ error: errorMessage }, { status: 502 })
  }

  await supabase
    .from('song_stem_jobs')
    .update({
      status: 'processing',
      musicgpt_task_id: musicGptJson.task_id,
      musicgpt_conversion_id: musicGptJson.conversion_id,
      eta: musicGptJson.eta,
      credit_estimate: musicGptJson.credit_estimate,
    })
    .eq('id', job.id)

  return NextResponse.json({
    jobId: job.id,
    status: 'processing',
    taskId: musicGptJson.task_id,
    conversionId: musicGptJson.conversion_id,
    eta: musicGptJson.eta,
    creditEstimate: musicGptJson.credit_estimate,
  })
}
