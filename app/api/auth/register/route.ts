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

  if (!supabaseUrl || !serviceRoleKey) return null

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })
}

export async function POST(request: Request) {
  const supabase = createServiceClient()
  if (!supabase) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY is not configured.' },
      { status: 428 }
    )
  }

  const body = (await request.json()) as RegisterPayload
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
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Reforço para garantir conta confirmada
  if (data.user?.id) {
    const { error: updateError } = await supabase.auth.admin.updateUserById(data.user.id, {
      email_confirm: true,
    })

    if (updateError) {
      return NextResponse.json(
        { error: `User created, but failed to confirm email: ${updateError.message}` },
        { status: 500 }
      )
    }
  }

  return NextResponse.json({ success: true })
}
