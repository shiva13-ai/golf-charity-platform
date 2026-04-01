'use client'
import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { ArrowRight, Heart, Trophy, BarChart3, Shield, Star, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function LandingPage() {
  const [charities, setCharities] = useState<any[]>([])
  const router = useRouter()
  const heroRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Check if logged in — redirect admins to admin panel
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
        if (profile?.role === 'admin') router.push('/admin/dashboard')
        else router.push('/dashboard')
      }
    })
    // Load charities
    supabase.from('charities').select('*').eq('featured', true).limit(3)
      .then(({ data }) => { if (data) setCharities(data) })
    // Animate on scroll
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') })
    }, { threshold: 0.1 })
    document.querySelectorAll('[data-anim]').forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <div className="min-h-screen" style={{ background: '#080808' }}>

      {/* NAV */}
      <nav className="fixed top-0 w-full z-50 px-6 py-4" style={{ background: 'rgba(8,8,8,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(212,168,42,0.08)' }}>
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="font-display text-xl" style={{ color: '#d4a82a', letterSpacing: '0.05em' }}>
            Golf<span style={{ color: '#f8f4e8' }}>Give</span>
          </div>
          <div className="flex gap-3">
            <Link href="/auth/login" className="btn-outline-gold px-5 py-2 text-sm font-medium">Log in</Link>
            <Link href="/auth/signup" className="btn-gold px-5 py-2 text-sm">Join Now</Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative min-h-screen flex flex-col justify-center items-center text-center px-4 pt-24 pb-16" ref={heroRef}>
        {/* Background gradient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/3 w-96 h-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #d4a82a, transparent)', filter: 'blur(80px)' }} />
          <div className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full opacity-8" style={{ background: 'radial-gradient(circle, #e8c44a, transparent)', filter: 'blur(60px)' }} />
        </div>
        
        <div className="relative max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm mb-8" style={{ background: 'rgba(212,168,42,0.1)', border: '1px solid rgba(212,168,42,0.3)', color: '#d4a82a' }}>
            <Heart size={14} fill="currentColor" />
            <span>£10,000+ donated to charity this month</span>
          </div>

          <h1 className="font-display text-6xl md:text-8xl font-bold leading-none mb-6" style={{ color: '#f8f4e8', letterSpacing: '-0.02em' }}>
            Play Golf.<br />
            <span className="gold-shimmer">Win Prizes.</span><br />
            <span style={{ color: '#d4a82a' }}>Change Lives.</span>
          </h1>

          <p className="text-xl md:text-2xl mb-12 max-w-2xl mx-auto" style={{ color: 'rgba(248,244,232,0.6)', fontWeight: 300 }}>
            Enter your Stableford scores, compete in monthly prize draws, and support the charity closest to your heart — all in one place.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup" className="btn-gold inline-flex items-center gap-2 px-8 py-4 text-lg rounded-lg">
              Start for £9.99/mo <ArrowRight size={20} />
            </Link>
            <a href="#how-it-works" className="btn-outline-gold inline-flex items-center gap-2 px-8 py-4 text-lg rounded-lg">
              How It Works <ChevronDown size={20} />
            </a>
          </div>

          <div className="flex justify-center gap-8 mt-16 text-center">
            {[['4,200+', 'Active Members'], ['£82,000+', 'Prizes Awarded'], ['12', 'Charities Supported']].map(([num, label]) => (
              <div key={label}>
                <div className="font-display text-3xl font-bold" style={{ color: '#d4a82a' }}>{num}</div>
                <div className="text-sm" style={{ color: 'rgba(248,244,232,0.5)' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16" data-anim>
            <p className="text-sm uppercase tracking-widest mb-3" style={{ color: '#d4a82a' }}>How It Works</p>
            <h2 className="font-display text-5xl font-bold" style={{ color: '#f8f4e8' }}>Simple. Exciting. Meaningful.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: BarChart3, step: '01', title: 'Enter Your Scores', desc: 'Log your last 5 Stableford scores after every round. Your most recent results are always in the running.' },
              { icon: Trophy, step: '02', title: 'Join the Monthly Draw', desc: 'Your scores automatically enter the monthly draw. Match 3, 4, or all 5 numbers to win real cash prizes.' },
              { icon: Heart, step: '03', title: 'Fund a Charity', desc: 'Choose a cause you believe in. A portion of every subscription goes directly to your chosen charity, every month.' },
            ].map(({ icon: Icon, step, title, desc }) => (
              <div key={step} className="glass-card rounded-2xl p-8 relative overflow-hidden" data-anim>
                <div className="absolute top-4 right-4 font-display text-6xl font-bold opacity-10" style={{ color: '#d4a82a' }}>{step}</div>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{ background: 'rgba(212,168,42,0.15)' }}>
                  <Icon size={22} style={{ color: '#d4a82a' }} />
                </div>
                <h3 className="font-display text-xl font-semibold mb-3" style={{ color: '#f8f4e8' }}>{title}</h3>
                <p style={{ color: 'rgba(248,244,232,0.6)', lineHeight: 1.7 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRIZE POOL */}
      <section className="py-24 px-4" style={{ background: 'rgba(212,168,42,0.03)', borderTop: '1px solid rgba(212,168,42,0.08)', borderBottom: '1px solid rgba(212,168,42,0.08)' }}>
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm uppercase tracking-widest mb-3" style={{ color: '#d4a82a' }}>Prize Structure</p>
          <h2 className="font-display text-5xl font-bold mb-16" style={{ color: '#f8f4e8' }} data-anim>Monthly Prize Pool</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { label: '5-Number Match', pct: '40%', badge: '🏆 Jackpot', desc: 'Rolls over if unclaimed', color: '#d4a82a' },
              { label: '4-Number Match', pct: '35%', badge: '🥈 Runner Up', desc: 'Split among all winners', color: '#a0a0a0' },
              { label: '3-Number Match', pct: '25%', badge: '🥉 Third Prize', desc: 'Split among all winners', color: '#b87333' },
            ].map(({ label, pct, badge, desc, color }) => (
              <div key={label} className="glass-card rounded-2xl p-8" data-anim>
                <div className="text-2xl mb-3">{badge.split(' ')[0]}</div>
                <div className="font-display text-5xl font-bold mb-2" style={{ color }}>{pct}</div>
                <div className="font-semibold mb-1" style={{ color: '#f8f4e8' }}>{label}</div>
                <div className="text-sm" style={{ color: 'rgba(248,244,232,0.5)' }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CHARITIES */}
      <section className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16" data-anim>
            <p className="text-sm uppercase tracking-widest mb-3" style={{ color: '#d4a82a' }}>Make It Count</p>
            <h2 className="font-display text-5xl font-bold" style={{ color: '#f8f4e8' }}>Choose Your Charity</h2>
            <p className="mt-4 text-lg" style={{ color: 'rgba(248,244,232,0.5)' }}>10% of every subscription goes to the charity you choose. Want to give more? You can.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {charities.length > 0 ? charities.map(c => (
              <div key={c.id} className="glass-card rounded-2xl overflow-hidden" data-anim>
                <div className="h-40 relative" style={{ background: 'rgba(212,168,42,0.1)' }}>
                  {c.image_url && <img src={c.image_url} alt={c.name} className="w-full h-full object-cover opacity-70" />}
                </div>
                <div className="p-6">
                  <h3 className="font-display text-lg font-semibold mb-2" style={{ color: '#f8f4e8' }}>{c.name}</h3>
                  <p className="text-sm line-clamp-3" style={{ color: 'rgba(248,244,232,0.6)' }}>{c.description}</p>
                </div>
              </div>
            )) : [
              { name: 'Golf Foundation', desc: 'Opening golf to young people from all backgrounds.' },
              { name: 'Cancer Research UK', desc: 'Funding pioneering research to beat cancer sooner.' },
              { name: 'British Heart Foundation', desc: 'Fighting cardiovascular disease since 1961.' },
            ].map(c => (
              <div key={c.name} className="glass-card rounded-2xl overflow-hidden" data-anim>
                <div className="h-40" style={{ background: 'linear-gradient(135deg, rgba(212,168,42,0.15), rgba(212,168,42,0.05))' }} />
                <div className="p-6">
                  <h3 className="font-display text-lg font-semibold mb-2" style={{ color: '#f8f4e8' }}>{c.name}</h3>
                  <p className="text-sm" style={{ color: 'rgba(248,244,232,0.6)' }}>{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLANS */}
      <section className="py-24 px-4" style={{ background: 'rgba(212,168,42,0.03)' }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-5xl font-bold mb-4" style={{ color: '#f8f4e8' }} data-anim>Simple Pricing</h2>
          <p className="mb-16 text-lg" style={{ color: 'rgba(248,244,232,0.5)' }}>No hidden fees. Cancel anytime.</p>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { plan: 'Monthly', price: '£9.99', period: '/month', desc: 'Billed monthly. Cancel any time.', tag: null },
              { plan: 'Yearly', price: '£89.99', period: '/year', desc: 'Save £29.89 vs monthly billing.', tag: 'Best Value' },
            ].map(({ plan, price, period, desc, tag }) => (
              <div key={plan} className={`glass-card rounded-2xl p-8 text-left relative ${tag ? 'ring-1 ring-[#d4a82a] border-[#d4a82a]/40' : ''}`}>
                {tag && <div className="absolute -top-3 left-6 px-3 py-1 text-xs font-semibold rounded-full" style={{ background: '#d4a82a', color: '#0f0f0f' }}>{tag}</div>}
                <div className="text-sm uppercase tracking-widest mb-4" style={{ color: '#d4a82a' }}>{plan}</div>
                <div className="font-display text-5xl font-bold mb-1" style={{ color: '#f8f4e8' }}>{price}</div>
                <div className="text-sm mb-4" style={{ color: 'rgba(248,244,232,0.4)' }}>{period} · {desc}</div>
                <ul className="space-y-2 mb-6">
                  {['Monthly prize draw entry', 'Charity contribution (min 10%)', 'Score tracking dashboard', 'Winner verification system'].map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm" style={{ color: 'rgba(248,244,232,0.7)' }}>
                      <span style={{ color: '#d4a82a' }}>✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link href="/auth/signup" className="btn-gold block text-center py-3 rounded-lg">Get Started</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, rgba(212,168,42,0.06), transparent)' }} />
        <h2 className="font-display text-5xl md:text-6xl font-bold mb-6" style={{ color: '#f8f4e8' }} data-anim>
          Ready to Play <span className="gold-shimmer">With Purpose?</span>
        </h2>
        <p className="mb-10 text-xl max-w-xl mx-auto" style={{ color: 'rgba(248,244,232,0.5)' }}>Join thousands of golfers who are winning prizes and funding causes they love.</p>
        <Link href="/auth/signup" className="btn-gold inline-flex items-center gap-2 px-10 py-4 text-lg rounded-lg">
          Create Your Account <ArrowRight size={20} />
        </Link>
      </section>

      {/* FOOTER */}
      <footer className="py-10 px-6 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', color: 'rgba(248,244,232,0.3)' }}>
        <div className="font-display text-lg mb-2" style={{ color: '#d4a82a' }}>GolfGive</div>
        <p className="text-sm">© 2026 GolfGive. Operated responsibly for charity.</p>
        <div className="flex justify-center gap-4 mt-3 text-xs">
          <Link href="#" className="hover:text-gold-400">Privacy Policy</Link>
          <Link href="#" className="hover:text-gold-400">Terms of Service</Link>
          <Link href="#" className="hover:text-gold-400">Responsible Gaming</Link>
        </div>
      </footer>
    </div>
  )
}
