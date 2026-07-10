import { PageHeader } from '@/components/layout/page-header'
import { listarAdministracaoLouvor } from './actions'
import { LouvorAdminClient } from './louvor-admin-client'

export default async function LouvorAdminPage() {
  const data = await listarAdministracaoLouvor()

  return (
    <>
      <PageHeader
        title="Administração de Louvor"
        subtitle="Gerencie indicações e escolha quais músicas estarão abertas para votação pública."
      />
      <div className="p-4 sm:p-6">
        <LouvorAdminClient
          suggestions={data.suggestions as never[]}
          votingSongs={data.votingSongs as never[]}
          catalog={data.catalog}
          repertoireSuggestions={data.repertoireSuggestions as never[]}
          upcomingEvents={data.upcomingEvents}
          spiritualSummaries={data.spiritualSummaries as never[]}
        />
      </div>
    </>
  )
}
