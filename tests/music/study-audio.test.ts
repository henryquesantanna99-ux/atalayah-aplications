import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { computeAudioHash, isStudyLevel, resolveAudioFileExtension } from '../../lib/music/study-audio.ts'

describe('study audio identity', () => {
  it('hashes identical bytes to the same value regardless of source type', () => {
    const bytes = Buffer.from('mesmo audio')
    const fromBuffer = computeAudioHash(bytes)
    const fromArrayBuffer = computeAudioHash(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength))
    assert.equal(fromBuffer, fromArrayBuffer)
    assert.equal(fromBuffer.length, 64)
  })

  it('produces different hashes for different content', () => {
    assert.notEqual(computeAudioHash(Buffer.from('a')), computeAudioHash(Buffer.from('b')))
  })

  it('extracts the file extension in lowercase', () => {
    assert.equal(resolveAudioFileExtension('Minha Musica.WAV'), 'wav')
    assert.equal(resolveAudioFileExtension('faixa.m4a'), 'm4a')
    assert.equal(resolveAudioFileExtension('sem-extensao'), 'bin')
  })

  it('validates study levels', () => {
    assert.equal(isStudyLevel('iniciante'), true)
    assert.equal(isStudyLevel('avancado'), true)
    assert.equal(isStudyLevel('expert'), false)
    assert.equal(isStudyLevel(''), false)
  })
})
