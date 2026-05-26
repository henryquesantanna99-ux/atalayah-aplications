import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

interface RegisterPayload {
  email?: string
  password?: string
  fullName?: string
}

function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return { client: null, missing: { supabaseUrl: !supabaseUrl, serviceRoleKey: !serviceRoleKey } }
  }

  const client = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  return { client, missing: null }
}

export async function POST(request: Request) {
  const { client: supabase, missing } = createServiceClient()

  if (!supabase) {
    return NextResponse.json(
      { error: 'Missing server envs', details: missing },
      { status: 428 }
    )
  }

  let body: RegisterPayload
  try {
    body = (await request.json()) as RegisterPayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const email = body.email?.trim().toLowerCase()
  const password = body.password ?? ''
  const fullName = body.fullName?.trim() || null

  if (!email || !password) {
    return NextResponse.json(
      { error: 'Email and password are required.' },
      { status: 400 }
    )
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: fullName ? { full_name: fullName } : {},
  })

  if (error) {
    return NextResponse.json(
      { error: 'createUser failed', details: error.message },
      { status: 400 }
    )
  }

  return NextResponse.json({
    success: true,
    userId: data.user?.id ?? null,
    email: data.user?.email ?? null,
  })
}
