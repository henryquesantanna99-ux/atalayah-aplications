/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createAdminClient()
  const { data: inscricao, error } = await (supabase as any).from('inscricoes').select('*').eq('id', params.id).single()
  if (error || !inscricao) return NextResponse.json({ message: 'Inscrição não encontrada.' }, { status: 404 })

  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN
  if (!token) return NextResponse.json({ message: 'MERCADO_PAGO_ACCESS_TOKEN não configurado.' }, { status: 500 })

  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin
  const response = await fetch('https://api.mercadopago.com/v1/payments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Idempotency-Key': params.id },
    body: JSON.stringify({
      transaction_amount: Number(inscricao.valor || 29),
      description: 'Inscrição AtalaYah - Ministério de Louvor',
      payment_method_id: 'pix',
      external_reference: params.id,
      notification_url: `${origin}/api/mercado-pago/webhook`,
      payer: { email: inscricao.email_contato || 'inscricao@atalayah.local', first_name: inscricao.nome_participante || 'Participante' },
      metadata: { inscricao_id: params.id },
    }),
  })
  const payment = await response.json()
  if (!response.ok) return NextResponse.json({ message: payment.message || 'Erro ao gerar Pix.', details: payment }, { status: 502 })

  await (supabase as any).from('inscricoes').update({ status_pagamento: 'processando', payment_id: String(payment.id), external_reference: params.id, metadata: { ...(inscricao.metadata || {}), mercado_pago: payment } }).eq('id', params.id)
  return NextResponse.json({ payment_id: String(payment.id), qr_code: payment.point_of_interaction?.transaction_data?.qr_code, qr_code_base64: payment.point_of_interaction?.transaction_data?.qr_code_base64 })
}
