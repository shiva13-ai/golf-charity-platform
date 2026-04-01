'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Users, Trophy, Heart, BarChart3, LogOut, Play, Check, X, Plus, Zap, RefreshCw, Shield } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'

type AdminTab = 'overview' | 'users' | 'draws' | 'charities' | 'winners'

export default function AdminDashboard() {
  const [tab, setTab] = useState<AdminTab>('overview')
  const [token, setToken] = useState<string | null>(null)
  const [stats, setStats] = useState({ users: 0, active: 0, totalPool: 0, charityTotal: 0 })
  const [users, setUsers] = useState<any[]>([])
  const [draws, setDraws] = useState<any[]>([])
  const [charities, setCharities] = useState<any[]>([])
  const [winners, setWinners] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [msg, setMsg] = useState({ type: 'success', text: '' })
  const [newCharity, setNewCharity] = useState({ name: '', description: '', image_url: '' })
  const router = useRouter()

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setMsg({ type, text })
    setTimeout(() => setMsg({ type: 'success', text: '' }), 4000)
  }

  // ── API helper — always sends token, uses service role on server ──
  const api = useCallback(async (method: 'GET' | 'POST', body?: object) => {
    const t = token || (await createClient().auth.getSession()).data.session?.access_token
    const res = await fetch('/api/admin', {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    return res.json()
  }, [token])

  const loadAll = useCallback(async (t?: string) => {
    const accessToken = t || token
    if (!accessToken) return
    try {
      const res = await fetch('/api/admin', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = await res.json()
      if (data.error) { showMsg(data.error, 'error'); return }
      setUsers(data.users || [])
      setDraws(data.draws || [])
      setCharities(data.charities || [])
      setWinners(data.winners || [])
      setStats(data.stats || { users: 0, active: 0, totalPool: 0, charityTotal: 0 })
    } catch (err: any) {
      showMsg('Failed to load data: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    const supabase = createClient()
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token
      if (!accessToken) { router.push('/auth/login'); return }

      // Verify admin server-side
      const vRes = await fetch('/api/verify-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken }),
      })
      const { isAdmin } = await vRes.json()
      if (!isAdmin) { router.push('/auth/login'); return }

      setToken(accessToken)
      loadAll(accessToken)
    }
    init()
  }, [router, loadAll])

  async function callApi(body: object, successMsg: string) {
    setActionLoading(true)
    try {
      const data = await api('POST', body)
      if (data.error) { showMsg(data.error, 'error') }
      else { showMsg(data.message || successMsg) }
      await loadAll()
    } catch (err: any) {
      showMsg(err.message, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  async function addCharity() {
    if (!newCharity.name.trim()) { showMsg('Charity name is required', 'error'); return }
    await callApi({ action: 'add_charity', ...newCharity }, 'Charity added!')
    setNewCharity({ name: '', description: '', image_url: '' })
  }

  async function logout() {
    await createClient().auth.signOut()
    router.push('/')
  }

  const navItems: { id: AdminTab; icon: any; label: string }[] = [
    { id: 'overview',  icon: BarChart3, label: 'Overview'  },
    { id: 'users',     icon: Users,     label: 'Users'     },
    { id: 'draws',     icon: Trophy,    label: 'Draws'     },
    { id: 'charities', icon: Heart,     label: 'Charities' },
    { id: 'winners',   icon: Zap,       label: 'Winners'   },
  ]

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#080808' }}>
      <div className="text-center">
        <Shield size={32} className="mx-auto mb-3" style={{ color: '#d4a82a' }} />
        <div className="flex items-center gap-2 text-sm" style={{ color: 'rgba(248,244,232,0.4)' }}>
          <RefreshCw size={14} className="animate-spin" /> Loading admin panel...
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex" style={{ background: '#080808' }}>

      {/* Sidebar */}
      <aside className="w-56 flex flex-col py-8 px-4" style={{ background: 'rgba(212,168,42,0.03)', borderRight: '1px solid rgba(212,168,42,0.08)' }}>
        <div className="mb-2">
          <div className="font-display text-xl px-2" style={{ color: '#d4a82a' }}>GolfGive</div>
          <div className="text-xs px-2 mt-0.5" style={{ color: 'rgba(248,244,232,0.3)' }}>Admin Panel</div>
        </div>
        <div className="my-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }} />
        <nav className="flex-1 space-y-1">
          {navItems.map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setTab(id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-left"
              style={{ background: tab === id ? 'rgba(212,168,42,0.15)' : 'transparent', color: tab === id ? '#d4a82a' : 'rgba(248,244,232,0.5)' }}>
              <Icon size={15} /> {label}
            </button>
          ))}
        </nav>
        <button onClick={logout} className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg" style={{ color: 'rgba(248,244,232,0.3)' }}>
          <LogOut size={14} /> Sign Out
        </button>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto p-6">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold" style={{ color: '#f8f4e8' }}>
            {navItems.find(n => n.id === tab)?.label}
          </h1>
          <button onClick={() => loadAll()} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg" style={{ color: 'rgba(248,244,232,0.4)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <RefreshCw size={12} /> Refresh
          </button>
        </div>

        {msg.text && (
          <div className="mb-4 p-3 rounded-lg text-sm" style={{
            background: msg.type === 'error' ? 'rgba(255,80,80,0.08)' : 'rgba(60,200,80,0.08)',
            border: `1px solid ${msg.type === 'error' ? 'rgba(255,80,80,0.2)' : 'rgba(60,200,80,0.2)'}`,
            color: msg.type === 'error' ? '#ff6b6b' : '#5de06e',
          }}>{msg.text}</div>
        )}

        {/* ── OVERVIEW ── */}
        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Members',        value: stats.users,                    color: '#f8f4e8' },
                { label: 'Active Subscribers',   value: stats.active,                   color: '#5de06e' },
                { label: 'Current Prize Pool',   value: formatCurrency(stats.totalPool),color: '#d4a82a' },
                { label: 'Charity Contributions',value: formatCurrency(stats.charityTotal), color: '#e05de0' },
              ].map(({ label, value, color }) => (
                <div key={label} className="glass-card rounded-xl p-4">
                  <div className="text-xs mb-2" style={{ color: 'rgba(248,244,232,0.4)' }}>{label}</div>
                  <div className="font-display text-2xl font-bold" style={{ color }}>{value}</div>
                </div>
              ))}
            </div>
            <div className="glass-card rounded-xl p-5">
              <h3 className="font-semibold mb-3" style={{ color: '#f8f4e8' }}>Quick Actions</h3>
              <div className="flex gap-3 flex-wrap">
                <button onClick={() => setTab('draws')}    className="btn-gold px-4 py-2 rounded-lg text-sm flex items-center gap-2"><Trophy size={14} /> Manage Draws</button>
                <button onClick={() => setTab('winners')}  className="btn-outline-gold px-4 py-2 rounded-lg text-sm flex items-center gap-2"><Check size={14} /> Verify Winners</button>
                <button onClick={() => setTab('users')}    className="btn-outline-gold px-4 py-2 rounded-lg text-sm flex items-center gap-2"><Users size={14} /> View Members</button>
                <button onClick={() => setTab('charities')} className="btn-outline-gold px-4 py-2 rounded-lg text-sm flex items-center gap-2"><Heart size={14} /> Charities</button>
              </div>
            </div>
          </div>
        )}

        {/* ── USERS ── */}
        {tab === 'users' && (
          <div className="glass-card rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
                  {['Name', 'Email', 'Joined', 'Role'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium" style={{ color: 'rgba(248,244,232,0.5)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td className="px-4 py-3" style={{ color: '#f8f4e8' }}>{u.full_name || '—'}</td>
                    <td className="px-4 py-3" style={{ color: 'rgba(248,244,232,0.6)' }}>{u.email}</td>
                    <td className="px-4 py-3" style={{ color: 'rgba(248,244,232,0.4)' }}>{formatDate(u.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-xs" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(248,244,232,0.5)' }}>{u.role}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && (
              <div className="text-center py-12" style={{ color: 'rgba(248,244,232,0.3)' }}>No members yet</div>
            )}
          </div>
        )}

        {/* ── DRAWS ── */}
        {tab === 'draws' && (
          <div className="space-y-4">
            <button
              onClick={() => callApi({ action: 'create_draw' }, 'Draw created')}
              disabled={actionLoading}
              className="btn-gold px-4 py-2 rounded-lg text-sm flex items-center gap-2 disabled:opacity-50">
              <Plus size={14} /> Create Next Month Draw
            </button>

            {draws.length === 0 && (
              <div className="glass-card rounded-xl p-10 text-center" style={{ color: 'rgba(248,244,232,0.3)' }}>No draws yet — create one above</div>
            )}

            {draws.map(draw => (
              <div key={draw.id} className="glass-card rounded-xl p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold" style={{ color: '#f8f4e8' }}>Draw — {draw.draw_month}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full mt-1 inline-block" style={{
                      background: draw.status === 'published' ? 'rgba(60,200,80,0.15)' : 'rgba(212,168,42,0.15)',
                      color: draw.status === 'published' ? '#5de06e' : '#d4a82a',
                    }}>{draw.status}</span>
                  </div>
                  {draw.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => callApi({ action: 'auto_enter', drawId: draw.id }, 'Subscribers entered')}
                        disabled={actionLoading}
                        className="btn-outline-gold text-xs px-3 py-2 rounded-lg flex items-center gap-1 disabled:opacity-50">
                        <RefreshCw size={12} /> Auto-Enter Subs
                      </button>
                      <button
                        onClick={() => callApi({ action: 'run_draw', drawId: draw.id, activeSubs: stats.active }, 'Draw published')}
                        disabled={actionLoading}
                        className="btn-gold text-xs px-3 py-2 rounded-lg flex items-center gap-1 disabled:opacity-50">
                        <Play size={12} /> Run Draw
                      </button>
                    </div>
                  )}
                </div>

                {draw.winning_numbers?.length > 0 && (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {draw.winning_numbers.map((n: number) => (
                      <div key={n} className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: '#d4a82a', color: '#0f0f0f' }}>{n}</div>
                    ))}
                  </div>
                )}

                {draw.status === 'published' && (
                  <div className="grid grid-cols-3 gap-3 mt-3 text-xs">
                    {[
                      ['Jackpot', draw.jackpot_amount, '#d4a82a', draw.jackpot_rolled_over ? 'Rolled over' : ''],
                      ['4-Match', draw.pool_4match, '#f8f4e8', ''],
                      ['3-Match', draw.pool_3match, '#f8f4e8', ''],
                    ].map(([label, val, color, note]) => (
                      <div key={label as string} className="rounded p-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <div style={{ color: 'rgba(248,244,232,0.4)' }}>{label}</div>
                        <div style={{ color: color as string }}>{formatCurrency((val as number) || 0)}</div>
                        {note && <div style={{ color: 'rgba(248,244,232,0.3)' }}>{note}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── CHARITIES ── */}
        {tab === 'charities' && (
          <div className="space-y-4">
            <div className="glass-card rounded-xl p-5">
              <h3 className="font-semibold mb-4" style={{ color: '#f8f4e8' }}>Add New Charity</h3>
              <div className="grid md:grid-cols-3 gap-3 mb-3">
                <input
                  value={newCharity.name}
                  onChange={e => setNewCharity(f => ({ ...f, name: e.target.value }))}
                  className="input-dark" placeholder="Charity name *" />
                <input
                  value={newCharity.description}
                  onChange={e => setNewCharity(f => ({ ...f, description: e.target.value }))}
                  className="input-dark" placeholder="Short description" />
                <input
                  value={newCharity.image_url}
                  onChange={e => setNewCharity(f => ({ ...f, image_url: e.target.value }))}
                  className="input-dark" placeholder="Image URL (optional)" />
              </div>
              <button onClick={addCharity} disabled={actionLoading}
                className="btn-gold px-4 py-2 rounded-lg text-sm flex items-center gap-2 disabled:opacity-50">
                <Plus size={14} /> Add Charity
              </button>
            </div>

            {charities.length === 0 && (
              <div className="glass-card rounded-xl p-10 text-center" style={{ color: 'rgba(248,244,232,0.3)' }}>No charities yet — add one above</div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              {charities.map(c => (
                <div key={c.id} className="glass-card rounded-xl p-4 flex justify-between items-start">
                  <div className="flex-1 min-w-0 mr-3">
                    <div className="font-semibold" style={{ color: '#f8f4e8' }}>{c.name}</div>
                    <div className="text-xs mt-1 line-clamp-2" style={{ color: 'rgba(248,244,232,0.4)' }}>{c.description}</div>
                    <span className="text-xs mt-1 inline-block px-2 py-0.5 rounded-full" style={{
                      background: c.active ? 'rgba(60,200,80,0.12)' : 'rgba(255,80,80,0.12)',
                      color: c.active ? '#5de06e' : '#ff6b6b',
                    }}>{c.active ? 'Active' : 'Disabled'}</span>
                  </div>
                  <button
                    onClick={() => callApi({ action: 'toggle_charity', id: c.id, active: !c.active }, '')}
                    disabled={actionLoading}
                    className={`text-xs px-3 py-1.5 rounded-lg flex-shrink-0 disabled:opacity-50 ${c.active ? 'btn-outline-gold' : 'btn-gold'}`}>
                    {c.active ? 'Disable' : 'Enable'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── WINNERS ── */}
        {tab === 'winners' && (
          <div className="space-y-4">
            {winners.length === 0 && (
              <div className="glass-card rounded-xl p-10 text-center" style={{ color: 'rgba(248,244,232,0.3)' }}>No winners yet — run a draw first</div>
            )}
            {winners.map(w => (
              <div key={w.id} className="glass-card rounded-xl p-5">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold" style={{ color: '#f8f4e8' }}>{w.profiles?.full_name || 'Unknown'}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'rgba(248,244,232,0.4)' }}>
                      {w.profiles?.email} · Draw {w.draws?.draw_month}
                    </div>
                    <div className="flex gap-3 mt-2">
                      <span className="text-sm font-semibold" style={{ color: '#d4a82a' }}>{w.match_type}</span>
                      <span className="text-sm" style={{ color: '#f8f4e8' }}>{formatCurrency(w.prize_amount || 0)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <span className="px-2 py-0.5 rounded text-xs" style={{
                      background: w.payment_status === 'paid' ? 'rgba(60,200,80,0.15)' : w.payment_status === 'rejected' ? 'rgba(255,80,80,0.15)' : 'rgba(212,168,42,0.15)',
                      color:      w.payment_status === 'paid' ? '#5de06e'              : w.payment_status === 'rejected' ? '#ff6b6b'              : '#d4a82a',
                    }}>{w.payment_status}</span>

                    {w.payment_status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => callApi({ action: 'verify_winner', winnerId: w.id, approved: true }, 'Winner verified')}
                          disabled={actionLoading}
                          className="btn-gold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 disabled:opacity-50">
                          <Check size={12} /> Verify
                        </button>
                        <button
                          onClick={() => callApi({ action: 'verify_winner', winnerId: w.id, approved: false }, 'Winner rejected')}
                          disabled={actionLoading}
                          className="text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 disabled:opacity-50"
                          style={{ background: 'rgba(255,80,80,0.1)', color: '#ff6b6b', border: '1px solid rgba(255,80,80,0.2)' }}>
                          <X size={12} /> Reject
                        </button>
                      </div>
                    )}
                    {w.payment_status === 'verified' && (
                      <button
                        onClick={() => callApi({ action: 'mark_paid', winnerId: w.id }, 'Marked as paid')}
                        disabled={actionLoading}
                        className="btn-gold text-xs px-3 py-1.5 rounded-lg disabled:opacity-50">
                        Mark Paid
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
