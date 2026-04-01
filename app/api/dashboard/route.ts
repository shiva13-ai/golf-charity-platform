import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Helper: get user from Bearer token
async function getUser(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data } = await supabaseAdmin.auth.getUser(token)
  return data?.user || null
}

export async function GET(req: NextRequest) {
  try {
    const user = await getUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const [
      { data: profile },
      { data: subscription },
      { data: scores },
      { data: draws },
      { data: winners },
    ] = await Promise.all([
      supabaseAdmin.from('profiles').select('*').eq('id', user.id).single(),
      supabaseAdmin
        .from('subscriptions')
        .select('*, charities(name, description)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from('golf_scores')
        .select('*')
        .eq('user_id', user.id)
        .order('score_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(5),
      supabaseAdmin
        .from('draws')
        .select('*')
        .eq('status', 'published')
        .order('draw_month', { ascending: false })
        .limit(6),
      supabaseAdmin
        .from('draw_winners')
        .select('*, draws(draw_month)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
    ])

    return NextResponse.json({
      profile,
      subscription: subscription || null,
      scores: scores || [],
      draws: draws || [],
      winners: winners || [],
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
