import assert from 'node:assert/strict'
import test from 'node:test'
import { redact } from '../../lib/automations/runtime/redact.ts'
import { SchemaValidationError, validateSchema } from '../../lib/automations/runtime/schema.ts'
import { resolveVariables } from '../../lib/automations/runtime/variables.ts'
import { getNodeHandler } from '../../lib/automations/runtime/registry.ts'

test('resolve somente caminhos de dados e não avalia JavaScript', () => {
  assert.equal(resolveVariables('${input.user.name}', { input: { user: { name: 'Ana' } }, nodes: {} }), 'Ana')
  assert.equal(resolveVariables('${process.exit()}', { input: {}, nodes: {} }), '${process.exit()}')
})

test('valida schema estrito de entrada e saída', () => {
  assert.doesNotThrow(() => validateSchema({ type: 'object', required: ['id'], properties: { id: { type: 'integer' } }, additionalProperties: false }, { id: 1 }))
  assert.throws(() => validateSchema({ type: 'string' }, 1), SchemaValidationError)
})

test('redige segredos e PII recursivamente', () => {
  assert.deepEqual(redact({ headers: { authorization: 'Bearer x' }, email: 'a@b.com', safe: 'ok' }), { headers: { authorization: '[REDACTED]' }, email: '[PII]', safe: 'ok' })
})

test('IF e Switch selecionam portas de saída explicitamente', async () => {
  const context = { runId: 'r', nodeId: 'n', attempt: 1, signal: new AbortController().signal, idempotencyKey: 'k' }
  assert.deepEqual((await getNodeHandler('if', 1)!.execute({ active: true }, { path: 'active', equals: true }, context)).ports, ['true'])
  assert.deepEqual((await getNodeHandler('switch', 1)!.execute({ kind: 'a' }, { path: 'kind', cases: { first: 'a' } }, context)).ports, ['first'])
})
