import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { runRandomDraw, calculatePrizePools } from '@/lib/utils'

// Service role — bypasses RLS for all admin operations
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── Auth helper ──────────────────────────────────────────────
async function verifyAdmin(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await db.auth.getUser(token)
  if (!user) return null
  const { data: p } = await db.from('profiles').select('role').eq('id', user.id).maybeSingle()
  return p?.role === 'admin' ? user : null
}

// ── GET /api/admin — load all dashboard data ─────────────────
export async function GET(req: NextRequest) {
  const user = await verifyAdmin(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [
    { data: profiles },
    { data: subs },
    { data: draws },
    { data: charities },
    { data: winners },
  ] = await Promise.all([
    db.from('profiles').select('*').neq('role', 'admin').order('created_at', { ascending: false }),
    db.from('subscriptions').select('*').eq('status', 'active'),
    db.from('draws').select('*').order('draw_month', { ascending: false }).limit(10),
    db.from('charities').select('*').order('name'),
    db.from('draw_winners')
      .select('*, profiles(full_name, email), draws(draw_month)')
      .order('created_at', { ascending: false }),
  ])

  const activeSubs = subs?.length || 0
  const pools = calculatePrizePools(activeSubs)
  const charityTotal = (subs || []).reduce(
    (sum: number, s: any) => sum + (s.amount * s.charity_percentage / 100), 0
  )

  return NextResponse.json({
    users: profiles || [],
    draws: draws || [],
    charities: charities || [],
    winners: winners || [],
    stats: {
      users: profiles?.length || 0,
      active: activeSubs,
      totalPool: pools.total,
      charityTotal,
    },
  })
}

// ── POST /api/admin — mutations ──────────────────────────────
export async function POST(req: NextRequest) {
  const user = await verifyAdmin(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { action } = body

  // ── Create next month draw ──
  if (action === 'create_draw') {
    const now = new Date()
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const monthStr = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`
    const { error } = await db.from('draws').insert({
      draw_month: monthStr, status: 'pending', jackpot_amount: 0, pool_4match: 0, pool_3match: 0,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, message: `Draw for ${monthStr} created.` })
  }

  // ── Auto-enter all subscribers into a draw ──
  if (action === 'auto_enter') {
    const { drawId } = body
    const { data: subs } = await db.from('subscriptions').select('user_id').eq('status', 'active')
    let entered = 0
    for (const sub of (subs || [])) {
      const { data: scores } = await db.from('golf_scores')
        .select('score').eq('user_id', sub.user_id)
        .order('score_date', { ascending: false }).limit(5)
      if (scores && scores.length > 0) {
        await db.from('draw_entries').upsert(
          { draw_id: drawId, user_id: sub.user_id, scores_snapshot: scores.map((s: any) => s.score) },
          { onConflict: 'draw_id,user_id' }
        )
        entered++
      }
    }
    return NextResponse.json({ ok: true, message: `${entered} subscriber(s) entered into draw.` })
  }

  // ── Run a draw ──
  if (action === 'run_draw') {
    const { drawId, activeSubs } = body
    const winNums = runRandomDraw()
    const pools = calculatePrizePools(activeSubs || 0)

    const { data: allEntries } = await db.from('draw_entries')
      .select('user_id, scores_snapshot').eq('draw_id', drawId)

    const winnerResults: any[] = []
    for (const entry of (allEntries || [])) {
      const scores: number[] = entry.scores_snapshot || []
      const matched = scores.filter((s: number) => winNums.includes(s))
      if (matched.length >= 3) {
        const matchType = matched.length >= 5 ? '5-match' : matched.length === 4 ? '4-match' : '3-match'
        winnerResults.push({ draw_id: drawId, user_id: entry.user_id, match_type: matchType, matched_numbers: matched, prize_amount: 0 })
      }
    }

    const j5 = winnerResults.filter(w => w.match_type === '5-match')
    const j4 = winnerResults.filter(w => w.match_type === '4-match')
    const j3 = winnerResults.filter(w => w.match_type === '3-match')
    j5.forEach(w => { w.prize_amount = j5.length ? pools.jackpot / j5.length : 0 })
    j4.forEach(w => { w.prize_amount = j4.length ? pools.match4 / j4.length : 0 })
    j3.forEach(w => { w.prize_amount = j3.length ? pools.match3 / j3.length : 0 })

    await db.from('draws').update({
      winning_numbers: winNums, status: 'published',
      jackpot_amount: pools.jackpot, pool_4match: pools.match4, pool_3match: pools.match3,
      jackpot_rolled_over: j5.length === 0, published_at: new Date().toISOString(),
    }).eq('id', drawId)

    if (winnerResults.length > 0) {
      await db.from('draw_winners').insert(winnerResults)
    }

    return NextResponse.json({
      ok: true,
      message: `Draw published! Winning numbers: ${winNums.join(', ')}. ${winnerResults.length} winner(s).`,
    })
  }

  // ── Add charity ──
  if (action === 'add_charity') {
    const { name, description, image_url } = body
    if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })
    const { error } = await db.from('charities').insert({ name, description, image_url, active: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, message: 'Charity added!' })
  }

  // ── Toggle charity ──
  if (action === 'toggle_charity') {
    const { id, active } = body
    const { error } = await db.from('charities').update({ active }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // ── Verify / reject winner ──
  if (action === 'verify_winner') {
    const { winnerId, approved } = body
    const { error } = await db.from('draw_winners').update({
      payment_status: approved ? 'verified' : 'rejected',
      verified_at: new Date().toISOString(),
    }).eq('id', winnerId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // ── Mark winner paid ──
  if (action === 'mark_paid') {
    const { winnerId } = body
    const { error } = await db.from('draw_winners').update({ payment_status: 'paid' }).eq('id', winnerId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
