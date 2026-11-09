import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
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
  const { addPoints } = useUser()
  const navigate = useNavigate()
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState(null)
  const [rotation, setRotation] = useState(0)
  const wheelRef = useRef(null)

  const spin = () => {
    if (spinning) return
    setSpinning(true)
    setResult(null)

    // Random segment
    const index = Math.floor(Math.random() * SEGMENTS.length)
    const segmentAngle = 360 / SEGMENTS.length
    // Extra spins + land on selected segment
    const extraSpins = 5 + Math.floor(Math.random() * 3)
    const targetAngle = extraSpins * 360 + (360 - (index * segmentAngle + segmentAngle / 2))

    setRotation(prev => prev + targetAngle)

    setTimeout(async () => {
      const won = SEGMENTS[index]
      setResult(won)
      await addPoints(won.points)
      setSpinning(false)
    }, 4200)
  }

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'radial-gradient(circle at center, #1e1b4b, #0f172a)',
      padding: '16px',
      position: 'relative'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            color: 'white',
            width: 40,
            height: 40,
            borderRadius: '50%',
            fontSize: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          ←
        </button>
        <h2 style={{ fontSize: 20 }}>🎰 Spin & Win</h2>
        <div style={{ width: 40 }} />
      </div>

      {/* Wheel Container */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
      }}>
        {/* Pointer */}
        <div style={{
          position: 'absolute',
          top: '12%',
          zIndex: 10,
          fontSize: 28,
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))'
        }}>
          ▼
        </div>

        {/* Wheel */}
        <div
          ref={wheelRef}
          style={{
            width: 280,
            height: 280,
            borderRadius: '50%',
            border: '6px solid #FFB800',
            boxShadow: '0 0 30px rgba(255,184,0,0.3)',
            position: 'relative',
            overflow: 'hidden',
            transition: spinning ? 'transform 4s cubic-bezier(0.2, 0.8, 0.3, 1)' : 'none',
            transform: `rotate(${rotation}deg)`,
            background: `conic-gradient(
              ${SEGMENTS.map((s, i) => {
                const start = (i / SEGMENTS.length) * 100
                const end = ((i + 1) / SEGMENTS.length) * 100
                return `${s.color} ${start}% ${end}%`
              }).join(', ')}
            )`
          }}
        >
          {SEGMENTS.map((seg, i) => {
            const angle = (i + 0.5) * (360 / SEGMENTS.length)
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: '50%',
                  height: 30,
                  marginTop: -15,
                  transformOrigin: 'left center',
                  transform: `rotate(${angle}deg)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  paddingRight: 12,
                  fontWeight: 700,
                  fontSize: 16,
                  color: 'white',
                  textShadow: '0 1px 2px rgba(0,0,0,0.6)'
                }}
              >
                {seg.label}
              </div>
            )
          })}
        </div>

        {/* Center circle */}
        <div style={{
          position: 'absolute',
          width: 50,
          height: 50,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #FFB800, #F59E0B)',
          border: '3px solid white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          zIndex: 5
        }}>
          🎯
        </div>
      </div>

      {/* Result / Button */}
      <div style={{ paddingBottom: 30, textAlign: 'center' }}>
        {result ? (
          <div>
            <div style={{
              fontSize: 28,
              fontWeight: 700,
              color: '#FFB800',
              marginBottom: 8
            }}>
              +{result.points} ⭐ পয়েন্ট!
            </div>
            <button
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 12 }}
              onClick={() => navigate('/')}
            >
              হোমে ফিরে যান
            </button>
          </div>
        ) : (
          <button
            className="btn btn-secondary"
            style={{ width: '100%', fontSize: 18, padding: '16px' }}
            onClick={spin}
            disabled={spinning}
          >
            {spinning ? 'ঘুরছে...' : '🎰 স্পিন করুন'}
          </button>
        )}
      </div>
    </div>
  )
}
