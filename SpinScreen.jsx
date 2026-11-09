import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useUser } from './UserContext.jsx'

const SEGMENTS = [
  { label: '৫', points: 5, color: '#EF4444' },
  { label: '১০', points: 10, color: '#F59E0B' },
  { label: '২০', points: 20, color: '#10B981' },
  { label: '৫০', points: 50, color: '#3B82F6' },
  { label: '১০০', points: 100, color: '#8B5CF6' },
  { label: '১৫', points: 15, color: '#EC4899' },
  { label: '৩০', points: 30, color: '#14B8A6' },
  { label: '৫০০', points: 500, color: '#F97316' },
]

export default function SpinScreen() {
  const { user, addPoints } = useUser()
  const navigate = useNavigate()
  const location = useLocation()
  const isFree = new URLSearchParams(location.search).get('free') === 'true'

  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState(null)
  const [rotation, setRotation] = useState(0)

  const spin = () => {
    if (spinning) return
    setSpinning(true)
    setResult(null)

    const randomDeg = Math.floor(Math.random() * 360)
    const totalRotation = rotation + (360 * 5) + randomDeg

    setRotation(totalRotation)

    setTimeout(async () => {
      const normalizedDeg = totalDeg % 360 // fixed typo
      const index = Math.floor(normalizedDeg / (360 / SEGMENTS.length))
      let wonSegment = SEGMENTS[SEGMENTS.length - 1 - index]

      if (isFree) wonSegment = { ...wonSegment, points: Math.floor(wonSegment.points / 2) }

      setResult(wonSegment)
      await addPoints(wonSegment.points)
      setSpinning(false)
    }, 4000)
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'radial-gradient(circle, #1e1b4b, #0f172a)', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <button onClick={() => navigate('/')} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: 40, height: 40, borderRadius: '50%' }}>←</button>
        <h2>{isFree ? '🎰 ফ্রি স্পিন' : '🎰 Spin & Win'}</h2>
        <div style={{ width: 40 }} />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '5%', zIndex: 10, fontSize: 32, color: '#fff' }}>▼</div>
        <div style={{
          width: 280, height: 280, borderRadius: '50%', border: '6px solid #FFB800',
          position: 'relative', overflow: 'hidden',
          transition: 'transform 4s cubic-bezier(0.1, 0.8, 0.1, 1)',
          transform: `rotate(${rotation}deg)`,
          background: `conic-gradient(${SEGMENTS.map((s, i) => `${s.color} ${(i / SEGMENTS.length) * 100}% ${((i + 1) / SEGMENTS.length) * 100}%`).join(', ')})`
        }}>
          {SEGMENTS.map((seg, i) => {
            const angle = (i + 0.5) * (360 / SEGMENTS.length)
            return (
              <div key={i} style={{
                position: 'absolute', top: '50%', left: '50%', width: '50%', height: 30, marginTop: -15,
                transformOrigin: 'left center', transform: `rotate(${angle}deg)`,
                display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 12,
                fontWeight: 700, fontSize: 18, color: 'white'
              }}>
                {seg.label}
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ paddingBottom: 30, textAlign: 'center' }}>
        {result ? (
          <div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#FFB800', marginBottom: 16 }}>+{result.points} ⭐ পয়েন্ট!</div>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => navigate('/')}>হোমে ফিরে যান</button>
          </div>
        ) : (
          <button className="btn btn-secondary" style={{ width: '100%', fontSize: 18, padding: '16px' }} onClick={spin} disabled={spinning}>
            {spinning ? 'ঘুরছে...' : '🎰 স্পিন করুন'}
          </button>
        )}
      </div>
    </div>
  )
}
