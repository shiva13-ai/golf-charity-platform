import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' })

// Admin supabase client (service role — bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const { user_id, plan, charity_id, charity_pct } = session.metadata || {}

    if (!user_id) return NextResponse.json({ received: true })

    const amount = plan === 'yearly' ? 89.99 : 9.99
    const now = new Date()
    const periodEnd = new Date(now)
    if (plan === 'yearly') periodEnd.setFullYear(periodEnd.getFullYear() + 1)
    else periodEnd.setMonth(periodEnd.getMonth() + 1)

    // Upsert subscription
    await supabaseAdmin.from('subscriptions').upsert({
      user_id,
      plan: plan || 'monthly',
      status: 'active',
      amount,
      charity_id: charity_id || null,
      charity_percentage: Number(charity_pct) || 10,
      stripe_subscription_id: session.subscription as string,
      stripe_customer_id: session.customer as string,
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
    }, { onConflict: 'user_id' })
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription
    await supabaseAdmin.from('subscriptions')
      .update({ status: 'cancelled' })
      .eq('stripe_subscription_id', sub.id)
  }

  return NextResponse.json({ received: true })
}
