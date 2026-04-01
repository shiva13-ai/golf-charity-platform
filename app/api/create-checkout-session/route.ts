import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' })

const PRICES = {
  monthly: { amount: 999,  interval: 'month' as const, label: '£9.99/month' },
  yearly:  { amount: 8999, interval: 'year'  as const, label: '£89.99/year' },
}

export async function POST(req: NextRequest) {
  try {
    const { plan, charityId, charityPct } = await req.json()

    // Get authenticated user
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const priceConfig = PRICES[plan as 'monthly' | 'yearly'] || PRICES.monthly
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{
        price_data: {
          currency: 'gbp',
          product_data: {
            name: `GolfGive ${plan === 'yearly' ? 'Yearly' : 'Monthly'} Plan`,
            description: 'Golf score tracking + monthly prize draws + charity contributions',
          },
          recurring: { interval: priceConfig.interval },
          unit_amount: priceConfig.amount,
        },
        quantity: 1,
      }],
      metadata: {
        user_id: user.id,
        plan,
        charity_id: charityId || '',
        charity_pct: String(charityPct || 10),
      },
      customer_email: user.email,
      success_url: `${appUrl}/dashboard?subscribed=1`,
      cancel_url: `${appUrl}/subscribe?cancelled=1`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('Stripe error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
