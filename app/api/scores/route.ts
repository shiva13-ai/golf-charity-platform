import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getUser(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data } = await supabaseAdmin.auth.getUser(token)
  return data?.user || null
}

// POST: Add a new score
export async function POST(req: NextRequest) {
  try {
    const user = await getUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { score, score_date } = await req.json()
    const scoreNum = parseInt(score)

    if (!scoreNum || scoreNum < 1 || scoreNum > 45) {
      return NextResponse.json({ error: 'Score must be between 1 and 45' }, { status: 400 })
    }
    if (!score_date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 })
    }

    // Check subscription for score limit
    const { data: sub } = await supabaseAdmin
      .from('subscriptions').select('status').eq('user_id', user.id).eq('status', 'active').maybeSingle()

    const isSubscribed = sub?.status === 'active'

    // Count existing scores
    const { count } = await supabaseAdmin
      .from('golf_scores').select('*', { count: 'exact', head: true }).eq('user_id', user.id)

    if (!isSubscribed && (count || 0) >= 2) {
      return NextResponse.json({ error: 'Free accounts can store up to 2 scores. Subscribe for full access.' }, { status: 403 })
    }

    const { data, error } = await supabaseAdmin
      .from('golf_scores')
      .insert({ user_id: user.id, score: scoreNum, score_date })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Fetch updated scores list
    const { data: scores } = await supabaseAdmin
      .from('golf_scores')
      .select('*')
      .eq('user_id', user.id)
      .order('score_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(5)

    return NextResponse.json({ success: true, score: data, scores: scores || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE: Remove a score by id
export async function DELETE(req: NextRequest) {
  try {
    const user = await getUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'Score ID required' }, { status: 400 })

    // Ensure the score belongs to this user
    const { error } = await supabaseAdmin
      .from('golf_scores')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Return updated scores
    const { data: scores } = await supabaseAdmin
      .from('golf_scores')
      .select('*')
      .eq('user_id', user.id)
      .order('score_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(5)

    return NextResponse.json({ success: true, scores: scores || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
