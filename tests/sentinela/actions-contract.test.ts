import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const actions = readFileSync(
  new URL('../../app/sentinela/actions.ts', import.meta.url),
  'utf8',
)

test('Sentinela exports a single rehearsal create action', () => {
  const declarations = actions.match(/export async function createRehearsal\s*\(/g) ?? []
  assert.equal(declarations.length, 1)
})

test('rehearsal mutations remain scoped to the authorized season', () => {
  assert.match(actions, /requireRehearsalManager\(input\.seasonId\)/)
  assert.match(actions, /\.eq\('season_id', season\.id\)/)
  assert.match(actions, /requireRehearsalManager\(seasonId\)/)
})
