import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from './UserContext.jsx'

export default function EarnScreen() {
  const { user, settings, updateUser } = useUser()
  const navigate = useNavigate()

  // প্রতি বাটনের আলাদা টাইমার (মিলিসেকেন্ডে বাকি সময়)
  const [rewardLeft, setRewardLeft] = useState(0)
  const [popupLeft, setPopupLeft] = useState(0)

  const shortMs = (settings.ad_cooldown_minutes || 5) * 60 * 1000
  const longMs  = (settings.session_cooldown_minutes || 45) * 60 * 1000
  const maxSessions = settings.max_sessions_per_day || 5

  useEffect(() => {
    if (!user) return
    const tick = () => {
      const now = Date.now()
      // reward button
      if (user.reward_cd_until) {
        const left = new Date(user.reward_cd_until).getTime() - now
        setRewardLeft(left > 0 ? left : 0)
      } else setRewardLeft(0)
      // popup button
      if (user.popup_cd_until) {
        const left = new Date(user.popup_cd_until).getTime() - now
        setPopupLeft(left > 0 ? left : 0)
      } else setPopupLeft(0)
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [user])

  const formatTime = (ms) => {
    if (ms <= 0) return '00:00'
    const m = Math.floor(ms / 60000)
    const s = Math.floor((ms % 60000) / 1000)
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const watchAd = async (type) => {
    if (!user) return

    const isReward = type === 'reward'
    const left = isReward ? rewardLeft : popupLeft
    if (left > 0) return alert(`অপেক্ষা করুন: ${formatTime(left)}`)

    const coins = isReward ? (settings.reward_ad_coins || 50) : (settings.popup_ad_coins || 20)
    const phaseKey = isReward ? 'reward_phase' : 'popup_phase'
    const cdKey    = isReward ? 'reward_cd_until' : 'popup_cd_until'
    const sessKey  = isReward ? 'reward_sessions' : 'popup_sessions'
    
    const currentPhase = user[phaseKey] || 0   // 0 = ready for short, 1 = ready for long
    const currentSess = user[sessKey] || 0

    if (currentSess >= maxSessions) {
      return alert('এই বাটনের আজকের সেশন লিমিট শেষ!')
    }

    const ok = window.confirm(`বিজ্ঞাপন দেখে ${coins} কয়েন পাবেন?`)
    if (!ok) return

    const now = Date.now()
    let updates = { coins: (user.coins || 0) + coins }

    if (currentPhase === 0) {
      // প্রথম ক্লিক → ৫ মিনিট CD
      updates[phaseKey] = 1
      updates[cdKey] = new Date(now + shortMs).toISOString()
    } else {
      // দ্বিতীয় ক্লিক → লম্বা CD + সংশ্লিষ্ট বাটনের সেশন +১
      updates[phaseKey] = 0
      updates[cdKey] = new Date(now + longMs).toISOString()
      updates[sessKey] = currentSess + 1
    }

    await updateUser(updates)
    alert(`+${coins} কয়েন পেয়েছেন!`)
  }

  const renderButton = (type, left, coins) => {
    const sess = type === 'reward' ? (user?.reward_sessions || 0) : (user?.popup_sessions || 0)
    const disabled = left > 0 || sess >= maxSessions
    return (
      <button
        className={type === 'reward' ? 'btn btn-primary' : 'btn btn-secondary'}
        style={{ width: '100%' }}
        disabled={disabled}
        onClick={() => watchAd(type)}
      >
        {left > 0 ? `⏳ ${formatTime(left)}` : `বিজ্ঞাপন দেখে ${coins} কয়েন পান`}
      </button>
    )
  }

  return (
    <div className="scroll-area" style={{ padding: '16px', paddingBottom: 140 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
        <button onClick={() => navigate('/')} style={{
          background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white',
          width: 36, height: 36, borderRadius: '50%', marginRight: 12
        }}>←</button>
        <h2 style={{ fontSize: 20 }}>📺 কয়েন সংগ্রহ করুন</h2>
      </div>

      <div className="badge badge-coin" style={{ fontSize: 18, padding: '10px 20px', display: 'inline-block', marginBottom: 16 }}>
        আপনার কয়েন: 🪙 {user?.coins || 0}
      </div>

      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <span>🎁 রিওয়ার্ড সেশন: {user?.reward_sessions || 0} / {maxSessions}</span>
        <span>📢 পপআপ সেশন: {user?.popup_sessions || 0} / {maxSessions}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🎁</div>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 14 }}>
            বিজ্ঞাপন দেখে {settings.reward_ad_coins || 50} কয়েন পান
          </p>
          {renderButton('reward', rewardLeft, settings.reward_ad_coins || 50)}
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>📢</div>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 14 }}>
            বিজ্ঞাপন দেখে {settings.popup_ad_coins || 20} কয়েন পান
          </p>
          {renderButton('popup', popupLeft, settings.popup_ad_coins || 20)}
        </div>
      </div>
    </div>
  )
}
