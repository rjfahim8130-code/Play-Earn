import React, { useState } from 'react'
import { useUser } from './UserContext.jsx'

const BOT_USERNAME = 'PlayAndEarnGame_bot'

export default function TasksScreen() {
  const { user, addPoints } = useUser()
  const [claimed, setClaimed] = useState({})
  const [copied, setCopied] = useState(false)

  const sessions = user?.sessions_today || 0
  const refCode = user?.referral_code || 'LOADING'

  const claimDaily = async () => {
    if (sessions < 3 || claimed.daily) return
    await addPoints(200)
    setClaimed(c => ({ ...c, daily: true }))
    alert('+২০০ পয়েন্ট পেয়েছেন!')
  }

  const copyLink = () => {
    const link = `https://t.me/${BOT_USERNAME}?start=${refCode}`
    if (navigator.clipboard) {
      navigator.clipboard.writeText(link)
    } else {
      // fallback
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
    <div className="scroll-area" style={{ padding: '16px' }}>
      <h2 style={{ fontSize: 22, marginBottom: 20, paddingTop: 8 }}>📋 টাস্ক ও রেফারেল</h2>

      {/* Daily Task */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, marginBottom: 8 }}>📅 দৈনিক টাস্ক</h3>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 12 }}>
          আজ ৩টি সেশন সম্পূর্ণ করুন → ২০০ পয়েন্ট
        </p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{
              flex: 1,
              height: 10,
              borderRadius: 5,
              background: i < sessions ? 'var(--success)' : 'rgba(255,255,255,0.1)'
            }} />
          ))}
        </div>
        <button
          className="btn btn-primary"
          style={{ width: '100%' }}
          disabled={sessions < 3 || claimed.daily}
          onClick={claimDaily}
        >
          {claimed.daily ? '✅ দাবি করা হয়েছে' : sessions >= 3 ? '🎁 ২০০ পয়েন্ট নিন' : `প্রগ্রেস: ${sessions}/3`}
        </button>
      </div>

      {/* Referral */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, marginBottom: 8 }}>👥 রেফারেল সিস্টেম</h3>
        
        <div style={{
          background: 'rgba(255,184,0,0.1)',
          border: '1px solid rgba(255,184,0,0.3)',
          borderRadius: 10,
          padding: 12,
          marginBottom: 14,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>তোমার ইউনিক কোড</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--secondary)', letterSpacing: 2 }}>
            {refCode}
          </div>
        </div>

        <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 12, lineHeight: 1.5 }}>
          বন্ধুকে ইনভাইট করুন। সে অন্তত <strong>১টি সেশন</strong> সম্পূর্ণ করলে আপনি <strong>৫০০ কয়েন</strong> পাবেন।
          <br /><br />
          এছাড়া বন্ধু যে পয়েন্ট জিতবে তার <strong>১০%</strong> আপনার অ্যাকাউন্টে আসবে (লাইফটাইম)।
        </p>

        <button className="btn btn-secondary" style={{ width: '100%' }} onClick={copyLink}>
          {copied ? '✅ কপি হয়েছে!' : '🔗 রেফারেল লিংক কপি করুন'}
        </button>
      </div>

      {/* How it works */}
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
