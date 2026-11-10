import React, { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from './UserContext.jsx'

const EMOJIS = ['🀄', '🐉', '🎋', '🌸', '🔴', '🟢', '🔵', '⭐', '🌙', '☀️', '🌺', '🍀', '💛', '💜', '🧡']
const TOTAL = 288
const MAX_SLOTS = 7

export default function MahjongScreen() {
  const { user, settings, updateUser, addPoints } = useUser()
  const navigate = useNavigate()

  const entryFee = settings?.mahjong_entry_fee || 50
  const maxFree = settings?.free_mahjong_per_day || settings?.free_game_per_day || 2
  const baseWin = settings?.mahjong_win_points || 300
  const finishBonus = Math.floor(baseWin * 0.2)
  const pool = baseWin - finishBonus

  const [started, setStarted] = useState(false)
  const [isFreeRun, setIsFreeRun] = useState(false)
  const [tiles, setTiles] = useState([])
  const [slots, setSlots] = useState([])
  const [tw, setTw] = useState(30)
  const [th, setTh] = useState(38)
  const [score, setScore] = useState(0)
  const [remaining, setRemaining] = useState(TOTAL)
  const [gameOver, setGameOver] = useState(false)
  const [won, setWon] = useState(false)
  const [boardH, setBoardH] = useState(400)

  const freeUsed = user?.free_mahjong_used || 0
  const freeLeft = Math.max(0, maxFree - freeUsed)
  const coins = user?.coins || 0
  const canPaid = coins >= entryFee
  const canFree = freeLeft > 0
  const canPlay = canPaid || canFree

  const buildLayout = useCallback(() => {
    const screenW = Math.min(window.innerWidth, 430)
    const screenH = window.innerHeight
    const availW = screenW - 16
    const availH = screenH - 210

    const cols = 14
    const rows = 10
    let tileW = Math.floor(availW / (cols * 0.78))
    let tileH = Math.floor(tileW * 1.22)
    if (rows * tileH * 0.72 > availH) {
      tileH = Math.floor(availH / (rows * 0.72))
      tileW = Math.floor(tileH / 1.22)
    }
    tileW = Math.max(24, Math.min(tileW, 34))
    tileH = Math.max(30, Math.min(tileH, 42))

    const stepX = tileW * 0.78
    const stepY = tileH * 0.72
    const positions = []
    const l0c = 12
    const baseW = l0c * stepX
    const ox = (screenW - baseW) / 2
    const oy = 4

    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 12; c++)
        positions.push({ x: ox + c * stepX, y: oy + r * stepY, z: 0 })

    for (let r = 0; r < 6; r++)
      for (let c = 0; c < 10; c++)
        positions.push({ x: ox + stepX + c * stepX, y: oy + stepY + r * stepY, z: 1 })

    for (let r = 0; r < 5; r++)
      for (let c = 0; c < 8; c++)
        positions.push({ x: ox + 2 * stepX + c * stepX, y: oy + 1.5 * stepY + r * stepY, z: 2 })

    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 6; c++)
        positions.push({ x: ox + 3 * stepX + c * stepX, y: oy + 2 * stepY + r * stepY, z: 3 })

    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 4; c++)
        positions.push({ x: ox + 4 * stepX + c * stepX, y: oy + 2.5 * stepY + r * stepY, z: 4 })

    for (let r = 0; r < 7; r++)
      for (let c = 0; c < 4; c++)
        positions.push({ x: ox - (c + 1) * stepX * 0.85, y: oy + r * stepY, z: 0 })

    for (let r = 0; r < 7; r++)
      for (let c = 0; c < 4; c++)
        positions.push({ x: ox + baseW + c * stepX * 0.85, y: oy + r * stepY, z: 0 })

    const margin = 2
    const final = positions.slice(0, TOTAL).map(p => ({
      x: Math.max(margin, Math.min(p.x, screenW - tileW - margin)),
      y: Math.max(0, p.y),
      z: p.z
    }))

    const maxY = Math.max(...final.map(p => p.y)) + tileH + 8
    setTw(tileW)
    setTh(tileH)
    setBoardH(maxY)
    return final
  }, [])

  const buildDeck = () => {
    const deck = []
    for (let i = 0; i < TOTAL / 3; i++) {
      const e = EMOJIS[i % EMOJIS.length]
      deck.push(e, e, e)
    }
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[deck[i], deck[j]] = [deck[j], deck[i]]
    }
    return deck
  }

  const startGame = async () => {
    if (!user || !canPlay) {
      alert('কয়েন নেই এবং ফ্রি গেমও শেষ!')
      return
    }
    let free = false
    if (canPaid) {
      await updateUser({ coins: (user.coins || 0) - entryFee })
      free = false
    } else {
      await updateUser({ free_mahjong_used: freeUsed + 1 })
      free = true
    }
    setIsFreeRun(free)

    const positions = buildLayout()
    const deck = buildDeck()
    setTiles(positions.map((p, i) => ({
      id: i, x: p.x, y: p.y, z: p.z, emoji: deck[i], removed: false
    })))
    setSlots([])
    setScore(0)
    setRemaining(TOTAL)
    setGameOver(false)
    setWon(false)
    setStarted(true)
  }

  const isFreeTile = (tile, all) => {
    if (tile.removed) return false
    const others = all.filter(t => !t.removed && t.id !== tile.id)
    const blockedTop = others.some(t =>
      t.z > tile.z &&
      Math.abs(t.x - tile.x) < tw * 0.75 &&
      Math.abs(t.y - tile.y) < th * 0.75
    )
    if (blockedTop) return false
    const left = others.some(t =>
      t.z === tile.z && t.x < tile.x && tile.x - t.x < tw * 0.9 &&
      Math.abs(t.y - tile.y) < th * 0.75
    )
    const right = others.some(t =>
      t.z === tile.z && t.x > tile.x && t.x - tile.x < tw * 0.9 &&
      Math.abs(t.y - tile.y) < th * 0.75
    )
    return !left || !right
  }

  const onTileClick = (tile) => {
    if (!started || gameOver || won || tile.removed) return
    if (!isFreeTile(tile, tiles)) return

    let newSlots = [...slots, { id: tile.id, emoji: tile.emoji }]
    const newTiles = tiles.map(t => t.id === tile.id ? { ...t, removed: true } : t)
    let newRem = remaining - 1

    const counts = {}
    newSlots.forEach(s => { counts[s.emoji] = (counts[s.emoji] || 0) + 1 })
    for (const em of Object.keys(counts)) {
      if (counts[em] >= 3) {
        let rm = 0
        newSlots = newSlots.filter(s => {
          if (s.emoji === em && rm < 3) { rm++; return false }
          return true
        })
      }
    }

    const percent = (TOTAL - newRem) / TOTAL
    const pts = Math.floor(pool * percent)
    setScore(isFreeRun ? Math.floor(pts / 10) : pts)
    setTiles(newTiles)
    setSlots(newSlots)
    setRemaining(newRem)

    if (newRem === 0) {
      setWon(true)
      const finalPts = isFreeRun
        ? Math.floor((pool + finishBonus) / 10)
        : pool + finishBonus
      addPoints(finalPts)
      setScore(finalPts)
      return
    }
    if (newSlots.length >= MAX_SLOTS) setGameOver(true)
  }

  if (!started) {
    return (
      <div style={{
        height: '100%', display: 'flex', flexDirection: 'column',
        background: 'radial-gradient(circle at center,#1e5e32,#0a2a14)',
        alignItems: 'center', justifyContent: 'center', padding: 24
      }}>
        <button onClick={() => navigate('/')} style={{
          position: 'absolute', top: 14, left: 14,
          background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff',
          width: 40, height: 40, borderRadius: '50%', fontSize: 18
        }}>←</button>

        <div style={{ fontSize: 56, marginBottom: 12 }}>🀄</div>
        <h2 style={{ color: '#fff', marginBottom: 8 }}>মাহজং চ্যালেঞ্জ</h2>
        <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 24, textAlign: 'center' }}>
          ২৮৮ টাইল · ৩ মিলিয়ে স্লট খালি রাখো
        </p>

        <div style={{
          background: 'rgba(0,0,0,0.35)', borderRadius: 16, padding: '16px 24px',
          marginBottom: 24, width: '100%', maxWidth: 300, textAlign: 'center'
        }}>
          <div style={{ color: '#FFB800', fontSize: 20, fontWeight: 700 }}>🪙 {coins}</div>
          <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 6 }}>
            ফ্রি বাকি: {freeLeft}/{maxFree}
          </div>
        </div>

        <button
          onClick={startGame}
          disabled={!canPlay}
          style={{
            width: '100%', maxWidth: 300, padding: '16px',
            borderRadius: 14, border: 'none', fontSize: 18, fontWeight: 700,
            background: canPlay
              ? 'linear-gradient(135deg,#FFB800,#F59E0B)'
              : 'rgba(255,255,255,0.15)',
            color: canPlay ? '#1e293b' : '#666',
            cursor: canPlay ? 'pointer' : 'not-allowed'
          }}
        >
          {!canPlay
            ? 'খেলতে পারবেন না'
            : canPaid
              ? `▶ প্লে করুন (${entryFee} কয়েন)`
              : `▶ ফ্রি প্লে (${freeLeft} বাকি)`}
        </button>

        <p style={{ color: '#64748b', fontSize: 12, marginTop: 16, textAlign: 'center' }}>
          {canPaid
            ? 'প্লে বাটনে চাপলে কয়েন কাটা হবে'
            : canFree
              ? 'কয়েন নেই — ফ্রি গেম চালু'
              : 'কয়েন সংগ্রহ করুন অথবা আগামীকাল আবার চেষ্টা করুন'}
        </p>
      </div>
    )
  }

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: 'radial-gradient(circle at center,#1e5e32,#0a2a14)',
      overflow: 'hidden'
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 12px', background: 'rgba(0,0,0,0.4)', zIndex: 20
      }}>
        <button onClick={() => navigate('/')} style={{
          background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff',
          width: 36, height: 36, borderRadius: '50%', fontSize: 16
        }}>←</button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>🀄 মাহজং</div>
          <div style={{ fontSize: 12, color: '#FFB800' }}>বাকি {remaining} | ⭐ {score}</div>
        </div>
        <div style={{ fontSize: 12, color: '#94a3b8' }}>
          {isFreeRun ? 'ফ্রি' : `${entryFee}🪙`}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 4, padding: '8px 0', zIndex: 15 }}>
        {Array.from({ length: MAX_SLOTS }).map((_, i) => (
          <div key={i} style={{
            width: tw, height: th, borderRadius: 5,
            background: slots[i] ? 'linear-gradient(to bottom,#fffef8,#f0e6d3)' : 'transparent',
            border: slots[i] ? '1px solid #c9bda5' : '1.5px dashed rgba(255,255,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: Math.floor(tw * 0.6)
          }}>
            {slots[i]?.emoji || ''}
          </div>
        ))}
      </div>

      <div style={{
        flex: 1, position: 'relative', overflow: 'hidden',
        width: '100%', maxWidth: 430, margin: '0 auto'
      }}>
        <div style={{ position: 'relative', height: boardH, width: '100%' }}>
          {tiles.map(tile => {
            if (tile.removed) return null
            const free = isFreeTile(tile, tiles)
            return (
              <div
                key={tile.id}
                onClick={() => onTileClick(tile)}
                style={{
                  position: 'absolute',
                  left: tile.x,
                  top: tile.y,
                  width: tw,
                  height: th,
                  zIndex: tile.z + 1,
                  background: free
                    ? 'linear-gradient(to bottom,#fffef8,#f5e6c8)'
                    : 'linear-gradient(to bottom,#c8c8c8,#9a9a9a)',
                  border: free ? '1px solid #d4c4a0' : '1px solid #888',
                  borderRadius: 5,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: Math.floor(tw * 0.58),
                  opacity: free ? 1 : 0.5,
                  boxShadow: free ? '2px 3px 5px rgba(0,0,0,0.4)' : '1px 1px 2px rgba(0,0,0,0.2)',
                  cursor: free ? 'pointer' : 'default',
                  userSelect: 'none',
                  WebkitTapHighlightColor: 'transparent'
                }}
              >
                {tile.emoji}
              </div>
            )
          })}
        </div>
      </div>

      <div style={{
        display: 'flex', justifyContent: 'center', gap: 20,
        padding: '10px 16px 18px', background: 'rgba(0,0,0,0.3)'
      }}>
        <button onClick={() => setStarted(false)} style={{
          width: 48, height: 48, borderRadius: '50%', border: 'none',
          background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', color: '#fff', fontSize: 20
        }}>🔄</button>
      </div>

      {(won || gameOver) && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', zIndex: 50, padding: 24
        }}>
          <div style={{ fontSize: 52 }}>{won ? '🎉' : '💥'}</div>
          <div style={{
            fontSize: 22, fontWeight: 700, margin: '12px 0',
            color: won ? '#22C55E' : '#EF4444'
          }}>
            {won ? 'আপনি জিতেছেন!' : 'গেম ওভার'}
          </div>
          {won && <div style={{ color: '#FFB800', fontSize: 18 }}>⭐ +{score} পয়েন্ট</div>}
          <button onClick={() => setStarted(false)} style={{
            marginTop: 20, padding: '14px 36px', borderRadius: 12, border: 'none',
            background: 'linear-gradient(135deg,#6C3CE9,#8B5CF6)',
            color: '#fff', fontWeight: 700, fontSize: 16
          }}>
            আবার খেলুন
          </button>
          <button onClick={() => navigate('/')} style={{
            marginTop: 12, background: 'none', border: 'none', color: '#94a3b8'
          }}>
            হোমে ফিরে যান
          </button>
        </div>
      )}
    </div>
  )
}
