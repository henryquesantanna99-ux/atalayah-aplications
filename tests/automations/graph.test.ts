import assert from 'node:assert/strict'
import test from 'node:test'
import { parseAutomationGraph } from '../../lib/automations/graph.ts'

test('parseAutomationGraph narrows unknown editor JSON without any', () => {
  const graph = parseAutomationGraph({
    nodes: [
      { id: 'trigger', type: 'webhook', config: { enabled: true } },
      { id: 'message', type: 'ycloud', credentialId: 'credential-1', config: { text: 'Olá' } },
    ],
    edges: [{ source: 'trigger', target: 'message' }],
  })

  assert.equal(graph.nodes[1].credentialId, 'credential-1')
  assert.deepEqual(graph.edges, [{ source: 'trigger', target: 'message' }])
})

test('parseAutomationGraph rejects malformed and dangling graph data', () => {
  assert.throws(() => parseAutomationGraph({ nodes: [], edges: [{ source: 'missing', target: 'also-missing' }] }), /inexistente/)
  assert.throws(() => parseAutomationGraph({ nodes: [{ id: 'same', type: 'http', config: { body: new Date() } }], edges: [] }), /Configuração inválida/)
  assert.throws(() => parseAutomationGraph({ nodes: [{ id: 'same', type: 'http', config: {} }, { id: 'same', type: 'ai', config: {} }], edges: [] }), /duplicados/)
})
