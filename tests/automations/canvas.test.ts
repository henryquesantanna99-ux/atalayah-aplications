import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { canvasNodePresentation, type CanvasNodeStatus } from '../../components/automations/canvas-node-presentation.ts'

describe('automation canvas node visual states', () => {
  const expectations: Array<[CanvasNodeStatus, string, RegExp]> = [
    ['success', 'Concluído', /green/],
    ['running', 'Executando', /animate-pulse/],
    ['skipped', 'Ignorado', /opacity/],
    ['failed', 'Falhou', /red/],
  ]
  for (const [status, label, visualToken] of expectations) {
    it(`presents ${status} with an accessible label and distinct style`, () => {
      assert.equal(canvasNodePresentation[status].label, label)
      assert.match(canvasNodePresentation[status].className, visualToken)
    })
  }
})
