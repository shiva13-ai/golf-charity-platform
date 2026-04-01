'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  Trophy, Heart, BarChart3, LogOut, Plus, Trash2,
  Star, AlertCircle, CheckCircle, Upload, ArrowRight, Lock, RefreshCw
} from 'lucide-react'
import { formatDate, formatCurrency, checkMatches } from '@/lib/utils'
import Link from 'next/link'

type Tab = 'overview' | 'scores' | 'draws' | 'charity' | 'winnings'

export default function Dashboard() {
  const [token, setToken] = useState<string | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [subscription, setSubscription] = useState<any>(null)
  const [scores, setScores] = useState<any[]>([])
  const [draws, setDraws] = useState<any[]>([])
  const [winners, setWinners] = useState<any[]>([])
  const [tab, setTab] = useState<Tab>('overview')
  const [newScore, setNewScore] = useState({ score: '', date: new Date().toISOString().split('T')[0] })
  const [addingScore, setAddingScore] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [msg, setMsg] = useState({ type: '', text: '' })
  const [loading, setLoading] = useState(true)
  const [justSubscribed, setJustSubscribed] = useState(false)
  const router = useRouter()

  const showMsg = (type: string, text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg({ type: '', text: '' }), 3000)
  }

  const loadDashboard = useCallback(async (authToken: string) => {
    try {
      const res = await fetch('/api/dashboard', {
        headers: { Authorization: `Bearer ${authToken}` }
      })
      if (res.status === 401) { router.push('/auth/login'); return }
      const data = await res.json()
      if (data.error) { console.error(data.error); return }
      setProfile(data.profile)
      setSubscription(data.subscription)
      setScores(data.scores || [])
      setDraws(data.draws || [])
      setWinners(data.winners || [])
    } catch (err) {
      console.error('Dashboard load error:', err)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search)
      if (sp.get('subscribed') === '1') setJustSubscribed(true)
    }
    const supabase = createClient()
    const init = async () => {
      // getUser() hits the server — more reliable than getSession() which reads cache
      const { data: { user }, error: userErr } = await supabase.auth.getUser()
      if (!user || userErr) { router.push('/auth/login'); return }

      // maybeSingle() never throws — returns null if no row found
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      if (profile?.role === 'admin') { router.push('/admin/dashboard'); return }

      // Get access token for API calls
      const { data: { session } } = await supabase.auth.getSession()
      const t = session?.access_token
      if (!t) { router.push('/auth/login'); return }
      setToken(t)
      loadDashboard(t)
    }
    init()
  }, [loadDashboard, router])

  async function addScore() {
    if (!token || !newScore.score || !newScore.date) return
    setAddingScore(true)
    try {
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ score: newScore.score, score_date: newScore.date }),
      })
      const data = await res.json()
      if (data.error) {
        showMsg('error', data.error)
      } else {
        setScores(data.scores)
        setNewScore({ score: '', date: new Date().toISOString().split('T')[0] })
        showMsg('success', 'Score added successfully!')
      }
    } catch {
      showMsg('error', 'Failed to add score. Try again.')
    } finally {
      setAddingScore(false)
    }
  }

  async function deleteScore(id: string) {
    if (!token) return
    setDeletingId(id)
    try {
      const res = await fetch('/api/scores', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id }),
      })
      const data = await res.json()
      if (data.error) { showMsg('error', data.error) }
      else { setScores(data.scores); showMsg('success', 'Score removed.') }
    } catch {
      showMsg('error', 'Failed to delete score.')
    } finally {
      setDeletingId(null)
    }
  }

  async function logout() {
    await createClient().auth.signOut()
    router.push('/')
  }

  const isSubscribed = subscription?.status === 'active'
  const myScoreNums = scores.map(s => s.score)
  const totalWon = winners.reduce((s, w) => s + (w.prize_amount || 0), 0)
  const pendingWinnings = winners.filter(w => w.payment_status === 'pending').length
  const charityName = subscription?.charities?.name || ''

  const navItems: { id: Tab; icon: any; label: string; locked?: boolean }[] = [
    { id: 'overview', icon: Star, label: 'Overview' },
    { id: 'scores', icon: BarChart3, label: 'My Scores' },
    { id: 'draws', icon: Trophy, label: 'Draw Results', locked: !isSubscribed },
    { id: 'charity', icon: Heart, label: 'My Charity', locked: !isSubscribed },
    { id: 'winnings', icon: CheckCircle, label: 'Winnings', locked: !isSubscribed },
  ]

  const LockedTab = ({ feature }: { feature: string }) => (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <div className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
        style={{ background: 'rgba(212,168,42,0.1)', border: '1px solid rgba(212,168,42,0.2)' }}>
        <Lock size={24} style={{ color: '#d4a82a' }} />
      </div>
      <h3 className="font-display text-2xl font-bold mb-2" style={{ color: '#f8f4e8' }}>Subscriber Feature</h3>
      <p className="mb-6 max-w-sm" style={{ color: 'rgba(248,244,232,0.5)' }}>
        {feature} is available to subscribers. Start from £9.99/month.
      </p>
      <Link href="/subscribe" className="btn-gold inline-flex items-center gap-2 px-6 py-3 rounded-lg">
        Subscribe Now <ArrowRight size={16} />
      </Link>
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#080808' }}>
        <div className="text-center">
          <div className="font-display text-2xl mb-3" style={{ color: '#d4a82a' }}>GolfGive</div>
          <div className="flex items-center justify-center gap-2 text-sm" style={{ color: 'rgba(248,244,232,0.4)' }}>
            <RefreshCw size={14} className="animate-spin" /> Loading your dashboard...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#080808' }}>
      <aside className="hidden md:flex flex-col w-60 py-8 px-4"
        style={{ background: 'rgba(255,255,255,0.02)', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="font-display text-xl px-2 mb-8" style={{ color: '#d4a82a' }}>GolfGive</div>
        <nav className="flex-1 space-y-1">
          {navItems.map(({ id, icon: Icon, label, locked }) => (
            <button key={id} onClick={() => setTab(id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-left"
              style={{ background: tab === id ? 'rgba(212,168,42,0.12)' : 'transparent', color: tab === id ? '#d4a82a' : locked ? 'rgba(248,244,232,0.25)' : 'rgba(248,244,232,0.5)' }}>
              <Icon size={16} /> {label}
              {locked && <Lock size={11} className="ml-auto opacity-40" />}
            </button>
          ))}
        </nav>
        {!isSubscribed && (
          <Link href="/subscribe" className="mx-2 mb-4 p-3 rounded-xl text-center text-sm font-semibold block"
            style={{ background: 'rgba(212,168,42,0.12)', border: '1px solid rgba(212,168,42,0.25)', color: '#d4a82a' }}>
            🏆 Subscribe from £9.99/mo
          </Link>
        )}
        <button onClick={logout} className="flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg" style={{ color: 'rgba(248,244,232,0.3)' }}>
          <LogOut size={16} /> Sign Out
        </button>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div>
            <h1 className="font-display text-2xl font-bold" style={{ color: '#f8f4e8' }}>
              {tab === 'overview' ? `Welcome, ${profile?.full_name?.split(' ')[0] || 'Golfer'}` :
               tab === 'scores' ? 'My Scores' : tab === 'draws' ? 'Draw Results' :
               tab === 'charity' ? 'My Charity' : 'Winnings'}
            </h1>
            <p className="text-sm" style={{ color: 'rgba(248,244,232,0.4)' }}>
              {isSubscribed ? `${subscription.plan} plan · Active` : 'Free account · Subscribe to unlock draws & prizes'}
            </p>
          </div>
          <div className="flex md:hidden gap-1">
            {navItems.map(({ id, icon: Icon, locked }) => (
              <button key={id} onClick={() => setTab(id)} className="p-2 rounded-lg"
                style={{ background: tab === id ? 'rgba(212,168,42,0.12)' : 'transparent', color: tab === id ? '#d4a82a' : locked ? 'rgba(248,244,232,0.2)' : 'rgba(248,244,232,0.4)' }}>
                <Icon size={18} />
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {justSubscribed && (
            <div className="mb-5 p-4 rounded-xl flex items-center gap-3" style={{ background: 'rgba(60,200,80,0.08)', border: '1px solid rgba(60,200,80,0.2)' }}>
              <CheckCircle size={18} style={{ color: '#5de06e' }} />
              <div>
                <div className="font-semibold text-sm" style={{ color: '#5de06e' }}>You're now subscribed! 🎉</div>
                <div className="text-xs" style={{ color: 'rgba(248,244,232,0.5)' }}>Enter your scores and join the next monthly draw.</div>
              </div>
            </div>
          )}

          {!isSubscribed && tab === 'overview' && (
            <div className="mb-6 rounded-2xl p-5 relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, rgba(212,168,42,0.12), rgba(212,168,42,0.04))', border: '1px solid rgba(212,168,42,0.25)' }}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Trophy size={16} style={{ color: '#d4a82a' }} />
                    <span className="font-semibold" style={{ color: '#f8f4e8' }}>Unlock Full GolfGive Access</span>
                  </div>
                  <p className="text-sm mb-3" style={{ color: 'rgba(248,244,232,0.5)' }}>Enter monthly prize draws, support a charity, and track all 5 scores.</p>
                  <div className="flex flex-wrap gap-3 text-xs" style={{ color: 'rgba(248,244,232,0.5)' }}>
                    {['Monthly prize draws', 'Cash prizes', 'Charity contributions', 'Full score history'].map(f => (
                      <span key={f} className="flex items-center gap-1"><span style={{ color: '#d4a82a' }}>✓</span> {f}</span>
                    ))}
                  </div>
                </div>
                <Link href="/subscribe" className="btn-gold flex-shrink-0 px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-1.5 whitespace-nowrap">
                  Subscribe <ArrowRight size={14} />
                </Link>
              </div>
              <div className="mt-3 text-xs" style={{ color: 'rgba(248,244,232,0.3)' }}>From £9.99/month · Cancel anytime</div>
            </div>
          )}

          {msg.text && (
            <div className="mb-4 p-3 rounded-lg text-sm flex items-center gap-2"
              style={{ background: msg.type === 'error' ? 'rgba(255,80,80,0.1)' : 'rgba(60,200,80,0.1)', border: `1px solid ${msg.type === 'error' ? 'rgba(255,80,80,0.3)' : 'rgba(60,200,80,0.3)'}`, color: msg.type === 'error' ? '#ff6b6b' : '#5de06e' }}>
              {msg.type === 'error' ? <AlertCircle size={14} /> : <CheckCircle size={14} />} {msg.text}
            </div>
          )}

          {/* OVERVIEW */}
          {tab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Account', value: isSubscribed ? 'Subscriber' : 'Free', sub: isSubscribed ? subscription?.plan : 'Upgrade available', color: isSubscribed ? '#5de06e' : '#d4a82a' },
                  { label: 'Scores Entered', value: scores.length, sub: isSubscribed ? 'of 5 max' : 'of 2 free', color: '#d4a82a' },
                  { label: 'Total Won', value: isSubscribed ? formatCurrency(totalWon) : '—', sub: isSubscribed ? `${winners.length} prizes` : 'Subscribers only', color: '#d4a82a' },
                  { label: 'Charity', value: isSubscribed ? (charityName || '—') : 'On subscribe', sub: isSubscribed ? `${subscription?.charity_percentage || 10}% of sub` : '', color: '#e05de0' },
                ].map(({ label, value, sub, color }) => (
                  <div key={label} className="glass-card rounded-xl p-4">
                    <div className="text-xs mb-2" style={{ color: 'rgba(248,244,232,0.4)' }}>{label}</div>
                    <div className="font-display text-xl font-bold truncate" style={{ color }}>{value}</div>
                    <div className="text-xs mt-1" style={{ color: 'rgba(248,244,232,0.3)' }}>{sub}</div>
                  </div>
                ))}
              </div>
              {isSubscribed && (
                <div className="glass-card rounded-xl p-5">
                  <h3 className="font-semibold mb-3" style={{ color: '#f8f4e8' }}>Subscription Details</h3>
                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div><span style={{ color: 'rgba(248,244,232,0.4)' }}>Plan: </span><span style={{ color: '#f8f4e8' }}>{subscription.plan} — {formatCurrency(subscription.amount)}</span></div>
                    <div><span style={{ color: 'rgba(248,244,232,0.4)' }}>Status: </span><span style={{ color: '#5de06e' }}>Active</span></div>
                    <div><span style={{ color: 'rgba(248,244,232,0.4)' }}>Renews: </span><span style={{ color: '#f8f4e8' }}>{subscription.current_period_end ? formatDate(subscription.current_period_end) : '—'}</span></div>
                  </div>
                </div>
              )}
              <div className="glass-card rounded-xl p-5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold" style={{ color: '#f8f4e8' }}>My Latest Scores</h3>
                  <button onClick={() => setTab('scores')} className="text-xs" style={{ color: '#d4a82a' }}>View all →</button>
                </div>
                {scores.length === 0 ? (
                  <p className="text-sm py-4 text-center" style={{ color: 'rgba(248,244,232,0.3)' }}>
                    No scores yet. <button onClick={() => setTab('scores')} style={{ color: '#d4a82a' }}>Add your first score.</button>
                  </p>
                ) : (
                  <div className="flex gap-3 flex-wrap">
                    {scores.map(s => (
                      <div key={s.id} className="score-badge" style={{ background: 'rgba(212,168,42,0.12)', border: '1px solid rgba(212,168,42,0.25)', color: '#d4a82a' }}>{s.score}</div>
                    ))}
                  </div>
                )}
              </div>
              {pendingWinnings > 0 && (
                <div className="rounded-xl p-5" style={{ background: 'rgba(212,168,42,0.08)', border: '1px solid rgba(212,168,42,0.3)' }}>
                  <div className="flex items-center gap-3">
                    <Trophy size={20} style={{ color: '#d4a82a' }} />
                    <div>
                      <div className="font-semibold" style={{ color: '#f8f4e8' }}>You have {pendingWinnings} pending prize{pendingWinnings > 1 ? 's' : ''}!</div>
                      <button onClick={() => setTab('winnings')} className="text-sm mt-1" style={{ color: '#d4a82a' }}>Submit verification proof →</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SCORES */}
          {tab === 'scores' && (
            <div className="space-y-6 max-w-xl">
              <div className="glass-card rounded-xl p-6">
                <h3 className="font-semibold mb-1" style={{ color: '#f8f4e8' }}>Add New Score</h3>
                <p className="text-sm mb-4" style={{ color: 'rgba(248,244,232,0.4)' }}>
                  Stableford format · Range 1–45 · {isSubscribed ? 'Latest 5 kept automatically' : `Free: ${scores.length}/2 scores used`}
                </p>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs mb-1" style={{ color: 'rgba(248,244,232,0.5)' }}>Score (1–45)</label>
                    <input type="number" min={1} max={45} value={newScore.score}
                      onChange={e => setNewScore(f => ({ ...f, score: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && addScore()}
                      className="input-dark" placeholder="e.g. 32" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs mb-1" style={{ color: 'rgba(248,244,232,0.5)' }}>Date Played</label>
                    <input type="date" value={newScore.date}
                      onChange={e => setNewScore(f => ({ ...f, date: e.target.value }))}
                      className="input-dark" />
                  </div>
                  <div className="flex items-end">
                    <button onClick={addScore} disabled={addingScore || (!isSubscribed && scores.length >= 2)}
                      className="btn-gold px-4 py-3 rounded-lg flex items-center gap-1 disabled:opacity-40">
                      {addingScore ? <RefreshCw size={16} className="animate-spin" /> : <Plus size={16} />}
                    </button>
                  </div>
                </div>
                {!isSubscribed && scores.length >= 2 && (
                  <div className="mt-3 p-3 rounded-lg flex items-center gap-2 text-sm"
                    style={{ background: 'rgba(212,168,42,0.08)', border: '1px solid rgba(212,168,42,0.2)' }}>
                    <Lock size={14} style={{ color: '#d4a82a' }} />
                    <span style={{ color: 'rgba(248,244,232,0.6)' }}>Score limit reached. </span>
                    <Link href="/subscribe" style={{ color: '#d4a82a' }}>Subscribe for 5 scores →</Link>
                  </div>
                )}
              </div>
              <div className="glass-card rounded-xl p-6">
                <h3 className="font-semibold mb-4" style={{ color: '#f8f4e8' }}>Your Scores ({scores.length}/{isSubscribed ? '5' : '2 free'})</h3>
                {scores.length === 0 ? (
                  <p className="text-sm text-center py-6" style={{ color: 'rgba(248,244,232,0.3)' }}>No scores entered yet</p>
                ) : (
                  <div className="space-y-3">
                    {scores.map((s, i) => (
                      <div key={s.id} className="flex items-center justify-between p-4 rounded-lg"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div className="flex items-center gap-4">
                          <div className="score-badge" style={{ background: 'rgba(212,168,42,0.15)', color: '#d4a82a', width: 40, height: 40, fontSize: '1rem' }}>{s.score}</div>
                          <div>
                            <div className="font-medium" style={{ color: '#f8f4e8' }}>{s.score} pts</div>
                            <div className="text-xs" style={{ color: 'rgba(248,244,232,0.4)' }}>{formatDate(s.score_date)}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {i === 0 && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(212,168,42,0.15)', color: '#d4a82a' }}>Latest</span>}
                          <button onClick={() => deleteScore(s.id)} disabled={deletingId === s.id}
                            className="p-1.5 rounded opacity-40 hover:opacity-100 transition-opacity disabled:opacity-20" style={{ color: '#ff6b6b' }}>
                            {deletingId === s.id ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* DRAWS */}
          {tab === 'draws' && !isSubscribed && <LockedTab feature="Monthly draw results" />}
          {tab === 'draws' && isSubscribed && (
            <div className="space-y-4">
              {draws.length === 0 ? (
                <div className="glass-card rounded-xl p-10 text-center">
                  <Trophy size={36} className="mx-auto mb-3 opacity-30" style={{ color: '#d4a82a' }} />
                  <p style={{ color: 'rgba(248,244,232,0.4)' }}>No published draws yet. Check back at the end of the month!</p>
                </div>
              ) : draws.map(draw => {
                const myMatches = myScoreNums.length > 0 && draw.winning_numbers?.length > 0 ? checkMatches(myScoreNums, draw.winning_numbers) : 0
                return (
                  <div key={draw.id} className="glass-card rounded-xl p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-display text-lg font-semibold" style={{ color: '#f8f4e8' }}>Draw — {draw.draw_month}</h3>
                        <div className="text-xs mt-1" style={{ color: 'rgba(248,244,232,0.4)' }}>Published {draw.published_at ? formatDate(draw.published_at) : '—'}</div>
                      </div>
                      {myMatches >= 3 && (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: 'rgba(212,168,42,0.2)', color: '#d4a82a', border: '1px solid rgba(212,168,42,0.4)' }}>
                          🏆 {myMatches}-Match Winner!
                        </span>
                      )}
                    </div>
                    <div className="mb-4">
                      <div className="text-xs mb-2" style={{ color: 'rgba(248,244,232,0.4)' }}>Winning Numbers</div>
                      <div className="flex gap-2 flex-wrap">
                        {(draw.winning_numbers || []).map((n: number) => (
                          <div key={n} className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                            style={{ background: myScoreNums.includes(n) ? '#d4a82a' : 'rgba(255,255,255,0.07)', color: myScoreNums.includes(n) ? '#0f0f0f' : 'rgba(248,244,232,0.6)' }}>
                            {n}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      {[['🏆 Jackpot', draw.jackpot_amount, '#d4a82a'], ['🥈 4-Match', draw.pool_4match, '#f8f4e8'], ['🥉 3-Match', draw.pool_3match, '#f8f4e8']].map(([label, val, color]) => (
                        <div key={label as string} className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
                          <div className="text-xs mb-1" style={{ color: 'rgba(248,244,232,0.4)' }}>{label}</div>
                          <div style={{ color: color as string }}>{formatCurrency((val as number) || 0)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* CHARITY */}
          {tab === 'charity' && !isSubscribed && <LockedTab feature="Charity contributions" />}
          {tab === 'charity' && isSubscribed && (
            <div className="space-y-6 max-w-xl">
              <div className="glass-card rounded-xl p-6">
                <h3 className="font-semibold mb-4" style={{ color: '#f8f4e8' }}>Your Charity</h3>
                <div className="p-4 rounded-lg mb-4" style={{ background: 'rgba(212,168,42,0.06)', border: '1px solid rgba(212,168,42,0.15)' }}>
                  <div className="font-display text-xl mb-1" style={{ color: '#f8f4e8' }}>{charityName || 'Not selected'}</div>
                  <div className="text-sm" style={{ color: 'rgba(248,244,232,0.5)' }}>You contribute {subscription.charity_percentage}% of your subscription</div>
                  <div className="text-lg font-semibold mt-2" style={{ color: '#d4a82a' }}>
                    {formatCurrency((subscription.amount * subscription.charity_percentage) / 100)}
                    <span className="text-sm font-normal ml-1" style={{ color: 'rgba(248,244,232,0.4)' }}>per {subscription.plan === 'monthly' ? 'month' : 'year'}</span>
                  </div>
                </div>
                <p className="text-sm" style={{ color: 'rgba(248,244,232,0.4)' }}>To change your charity, please contact support.</p>
              </div>
            </div>
          )}

          {/* WINNINGS */}
          {tab === 'winnings' && !isSubscribed && <LockedTab feature="Prize winnings & verification" />}
          {tab === 'winnings' && isSubscribed && (
            <div className="space-y-4">
              <div className="glass-card rounded-xl p-5">
                <div className="text-xs mb-1" style={{ color: 'rgba(248,244,232,0.4)' }}>Total Winnings</div>
                <div className="font-display text-3xl font-bold" style={{ color: '#d4a82a' }}>{formatCurrency(totalWon)}</div>
              </div>
              {winners.length === 0 ? (
                <div className="glass-card rounded-xl p-10 text-center">
                  <Trophy size={36} className="mx-auto mb-3 opacity-30" style={{ color: '#d4a82a' }} />
                  <p style={{ color: 'rgba(248,244,232,0.4)' }}>No winnings yet. Keep entering your scores!</p>
                </div>
              ) : winners.map(w => (
                <div key={w.id} className="glass-card rounded-xl p-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold" style={{ color: '#f8f4e8' }}>{w.match_type} — Draw {w.draws?.draw_month}</div>
                      <div className="text-2xl font-bold mt-1" style={{ color: '#d4a82a' }}>{formatCurrency(w.prize_amount || 0)}</div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs" style={{
                      background: w.payment_status === 'paid' ? 'rgba(60,200,80,0.15)' : w.payment_status === 'rejected' ? 'rgba(255,80,80,0.15)' : 'rgba(212,168,42,0.15)',
                      color: w.payment_status === 'paid' ? '#5de06e' : w.payment_status === 'rejected' ? '#ff6b6b' : '#d4a82a',
                    }}>{w.payment_status}</span>
                  </div>
                  {w.payment_status === 'pending' && (
                    <div className="mt-4 p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <p className="text-sm mb-2" style={{ color: 'rgba(248,244,232,0.6)' }}>Upload a screenshot of your scores as proof to claim your prize.</p>
                      <button className="btn-outline-gold text-sm px-4 py-2 rounded-lg flex items-center gap-2">
                        <Upload size={14} /> Upload Proof
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
