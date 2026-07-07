/* eslint-disable @typescript-eslint/no-explicit-any */
'use server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function listarInscricoes(searchParams: Record<string, string | string[] | undefined>) {
  const supabase = createAdminClient()
  const page = Number(searchParams.page || 1)
  const pageSize = 25
  let query = (supabase as any).from('inscricoes').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1)
  const filters = ['cidade','bairro','sede_regional','lider_responsavel','tipo_inscricao','area_desejada','status_pagamento','status_inscricao','classificacao_idade']
  filters.forEach((key) => { const value = searchParams[key]; if (value && typeof value === 'string') query = query.eq(key, value) })
  const q = searchParams.q
  if (q && typeof q === 'string') query = query.or(`nome_participante.ilike.%${q}%,telefone_contato.ilike.%${q}%,email_contato.ilike.%${q}%,id.eq.${q}`)
  if (typeof searchParams.de === 'string') query = query.gte('created_at', searchParams.de)
  if (typeof searchParams.ate === 'string') query = query.lte('created_at', `${searchParams.ate}T23:59:59`)
  const { data, count, error } = await query
  if (error) throw new Error(error.message)
  const { data: metrics } = await (supabase as any).from('inscricoes_dashboard').select('*').single()
  return { rows: data || [], count: count || 0, page, pageSize, metrics }
}

export async function obterInscricao(id: string) {
  const supabase = createAdminClient()
  const { data, error } = await (supabase as any).from('inscricoes').select('*').eq('id', id).single()
  if (error) throw new Error(error.message)
  const { data: payments } = await (supabase as any).from('inscricao_pagamentos').select('*').eq('inscricao_id', id).order('created_at', { ascending: false })
  return { inscricao: data, payments: payments || [] }
}
