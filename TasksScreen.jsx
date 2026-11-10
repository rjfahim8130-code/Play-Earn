import React, { useState } from 'react'
import { useUser } from './UserContext.jsx'
import { BOT_USERNAME } from './supabase.js'

export default function TasksScreen() {
  const { user, settings, addPoints, updateUser } = useUser()
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)

  if (!user) return null

  const needSessions = settings?.daily_task_sessions || 3
  const bonusReward = settings?.daily_task_reward || 200
  const refBonus = settings?.referral_bonus_coins || 500
  const refPercent = settings?.referral_commission_percent || 10

  const sessions = user.sessions_today || 0
  const progress = Math.min(sessions, needSessions)
  const canClaim = sessions >= needSessions && !user.daily_bonus_claimed

  const claimDaily = async () => {
    if (!canClaim || loading) return
    setLoading(true)
    try {
      await addPoints(bonusReward)
      await updateUser({ daily_bonus_claimed: true })
      alert(`+${bonusReward} পয়েন্ট পেয়েছেন!`)
    } finally {
      setLoading(false)
    }
  }

  const copyLink = () => {
    const link = `https://t.me/${BOT_USERNAME}?start=${user.referral_code || ''}`
    if (navigator.clipboard) {
      navigator.clipboard.writeText(link)
    } else {
      const input = document.createElement('input')
      input.value = link
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    alert('রেফারেল লিংক কপি হয়েছে!\n' + link)
  }

  return (
    <div className="scroll-area" style={{ padding: '16px', paddingBottom: 140 }}>
      <h2 style={{ fontSize: 22, marginBottom: 20, paddingTop: 8 }}>📋 টাস্ক ও রেফারেল</h2>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, marginBottom: 8 }}>📅 দৈনিক টাস্ক</h3>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 12 }}>
          দৈনিক {needSessions}টি সেশন পূর্ণ করলে → {bonusReward} পয়েন্ট
        </p>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>
          আজকের সেশন: {sessions} / {needSessions}
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {Array.from({ length: needSessions }).map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 10, borderRadius: 5,
              background: i < progress ? 'var(--success)' : 'rgba(255,255,255,0.1)'
            }} />
          ))}
        </div>
        <button
          className="btn btn-primary"
          style={{ width: '100%' }}
          disabled={!canClaim || loading}
          onClick={claimDaily}
        >
          {user.daily_bonus_claimed
            ? '✅ আজকের বোনাস নেওয়া হয়েছে'
            : canClaim
              ? `🎁 ${bonusReward} পয়েন্ট নিন`
              : `প্রগ্রেস: ${progress}/${needSessions}`}
        </button>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, marginBottom: 8 }}>👥 রেফারেল সিস্টেম</h3>
        <div style={{
          background: 'rgba(255,184,0,0.1)',
          border: '1px solid rgba(255,184,0,0.3)',
          borderRadius: 10, padding: 12, marginBottom: 14, textAlign: 'center'
        }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>তোমার ইউনিক কোড</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--secondary)', letterSpacing: 2 }}>
            {user.referral_code || '—'}
          </div>
        </div>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 12, lineHeight: 1.5 }}>
          বন্ধু অন্তত ১টি সেশন শেষ করলে আপনি <strong>{refBonus} কয়েন</strong> পাবেন।
          <br /><br />
          বন্ধুর পয়েন্টের <strong>{refPercent}%</strong> আপনার অ্যাকাউন্টে আসবে (লাইফটাইম)।
        </p>
        <button className="btn btn-secondary" style={{ width: '100%' }} onClick={copyLink}>
          {copied ? '✅ কপি হয়েছে!' : '🔗 রেফারেল লিংক কপি করুন'}
        </button>
      </div>

      <div className="card">
        <h3 style={{ fontSize: 16, marginBottom: 10 }}>ℹ️ কীভাবে কাজ করে?</h3>
        <ul style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, paddingLeft: 18 }}>
          <li>বিজ্ঞাপন দেখে কয়েন নিন</li>
          <li>কয়েন দিয়ে গেম খেলুন</li>
          <li>গেম জিতে পয়েন্ট পান</li>
          <li>পয়েন্ট জমিয়ে সিলভার/গোল্ড কার্ড রিডিম করুন</li>
        </ul>
      </div>
    </div>
  )
}
