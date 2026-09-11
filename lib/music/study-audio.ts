import { createHash } from 'node:crypto'

export const STUDY_LEVELS = ['iniciante', 'intermediario', 'avancado'] as const
export type StudyLevelValue = (typeof STUDY_LEVELS)[number]

export function isStudyLevel(value: unknown): value is StudyLevelValue {
  return typeof value === 'string' && STUDY_LEVELS.includes(value as StudyLevelValue)
}

export function computeAudioHash(buffer: Buffer | ArrayBuffer) {
  const data = buffer instanceof ArrayBuffer ? Buffer.from(buffer) : buffer
  return createHash('sha256').update(data).digest('hex')
}

export function resolveAudioFileExtension(fileName: string) {
  const match = /\.([a-z0-9]+)$/i.exec(fileName)
  return (match?.[1] ?? 'bin').toLowerCase()
}
