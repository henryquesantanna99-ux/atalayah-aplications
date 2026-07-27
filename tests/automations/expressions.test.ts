import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { evaluate, resolvePath, resolveTemplate, switchCase } from '../../lib/automations/expressions.ts'

describe('expressions', () => {
  it('resolves values, preserves their types and handles missing values', () => {
    assert.equal(resolveTemplate('{{ contact.active }}', { contact: { active: false } }), false)
    assert.equal(resolveTemplate('Olá {{ contact.name }}!', { contact: {} }), 'Olá !')
    assert.equal(resolvePath({}, 'missing.value'), undefined)
  })
  it('rejects incompatible equality and prototype pollution paths', () => {
    assert.equal(evaluate({ op: 'eq', left: '1', right: 1 }), false)
    assert.throws(() => resolvePath({}, '__proto__.polluted'), /Unsafe/)
    assert.throws(() => resolvePath({}, 'constructor.prototype.polluted'), /Unsafe/)
    assert.equal(({} as Record<string, unknown>).polluted, undefined)
  })
  it('supports IF, AND, OR and NOT without treating false as missing', () => {
    const isFalse = { op: 'eq', left: false, right: false } as const
    assert.equal(evaluate(isFalse), true)
    assert.equal(evaluate({ op: 'and', conditions: [isFalse, { op: 'not', condition: { op: 'eq', left: 1, right: 2 } }] }), true)
    assert.equal(evaluate({ op: 'or', conditions: [{ op: 'eq', left: 1, right: 2 }, isFalse] }), true)
  })
  it('selects switch branches including false and fallback', () => {
    const cases = [{ value: false, next: 'disabled' }, { value: true, next: 'enabled' }]
    assert.equal(switchCase(false, cases, 'fallback'), 'disabled')
    assert.equal(switchCase('false', cases, 'fallback'), 'fallback')
  })
})
