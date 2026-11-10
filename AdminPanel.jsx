import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabase.js'
import { useUser } from './UserContext.jsx'
import { DEFAULT_SETTINGS } from './supabase.js'

const SETTINGS_KEYS = [
  'reward_ad_coins',
  'popup_ad_coins',
  'ad_cooldown_minutes',
  'session_cooldown_minutes',
  'max_sessions_per_day',
  'spin_entry_fee',
  'mahjong_entry_fee',
  'mahjong_win_points',
  'daily_task_sessions',
  'daily_task_reward',
  'referral_bonus_coins',
  'referral_commission_percent',
  'silver_card_points',
  'gold_card_points',
  'starting_coins',
  'redeem_min_points',
  'redeem_min_sessions',
  'redeem_min_active_refs',
  'free_spin_per_day',
  'free_game_per_day',
  'free_mahjong_per_day',
  'free_spin_reward_coins',
  'free_game_reward_coins',
]

export default function AdminPanel() {
  const navigate = useNavigate()
  const { refreshSettings } = useUser()
  const [tab, setTab] = useState('settings')
  const [form, setForm] = useState({ ...DEFAULT_SETTINGS })
  const [settingsId, setSettingsId] = useState(null)
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState({})
  const [redeems, setRedeems] = useState([])
  const [saving, setSaving] = useState(false)
  const [loadingForm, setLoadingForm] = useState(true)
  const [search, setSearch] = useState('')
  const [msg, setMsg] = useState('')

  // সরাসরি DB থেকে লোড — কনটেক্সটের উপর নির্ভর নয়
  const loadFormFromDb = async () => {
    setLoadingForm(true)
    setMsg('')
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .limit(1)
        .maybeSingle()

      if (error) throw error

      if (data?.id) {
        setSettingsId(data.id)
        const next = { ...DEFAULT_SETTINGS }
        SETTINGS_KEYS.forEach(k => {
          if (data[k] !== undefined && data[k] !== null) next[k] = data[k]
        })
        setForm(next)
      } else {
        setSettingsId(null)
        setForm({ ...DEFAULT_SETTINGS })
        setMsg('⚠️ settings টেবিলে কোনো রো নেই — সেভ করলে নতুন রো তৈরি হবে')
      }
    } catch (e) {
      console.error(e)
      setMsg('❌ সেটিংস লোড ব্যর্থ: ' + (e.message || String(e)))
    }
    setLoadingForm(false)
  }

  useEffect(() => {
    if (tab === 'settings') loadFormFromDb()
    if (tab === 'users') loadUsers()
    if (tab === 'analytics') loadStats()
    if (tab === 'redeems') loadRedeems()
  }, [tab])

  const loadUsers = async () => {
    const { data } = await supabase.from('users').select('*').order('created_at', { ascending: false }).limit(100)
    setUsers(data || [])
  }

  const loadStats = async () => {
    const { count: totalUsers } = await supabase.from('users').select('*', { count: 'exact', head: true })
    const { count: totalGames } = await supabase.from('game_history').select('*', { count: 'exact', head: true })
    const { count: totalAds } = await supabase.from('ads_log').select('*', { count: 'exact', head: true })
    const { data: coinData } = await supabase.from('users').select('coins, points')
    let totalCoins = 0, totalPoints = 0
    ;(coinData || []).forEach(u => {
      totalCoins += u.coins || 0
      totalPoints += u.points || 0
    })
    setStats({
      totalUsers: totalUsers || 0,
      totalGames: totalGames || 0,
      totalAds: totalAds || 0,
      totalCoins,
      totalPoints,
    })
  }

  const loadRedeems = async () => {
    const { data } = await supabase
      .from('redeem_requests')
      .select('*, users(username, tg_id, first_name)')
      .order('created_at', { ascending: false })
      .limit(50)
    setRedeems(data || [])
  }

  const saveSettings = async () => {
    setSaving(true)
    setMsg('')
    try {
      const payload = {}
      SETTINGS_KEYS.forEach(k => {
        const v = form[k]
        if (v === undefined || v === null || v === '') return
        payload[k] = Number(v)
        if (Number.isNaN(payload[k])) delete payload[k]
      })

      if (Object.keys(payload).length === 0) {
        throw new Error('সেভ করার মতো কোনো মান নেই')
      }

      let savedRow = null

      if (settingsId) {
        const { data, error } = await supabase
          .from('settings')
          .update(payload)
          .eq('id', settingsId)
          .select('*')
          .single()
        if (error) throw error
        if (!data) throw new Error('Update 0 row — RLS বা id ভুল')
        savedRow = data
      } else {
        const { data, error } = await supabase
          .from('settings')
          .insert(payload)
          .select('*')
          .single()
        if (error) throw error
        if (!data) throw new Error('Insert ব্যর্থ')
        savedRow = data
        setSettingsId(data.id)
      }

      // DB থেকে আবার পড়ে ফর্ম আপডেট
      const next = { ...DEFAULT_SETTINGS }
      SETTINGS_KEYS.forEach(k => {
        if (savedRow[k] !== undefined && savedRow[k] !== null) next[k] = savedRow[k]
      })
      setForm(next)

      // গ্লোবাল কনটেক্সটও আপডেট
      if (typeof refreshSettings === 'function') await refreshSettings()

      setMsg('✅ সেভ OK — DB তে লিখা হয়েছে (id: ' + (savedRow.id || '').toString().slice(0, 8) + '...)')
    } catch (e) {
      console.error('saveSettings', e)
      setMsg('❌ সেভ ব্যর্থ: ' + (e.message || JSON.stringify(e)))
    }
    setSaving(false)
  }

  const banUser = async (id, ban) => {
    await supabase.from('users').update({ is_banned: ban }).eq('id', id)
    loadUsers()
  }

  const adjustBalance = async (id, field, amount) => {
    const u = users.find(x => x.id === id)
    if (!u) return
    const newVal = Math.max(0, (u[field] || 0) + amount)
    await supabase.from('users').update({ [field]: newVal }).eq('id', id)
    loadUsers()
  }

  const filteredUsers = users.filter(u =>
    !search ||
    (u.username || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.first_name || '').toLowerCase().includes(search.toLowerCase()) ||
    String(u.tg_id).includes(search) ||
    (u.referral_code || '').includes(search.toUpperCase())
  )

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0f172a' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <button onClick={() => navigate('/')} style={{
          background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white',
          width: 36, height: 36, borderRadius: '50%', marginRight: 12
        }}>←</button>
        <h2 style={{ fontSize: 18 }}>👑 অ্যাডমিন প্যানেল</h2>
      </div>

      <div style={{ display: 'flex', gap: 4, padding: '10px 12px', overflowX: 'auto' }}>
        {[
          { id: 'settings', label: '⚙️ সেটিংস' },
          { id: 'users', label: '👥 ইউজার' },
          { id: 'analytics', label: '📊 অ্যানালিটিক্স' },
          { id: 'redeems', label: '🏆 রিডিম' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '8px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
            background: tab === t.id ? 'var(--primary)' : 'rgba(255,255,255,0.08)',
            color: tab === t.id ? 'white' : 'var(--muted)', border: 'none'
          }}>{t.label}</button>
        ))}
      </div>

      <div className="scroll-area" style={{ padding: '12px 16px' }}>
        {tab === 'settings' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontSize: 16 }}>ডাইনামিক সেটিংস</h3>
              <button type="button" className="btn btn-outline" style={{ padding: '6px 12px', fontSize: 12 }} onClick={loadFormFromDb}>
                🔄 DB থেকে আবার লোড
              </button>
            </div>

            {loadingForm ? (
              <p style={{ color: 'var(--muted)' }}>লোড হচ্ছে...</p>
            ) : (
              <>
                <Section title="📺 অ্যাড সেটিংস">
                  <Field label="Reward অ্যাড কয়েন" value={form.reward_ad_coins} onChange={v => setForm(f => ({ ...f, reward_ad_coins: v }))} />
                  <Field label="Popup অ্যাড কয়েন" value={form.popup_ad_coins} onChange={v => setForm(f => ({ ...f, popup_ad_coins: v }))} />
                  <Field label="অ্যাড কুলডাউন (মিনিট)" value={form.ad_cooldown_minutes} onChange={v => setForm(f => ({ ...f, ad_cooldown_minutes: v }))} />
                  <Field label="সেশন কুলডাউন (মিনিট)" value={form.session_cooldown_minutes} onChange={v => setForm(f => ({ ...f, session_cooldown_minutes: v }))} />
                  <Field label="দিনে সর্বোচ্চ সেশন" value={form.max_sessions_per_day} onChange={v => setForm(f => ({ ...f, max_sessions_per_day: v }))} />
                </Section>

                <Section title="🎮 গেম সেটিংস">
                  <Field label="স্পিন এন্ট্রি ফি" value={form.spin_entry_fee} onChange={v => setForm(f => ({ ...f, spin_entry_fee: v }))} />
                  <Field label="মাহজং এন্ট্রি ফি" value={form.mahjong_entry_fee} onChange={v => setForm(f => ({ ...f, mahjong_entry_fee: v }))} />
                  <Field label="মাহজং জিতলে পয়েন্ট" value={form.mahjong_win_points} onChange={v => setForm(f => ({ ...f, mahjong_win_points: v }))} />
                  <Field label="স্টার্টিং কয়েন" value={form.starting_coins} onChange={v => setForm(f => ({ ...f, starting_coins: v }))} />
                </Section>

                <Section title="👥 রেফারেল ও টাস্ক">
                  <Field label="রেফারেল বোনাস কয়েন" value={form.referral_bonus_coins} onChange={v => setForm(f => ({ ...f, referral_bonus_coins: v }))} />
                  <Field label="কমিশন %" value={form.referral_commission_percent} onChange={v => setForm(f => ({ ...f, referral_commission_percent: v }))} />
                  <Field label="দৈনিক টাস্ক সেশন" value={form.daily_task_sessions} onChange={v => setForm(f => ({ ...f, daily_task_sessions: v }))} />
                  <Field label="দৈনিক টাস্ক পয়েন্ট" value={form.daily_task_reward} onChange={v => setForm(f => ({ ...f, daily_task_reward: v }))} />
                </Section>

                <Section title="🏆 রিডিম শর্ত">
                  <Field label="মিন পয়েন্ট" value={form.redeem_min_points} onChange={v => setForm(f => ({ ...f, redeem_min_points: v }))} />
                  <Field label="মিন সেশন" value={form.redeem_min_sessions} onChange={v => setForm(f => ({ ...f, redeem_min_sessions: v }))} />
                  <Field label="মিন সচল রেফার" value={form.redeem_min_active_refs} onChange={v => setForm(f => ({ ...f, redeem_min_active_refs: v }))} />
                  <Field label="সিলভার পয়েন্ট" value={form.silver_card_points} onChange={v => setForm(f => ({ ...f, silver_card_points: v }))} />
                  <Field label="গোল্ড পয়েন্ট" value={form.gold_card_points} onChange={v => setForm(f => ({ ...f, gold_card_points: v }))} />
                </Section>

                <Section title="🎁 ফ্রি ডেইলি">
                  <Field label="ফ্রি স্পিন / দিন" value={form.free_spin_per_day} onChange={v => setForm(f => ({ ...f, free_spin_per_day: v }))} />
                  <Field label="ফ্রি মাহজং / দিন" value={form.free_mahjong_per_day ?? form.free_game_per_day} onChange={v => setForm(f => ({ ...f, free_mahjong_per_day: v, free_game_per_day: v }))} />
                </Section>
              </>
            )}

            {msg && (
              <p style={{
                textAlign: 'center', margin: '10px 0', fontSize: 13,
                color: msg.includes('✅') ? 'var(--success)' : msg.includes('⚠️') ? 'var(--secondary)' : 'var(--danger)'
              }}>{msg}</p>
            )}

            <button className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} onClick={saveSettings} disabled={saving || loadingForm}>
              {saving ? 'সেভ হচ্ছে...' : '💾 সেটিংস সেভ করুন'}
            </button>
          </div>
        )}

        {tab === 'users' && (
          <div>
            <input className="admin-input" placeholder="সার্চ: নাম / TG ID / রেফ কোড" value={search} onChange={e => setSearch(e.target.value)} />
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>মোট: {filteredUsers.length} জন</p>
            {filteredUsers.map(u => (
              <div key={u.id} className="card" style={{ marginBottom: 10, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <strong>{u.first_name || u.username || 'Unknown'}</strong>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>TG: {u.tg_id}</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>
                  🪙 {u.coins} | ⭐ {u.points} | S:{u.sessions_today || 0} | {u.referral_code}
                  {u.is_banned && <span style={{ color: 'var(--danger)', marginLeft: 8 }}>🚫</span>}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button className="btn btn-outline" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => adjustBalance(u.id, 'coins', 100)}>+১০০ কয়েন</button>
                  <button className="btn btn-outline" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => adjustBalance(u.id, 'points', 100)}>+১০০ পয়েন্ট</button>
                  <button className="btn btn-danger" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => banUser(u.id, !u.is_banned)}>
                    {u.is_banned ? 'আনব্যান' : 'ব্যান'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'analytics' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <StatCard icon="👥" label="মোট ইউজার" value={stats.totalUsers} />
            <StatCard icon="🎮" label="মোট গেম" value={stats.totalGames} />
            <StatCard icon="📺" label="মোট অ্যাড ভিউ" value={stats.totalAds} />
            <StatCard icon="🪙" label="সার্কুলেশনে কয়েন" value={stats.totalCoins} />
            <StatCard icon="⭐" label="সার্কুলেশনে পয়েন্ট" value={stats.totalPoints} />
          </div>
        )}

        {tab === 'redeems' && (
          <div>
            {redeems.length === 0 && <p style={{ color: 'var(--muted)', textAlign: 'center' }}>এখনো কোনো রিডিম নেই</p>}
            {redeems.map(r => (
              <div key={r.id} className="card" style={{ marginBottom: 10, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <strong>{r.users?.first_name || r.users?.username || 'Unknown'}</strong>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>TG: {r.users?.tg_id}</div>
                    <div style={{ fontSize: 12 }}>{r.bkash_name} · {r.bkash_number}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700 }}>{r.points_spent} ⭐</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{r.status}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <h4 style={{ fontSize: 14, marginBottom: 12, color: 'var(--secondary)' }}>{title}</h4>
      {children}
    </div>
  )
}

function Field({ label, value, onChange }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label className="admin-label">{label}</label>
      <input
        className="admin-input"
        type="number"
        value={value ?? ''}
        onChange={e => onChange(e.target.value === '' ? '' : e.target.value)}
      />
    </div>
  )
}

function StatCard({ icon, label, value }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: 16 }}>
      <div style={{ fontSize: 28 }}>{icon}</div>
      <div style={{ fontSize: 22, fontWeight: 700, margin: '6px 0' }}>{value ?? '—'}</div>
      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{label}</div>
    </div>
  )
                  }
