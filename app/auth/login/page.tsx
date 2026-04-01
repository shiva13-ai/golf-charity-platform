'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Eye, EyeOff, User, Shield } from 'lucide-react'

type Mode = 'member' | 'admin'

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('member')

  // Member fields
  const [memberEmail, setMemberEmail] = useState('')
  const [memberPw, setMemberPw] = useState('')
  const [showMemberPw, setShowMemberPw] = useState(false)
  const [memberError, setMemberError] = useState('')
  const [memberLoading, setMemberLoading] = useState(false)

  // Admin fields
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPw, setAdminPw] = useState('')
  const [showAdminPw, setShowAdminPw] = useState(false)
  const [adminError, setAdminError] = useState('')
  const [adminLoading, setAdminLoading] = useState(false)

  const router = useRouter()

  async function handleMemberLogin(e: React.FormEvent) {
    e.preventDefault()
    setMemberError(''); setMemberLoading(true)
    const supabase = createClient()
    const { data, error: err } = await supabase.auth.signInWithPassword({ email: memberEmail, password: memberPw })
    if (err) { setMemberError(err.message); setMemberLoading(false); return }

    // Verify role server-side — prevents admins landing on member dashboard
    const session = await supabase.auth.getSession()
    const accessToken = session.data.session?.access_token
    if (!accessToken) { setMemberLoading(false); router.push('/dashboard'); return }

    const res = await fetch('/api/verify-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken }),
    })
    const result = await res.json()
    setMemberLoading(false)

    if (result.isAdmin) { router.push('/admin/dashboard'); return }
    router.push('/dashboard')
  }

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault()
    setAdminError(''); setAdminLoading(true)
    const supabase = createClient()
    const { data, error: err } = await supabase.auth.signInWithPassword({ email: adminEmail, password: adminPw })
    if (err) { setAdminError(err.message); setAdminLoading(false); return }

    // Verify role server-side using service role key — bypasses RLS completely
    const session = await supabase.auth.getSession()
    const accessToken = session.data.session?.access_token
    if (!accessToken) { setAdminError('Session error. Please try again.'); setAdminLoading(false); return }

    const res = await fetch('/api/verify-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken }),
    })
    const result = await res.json()
    setAdminLoading(false)

    if (!result.isAdmin) {
      await supabase.auth.signOut()
      setAdminError('Access denied — this account does not have admin privileges.')
      return
    }
    router.push('/admin/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#080808' }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(212,168,42,0.06), transparent)' }} />

      <div className="w-full max-w-md relative">
        <Link href="/" className="block text-center font-display text-2xl mb-8" style={{ color: '#d4a82a' }}>
          GolfGive
        </Link>

        {/* Tab switcher */}
        <div className="flex rounded-xl p-1 mb-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <button
            onClick={() => { setMode('member'); setAdminError('') }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all"
            style={{
              background: mode === 'member' ? 'rgba(212,168,42,0.15)' : 'transparent',
              color: mode === 'member' ? '#d4a82a' : 'rgba(248,244,232,0.4)',
              border: mode === 'member' ? '1px solid rgba(212,168,42,0.3)' : '1px solid transparent',
            }}
          >
            <User size={15} /> Member Login
          </button>
          <button
            onClick={() => { setMode('admin'); setMemberError('') }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all"
            style={{
              background: mode === 'admin' ? 'rgba(100,120,255,0.12)' : 'transparent',
              color: mode === 'admin' ? '#8899ff' : 'rgba(248,244,232,0.4)',
              border: mode === 'admin' ? '1px solid rgba(100,120,255,0.25)' : '1px solid transparent',
            }}
          >
            <Shield size={15} /> Admin Login
          </button>
        </div>

        {/* ── MEMBER PANEL ── */}
        {mode === 'member' && (
          <div className="glass-card rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(212,168,42,0.12)', border: '1px solid rgba(212,168,42,0.2)' }}>
                <User size={17} style={{ color: '#d4a82a' }} />
              </div>
              <div>
                <h1 className="font-display text-xl font-bold leading-tight" style={{ color: '#f8f4e8' }}>Member Sign In</h1>
                <p className="text-xs" style={{ color: 'rgba(248,244,232,0.4)' }}>Access your scores, draws & charity</p>
              </div>
            </div>

            {memberError && (
              <div className="rounded-lg p-3 mb-5 text-sm" style={{ background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.3)', color: '#ff6b6b' }}>
                {memberError}
              </div>
            )}

            <form onSubmit={handleMemberLogin} className="space-y-4">
              <div>
                <label className="block text-sm mb-1.5" style={{ color: 'rgba(248,244,232,0.7)' }}>Email</label>
                <input
                  type="email" required value={memberEmail}
                  onChange={e => setMemberEmail(e.target.value)}
                  className="input-dark" placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="block text-sm mb-1.5" style={{ color: 'rgba(248,244,232,0.7)' }}>Password</label>
                <div className="relative">
                  <input
                    type={showMemberPw ? 'text' : 'password'} required value={memberPw}
                    onChange={e => setMemberPw(e.target.value)}
                    className="input-dark pr-12" placeholder="Password"
                  />
                  <button type="button" onClick={() => setShowMemberPw(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 transition-opacity">
                    {showMemberPw ? <EyeOff size={16} style={{ color: '#f8f4e8' }} /> : <Eye size={16} style={{ color: '#f8f4e8' }} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={memberLoading} className="btn-gold w-full py-3 rounded-lg disabled:opacity-50 mt-1">
                {memberLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <p className="text-center mt-5 text-sm" style={{ color: 'rgba(248,244,232,0.4)' }}>
              No account?{' '}
              <Link href="/auth/signup" style={{ color: '#d4a82a' }}>Join GolfGive</Link>
            </p>
          </div>
        )}

        {/* ── ADMIN PANEL ── */}
        {mode === 'admin' && (
          <div className="rounded-2xl p-8" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(100,120,255,0.2)' }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(100,120,255,0.1)', border: '1px solid rgba(100,120,255,0.25)' }}>
                <Shield size={17} style={{ color: '#8899ff' }} />
              </div>
              <div>
                <h1 className="font-display text-xl font-bold leading-tight" style={{ color: '#f8f4e8' }}>Admin Sign In</h1>
                <p className="text-xs" style={{ color: 'rgba(248,244,232,0.4)' }}>Restricted to authorised staff only</p>
              </div>
            </div>

            {adminError && (
              <div className="rounded-lg p-3 mb-5 text-sm" style={{ background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.3)', color: '#ff6b6b' }}>
                {adminError}
              </div>
            )}

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-sm mb-1.5" style={{ color: 'rgba(248,244,232,0.7)' }}>Admin Email</label>
                <input
                  type="email" required value={adminEmail}
                  onChange={e => setAdminEmail(e.target.value)}
                  className="input-dark" placeholder="admin@example.com"
                  style={{ borderColor: 'rgba(100,120,255,0.2)' }}
                />
              </div>
              <div>
                <label className="block text-sm mb-1.5" style={{ color: 'rgba(248,244,232,0.7)' }}>Password</label>
                <div className="relative">
                  <input
                    type={showAdminPw ? 'text' : 'password'} required value={adminPw}
                    onChange={e => setAdminPw(e.target.value)}
                    className="input-dark pr-12" placeholder="Password"
                    style={{ borderColor: 'rgba(100,120,255,0.2)' }}
                  />
                  <button type="button" onClick={() => setShowAdminPw(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 transition-opacity">
                    {showAdminPw ? <EyeOff size={16} style={{ color: '#f8f4e8' }} /> : <Eye size={16} style={{ color: '#f8f4e8' }} />}
                  </button>
                </div>
              </div>
              <button
                type="submit" disabled={adminLoading}
                className="w-full py-3 rounded-lg font-semibold text-sm disabled:opacity-50 transition-all"
                style={{ background: 'linear-gradient(135deg, #5566dd, #8899ff)', color: '#fff' }}
              >
                {adminLoading ? 'Verifying...' : 'Access Admin Panel'}
              </button>
            </form>

            <p className="text-center mt-5 text-xs" style={{ color: 'rgba(248,244,232,0.2)' }}>
              Unauthorised access attempts are logged.
            </p>
          </div>
        )}

        <p className="text-center mt-5 text-xs">
          <Link href="/" style={{ color: 'rgba(212,168,42,0.4)' }}>← Back to site</Link>
        </p>
      </div>
    </div>
  )
}
