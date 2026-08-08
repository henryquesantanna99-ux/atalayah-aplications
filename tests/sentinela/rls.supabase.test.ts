import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_TEST_URL
const anonKey = process.env.SUPABASE_TEST_ANON_KEY
const serviceKey = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY
const enabled = Boolean(url && anonKey && serviceKey)

describe('Sentinela RLS on local Supabase', { skip: !enabled && 'set SUPABASE_TEST_URL, SUPABASE_TEST_ANON_KEY and SUPABASE_TEST_SERVICE_ROLE_KEY' }, () => {
  let admin: SupabaseClient
  let alice: SupabaseClient
  let bob: SupabaseClient
  let mentor: SupabaseClient
  let seasonId = ''
  const userIds: string[] = []

  async function makeUser(label: string, role: 'participant' | 'mentor') {
    const email = `sentinela-${label}-${Date.now()}@local.test`
    const password = 'Local-test-only-123!'
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
    assert.ifError(error)
    userIds.push(data.user.id)
    const client = createClient(url!, anonKey!, { auth: { persistSession: false } })
    const login = await client.auth.signInWithPassword({ email, password })
    assert.ifError(login.error)
    return { client, id: data.user.id, role }
  }

  before(async () => {
    admin = createClient(url!, serviceKey!, { auth: { persistSession: false } })
    const a = await makeUser('alice', 'participant')
    const b = await makeUser('bob', 'participant')
    const m = await makeUser('mentor', 'mentor')
    alice = a.client; bob = b.client; mentor = m.client
    const season = await admin.from('sentinela_seasons').insert({ name: 'RLS test', starts_at: '2026-01-01', ends_at: '2026-12-31' }).select('id').single()
    assert.ifError(season.error); seasonId = season.data.id
    const memberships = [a, b, m].map((user) => ({ season_id: seasonId, profile_id: user.id, role: user.role }))
    assert.ifError((await admin.from('sentinela_memberships').insert(memberships)).error)
  })

  after(async () => {
    if (seasonId) await admin.from('sentinela_seasons').delete().eq('id', seasonId)
    for (const id of userIds) await admin.auth.admin.deleteUser(id)
  })

  it('keeps private evidence and journals private', async () => {
    const ownerId = userIds[0]
    assert.ifError((await alice.from('sentinela_private_evidence').insert({ season_id: seasonId, owner_id: ownerId, body: 'private' })).error)
    assert.ifError((await alice.from('sentinela_journals').insert({ season_id: seasonId, owner_id: ownerId, body: 'private' })).error)
    assert.equal((await bob.from('sentinela_private_evidence').select('*')).data?.length, 0)
    assert.equal((await bob.from('sentinela_journals').select('*')).data?.length, 0)
  })

  it('protects official progress, checkpoints and competency assessments', async () => {
    const profileId = userIds[0]
    assert.ifError((await admin.from('sentinela_official_progress').insert({ season_id: seasonId, profile_id: profileId })).error)
    assert.ok((await alice.from('sentinela_official_progress').update({ competency: 50 }).eq('profile_id', profileId)).error)
    assert.ifError((await mentor.from('sentinela_official_progress').update({ competency: 50 }).eq('profile_id', profileId)).error)
    assert.ok((await alice.from('sentinela_checkpoints').insert({ season_id: seasonId, profile_id: profileId })).error)
    assert.ifError((await mentor.from('sentinela_checkpoints').insert({ season_id: seasonId, profile_id: profileId })).error)
    assert.ok((await alice.from('sentinela_competency_assessments').insert({ season_id: seasonId, profile_id: profileId, assessor_id: profileId, score: 60 })).error)
  })

  it('isolates private storage by owner prefix', async () => {
    const path = `${seasonId}/${userIds[0]}/proof.txt`
    assert.ifError((await alice.storage.from('sentinela-private').upload(path, new Blob(['proof']))).error)
    assert.ok((await bob.storage.from('sentinela-private').download(path)).error)
  })
})
