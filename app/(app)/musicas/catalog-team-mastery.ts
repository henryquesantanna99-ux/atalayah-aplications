import type { TeamMastery } from '@/types/database'

export const TEAM_MASTERY_OPTIONS = ['100% da equipe', 'Apenas a banda', 'Apenas os vocais', 'Só algumas pessoas'] as const satisfies readonly TeamMastery[]

export function calculateRepertoireReadiness(teamMastery: TeamMastery) {
  switch (teamMastery) {
    case '100% da equipe': return { readinessIndex: 100, readinessLevel: 'Completo' as const, suggestedStage: 'Repertório oficial' }
    case 'Apenas a banda':
    case 'Apenas os vocais': return { readinessIndex: 60, readinessLevel: 'Médio' as const, suggestedStage: 'Em teste' }
    case 'Só algumas pessoas': return { readinessIndex: 25, readinessLevel: 'Baixo' as const, suggestedStage: 'Aprendizado' }
  }
}
