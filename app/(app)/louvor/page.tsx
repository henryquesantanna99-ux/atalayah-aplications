import { PageHeader } from '@/components/layout/page-header'
import { LaiaFloatingBadge } from '@/components/laia/laia-floating-badge'
import { getMusicasParaVotacao } from './actions'
import { WorshipVotingClient } from './worship-voting-client'

export default async function LouvorPage() {
  const songs = await getMusicasParaVotacao()

  return (
    <>
      <PageHeader
        title="Indicação e Votação de Louvor"
        subtitle="Termômetro da igreja para sugestões e repertório, sempre sob avaliação ministerial."
      />
      <div className="p-4 sm:p-6">
        <WorshipVotingClient songs={songs} />
      </div>
      <LaiaFloatingBadge tip="A votação ajuda a ouvir a igreja, mas não aprova repertório automaticamente." />
    </>
  )
}
