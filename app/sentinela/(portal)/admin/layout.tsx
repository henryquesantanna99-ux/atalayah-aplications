import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSentinelaContext } from '../../_lib/data'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { membership } = await getSentinelaContext()
  if (!['mentor', 'journey_admin'].includes(membership.role)) redirect('/sentinela/overview')
  return <><nav className="mb-6 flex flex-wrap gap-2 text-sm" aria-label="Administração Sentinela">{[['Painel','/sentinela/admin'],['Temporada','/sentinela/admin/temporada'],['Pessoas','/sentinela/admin/pessoas'],['Squads','/sentinela/admin/squads'],['Conteúdos','/sentinela/admin/conteudo'],['Missões','/sentinela/admin/missoes'],['Ensaios','/sentinela/admin/ensaios'],['Avaliações','/sentinela/admin/avaliacoes'],['Analytics','/sentinela/admin/analytics']].map(([label, href]) => <Link className="rounded-lg border border-white/10 px-3 py-2 hover:border-amber-300" href={href} key={href}>{label}</Link>)}</nav>{children}</>
}
