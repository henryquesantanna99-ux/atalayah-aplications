import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const MAX_DAILY_CALLS = 2

export async function POST(request: Request) {
  const supabase = await createClient()

  // Verify auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { question } = await request.json()
  if (!question?.trim()) {
    return NextResponse.json({ error: 'Question is required' }, { status: 400 })
  }

  // Check and increment usage
  const today = new Date().toISOString().split('T')[0]

  const { data: existingUsage } = await supabase
    .from('laia_usage')
    .select('id, count')
    .eq('profile_id', user.id)
    .eq('used_at', today)
    .single()

  if (existingUsage && existingUsage.count >= MAX_DAILY_CALLS) {
    return NextResponse.json(
      { error: 'Daily limit reached' },
      { status: 429 }
    )
  }

  // Upsert usage count
  if (existingUsage) {
    await supabase
      .from('laia_usage')
      .update({ count: existingUsage.count + 1 })
      .eq('id', existingUsage.id)
  } else {
    await supabase.from('laia_usage').insert({
      profile_id: user.id,
      used_at: today,
      count: 1,
    })
  }

  // Get context (next event + setlist)
  const [eventResult] = await Promise.all([
    supabase
      .from('events')
      .select('title, date, arrival_time, type')
      .gte('date', today)
      .order('date')
      .limit(1)
      .single(),
  ])

  const nextEvent = eventResult.data
  const contextInfo = nextEvent
    ? `Próximo evento: ${nextEvent.title} em ${nextEvent.date}${nextEvent.arrival_time ? `, chegada às ${nextEvent.arrival_time}` : ''}.`
    : 'Nenhum evento próximo cadastrado.'

  const systemPrompt = `Você é Laia, a assistente inteligente do ministério de louvor AtalaYah.
Você auxilia os integrantes com dúvidas sobre escalas, músicas, estudos bíblicos e organização do ministério.
Seja gentil, encorajadora e sempre baseie suas respostas na fé cristã. Responda em português.
Contexto atual: ${contextInfo}`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question },
      ],
      max_tokens: 500,
    })

    const responseText = completion.choices[0].message.content ?? 'Não consegui gerar uma resposta.'

    // Insert Laia's response into group chat
    await supabase.from('chat_messages').insert({
      author_id: user.id,
      content: responseText,
      type: 'text',
      is_laia: true,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('OpenAI error:', error)
    return NextResponse.json({ error: 'AI error' }, { status: 500 })
  }
}
