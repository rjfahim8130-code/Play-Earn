import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from './UserContext.jsx'

export default function EarnScreen() {
  const { user, settings, updateUser } = useUser()
  const navigate = useNavigate()
  const [adCooldown, setAdCooldown] = useState(0)
  const [sessionCooldown, setSessionCooldown] = useState(0)

  useEffect(() => {
    if (!user) return
    const checkCooldowns = () => {
      const now = Date.now()
      
      // ৫ মিনিট কুলডাউন (Reward/Popup Ads এর জন্য)
      if (user.last_ad_at) {
        const adMs = (settings.ad_cooldown_minutes || 5) * 60 * 1000
        const left = adMs - (now - new Date(user.last_ad_at).getTime())
        setAdCooldown(left > 0 ? left : 0)
      }

      // ৪৫ মিনিট কুলডাউন (সেশন এন্ড)
      if (user.last_session_at) {
        const sessionMs = (settings.session_cooldown_minutes || 45) * 60 * 1000
        const left = sessionMs - (now - new Date(user.last_session_at).getTime())
        setSessionCooldown(left > 0 ? left : 0)
      }
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
    if (adCooldown > 0) return alert(`অপেক্ষা করুন: ${formatTime(adCooldown)}`)
    if (sessionCooldown > 0) return alert(`দীর্ঘ কুলডাউন চলছে: ${formatTime(sessionCooldown)}`)

    const reward = type === 'reward' ? settings.reward_ad_coins : settings.popup_ad_coins
    const ok = window.confirm(`বিজ্ঞাপন দেখে ${reward} কয়েন নিন?`)
    if (!ok) return

    let updates = { coins: (user.coins || 0) + reward, last_ad_at: new Date().toISOString() }
    
    // চেক করা: আগের অ্যাড দেখার পর ৫ মিনিট শেষ হয়েছে কি না
    const lastAd = user.last_ad_at ? new Date(user.last_ad_at).getTime() : 0
    const isNewSession = (Date.now() - lastAd) > ((settings.ad_cooldown_minutes || 5) * 60 * 1000)

    // যদি ৫ মিনিট পার হয়ে যায়, তবে নতুন সেশন হবে এবং ৪৫ মিনিটের লং কুলডাউন শুরু হবে
    if (isNewSession) {
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
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🎁</div>
          <h3 style={{ marginBottom: 8 }}>Reward Ad</h3>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>বিজ্ঞাপন দেখে {settings.reward_ad_coins} কয়েন নিন</p>
          <button className="btn btn-primary" style={{ width: '100%' }} disabled={adCooldown > 0 || sessionCooldown > 0} onClick={() => watchAd('reward')}>
            {adCooldown > 0 ? `⏳ ${formatTime(adCooldown)}` : 'বিজ্ঞাপন দেখুন'}
          </button>
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>📢</div>
          <h3 style={{ marginBottom: 8 }}>Popup Ad</h3>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>বিজ্ঞাপন দেখে {settings.popup_ad_coins} কয়েন নিন</p>
          <button className="btn btn-secondary" style={{ width: '100%' }} disabled={adCooldown > 0 || sessionCooldown > 0} onClick={() => watchAd('popup')}>
            {adCooldown > 0 ? `⏳ ${formatTime(adCooldown)}` : 'বিজ্ঞাপন দেখুন'}
          </button>
        </div>
      </div>
    </div>
  )
            }
