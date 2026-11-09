import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from './UserContext.jsx'

export default function HomeScreen() {
  const { user, settings, updateUser } = useUser()
  const navigate = useNavigate()

  const startGame = async (game, cost, isFree) => {
    if (isFree) {
      const freeLimit = settings[`free_${game}_per_day`] || 2
      const used = user[`free_${game}_used`] || 0
      if (used >= freeLimit) return alert('আজকের ফ্রি খেলা শেষ!')

      await updateUser({ [`free_${game}_used`]: used + 1 })
    } else {
      if ((user.coins || 0) < cost) return alert('পর্যাপ্ত কয়েন নেই! কয়েন সংগ্রহ করুন।')
      await updateUser({ coins: user.coins - cost })
    }
    navigate(`/${game}?free=${isFree}`)
  }

  if (!user) return null

  const freeSpinUsed = user.free_spin_used || 0
  const freeMahjongUsed = user.free_mahjong_used || 0
  const maxFreeSpin = settings.free_spin_per_day || 2
  const maxFreeMahjong = settings.free_mahjong_per_day || 2

  return (
    <div className="scroll-area" style={{ padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, paddingTop: 8 }}>
        <div className="badge badge-coin">🪙 {user.coins || 0}</div>
        <div className="badge badge-point">⭐ {user.points || 0}</div>
      </div>

      <h2 style={{ fontSize: 22, marginBottom: 4 }}>হ্যালো, {user.username}! 👋</h2>
      
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, marginBottom: 12 }}>🎮 গেম খেলুন</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          
          {/* স্পিন অপশন */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button 
              className="btn btn-outline" 
              style={{ flex: 1 }} 
              onClick={() => startGame('spin', 0, true)}
              disabled={freeSpinUsed >= maxFreeSpin}
            >
              🎰 ফ্রি স্পিন ({maxFreeSpin - freeSpinUsed} বাকি)
            </button>
            <button 
              className="btn btn-primary" 
              style={{ flex: 1 }} 
              onClick={() => startGame('spin', settings.spin_entry_fee, false)}
            >
              🎰 স্পিন ({settings.spin_entry_fee} কয়েন)
            </button>
          </div>

          {/* মাহজং অপশন */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button 
              className="btn btn-outline" 
              style={{ flex: 1 }} 
              onClick={() => startGame('mahjong', 0, true)}
              disabled={freeMahjongUsed >= maxFreeMahjong}
            >
              🀄 ফ্রি মাহজং ({maxFreeMahjong - freeMahjongUsed} বাকি)
            </button>
            <button 
              className="btn btn-primary" 
              style={{ flex: 1, background: 'linear-gradient(135deg, #059669, #10B981)' }} 
              onClick={() => startGame('mahjong', settings.mahjong_entry_fee, false)}
            >
              🀄 মাহজং ({settings.mahjong_entry_fee} কয়েন)
            </button>
          </div>
        </div>
      </div>

      <button className="btn btn-secondary" style={{ width: '100%', height: 56 }} onClick={() => navigate('/earn')}>
        📺 কয়েন সংগ্রহ করুন (বিজ্ঞাপন দেখুন)
      </button>
    </div>
  )
}
