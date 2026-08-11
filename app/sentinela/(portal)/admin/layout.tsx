import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSentinelaContext } from '../../_lib/data'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { membership } = await getSentinelaContext()
  if (!['mentor', 'journey_admin'].includes(membership.role)) redirect('/sentinela/overview')
  return <><nav className="mb-6 flex flex-wrap gap-2 text-sm" aria-label="Administração Sentinela">{[['Painel','/sentinela/admin'],['Conteúdo','/sentinela/admin/conteudo'],['Temporada','/sentinela/admin/temporada'],['Avaliações','/sentinela/admin/avaliacoes'],['Participantes','/sentinela/admin/participantes']].map(([label, href]) => <Link className="rounded-lg border border-white/10 px-3 py-2 hover:border-amber-300" href={href} key={href}>{label}</Link>)}</nav>{children}</>
}
