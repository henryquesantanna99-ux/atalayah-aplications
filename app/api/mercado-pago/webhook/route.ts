/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

function mapStatus(status: string) {
  if (status === 'approved') return { status_pagamento: 'pago', status_inscricao: 'confirmada', confirmed: true }
  if (status === 'cancelled') return { status_pagamento: 'cancelado', status_inscricao: 'cancelada', confirmed: false }
  if (status === 'rejected') return { status_pagamento: 'rejeitado', status_inscricao: 'aguardando_pagamento', confirmed: false }
  return { status_pagamento: 'processando', status_inscricao: 'aguardando_pagamento', confirmed: false }
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => ({}))
  const paymentId = payload?.data?.id || payload?.id
  if (!paymentId) return NextResponse.json({ ok: true })
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN
  if (!token) return NextResponse.json({ message: 'Token Mercado Pago ausente.' }, { status: 500 })
  const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, { headers: { Authorization: `Bearer ${token}` } })
  const payment = await paymentRes.json()
  if (!paymentRes.ok) return NextResponse.json({ message: 'Pagamento não encontrado.' }, { status: 404 })
  const uuid = payment.external_reference
  if (!uuid) return NextResponse.json({ message: 'Pagamento sem external_reference.' }, { status: 400 })
  const mapped = mapStatus(payment.status)
  const supabase = createAdminClient()
  await (supabase as any).from('inscricao_pagamentos').insert({ inscricao_id: uuid, payment_id: String(payment.id), external_reference: uuid, status: payment.status, status_detail: payment.status_detail, raw_payload: payment }).select('id').maybeSingle()
  await (supabase as any).from('inscricoes').update({ payment_id: String(payment.id), external_reference: uuid, status_pagamento: mapped.status_pagamento, status_inscricao: mapped.status_inscricao, data_pagamento: mapped.confirmed ? new Date().toISOString() : null, webhook_recebido_em: new Date().toISOString(), metadata: { mercado_pago_webhook: payment } }).eq('id', uuid)
  // Ponto desacoplado para futura liberação automática de acesso ao grupo.
  return NextResponse.json({ ok: true })
}
