/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { obterInscricao } from '../actions'

export default async function InscricaoDetalhePage({ params }: { params: { id: string } }) {
  const { inscricao, payments } = await obterInscricao(params.id)
  const fields = Object.entries(inscricao).filter(([key]) => !['metadata'].includes(key))
  return <><PageHeader title="Detalhes da inscrição" subtitle={inscricao.nome_participante} actions={<Button asChild variant="outline" className="border-white/10 bg-transparent text-white"><Link href="/inscricoes"><ArrowLeft className="h-4 w-4" />Voltar</Link></Button>} /><div className="space-y-5 p-4 sm:p-6">
    <section className="grid gap-3 sm:grid-cols-3"><Card label="UUID" value={inscricao.id} mono /><Card label="Payment ID" value={inscricao.payment_id || '-'} /><Card label="External Reference" value={inscricao.external_reference || inscricao.id} mono /><Card label="Status atual" value={<Badge className="bg-brand/20 text-brand">{inscricao.status_pagamento}</Badge>} /><Card label="Data de criação" value={fmt(inscricao.created_at)} /><Card label="Data da confirmação" value={fmt(inscricao.data_pagamento)} /></section>
    <section className="rounded-2xl border border-white/[0.08] bg-navy-900 p-4"><h2 className="text-lg font-bold text-white">Informações cadastradas</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{fields.map(([key, value]) => <div key={key} className="rounded-xl bg-black/20 p-3"><p className="text-xs uppercase tracking-wide text-[#64748B]">{key.replaceAll('_',' ')}</p><p className="mt-1 break-words text-sm text-white">{value == null || value === '' ? '-' : typeof value === 'object' ? JSON.stringify(value) : String(value)}</p></div>)}</div></section>
    <section className="rounded-2xl border border-white/[0.08] bg-navy-900 p-4"><h2 className="text-lg font-bold text-white">Histórico do pagamento</h2><div className="mt-4 space-y-3">{payments.map((p: any) => <article key={p.id} className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><strong className="text-white">{p.status}</strong><span className="text-sm text-[#94A3B8]">{fmt(p.created_at)}</span></div><p className="mt-2 text-sm text-[#94A3B8]">Payment ID: {p.payment_id} · External Reference: {p.external_reference}</p></article>)}{payments.length === 0 && <p className="text-sm text-[#94A3B8]">Nenhum evento recebido ainda.</p>}</div></section>
  </div></>
}
function Card({ label, value, mono }: any) { return <div className="rounded-2xl border border-white/[0.08] bg-navy-900 p-4"><p className="text-sm text-[#94A3B8]">{label}</p><div className={`mt-2 break-words text-white ${mono ? 'font-mono text-xs' : 'text-lg font-semibold'}`}>{value}</div></div> }
function fmt(value?: string | null) { return value ? new Date(value).toLocaleString('pt-BR') : '-' }
