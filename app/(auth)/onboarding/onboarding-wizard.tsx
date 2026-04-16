'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

const INSTRUMENTS = [
  { id: 'vocal', label: 'Vocal', icon: '🎤' },
  { id: 'guitarra', label: 'Guitarra', icon: '🎸' },
  { id: 'baixo', label: 'Baixo', icon: '🎸' },
  { id: 'bateria', label: 'Bateria', icon: '🥁' },
  { id: 'teclado', label: 'Teclado', icon: '🎹' },
  { id: 'violao', label: 'Violão', icon: '🎸' },
  { id: 'bateria_eletronica', label: 'Bateria Eletrônica', icon: '🥁' },
  { id: 'violino', label: 'Violino', icon: '🎻' },
  { id: 'saxofone', label: 'Saxofone', icon: '🎷' },
  { id: 'trompete', label: 'Trompete', icon: '🎺' },
  { id: 'som', label: 'Som / Técnico', icon: '🎚️' },
  { id: 'midia', label: 'Mídia / Câmera', icon: '📷' },
  { id: 'design', label: 'Design', icon: '🎨' },
  { id: 'adm', label: 'Administrativo', icon: '📋' },
  { id: 'lideranca', label: 'Liderança', icon: '⭐' },
]

const LAIA_SLIDES = [
  {
    icon: '⭐',
    title: 'Olá! Sou a Laia',
    description:
      'Sou a assistente inteligente do AtalaYah. Estou aqui para ajudar você com tudo sobre o ministério — escalas, músicas, estudos e muito mais.',
  },
  {
    icon: '🎵',
    title: 'Músicas & Setlist',
    description:
      'Na seção Músicas você encontra o setlist completo de cada culto, com tom, versão, guias vocais e instrumentais.',
  },
  {
    icon: '📅',
    title: 'Agenda do Ministério',
    description:
      'Em Agenda você vê todos os cultos, ensaios e reuniões do mês. Confirme sua presença diretamente pelo app.',
  },
  {
    icon: '💬',
    title: 'Chat & Comunhão',
    description:
      'No Chat do Grupo, toda a equipe se conecta em tempo real. Em Comunhão, compartilhe reflexões e estudos bíblicos.',
  },
  {
    icon: '✅',
    title: 'Tudo pronto!',
    description:
      'Seu perfil foi criado. Aguarde a aprovação do administrador para ter acesso completo ao app.',
  },
]

interface OnboardingWizardProps {
  userId: string
  initialName: string
}

