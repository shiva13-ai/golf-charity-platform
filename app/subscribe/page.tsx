'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowRight, Heart, Trophy, Check, AlertCircle, RefreshCw } from 'lucide-react'

export default function SubscribePage() {
  const [plan, setPlan] = useState<'monthly' | 'yearly'>('monthly')
  const [charities, setCharities] = useState<any[]>([])
  const [charityId, setCharityId] = useState('')
  const [charityPct, setCharityPct] = useState(10)
  const [loading, setLoading] = useState(false)
  const [charityLoading, setCharityLoading] = useState(true)
  const [charityError, setCharityError] = useState('')
  const [error, setError] = useState('')
  const [cancelled, setCancelled] = useState(false)
  const [alreadySubscribed, setAlreadySubscribed] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCancelled(new URLSearchParams(window.location.search).get('cancelled') === '1')
    }
    checkAuthAndLoad()
  }, [])

  async function checkAuthAndLoad() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    // Admins never need to subscribe — maybeSingle() avoids throwing on no-row
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    if (profile?.role === 'admin') { router.push('/admin/dashboard'); return }

    // Check if already subscribed
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()

    if (sub) { setAlreadySubscribed(true) }

    loadCharities()
  }

  async function loadCharities() {
    setCharityLoading(true)
    setCharityError('')
    try {
      // Use API route — bypasses RLS, works on Vercel
      const res = await fetch('/api/charities')
      const json = await res.json()
      if (json.error) {
        setCharityError('Could not load charities: ' + json.error)
      } else if (!json.charities || json.charities.length === 0) {
        setCharityError('No charities found. Please run the seed SQL in your Supabase project.')
      } else {
        setCharities(json.charities)
      }
    } catch (e: any) {
      setCharityError('Network error loading charities. Check your connection.')
    } finally {
      setCharityLoading(false)
    }
  }

  async function handleCheckout() {
    if (!charityId) { setError('Please select a charity to support'); return }
    setError(''); setLoading(true)
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, charityId, charityPct }),
      })
      const data = await res.json()
      if (data.error) {
        setError('Payment error: ' + data.error)
        setLoading(false)
        return
      }
      window.location.href = data.url
    } catch {
      setError('Payment system unavailable. Make sure STRIPE_SECRET_KEY is set in Vercel.')
      setLoading(false)
    }
  }

  const planAmount = plan === 'monthly' ? 9.99 : 89.99
  const charityAmount = ((planAmount * charityPct) / 100).toFixed(2)

  if (alreadySubscribed) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#080808' }}>
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: 'rgba(93,224,110,0.1)', border: '1px solid rgba(93,224,110,0.3)' }}>
            <Check size={28} style={{ color: '#5de06e' }} />
          </div>
          <h2 className="font-display text-3xl font-bold mb-3" style={{ color: '#f8f4e8' }}>Already Subscribed!</h2>
          <p className="mb-6" style={{ color: 'rgba(248,244,232,0.5)' }}>You have an active subscription. Head to your dashboard.</p>
          <Link href="/dashboard" className="btn-gold inline-block px-8 py-3 rounded-lg">Go to Dashboard</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-12 px-4" style={{ background: '#080808' }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(212,168,42,0.06), transparent)' }} />
      <div className="max-w-2xl mx-auto relative">

        <Link href="/" className="block text-center font-display text-2xl mb-8" style={{ color: '#d4a82a' }}>GolfGive</Link>

        <div className="text-center mb-10">
          <h1 className="font-display text-4xl font-bold mb-2" style={{ color: '#f8f4e8' }}>Unlock Full Access</h1>
          <p style={{ color: 'rgba(248,244,232,0.5)' }}>Join monthly draws, fund a charity, and track your game</p>
        </div>

        {cancelled && (
          <div className="mb-6 p-4 rounded-xl flex items-center gap-3 text-sm" style={{ background: 'rgba(255,165,0,0.08)', border: '1px solid rgba(255,165,0,0.2)', color: '#ffa500' }}>
            <AlertCircle size={16} /> Payment was cancelled. No charge was made. You can try again below.
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-xl text-sm" style={{ background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)', color: '#ff6b6b' }}>
            {error}
          </div>
        )}

        {/* Plan Selection */}
        <div className="glass-card rounded-2xl p-6 mb-5">
          <h2 className="font-semibold mb-4" style={{ color: '#f8f4e8' }}>1. Choose Your Plan</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { id: 'monthly', label: 'Monthly', price: '£9.99', period: '/month', tag: null },
              { id: 'yearly',  label: 'Yearly',  price: '£89.99', period: '/year',  tag: 'Save 25%' },
            ].map(p => (
              <button key={p.id} onClick={() => setPlan(p.id as 'monthly' | 'yearly')}
                className="p-5 rounded-xl text-left transition-all relative"
                style={{ border: `1px solid ${plan === p.id ? '#d4a82a' : 'rgba(255,255,255,0.08)'}`, background: plan === p.id ? 'rgba(212,168,42,0.08)' : 'transparent' }}>
                {p.tag && (
                  <span className="absolute -top-2.5 left-3 text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: '#d4a82a', color: '#0f0f0f' }}>{p.tag}</span>
                )}
                <div className="text-sm mb-2" style={{ color: 'rgba(248,244,232,0.6)' }}>{p.label}</div>
                <div className="font-display text-2xl font-bold" style={{ color: '#d4a82a' }}>{p.price}</div>
                <div className="text-xs" style={{ color: 'rgba(248,244,232,0.4)' }}>{p.period}</div>
                {plan === p.id && (
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: '#d4a82a' }}>
                    <Check size={11} style={{ color: '#0f0f0f' }} />
                  </div>
                )}
              </button>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {['Monthly prize draw entry', 'Charity contribution', 'Full score history (5 scores)', 'Win cash prizes'].map(f => (
              <div key={f} className="flex items-center gap-2 text-xs" style={{ color: 'rgba(248,244,232,0.6)' }}>
                <span style={{ color: '#d4a82a' }}>✓</span> {f}
              </div>
            ))}
          </div>
        </div>

        {/* Charity Selection */}
        <div className="glass-card rounded-2xl p-6 mb-5">
          <h2 className="font-semibold mb-1" style={{ color: '#f8f4e8' }}>2. Choose Your Charity</h2>
          <p className="text-sm mb-4" style={{ color: 'rgba(248,244,232,0.4)' }}>Minimum 10% of your subscription goes to them</p>

          {charityLoading && (
            <div className="py-8 text-center text-sm" style={{ color: 'rgba(248,244,232,0.4)' }}>
              <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-2" style={{ borderColor: '#d4a82a', borderTopColor: 'transparent' }} />
              Loading charities...
            </div>
          )}

          {!charityLoading && charityError && (
            <div className="py-6 text-center">
              <p className="text-sm mb-3" style={{ color: '#ff6b6b' }}>{charityError}</p>
              <button onClick={loadCharities} className="btn-outline-gold text-sm px-4 py-2 rounded-lg flex items-center gap-2 mx-auto">
                <RefreshCw size={14} /> Retry
              </button>
            </div>
          )}

          {!charityLoading && !charityError && charities.length > 0 && (
            <div className="space-y-2 max-h-60 overflow-y-auto mb-4 pr-1">
              {charities.map(c => (
                <button key={c.id} onClick={() => setCharityId(c.id)}
                  className="w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all"
                  style={{ border: `1px solid ${charityId === c.id ? '#d4a82a' : 'rgba(255,255,255,0.06)'}`, background: charityId === c.id ? 'rgba(212,168,42,0.07)' : 'rgba(255,255,255,0.02)' }}>
                  <div className="w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all"
                    style={{ borderColor: charityId === c.id ? '#d4a82a' : 'rgba(255,255,255,0.3)' }}>
                    {charityId === c.id && <div className="w-2 h-2 rounded-full" style={{ background: '#d4a82a' }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold" style={{ color: '#f8f4e8' }}>{c.name}</div>
                    <div className="text-xs mt-0.5 line-clamp-2" style={{ color: 'rgba(248,244,232,0.4)' }}>{c.description}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="mt-4">
            <label className="block text-sm mb-2" style={{ color: 'rgba(248,244,232,0.7)' }}>
              Contribution: <span style={{ color: '#d4a82a' }}>{charityPct}%</span>
              <span className="ml-2 text-xs" style={{ color: 'rgba(248,244,232,0.4)' }}>(£{charityAmount} per {plan === 'monthly' ? 'month' : 'year'})</span>
            </label>
            <input type="range" min={10} max={50} value={charityPct}
              onChange={e => setCharityPct(Number(e.target.value))}
              className="w-full" style={{ accentColor: '#d4a82a' }} />
            <div className="flex justify-between text-xs mt-1" style={{ color: 'rgba(248,244,232,0.3)' }}>
              <span>Min 10%</span><span>Max 50%</span>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="glass-card rounded-2xl p-6">
          <h2 className="font-semibold mb-4" style={{ color: '#f8f4e8' }}>3. Summary</h2>
          <div className="space-y-2 text-sm mb-5">
            <div className="flex justify-between">
              <span style={{ color: 'rgba(248,244,232,0.5)' }}>Plan</span>
              <span style={{ color: '#f8f4e8' }}>{plan === 'monthly' ? 'Monthly — £9.99/mo' : 'Yearly — £89.99/yr'}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'rgba(248,244,232,0.5)' }}>Charity</span>
              <span style={{ color: charityId ? '#d4a82a' : 'rgba(248,244,232,0.3)' }}>
                {charityId ? charities.find(c => c.id === charityId)?.name : 'Not selected yet'}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'rgba(248,244,232,0.5)' }}>Charity contribution</span>
              <span style={{ color: '#d4a82a' }}>£{charityAmount} ({charityPct}%)</span>
            </div>
            <div className="flex justify-between pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ color: 'rgba(248,244,232,0.5)' }}>Prize pool contribution</span>
              <span style={{ color: '#f8f4e8' }}>£{(planAmount * 0.5).toFixed(2)}</span>
            </div>
          </div>

          <button onClick={handleCheckout} disabled={loading || charityLoading}
            className="btn-gold w-full py-4 rounded-xl flex items-center justify-center gap-2 text-base font-semibold disabled:opacity-50">
            {loading
              ? <><div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#0f0f0f', borderTopColor: 'transparent' }} /> Redirecting to payment...</>
              : <><Heart size={18} /> Subscribe & Start Playing <ArrowRight size={18} /></>
            }
          </button>
          <p className="text-center text-xs mt-3" style={{ color: 'rgba(248,244,232,0.3)' }}>
            Secure payment via Stripe · Cancel anytime
          </p>
        </div>

        <p className="text-center mt-6 text-sm">
          <Link href="/dashboard" style={{ color: 'rgba(248,244,232,0.3)' }}>← Back to dashboard</Link>
        </p>
      </div>
    </div>
  )
}
