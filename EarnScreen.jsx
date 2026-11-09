import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from './UserContext.jsx'

export default function EarnScreen() {
  const { user, settings, updateUser } = useUser()
  const navigate = useNavigate()
  
  const [rewardCooldown, setRewardCooldown] = useState(0)
  const [popupCooldown, setPopupCooldown] = useState(0)
  const [sessionCooldown, setSessionCooldown] = useState(0)

  useEffect(() => {
    if (!user) return
    const checkCooldowns = () => {
      const now = Date.now()
      const adMs = (settings.ad_cooldown_minutes || 5) * 60 * 1000
      const sessionMs = (settings.session_cooldown_minutes || 45) * 60 * 1000

      // Reward Cooldown
      if (user.last_reward_ad_at) {
        const left = adMs - (now - new Date(user.last_reward_ad_at).getTime())
        setRewardCooldown(left > 0 ? left : 0)
      } else setRewardCooldown(0)

      // Popup Cooldown
      if (user.last_popup_ad_at) {
        const left = adMs - (now - new Date(user.last_popup_ad_at).getTime())
        setPopupCooldown(left > 0 ? left : 0)
      } else setPopupCooldown(0)

      // Long Session Cooldown
      if (user.last_session_at) {
        const left = sessionMs - (now - new Date(user.last_session_at).getTime())
        setSessionCooldown(left > 0 ? left : 0)
      } else setSessionCooldown(0)
    }
    checkCooldowns()
    const timer = setInterval(checkCooldowns, 1000)
    return () => clearInterval(timer)
  }, [user, settings])

  const formatTime = (ms) => {
    if (ms <= 0) return '00:00'
    const m = Math.floor(ms / 60000)
    const s = Math.floor((ms % 60000) / 1000)
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const watchAd = async (type) => {
    const isReward = type === 'reward'
    const currentCooldown = isReward ? rewardCooldown : popupCooldown

    if (currentCooldown > 0) return alert(`এই বিজ্ঞাপনের জন্য অপেক্ষা করুন: ${formatTime(currentCooldown)}`)
    if (sessionCooldown > 0) return alert(`দীর্ঘ কুলডাউন চলছে: ${formatTime(sessionCooldown)}`)

    const reward = isReward ? settings.reward_ad_coins : settings.popup_ad_coins
    const ok = window.confirm(`বিজ্ঞাপন দেখে ${reward} কয়েন নিন?`)
    if (!ok) return

    const now = Date.now()
    let updates = { coins: (user.coins || 0) + reward }
    
    // অ্যাড দেখার টাইম আপডেট
    if (isReward) updates.last_reward_ad_at = new Date().toISOString()
    else updates.last_popup_ad_at = new Date().toISOString()

    // ✅ চেক করা: এই অ্যাডের আগের অ্যাড দেখার পর ৫ মিনিট পার হয়েছে কি না (সেশন এন্ড হবে কি না)
    const lastAdTime = isReward ? user.last_reward_ad_at : user.last_popup_ad_at
    const lastSessionTime = user.last_session_at
    const adMs = (settings.ad_cooldown_minutes || 5) * 60 * 1000

    // যদি আগে অ্যাড দেখা হয়ে থাকে এবং ৫ মিনিট পার হয়ে যায়
    if (lastSessionTime && (now - new Date(lastSessionTime).getTime()) > adMs) {
      updates.last_session_at = new Date().toISOString()
      updates.sessions_today = (user.sessions_today || 0) + 1
    }

    await updateUser(updates)
    alert(`সফল! +${reward} কয়েন`)
  }

  return (
    <div className="scroll-area" style={{ padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
        <button onClick={() => navigate('/')} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: 36, height: 36, borderRadius: '50%', marginRight: 12 }}>←</button>
        <h2 style={{ fontSize: 20 }}>📺 কয়েন সংগ্রহ করুন</h2>
      </div>

      <div className="badge badge-coin" style={{ fontSize: 18, padding: '10px 20px', display: 'inline-block', marginBottom: 20 }}>
        আপনার কয়েন: 🪙 {user?.coins || 0}
      </div>

      {sessionCooldown > 0 && (
        <div className="card" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444', marginBottom: 16, textAlign: 'center' }}>
          <p style={{ color: '#f87171', fontWeight: 600 }}>⏳ দীর্ঘ কুলডাউন চলছে: {formatTime(sessionCooldown)}</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Reward Ad Card */}
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🎁</div>
          <h3 style={{ marginBottom: 8 }}>Reward Ad</h3>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>বিজ্ঞাপন দেখে {settings.reward_ad_coins} কয়েন নিন</p>
          <button className="btn btn-primary" style={{ width: '100%' }} disabled={rewardCooldown > 0 || sessionCooldown > 0} onClick={() => watchAd('reward')}>
            {rewardCooldown > 0 ? `⏳ ${formatTime(rewardCooldown)}` : 'বিজ্ঞাপন দেখুন'}
          </button>
        </div>

        {/* Popup Ad Card */}
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>📢</div>
          <h3 style={{ marginBottom: 8 }}>Popup Ad</h3>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>বিজ্ঞাপন দেখে {settings.popup_ad_coins} কয়েন নিন</p>
          <button className="btn btn-secondary" style={{ width: '100%' }} disabled={popupCooldown > 0 || sessionCooldown > 0} onClick={() => watchAd('popup')}>
            {popupCooldown > 0 ? `⏳ ${formatTime(popupCooldown)}` : 'বিজ্ঞাপন দেখুন'}
          </button>
        </div>
      </div>
    </div>
  )
}
