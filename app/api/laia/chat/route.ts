import { convertToModelMessages, streamText } from 'ai'
import { openai } from '@/lib/openai'
import { buildLaiaSystemPrompt } from '@/lib/laia-prompt'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()

  // Verify auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { messages } = await request.json()
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response('Messages required', { status: 400 })
  }

  // Get context for the system prompt
  const [profileResult, eventResult] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user.id).single(),
    supabase
      .from('events')
      .select('title, date')
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date')
      .limit(1)
      .single(),
  ])

  const systemPrompt = buildLaiaSystemPrompt({
    userName: profileResult.data?.full_name ?? undefined,
    nextEventTitle: eventResult.data?.title ?? undefined,
    nextEventDate: eventResult.data?.date ?? undefined,
  })

  // Persist the last user message
  const lastUserMessage = messages[messages.length - 1]
  const lastUserText =
    typeof lastUserMessage?.content === 'string'
      ? lastUserMessage.content
      : lastUserMessage?.parts
          ?.filter((part: { type: string }) => part.type === 'text')
          .map((part: { text?: string }) => part.text ?? '')
          .join('')

  if (lastUserMessage?.role === 'user') {
    await supabase.from('laia_messages').insert({
      profile_id: user.id,
      role: 'user',
      content: lastUserText,
    })
  }

  const result = streamText({
    model: openai('gpt-4o'),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    onFinish: async ({ text }) => {
      // Persist assistant response
      await supabase.from('laia_messages').insert({
        profile_id: user.id,
        role: 'assistant',
        content: text,
      })
    },
  })

  return result.toUIMessageStreamResponse()
}
