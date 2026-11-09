import React, { useState, useEffect } from 'react'
import { useUser } from './UserContext.jsx'
import { supabase } from './supabase.js'

export default function ProfileScreen() {
  const { user, settings, updateUser } = useUser()
  const [cards, setCards] = useState([])
  const [showRedeem, setShowRedeem] = useState(false)
  const [bkashName, setBkashName] = useState('')
  const [bkashNumber, setBkashNumber] = useState('')
  const [activeRefs, setActiveRefs] = useState(0)
  const [totalSessions, setTotalSessions] = useState(0)
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const minPoints = settings?.redeem_min_points || 50000
  const minSessions = settings?.redeem_min_sessions || 10
  const minActiveRefs = settings?.redeem_min_active_refs || 3

  useEffect(() => {
    if (!user || user.id === 'local') return
    supabase.from('cards').select('*').eq('user_id', user.id).then(({ data }) => setCards(data || []))
    setTotalSessions(user.sessions_today || 0)
    // Active refs approximation
    supabase.from('referrals').select('id').eq('referrer_id', user.id).then(({ data }) => {
      setActiveRefs((data || []).length)
    }).catch(() => {})
  }, [user])

  const canRedeem = (user?.points || 0) >= minPoints && totalSessions >= minSessions && activeRefs >= minActiveRefs

  const handleRedeem = async () => {
    if (!canRedeem) return
    if (!bkashName.trim() || !bkashNumber.trim()) { setMsg('নাম এবং বিকাশ নম্বর দিতে হবে'); return }
    if (!/^01[0-9]{9}$/.test(bkashNumber.trim())) { setMsg('সঠিক বিকাশ নম্বর দিন'); return }
    setLoading(true)
    setMsg('')
    try {
      await updateUser({ points: user.points - minPoints })
      if (user.id !== 'local') {
        await supabase.from('cards').insert({ user_id: user.id, card_type: 'silver' })
        await supabase.from('redeem_requests').insert({
          user_id: user.id, points_spent: minPoints,
          bkash_name: bkashName.trim(), bkash_number: bkashNumber.trim(), status: 'pending'
        })
      }
      setCards(c => [...c, { card_type: 'silver' }])
      setShowRedeem(false)
      setBkashName('')
      setBkashNumber('')
      setMsg('✅ রিডিম রিকোয়েস্ট সাবমিট হয়েছে!')
    } catch (e) { setMsg('সমস্যা: ' + e.message) }
    setLoading(false)
  }

  if (!user) return null

  return (
    <div className="scroll-area" style={{ padding: '16px' }}>
      <div style={{ textAlign: 'center', marginBottom: 24, paddingTop: 12 }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg,#6C3CE9,#8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto 12px' }}>👤</div>
        <h2 style={{ fontSize: 20 }}>{user.username}</h2>
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>ID: {user.tg_id}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
        <div className="card" style={{ textAlign: 'center', padding: 12 }}>
          <div>🪙</div>
          <div style={{ fontWeight: 700, color: 'var(--secondary)' }}>{user.coins || 0}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>কয়েন</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 12 }}>
          <div>⭐</div>
          <div style={{ fontWeight: 700, color: '#a78bfa' }}>{user.points || 0}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>পয়েন্ট</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 12 }}>
          <div>👥</div>
          <div style={{ fontWeight: 700 }}>{activeRefs}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>সচল রেফার</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, marginBottom: 12 }}>🏆 রিডিম সেন্টার</h3>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12, lineHeight: 1.8 }}>
          <div>⭐ পয়েন্ট: <b style={{ color: (user.points||0) >= minPoints ? 'var(--success)' : 'var(--danger)' }}>{user.points||0}</b> / {minPoints}</div>
          <div>🎮 সেশন: <b style={{ color: totalSessions >= minSessions ? 'var(--success)' : 'var(--danger)' }}>{totalSessions}</b> / {minSessions}</div>
          <div>👥 সচল রেফার: <b style={{ color: activeRefs >= minActiveRefs ? 'var(--success)' : 'var(--danger)' }}>{activeRefs}</b> / {minActiveRefs}</div>
          <div style={{ fontSize: 11, marginTop: 4 }}>* সচল রেফার = অন্তত ১টি সেশন শেষ করেছে এমন রেফার</div>
        </div>
        {!showRedeem ? (
          <button className="btn btn-secondary" style={{ width: '100%' }} disabled={!canRedeem} onClick={() => setShowRedeem(true)}>
            {canRedeem ? '✨ রিডিম করুন' : 'শর্ত পূরণ হয়নি'}
          </button>
        ) : (
          <div>
            <input className="admin-input" placeholder="বিকাশ অ্যাকাউন্টের নাম" value={bkashName} onChange={e => setBkashName(e.target.value)} />
            <input className="admin-input" placeholder="বিকাশ নম্বর (01XXXXXXXXX)" value={bkashNumber} onChange={e => setBkashNumber(e.target.value)} type="tel" />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowRedeem(false)}>বাতিল</button>
              <button className="btn btn-secondary" style={{ flex: 1 }} disabled={loading} onClick={handleRedeem}>{loading ? '...' : 'সাবমিট'}</button>
            </div>
          </div>
        )}
        {msg && <p style={{ textAlign: 'center', marginTop: 10, fontSize: 13 }}>{msg}</p>}
      </div>

      <div className="card">
        <h3 style={{ fontSize: 16, marginBottom: 12 }}>🎖️ আমার অর্জন</h3>
        {cards.length === 0 ? <p style={{ color: 'var(--muted)', textAlign: 'center', fontSize: 13 }}>এখনো কোনো কার্ড নেই</p> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
            {cards.map((c, i) => (
              <div key={i} style={{ background: 'linear-gradient(135deg,#64748b,#94a3b8)', borderRadius: 12, padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 28 }}>{c.card_type === 'gold' ? '🥇' : '🥈'}</div>
                <div style={{ fontSize: 11 }}>{c.card_type === 'gold' ? 'গোল্ড' : 'সিলভার'}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
