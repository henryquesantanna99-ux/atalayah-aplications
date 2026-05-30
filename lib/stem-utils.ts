export const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg', '.aiff', '.aif', '.wma']
export const AUDIO_FILE_PATTERN = /\.(mp3|wav|m4a|aac|flac|ogg|aiff?|wma)$/i

export function isAudioFileName(fileName: string) {
  return AUDIO_FILE_PATTERN.test(fileName)
}

export function normalizeStemFileName(fileName: string) {
  return fileName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_\-.]+/g, ' ')
}

export function detectStemType(fileName: string) {
  const normalized = normalizeStemFileName(fileName)
  const rules: Array<{ stem: string; aliases: string[] }> = [
    { stem: 'voice_guide', aliases: ['voz guia', 'lead vocal guia', 'guia'] },
    { stem: 'back_vocal', aliases: ['back vocal', 'background vocal', 'backing vocal', 'backing vox', 'b vocal', 'bv', 'choir', 'coro'] },
    { stem: 'vocals', aliases: ['vocal', 'vocals', 'vox', 'voz', 'lead vox', 'lead vocal'] },
    { stem: 'drums', aliases: ['drum', 'drums', 'bateria', 'kick', 'bumbo', 'snare', 'caixa', 'hihat', 'hi hat', 'tom', 'overhead', 'oh '] },
    { stem: 'bass', aliases: ['bass', 'baixo', 'sub bass', 'contrabaixo'] },
    { stem: 'acoustic_guitar', aliases: ['acoustic guitar', 'acoustic', 'violao', 'nylon', 'aco', 'steel guitar'] },
    { stem: 'guitar', aliases: ['electric guitar', 'gtr', 'guitar', 'guitarra', 'eguitar', 'lead guitar'] },
    { stem: 'piano', aliases: ['piano', 'keys', 'teclado', 'pad', 'synth', 'organ', 'orgao', 'rhodes', 'string pad'] },
    { stem: 'percussion', aliases: ['perc', 'percussion', 'percussao', 'conga', 'shaker', 'tamb', 'tambourine', 'pandeiro'] },
    { stem: 'strings', aliases: ['strings', 'cordas', 'violin', 'violino', 'cello', 'orchestra'] },
    { stem: 'brass', aliases: ['brass', 'sopro', 'sopros', 'trumpet', 'trompete', 'sax', 'horn'] },
    { stem: 'click', aliases: ['click', 'metronome', 'metronomo', 'cue'] },
  ]

  return rules.find((rule) => rule.aliases.some((alias) => normalized.includes(alias)))?.stem ?? 'other'
}

export function sanitizeStemFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
}

export function buildStemStoragePath(ownerId: string, index: number, fileName: string) {
  return `${ownerId}/${Date.now()}-${index}-${sanitizeStemFileName(fileName)}`
}
