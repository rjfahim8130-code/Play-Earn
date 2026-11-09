import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from './UserContext.jsx'

const AD_COOLDOWN_MS = 5 * 60 * 1000 // 5 minutes
const SESSION_COOLDOWN_MS = 45 * 60 * 1000 // 45 minutes
const MAX_SESSIONS = 5

export default function HomeScreen() {
  const { user, addCoins, updateUser } = useUser()
  const navigate = useNavigate()
  const [adCooldown, setAdCooldown] = useState(0)
  const [sessionCooldown, setSessionCooldown] = useState(0)

  useEffect(() => {
    if (!user) return

    const checkCooldowns = () => {
      const now = Date.now()

      // Ad cooldown
      if (user.last_ad_at) {
        const left = AD_COOLDOWN_MS - (now - new Date(user.last_ad_at).getTime())
        setAdCooldown(left > 0 ? left : 0)
      } else {
        setAdCooldown(0)
      }

      // Session cooldown
      if (user.last_session_at) {
        const left = SESSION_COOLDOWN_MS - (now - new Date(user.last_session_at).getTime())
        setSessionCooldown(left > 0 ? left : 0)
      } else {
        setSessionCooldown(0)
      }
    }

    checkCooldowns()
    const timer = setInterval(checkCooldowns, 1000)
    return () => clearInterval(timer)
  }, [user])

  const formatTime = (ms) => {
    if (ms <= 0) return '00:00'
    const m = Math.floor(ms / 60000)
    const s = Math.floor((ms % 60000) / 1000)
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const watchAd = async (type) => {
    if (adCooldown > 0 || sessionCooldown > 0) return
    if ((user.sessions_today || 0) >= MAX_SESSIONS) {
      alert('আজকের সেশন শেষ! কাল আবার আসুন।')
      return
    }

    // Simulate ad (in real app: call Monetag / Adsgram SDK)
    const reward = type === 'reward' ? 50 : 20
    const ok = window.confirm(`বিজ্ঞাপন দেখুন এবং ${reward} কয়েন নিন?`)
    if (!ok) return

    await addCoins(reward)
    await updateUser({ last_ad_at: new Date().toISOString() })
    alert(`+${reward} কয়েন পেয়েছেন!`)
  }

  const startGame = async (game, cost) => {
    if (sessionCooldown > 0) {
      alert(`সেশন কুলডাউন চলছে: ${formatTime(sessionCooldown)}`)
      return
    }
    if ((user.sessions_today || 0) >= MAX_SESSIONS) {
      alert('আজকের ৫টি সেশন শেষ!')
      return
    }
    if ((user.coins || 0) < cost) {
      alert('পর্যাপ্ত কয়েন নেই! বিজ্ঞাপন দেখে কয়েন নিন।')
      return
    }

    // Spend coins
    const success = await updateUser({
      coins: user.coins - cost,
      sessions_today: (user.sessions_today || 0) + 1,
      last_session_at: new Date().toISOString()
    })

    if (game === 'spin') navigate('/spin')
    else if (game === 'mahjong') navigate('/mahjong')
  }

  if (!user) return null

  const sessions = user.sessions_today || 0

  return (
    <div className="scroll-area" style={{ padding: '16px' }}>
      {/* Header Balance */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: 20,
        paddingTop: 8
      }}>
        <div className="badge badge-coin" style={{ fontSize: 16, padding: '8px 14px' }}>
          🪙 {user.coins || 0}
        </div>
        <div className="badge badge-point" style={{ fontSize: 16, padding: '8px 14px' }}>
          ⭐ {user.points || 0}
        </div>
      </div>

      {/* Welcome */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, marginBottom: 4 }}>হ্যালো, {user.username}! 👋</h2>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>আজকের সেশন: {sessions}/{MAX_SESSIONS}</p>
      </div>

      {/* Session Progress */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 14, color: 'var(--muted)' }}>সেশন প্রগ্রেস</span>
          <span style={{ fontSize: 13, color: 'var(--secondary)' }}>
            {sessions >= 3 ? 'বোনাস আনলকড!' : `${3 - sessions} সেশন বাকি বোনাসের জন্য`}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[0,1,2,3,4].map(i => (
            <div key={i} style={{
              flex: 1,
              height: 8,
              borderRadius: 4,
              background: i < sessions ? 'var(--secondary)' : 'rgba(255,255,255,0.1)'
            }} />
          ))}
        </div>
      </div>

      {/* Ad Center */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, marginBottom: 12 }}>📺 কয়েন সংগ্রহ করুন</h3>
        
        {sessionCooldown > 0 && (
          <div style={{
            background: 'rgba(239,68,68,0.15)',
            color: '#f87171',
            padding: '10px 14px',
            borderRadius: 10,
            marginBottom: 12,
            fontSize: 13,
            textAlign: 'center'
          }}>
            সেশন কুলডাউন: {formatTime(sessionCooldown)}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            className="btn btn-secondary"
            disabled={adCooldown > 0 || sessionCooldown > 0}
            onClick={() => watchAd('reward')}
          >
            {adCooldown > 0 ? `⏳ ${formatTime(adCooldown)}` : '🎁 Monetag Reward (+৫০ কয়েন)'}
          </button>
          <button
            className="btn btn-outline"
            disabled={adCooldown > 0 || sessionCooldown > 0}
            onClick={() => watchAd('popup')}
          >
            {adCooldown > 0 ? `⏳ ${formatTime(adCooldown)}` : '📢 Monetag Popup (+২০ কয়েন)'}
          </button>
        </div>
      </div>

      {/* Games */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, marginBottom: 12 }}>🎮 গেম খেলুন</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            className="btn btn-primary"
            style={{ justifyContent: 'space-between', padding: '16px 18px' }}
            onClick={() => startGame('spin', 10)}
          >
            <span>🎰 Spin & Win</span>
            <span style={{ fontSize: 13, opacity: 0.9 }}>১০ কয়েন</span>
          </button>

          <button
            className="btn btn-primary"
            style={{ justifyContent: 'space-between', padding: '16px 18px', background: 'linear-gradient(135deg, #059669, #10B981)' }}
            onClick={() => startGame('mahjong', 50)}
          >
            <span>🀄 Mahjong Master</span>
            <span style={{ fontSize: 13, opacity: 0.9 }}>৫০ কয়েন</span>
          </button>
        </div>
      </div>

      {/* Quick Tip */}
      <div style={{
        background: 'rgba(108,60,233,0.1)',
        border: '1px solid rgba(108,60,233,0.25)',
        borderRadius: 12,
        padding: 14,
        fontSize: 13,
        color: '#c4b5fd',
        lineHeight: 1.5
      }}>
        💡 টিপ: প্রতিদিন ৩টি সেশন শেষ করলে বিশেষ বোনাস পয়েন্ট পাবেন!
      </div>
    </div>
  )
}
