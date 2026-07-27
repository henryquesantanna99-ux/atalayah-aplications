import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { describe, it } from 'node:test'
import { AdapterRegistry, type AdapterName, type AdapterRequest, type AutomationAdapter } from '../../lib/automations/adapters.ts'
import { publish, saveDraft } from '../../lib/automations/versions.ts'

describe('draft and published versions', () => {
  it('does not expose draft edits until they are published', () => {
    const published = publish({ draft: { name: 'v1' }, published: null, publishedRevision: 0 })
    const edited = saveDraft(published, { name: 'v2' })
    assert.deepEqual(edited.published, { name: 'v1' })
    assert.deepEqual(edited.draft, { name: 'v2' })
    assert.deepEqual(publish(edited).published, { name: 'v2' })
  })
})

describe('adapter contracts', () => {
  for (const name of ['crm', 'whatsapp', 'instagram', 'ai', 'google-calendar'] as AdapterName[]) {
    it(`${name} uses its double and never performs a real call`, async () => {
      const received: AdapterRequest[] = []
      const double: AutomationAdapter = { execute: async (request) => { received.push(request); return { externalId: `${name}-1`, status: 'accepted' } } }
      const registry = new AdapterRegistry(); registry.register(name, double)
      const request = { operation: 'create', payload: { message: 'test' }, idempotencyKey: 'run-1:node-1' }
      const response = await registry.execute(name, request)
      assert.deepEqual(received, [request]); assert.equal(response.externalId, `${name}-1`)
    })
  }
})

describe('endpoint authorization and database isolation', () => {
  it('enables RLS and scopes every new table policy to the current organization', async () => {
    const sql = await readFile(new URL('../../supabase/migrations/037_automation_runtime.sql', import.meta.url), 'utf8')
    for (const table of ['automations', 'automation_runs']) {
      assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, 'i'))
    }
    assert.equal((sql.match(/current_user_organization_id\(\)/g) ?? []).length, 6)
    assert.doesNotMatch(sql, /\bto\s+anon\b/i)
    assert.match(sql, /to authenticated/i)
  })
})
