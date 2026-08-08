import type { LucideIcon } from 'lucide-react'
import { BookOpen, Check, Fingerprint, Shield, Sparkles } from 'lucide-react'

export type OnboardingScene = { id: string; step: 'narrativa' | 'chamado' | 'registro' | 'avatar' | 'diagnostico'; title: string; speech: string; action: string; icon: LucideIcon }
export const onboardingScenes: OnboardingScene[] = [
  { id: 'limiar', step: 'narrativa', title: 'O limiar', speech: 'Toda jornada começa quando alguém decide prestar atenção. Você chegou ao lugar onde propósito encontra prática.', action: 'Ouvir o chamado', icon: BookOpen },
  { id: 'chamado', step: 'chamado', title: 'Sua resposta', speech: 'Não é preciso conhecer o caminho inteiro. Basta responder com honestidade ao próximo passo.', action: 'Eu aceito caminhar', icon: Sparkles },
  { id: 'registro', step: 'registro', title: 'Seu nome na história', speech: 'Como devemos chamar você ao longo desta temporada?', action: 'Guardar meu nome', icon: Fingerprint },
  { id: 'avatar', step: 'avatar', title: 'Dê forma ao viajante', speech: 'Seu avatar acompanhará conquistas, encontros e tudo o que você construir junto ao seu squad.', action: 'Este sou eu', icon: Shield },
  { id: 'diagnostico', step: 'diagnostico', title: 'Seu ponto de partida', speech: 'Qual área você deseja fortalecer primeiro? Não há resposta certa — isto apenas personaliza a sua jornada.', action: 'Concluir e entrar', icon: Check },
]
