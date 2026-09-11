'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ChevronLeft, Loader2, Upload } from 'lucide-react'
import type { StudyLevelValue } from '@/lib/music/study-audio'

const LEVELS: Array<{ id: StudyLevelValue; label: string; description: string }> = [
  { id: 'iniciante', label: 'Iniciante', description: 'Estou começando a estudar essa música.' },
  { id: 'intermediario', label: 'Intermediário', description: 'Já toco/canto músicas parecidas.' },
  { id: 'avancado', label: 'Avançado', description: 'Quero refinar detalhes e nuances.' },
]

const INSTRUMENTS = [
  { id: 'vocal', label: 'Cantor/Voz', icon: '🎤' },
  { id: 'violao', label: 'Violão', icon: '🎸' },
  { id: 'guitarra', label: 'Guitarra', icon: '🎸' },
  { id: 'baixo', label: 'Baixo', icon: '🎸' },
  { id: 'bateria', label: 'Bateria', icon: '🥁' },
  { id: 'bateria_eletronica', label: 'Bateria Eletrônica', icon: '🥁' },
  { id: 'teclado', label: 'Teclado', icon: '🎹' },
  { id: 'violino', label: 'Violino', icon: '🎻' },
  { id: 'saxofone', label: 'Saxofone', icon: '🎷' },
  { id: 'trompete', label: 'Trompete', icon: '🎺' },
] as const

interface StudyWizardProps {
  defaultInstrument: string | null
}

export function StudyWizard({ defaultInstrument }: StudyWizardProps) {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [level, setLevel] = useState<StudyLevelValue | null>(null)
  const [instrument, setInstrument] = useState<string | null>(defaultInstrument)
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    if (!level || !instrument || !file) return
    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.set('level', level)
      formData.set('instrument', instrument)
      formData.set('file', file)
      const response = await fetch('/api/study/song-analysis/upload', { method: 'POST', body: formData })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error ?? 'Não foi possível enviar o áudio.')
        return
      }
      toast.success(
        data.reused
          ? 'Essa música já foi analisada por alguém da equipe — reaproveitando o resultado.'
          : 'Áudio enviado! Iniciando a identificação da música...',
      )
      router.push(`/estudo/musica/${data.versionId}`)
    } catch {
      toast.error('Erro ao enviar o áudio.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      {step > 1 && (
        <button
          type="button"
          onClick={() => setStep((current) => (current === 3 ? 2 : 1))}
          className="inline-flex items-center gap-1.5 text-sm text-[#94A3B8] hover:text-white transition-colors"
        >
          <ChevronLeft className="h-4 w-4" /> Voltar
        </button>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">Qual é o seu nível nessa música?</h2>
          <div className="grid gap-3">
            {LEVELS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  setLevel(option.id)
                  setStep(2)
                }}
                className="text-left rounded-modal border border-white/[0.08] bg-navy-900 p-4 hover:border-brand/40 hover:bg-brand/5 transition-all"
              >
                <p className="font-semibold text-white">{option.label}</p>
                <p className="text-sm text-[#94A3B8] mt-1">{option.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">Qual instrumento você vai estudar?</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {INSTRUMENTS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  setInstrument(option.id)
                  setStep(3)
                }}
                className={`rounded-modal border p-4 text-center transition-all ${
                  instrument === option.id ? 'border-brand bg-brand/10' : 'border-white/[0.08] bg-navy-900 hover:border-brand/40'
                }`}
              >
                <span className="text-2xl">{option.icon}</span>
                <p className="mt-2 text-sm font-medium text-white">{option.label}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">Envie o áudio da música</h2>
          <p className="text-sm text-[#94A3B8]">
            Se essa música já foi estudada por alguém da equipe, o sistema reaproveita a análise — sem reprocessar.
          </p>
          <label className="flex flex-col items-center justify-center gap-2 rounded-modal border border-dashed border-white/[0.16] bg-navy-900 p-8 cursor-pointer hover:border-brand/40 transition-colors">
            <Upload className="h-6 w-6 text-[#94A3B8]" />
            <span className="text-sm text-[#94A3B8]">{file ? file.name : 'Selecionar arquivo de áudio'}</span>
            <input
              type="file"
              accept="audio/*"
              className="sr-only"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!file || submitting}
            className="w-full py-2.5 rounded-card bg-brand text-white text-sm font-medium hover:bg-brand-light transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Enviando...
              </>
            ) : (
              'Iniciar estudo'
            )}
          </button>
        </div>
      )}
    </main>
  )
}
