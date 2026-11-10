import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from './UserContext.jsx'

export default function HomeScreen() {
  const { user, settings, updateUser, addPoints } = useUser()
  const navigate = useNavigate()
  
  if (!user) {
    return (
      <div className="loading">
        লোড হচ্ছে...
      </div>
    )
  }

  const spinFee = settings.spin_entry_fee || 10
  const mahjongFee = settings.mahjong_entry_fee || 50
  const maxFreeSpin = settings.free_spin_per_day || 2
  const maxFreeMahjong = settings.free_mahjong_per_day || 2
  const freeSpinLeft = maxFreeSpin - (user.free_spin_used || 0)
  const freeMahjongLeft = maxFreeMahjong - (user.free_mahjong_used || 0)

  const rewardSess = user.reward_sessions || 0
  const popupSess = user.popup_sessions || 0
  const canClaimBonus = rewardSess >= 3 && popupSess >= 3 && !user.daily_bonus_claimed

  const startGame = async (game) => {
    const fee = game === 'spin' ? spinFee : mahjongFee
    const freeLeft = game === 'spin' ? freeSpinLeft : freeMahjongLeft
    const usedKey = game === 'spin' ? 'free_spin_used' : 'free_mahjong_used'

    if ((user.coins || 0) >= fee) {
      // পেইড
      await updateUser({ coins: user.coins - fee })
      navigate(`/${game}?mode=paid`)
    } else if (freeLeft > 0) {
      // ফ্রি
      await updateUser({ [usedKey]: (user[usedKey] || 0) + 1 })
      navigate(`/${game}?mode=free`)
    } else {
      alert('কয়েন নেই এবং আজকের ফ্রি লিমিটও শেষ!')
    }
  }

  const claimBonus = async () => {
    if (!canClaimBonus) return
    const reward = settings.daily_task_reward || 200
    await addPoints(reward)
    await updateUser({ daily_bonus_claimed: true })
    alert(`+${reward} পয়েন্ট বোনাস!`)
  }

  // নাম: Telegram first_name বা username
  const displayName = user.first_name || user.username || 'Player'

  return (
    <div className="scroll-area" style={{ padding: '16px', paddingBottom: 140 }}>
      {/* Visa/Mastercard স্টাইল ব্যালেন্স কার্ড */}
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        borderRadius: 16, padding: '20px 18px', marginBottom: 16,
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,184,0,0.08)' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', letterSpacing: 2 }}>PLAY & EARN</span>
          <span style={{ fontSize: 18 }}>💳</span>
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>অ্যাকাউন্ট হোল্ডার</div>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>{displayName}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>কয়েন</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#FFB800' }}>🪙 {user.coins || 0}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>পয়েন্ট</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#a78bfa' }}>⭐ {user.points || 0}</div>
          </div>
        </div>
      </div>

      {/* সেশন প্রগ্রেস + বোনাস */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, marginBottom: 10 }}>📊 সেশন প্রগ্রেস</h3>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>
          🎁 বাটন ১: {rewardSess}/3 সেশন &nbsp;|&nbsp; 📢 বাটন ২: {popupSess}/3 সেশন
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ flex: 1, height: 8, borderRadius: 4, background: i < Math.min(rewardSess, popupSess) ? 'var(--success)' : 'rgba(255,255,255,0.1)' }} />
          ))}
        </div>
        {canClaimBonus ? (
          <button className="btn btn-secondary" style={{ width: '100%' }} onClick={claimBonus}>
            🎁 সেশন বোনাস ক্লেইম করুন (+{settings.daily_task_reward || 200})
          </button>
        ) : (
          <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
            প্রতিটি বাটনের ৩টি সেশন পূরণ হলে বোনাস পাবেন
          </p>
        )}
      </div>

      {/* গেম বাটন */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, marginBottom: 12 }}>🎮 গেম খেলুন</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'space-between' }} onClick={() => startGame('spin')}>
            <span>🎰 স্পিন</span>
            <span style={{ fontSize: 12, opacity: 0.85 }}>
              {(user.coins || 0) >= spinFee ? `${spinFee} কয়েন` : `ফ্রি (${freeSpinLeft} বাকি)`}
            </span>
          </button>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'space-between', background: 'linear-gradient(135deg,#059669,#10B981)' }} onClick={() => startGame('mahjong')}>
            <span>🀄 মাহজং</span>
            <span style={{ fontSize: 12, opacity: 0.85 }}>
              {(user.coins || 0) >= mahjongFee ? `${mahjongFee} কয়েন` : `ফ্রি (${freeMahjongLeft} বাকি)`}
            </span>
          </button>
        </div>
      </div>

      <button className="btn btn-secondary" style={{ width: '100%', height: 52 }} onClick={() => navigate('/earn')}>
        📺 কয়েন সংগ্রহ করুন
      </button>
    </div>
  )
}
