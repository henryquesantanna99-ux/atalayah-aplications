import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { executionPlan, migrateGraph, validateGraph } from '../../lib/automations/graph.ts'

describe('schema and topology', () => {
  it('migrates v1 connections without mutating the stored graph', () => {
    const legacy = { version: 1, nodes: [{ id: 'start', type: 'trigger' }, { id: 'end', type: 'action' }], connections: [{ source: 'start', target: 'end' }] }
    const result = migrateGraph(legacy)
    assert.deepEqual(result.edges, [{ from: 'start', to: 'end' }])
    assert.equal(result.schemaVersion, 2)
    assert.equal('schemaVersion' in legacy, false)
  })

  it('rejects malformed and future schemas', () => {
    assert.throws(() => migrateGraph({ schemaVersion: 99, nodes: [], edges: [] }), /Unsupported/)
    assert.throws(() => validateGraph({ schemaVersion: 2, nodes: [{ id: 'x', type: 'a' }], edges: [{ from: 'x', to: 'missing' }] }), /unknown/)
  })

  it('plans forks and merge once and reports unreachable nodes', () => {
    const graph = migrateGraph({ schemaVersion: 2, nodes: ['start', 'a', 'b', 'merge', 'orphan'].map((id) => ({ id, type: 'action' })), edges: [
      { from: 'start', to: 'a' }, { from: 'start', to: 'b' }, { from: 'a', to: 'merge' }, { from: 'b', to: 'merge' },
    ] })
    const plan = executionPlan(graph)
    assert.equal(plan.ordered.filter((id) => id === 'merge').length, 1)
    assert.ok(plan.ordered.indexOf('merge') > plan.ordered.indexOf('a'))
    assert.deepEqual(plan.unreachable, ['orphan'])
  })

  it('rejects cycles', () => {
    assert.throws(() => migrateGraph({ schemaVersion: 2, nodes: [{ id: 'a', type: 'x' }, { id: 'b', type: 'x' }], edges: [{ from: 'a', to: 'b' }, { from: 'b', to: 'a' }] }), /cycle/)
  })
})