export function OnboardingWizard({
  userId,
  initialName,
}: OnboardingWizardProps) {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)

  // Step 1 state
  const [fullName, setFullName] = useState(initialName)
  const [birthDate, setBirthDate] = useState('')

  // Step 2 state
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([])

  // Step 3 state
  const [slideIndex, setSlideIndex] = useState(0)

  function toggleInstrument(id: string) {
    setSelectedInstruments((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  async function handleStep1Submit() {
    if (!fullName.trim()) {
      toast.error('Por favor, informe seu nome completo.')
      return
    }
    await supabase
      .from('profiles')
      .update({ full_name: fullName, birth_date: birthDate || null })
      .eq('id', userId)
    setStep(2)
  }

  async function handleStep2Submit() {
    if (selectedInstruments.length === 0) {
      toast.error('Selecione pelo menos uma função ou instrumento.')
      return
    }
    const { data: existing } = await supabase
      .from('team_members')
      .select('id')
      .eq('profile_id', userId)
      .single()

    if (existing) {
      await supabase
        .from('team_members')
        .update({ instruments: selectedInstruments })
        .eq('profile_id', userId)
    } else {
      await supabase.from('team_members').insert({
        profile_id: userId,
        instruments: selectedInstruments,
        teams: [],
        function_role: 'integrante',
      })
    }
    setStep(3)
  }

  async function handleFinish() {
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ onboarding_completed: true })
      .eq('id', userId)

    if (error) {
      setSaving(false)
      toast.error(`Erro ao concluir onboarding: ${error.message}`)
      return
    }

    router.replace('/onboarding')
    router.refresh()
  }

  if (step === 1) {
    return (
      <OnboardingLayout step={1} title="Dados Pessoais" subtitle="Conte-nos um pouco sobre você">
        <div className="space-y-4">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-[#94A3B8] mb-2">
              Nome Completo
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Seu nome completo"
              className="w-full px-4 py-3 rounded-card bg-navy-800 border border-white/[0.08] text-white placeholder-[#64748B] focus:outline-none focus:border-brand text-sm"
            />
          </div>
          <div>
            <label htmlFor="birthDate" className="block text-sm font-medium text-[#94A3B8] mb-2">
              Data de Nascimento <span className="text-[#64748B]">(opcional)</span>
            </label>
            <input
              id="birthDate"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full px-4 py-3 rounded-card bg-navy-800 border border-white/[0.08] text-white focus:outline-none focus:border-brand text-sm"
            />
          </div>
        </div>
        <button
          onClick={handleStep1Submit}
          className="w-full mt-6 py-3 rounded-card bg-brand text-white font-medium text-sm hover:bg-brand-light transition-colors"
        >
          Próximo
        </button>
      </OnboardingLayout>
    )
  }

  if (step === 2) {
    return (
      <OnboardingLayout step={2} title="Sua Função" subtitle="Selecione seus instrumentos e áreas de atuação">
        <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
          {INSTRUMENTS.map((inst) => {
            const selected = selectedInstruments.includes(inst.id)
            return (
              <button
                key={inst.id}
                onClick={() => toggleInstrument(inst.id)}
                aria-pressed={selected}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-card border text-sm font-medium transition-all ${
                  selected
                    ? 'bg-brand/20 border-brand text-white'
                    : 'bg-navy-800 border-white/[0.06] text-[#94A3B8] hover:border-white/20'
                }`}
              >
                <span className="text-base">{inst.icon}</span>
                {inst.label}
              </button>
            )
          })}
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => setStep(1)}
            className="flex-1 py-3 rounded-card border border-white/[0.08] text-[#94A3B8] font-medium text-sm hover:bg-white/[0.04] transition-colors"
          >
            Voltar
          </button>
          <button
            onClick={handleStep2Submit}
            className="flex-1 py-3 rounded-card bg-brand text-white font-medium text-sm hover:bg-brand-light transition-colors"
          >
            Próximo
          </button>
        </div>
      </OnboardingLayout>
    )
  }

  const slide = LAIA_SLIDES[slideIndex]
  const isLast = slideIndex === LAIA_SLIDES.length - 1

  return (
    <OnboardingLayout step={3} title="Bem-vindo ao AtalaYah" subtitle="Conheça a plataforma">
      <div className="text-center py-4">
        {/* Laia avatar */}
        <div className="relative inline-block mb-6">
          <div className="absolute inset-0 rounded-full bg-brand/20 animate-ping" />
          <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-brand to-navy-800 border border-brand/30 flex items-center justify-center text-3xl mx-auto">
            {slide.icon}
          </div>
        </div>
        <h3 className="text-lg font-bold text-white mb-3">{slide.title}</h3>
        <p className="text-sm text-[#94A3B8] leading-relaxed px-4">{slide.description}</p>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 mt-6">
          {LAIA_SLIDES.map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                i === slideIndex ? 'w-4 bg-brand' : 'bg-white/20'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        {slideIndex > 0 && (
          <button
            onClick={() => setSlideIndex((i) => i - 1)}
            className="flex-1 py-3 rounded-card border border-white/[0.08] text-[#94A3B8] font-medium text-sm hover:bg-white/[0.04] transition-colors"
          >
            Anterior
          </button>
        )}
        {!isLast ? (
          <button
            onClick={() => setSlideIndex((i) => i + 1)}
            className="flex-1 py-3 rounded-card bg-brand text-white font-medium text-sm hover:bg-brand-light transition-colors"
          >
            Próximo
          </button>
        ) : (
          <button
            onClick={handleFinish}
            disabled={saving}
            className="flex-1 py-3 rounded-card bg-brand text-white font-medium text-sm hover:bg-brand-light transition-colors disabled:opacity-60"
          >
            {saving ? 'Salvando...' : 'Concluir'}
          </button>
        )}
      </div>
    </OnboardingLayout>
  )
}

function OnboardingLayout({
  step,
  title,
  subtitle,
  children,
}: {
  step: number
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-brand/5 blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  s === step
                    ? 'bg-brand text-white'
                    : s < step
                    ? 'bg-brand/30 text-brand'
                    : 'bg-white/10 text-[#64748B]'
                }`}
              >
                {s < step ? '✓' : s}
              </div>
              {s < 3 && (
                <div className={`w-8 h-px ${s < step ? 'bg-brand/50' : 'bg-white/10'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-navy-900 border border-white/[0.06] rounded-modal p-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white">{title}</h2>
            <p className="text-sm text-[#94A3B8] mt-1">{subtitle}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
