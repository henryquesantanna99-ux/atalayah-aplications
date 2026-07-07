/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const supabase = createAdminClient()
  const { data, error } = await (supabase as any).from('inscricoes').select('id,status_pagamento,status_inscricao,data_pagamento,updated_at').eq('id', params.id).single()
  if (error) return NextResponse.json({ message: error.message }, { status: 404 })
  return NextResponse.json({ ...data, group_url: data.status_pagamento === 'pago' ? process.env.REGISTRATION_GROUP_URL || null : null })
}
