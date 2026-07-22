/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendRegistrationConfirmationWhatsApp } from '@/lib/registrations/whatsapp'

function mapStatus(status: string) {
  if (status === 'approved') return { status_pagamento: 'pago', status_inscricao: 'confirmada', confirmed: true }
  if (status === 'cancelled') return { status_pagamento: 'cancelado', status_inscricao: 'cancelada', confirmed: false }
  if (status === 'rejected') return { status_pagamento: 'rejeitado', status_inscricao: 'aguardando_pagamento', confirmed: false }
  return { status_pagamento: 'processando', status_inscricao: 'aguardando_pagamento', confirmed: false }
}

async function readJsonSafely(response: Response) {
  return response.json().catch(() => ({}))
}

function acknowledged(body: Record<string, unknown>, status = 200) {
  return NextResponse.json({ received: true, ...body }, { status })
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => ({}))
  const paymentId = payload?.data?.id || payload?.id

  if (!paymentId) return acknowledged({ ok: true, skipped: true, reason: 'Notificação sem payment id.' })

  try {
    const token = process.env.MERCADO_PAGO_ACCESS_TOKEN
    if (!token) {
      console.error('[mercado-pago-webhook] MERCADO_PAGO_ACCESS_TOKEN ausente.')
      return acknowledged({ ok: false, processed: false, reason: 'Token Mercado Pago ausente.' })
    }

    const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const payment = await readJsonSafely(paymentRes)

    if (!paymentRes.ok) {
      console.error('[mercado-pago-webhook] Pagamento não encontrado.', { paymentId, status: paymentRes.status, payment })
      return acknowledged({ ok: false, processed: false, reason: 'Pagamento não encontrado.', paymentId, status: paymentRes.status })
    }

    const uuid = payment.external_reference
    if (!uuid) {
      console.error('[mercado-pago-webhook] Pagamento sem external_reference.', { paymentId, payment })
      return acknowledged({ ok: false, processed: false, reason: 'Pagamento sem external_reference.', paymentId })
    }

    const mapped = mapStatus(payment.status)
    const supabase = createAdminClient()
    const { data: inscricao, error: inscricaoError } = await (supabase as any)
      .from('inscricoes')
      .select('id,nome_participante,telefone_contato,metadata')
      .eq('id', uuid)
      .maybeSingle()

    if (inscricaoError) {
      console.error('[mercado-pago-webhook] Erro ao buscar inscrição.', { uuid, inscricaoError })
    }

    const groupUrl = process.env.REGISTRATION_GROUP_URL || null
    const whatsappResult = mapped.confirmed
      ? await sendRegistrationConfirmationWhatsApp({
          to: inscricao?.telefone_contato,
          name: inscricao?.nome_participante,
          registrationId: uuid,
          groupUrl,
        })
      : null

    const paymentLog = await (supabase as any)
      .from('inscricao_pagamentos')
      .insert({
        inscricao_id: uuid,
        payment_id: String(payment.id),
        external_reference: uuid,
        status: payment.status,
        status_detail: payment.status_detail,
        raw_payload: { ...payment, whatsapp: whatsappResult },
      })
      .select('id')
      .maybeSingle()

    if (paymentLog.error) {
      console.error('[mercado-pago-webhook] Erro ao registrar pagamento.', { uuid, error: paymentLog.error })
    }

    const updateResult = await (supabase as any)
      .from('inscricoes')
      .update({
        payment_id: String(payment.id),
        external_reference: uuid,
        status_pagamento: mapped.status_pagamento,
        status_inscricao: mapped.status_inscricao,
        data_pagamento: mapped.confirmed ? new Date().toISOString() : null,
        webhook_recebido_em: new Date().toISOString(),
        metadata: { ...(inscricao?.metadata || {}), mercado_pago_webhook: payment, whatsapp: whatsappResult, group_url: groupUrl },
      })
      .eq('id', uuid)

    if (updateResult.error) {
      console.error('[mercado-pago-webhook] Erro ao atualizar inscrição.', { uuid, error: updateResult.error })
      return acknowledged({ ok: false, processed: false, reason: 'Erro ao atualizar inscrição.', registrationId: uuid })
    }

    return acknowledged({ ok: true, processed: true, registrationId: uuid, whatsapp: whatsappResult })
  } catch (error) {
    console.error('[mercado-pago-webhook] Falha inesperada ao processar webhook.', { paymentId, error })
    return acknowledged({ ok: false, processed: false, reason: 'Falha inesperada ao processar webhook.', paymentId })
  }
}
