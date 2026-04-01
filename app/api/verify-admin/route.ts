import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service role bypasses RLS — safe for server-side only
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { accessToken } = await req.json()
    if (!accessToken) return NextResponse.json({ isAdmin: false }, { status: 400 })

    // Verify the token and get the user — service role, no RLS
    const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(accessToken)
    if (userErr || !user) return NextResponse.json({ isAdmin: false }, { status: 401 })

    // Check role using service role client — completely bypasses RLS
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    return NextResponse.json({ isAdmin: profile?.role === 'admin' })
  } catch (err: any) {
    return NextResponse.json({ isAdmin: false, error: err.message }, { status: 500 })
  }
}
