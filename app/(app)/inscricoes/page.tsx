/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { Download, Eye } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { listarInscricoes } from './actions'

export default async function InscricoesPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const { rows, count, page, pageSize, metrics } = await listarInscricoes(searchParams)
  const pages = Math.max(1, Math.ceil(count / pageSize))
  const csvHref = `/api/inscricoes/export?${new URLSearchParams(searchParams as any).toString()}`
  return <><PageHeader title="Inscrições" subtitle="Acompanhe inscrições públicas e pagamentos em tempo real." actions={<Button asChild className="bg-brand hover:bg-brand/90"><a href={csvHref}><Download className="h-4 w-4" />Exportar CSV</a></Button>} /><div className="space-y-5 p-4 sm:p-6">
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
      ['Total de inscrições', metrics?.total_inscricoes], ['Confirmadas', metrics?.total_confirmadas], ['Aguardando pagamento', metrics?.total_aguardando_pagamento], ['Pagamentos aprovados', metrics?.total_pagamentos_aprovados], ['Pagamentos pendentes', metrics?.total_pagamentos_pendentes], ['Menores de idade', metrics?.total_menores], ['Maiores de idade', metrics?.total_maiores]
    ].map(([label, value]) => <div key={label as string} className="rounded-2xl border border-white/[0.08] bg-navy-900 p-4"><p className="text-sm text-[#94A3B8]">{label}</p><strong className="mt-2 block text-2xl text-white">{String(value ?? 0)}</strong></div>)}</section>
    <form className="grid gap-3 rounded-2xl border border-white/[0.08] bg-navy-900 p-4 sm:grid-cols-2 xl:grid-cols-4"><Input name="q" placeholder="Busca: nome, WhatsApp, email ou ID" defaultValue={searchParams.q} className="border-white/10 bg-black/20 text-white xl:col-span-2" />{['cidade','bairro','sede_regional','lider_responsavel','tipo_inscricao','area_desejada','status_pagamento','status_inscricao','classificacao_idade'].map((key) => <Input key={key} name={key} placeholder={key.replaceAll('_',' ')} defaultValue={searchParams[key]} className="border-white/10 bg-black/20 text-white" />)}<Input type="date" name="de" defaultValue={searchParams.de} className="border-white/10 bg-black/20 text-white" /><Input type="date" name="ate" defaultValue={searchParams.ate} className="border-white/10 bg-black/20 text-white" /><Button className="bg-brand hover:bg-brand/90">Filtrar</Button></form>
    <section className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-navy-900"><table className="min-w-[1500px] w-full text-sm"><thead className="bg-black/30 text-left text-[#94A3B8]"><tr>{['ID','Data','Tipo','Participante','Inscrito por','Idade','Classificação','WhatsApp','Email','Cidade','Bairro','Sede Regional','Líder','Área','Experiência','Pagamento','Inscrição','Data pagamento','Atualização',''].map(h => <th key={h} className="px-3 py-3 font-medium">{h}</th>)}</tr></thead><tbody>{rows.map((r: any) => <tr key={r.id} className="border-t border-white/[0.06]"><td className="px-3 py-3 font-mono text-xs">{r.id.slice(0,8)}</td><td className="px-3 py-3">{fmt(r.created_at)}</td><td className="px-3 py-3">{r.tipo_inscricao === 'para_jovem' ? 'Para um jovem' : 'Pra mim'}</td><td className="px-3 py-3 font-medium text-white">{r.nome_participante}</td><td className="px-3 py-3">{r.nome_inscrito_por || '-'}</td><td className="px-3 py-3">{r.idade ?? '-'}</td><td className="px-3 py-3">{r.classificacao_idade}</td><td className="px-3 py-3">{r.telefone_contato}</td><td className="px-3 py-3">{r.email_contato || '-'}</td><td className="px-3 py-3">{r.cidade}</td><td className="px-3 py-3">{r.bairro}</td><td className="px-3 py-3">{r.sede_regional}</td><td className="px-3 py-3">{r.lider_responsavel}</td><td className="px-3 py-3">{r.area_desejada || '-'}</td><td className="px-3 py-3">{r.tem_experiencia || '-'}</td><td className="px-3 py-3"><Badge className="bg-white/10 text-white">{r.status_pagamento}</Badge></td><td className="px-3 py-3">{r.status_inscricao}</td><td className="px-3 py-3">{fmt(r.data_pagamento)}</td><td className="px-3 py-3">{fmt(r.updated_at)}</td><td className="px-3 py-3"><Button size="sm" variant="outline" className="border-white/10 bg-transparent text-white" asChild><Link href={`/inscricoes/${r.id}`}><Eye className="h-4 w-4" />Detalhes</Link></Button></td></tr>)}</tbody></table></section>
    <div className="flex items-center justify-between text-sm text-[#94A3B8]"><span>Página {page} de {pages} · {count} registros</span><div className="flex gap-2"><Button disabled={page<=1} asChild variant="outline" className="border-white/10 bg-transparent text-white"><Link href={`?page=${page-1}`}>Anterior</Link></Button><Button disabled={page>=pages} asChild variant="outline" className="border-white/10 bg-transparent text-white"><Link href={`?page=${page+1}`}>Próxima</Link></Button></div></div>
  </div></>
}
function fmt(value?: string | null) { return value ? new Date(value).toLocaleString('pt-BR') : '-' }
