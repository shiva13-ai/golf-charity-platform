'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    const supabase = createClient()
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (err) { setError(err.message); return }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
    if (profile?.role !== 'admin') { setError('Access denied: not an admin account'); return }
    router.push('/admin/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#080808' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="font-display text-2xl mb-1" style={{ color: '#d4a82a' }}>GolfGive</div>
          <div className="text-xs uppercase tracking-widest" style={{ color: 'rgba(248,244,232,0.3)' }}>Admin Portal</div>
        </div>
        <div className="glass-card rounded-2xl p-8">
          <h1 className="font-display text-2xl font-bold mb-6" style={{ color: '#f8f4e8' }}>Admin Login</h1>
          {error && <div className="rounded-lg p-3 mb-4 text-sm" style={{ background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.2)', color: '#ff6b6b' }}>{error}</div>}
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="input-dark" placeholder="Admin email" />
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="input-dark" placeholder="Password" />
            <button type="submit" disabled={loading} className="btn-gold w-full py-3 rounded-lg disabled:opacity-50">
              {loading ? 'Signing in...' : 'Access Admin Panel'}
            </button>
          </form>
        </div>
        <p className="text-center mt-4 text-xs" style={{ color: 'rgba(248,244,232,0.2)' }}>
          <Link href="/" style={{ color: 'rgba(212,168,42,0.4)' }}>← Back to site</Link>
        </p>
      </div>
    </div>
  )
}
