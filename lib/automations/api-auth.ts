import { createClient } from '@/lib/supabase/server'

export async function authenticatedAutomation(request?: Request) {
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return null
  return { client: client as any, user }
}

export async function authorizeRun(client: any, userId: string, runId: string) {
  const { data } = await client.from('automation_runs').select('id').eq('id', runId).eq('requested_by', userId).maybeSingle()
  return Boolean(data)
}
