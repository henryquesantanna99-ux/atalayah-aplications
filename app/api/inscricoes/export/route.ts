/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
const cols = ['id','created_at','tipo_inscricao','nome_participante','nome_inscrito_por','idade','classificacao_idade','telefone_contato','email_contato','cidade','bairro','sede_regional','lider_responsavel','area_desejada','tem_experiencia','status_pagamento','status_inscricao','data_pagamento','updated_at']
export async function GET() {
  const supabase = createAdminClient()
  const { data, error } = await (supabase as any).from('inscricoes').select(cols.join(',')).order('created_at', { ascending: false }).limit(5000)
  if (error) return NextResponse.json({ message: error.message }, { status: 500 })
  const csv = [cols.join(','), ...(data || []).map((row: any) => cols.map((c) => `"${String(row[c] ?? '').replaceAll('"','""')}"`).join(','))].join('\n')
  return new NextResponse(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="inscricoes.csv"' } })
}
