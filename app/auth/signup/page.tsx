'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Eye, EyeOff, UserCheck } from 'lucide-react'

export default function SignupPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPw: '' })
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const router = useRouter()

  function update(key: string, val: string) { setForm(f => ({ ...f, [key]: val })) }

  async function handleSignup() {
    if (!form.name || !form.email || !form.password) { setError('All fields are required'); return }
    if (form.password !== form.confirmPw) { setError('Passwords do not match'); return }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return }
    setError(''); setLoading(true)
    const supabase = createClient()
    const { data, error: err } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.name } }
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    // If email confirmation is disabled in Supabase, user is immediately logged in
    if (data.session) {
      router.push('/dashboard')
    } else {
      // Email confirmation required — show success state
      setDone(true)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#080808' }}>
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(212,168,42,0.15)', border: '1px solid rgba(212,168,42,0.3)' }}>
            <UserCheck size={28} style={{ color: '#d4a82a' }} />
          </div>
          <h2 className="font-display text-3xl font-bold mb-3" style={{ color: '#f8f4e8' }}>Check your email</h2>
          <p className="mb-6" style={{ color: 'rgba(248,244,232,0.5)' }}>
            We sent a confirmation link to <span style={{ color: '#d4a82a' }}>{form.email}</span>. Click it to activate your account, then sign in.
          </p>
          <Link href="/auth/login" className="btn-gold inline-block px-8 py-3 rounded-lg">Go to Sign In</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: '#080808' }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 20%, rgba(212,168,42,0.05), transparent)' }} />
      <div className="w-full max-w-md relative">
        <Link href="/" className="block text-center font-display text-2xl mb-8" style={{ color: '#d4a82a' }}>GolfGive</Link>

        <div className="glass-card rounded-2xl p-8">
          <h2 className="font-display text-3xl font-bold mb-1" style={{ color: '#f8f4e8' }}>Create Account</h2>
          <p className="mb-6 text-sm" style={{ color: 'rgba(248,244,232,0.5)' }}>Free to join. Subscribe when you're ready.</p>

          {error && (
            <div className="rounded-lg p-3 mb-5 text-sm" style={{ background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.2)', color: '#ff6b6b' }}>
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-1.5" style={{ color: 'rgba(248,244,232,0.7)' }}>Full Name</label>
              <input type="text" value={form.name} onChange={e => update('name', e.target.value)} className="input-dark" placeholder="Your full name" />
            </div>
            <div>
              <label className="block text-sm mb-1.5" style={{ color: 'rgba(248,244,232,0.7)' }}>Email</label>
              <input type="email" value={form.email} onChange={e => update('email', e.target.value)} className="input-dark" placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-sm mb-1.5" style={{ color: 'rgba(248,244,232,0.7)' }}>Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={form.password} onChange={e => update('password', e.target.value)} className="input-dark pr-12" placeholder="Min. 6 characters" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-100">
                  {showPw ? <EyeOff size={16} style={{ color: '#f8f4e8' }} /> : <Eye size={16} style={{ color: '#f8f4e8' }} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm mb-1.5" style={{ color: 'rgba(248,244,232,0.7)' }}>Confirm Password</label>
              <input type="password" value={form.confirmPw} onChange={e => update('confirmPw', e.target.value)} className="input-dark" placeholder="Repeat password" />
            </div>

            <button onClick={handleSignup} disabled={loading} className="btn-gold w-full py-3 rounded-lg disabled:opacity-50 mt-2">
              {loading ? 'Creating account...' : 'Create Free Account'}
            </button>
          </div>

          {/* What you get free vs paid */}
          <div className="mt-6 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs mb-3 text-center" style={{ color: 'rgba(248,244,232,0.3)' }}>FREE ACCOUNT INCLUDES</p>
            <div className="space-y-1.5">
              {['View charity listings', 'Explore draw mechanics', 'Enter up to 2 scores'].map(f => (
                <div key={f} className="flex items-center gap-2 text-xs" style={{ color: 'rgba(248,244,232,0.5)' }}>
                  <span style={{ color: '#d4a82a' }}>✓</span> {f}
                </div>
              ))}
              {['Join monthly prize draws', 'Charity contributions', 'Full score history', 'Win cash prizes'].map(f => (
                <div key={f} className="flex items-center gap-2 text-xs" style={{ color: 'rgba(248,244,232,0.25)' }}>
                  <span>🔒</span> {f} <span className="ml-auto text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(212,168,42,0.1)', color: '#d4a82a' }}>Subscriber</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center mt-4 text-sm" style={{ color: 'rgba(248,244,232,0.4)' }}>
          Already have an account? <Link href="/auth/login" style={{ color: '#d4a82a' }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
