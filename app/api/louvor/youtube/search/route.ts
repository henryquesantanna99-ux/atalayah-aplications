import { NextResponse } from 'next/server'
import { searchYouTubeMusic } from '@/lib/music/youtube'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.trim()

  if (!query) return NextResponse.json({ error: 'q is required' }, { status: 400 })

  try {
    const results = await searchYouTubeMusic(query, 5)
    return NextResponse.json({ results })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Não foi possível buscar músicas.' },
      { status: process.env.YOUTUBE_API_KEY ? 502 : 428 }
    )
  }
}
