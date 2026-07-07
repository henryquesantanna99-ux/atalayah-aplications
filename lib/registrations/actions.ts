/* eslint-disable @typescript-eslint/no-explicit-any */
'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { classifyAge } from './types'

type RegistrationInput = Record<string, string | number | null | undefined>

const PAYMENT_AMOUNT = 29

export async function criarInscricao(payload: RegistrationInput) {
  const supabase = createAdminClient()
  const idade = payload.idade === '' || payload.idade === undefined || payload.idade === null ? null : Number(payload.idade)
  const tipo = payload.tipo_inscricao === 'para_jovem' ? 'para_jovem' : 'pra_mim'
  const record = {
    tipo_inscricao: tipo,
    nome_participante: String(payload.nome_participante || '').trim(),
    nome_inscrito_por: tipo === 'para_jovem' ? String(payload.nome_inscrito_por || '').trim() : null,
    idade,
    classificacao_idade: classifyAge(idade),
    nome_responsavel: String(payload.nome_responsavel || '').trim() || null,
    telefone_responsavel: String(payload.telefone_responsavel || '').trim() || null,
    telefone_contato: String(payload.telefone_contato || '').trim(),
    email_contato: String(payload.email_contato || '').trim() || null,
    pais: 'Brasil',
    uf: String(payload.uf || '').trim() || null,
    cidade: String(payload.cidade || '').trim(),
    bairro: String(payload.bairro || '').trim(),
    sede_regional: String(payload.sede_regional || '').trim(),
    lider_responsavel: String(payload.lider_responsavel || '').trim(),
    igreja: String(payload.igreja || '').trim() || null,
    area_desejada: String(payload.area_desejada || '').trim() || null,
    instrumentos: String(payload.instrumentos || '').trim() || null,
    tem_experiencia: String(payload.tem_experiencia || '').trim() || null,
    tempo_experiencia: payload.tem_experiencia === 'Sim' ? String(payload.tempo_experiencia || '').trim() || null : null,
    serve_ministerio: String(payload.serve_ministerio || '').trim() || null,
    disponibilidade: String(payload.disponibilidade || '').trim() || null,
    ajuda_financeira: String(payload.ajuda_financeira || '').trim() || null,
    observacoes: String(payload.observacoes || '').trim() || null,
    status_pagamento: 'aguardando_pagamento',
    status_inscricao: 'aguardando_pagamento',
    valor: PAYMENT_AMOUNT,
    metadata: payload,
  }

  if (!record.nome_participante || !record.telefone_contato || !record.cidade || !record.bairro || !record.sede_regional || !record.lider_responsavel) {
    return { success: false, message: 'Preencha os campos obrigatórios.' }
  }
  if (tipo === 'para_jovem' && !record.nome_inscrito_por) {
    return { success: false, message: 'Informe seu nome completo.' }
  }

  const { data, error } = await (supabase as any).from('inscricoes').insert(record).select('id').single()
  if (error) return { success: false, message: error.message }
  revalidatePath('/inscricao')
  revalidatePath('/inscricoes')
  return { success: true, id: data.id as string }
}
