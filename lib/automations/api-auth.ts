import { createClient } from '@/lib/supabase/server'
import type { AutomationClient } from './database'

export async function authenticatedAutomation() {
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return null
  return { client: client as unknown as AutomationClient, user }
}

export async function authorizeRun(client: AutomationClient, userId: string, runId: string) {
  const { data } = await client.from('automation_runs').select('id').eq('id', runId).eq('requested_by', userId).maybeSingle()
  return Boolean(data)
}
