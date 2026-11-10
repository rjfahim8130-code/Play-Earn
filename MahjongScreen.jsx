import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useUser } from './UserContext.jsx'

const EMOJIS = ['🀄','🐉','🎋','🌸','🔴','🟢','🔵','⭐','🌙','☀️','🌺','🍀','💛','💜','🧡']
const TOTAL = 288
const MAX_SLOTS = 7

export default function MahjongScreen() {
  const { user, settings, addPoints } = useUser()
  const navigate = useNavigate()
  const location = useLocation()
  const boardRef = useRef(null)

  const isFree = new URLSearchParams(location.search).get('mode') === 'free'
  const baseWin = settings?.mahjong_win_points || 300
  const finishBonus = Math.floor(baseWin * 0.2)
  const pool = baseWin - finishBonus

  const [tiles, setTiles] = useState([])
  const [slots, setSlots] = useState([])
  const [tileW, setTileW] = useState(32)
  const [tileH, setTileH] = useState(40)
  const [score, setScore] = useState(0)
  const [remaining, setRemaining] = useState(TOTAL)
  const [gameOver, setGameOver] = useState(false)
  const [won, setWon] = useState(false)

  const calcSize = () => {
    const w = Math.min(window.innerWidth, 420)
    const availH = window.innerHeight - 220
    // 12 cols max, \~10 rows visual
    const tw = Math.floor((w - 16) / 12)
    const th = Math.floor(tw * 1.25)
    setTileW(Math.max(26, Math.min(tw, 36)))
    setTileH(Math.max(32, Math.min(th, 44)))
  }

  const buildDeck = () => {
    // 288 / 3 = 96 triplets, cycle through 15 emojis
    const deck = []
    for (let i = 0; i < TOTAL / 3; i++) {
      const e = EMOJIS[i % EMOJIS.length]
      deck.push(e, e, e)
    }
    // shuffle
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[deck[i], deck[j]] = [deck[j], deck[i]]
    }
    return deck
  }

  const buildPositions = (tw, th) => {
    const positions = []
    const cols = 12
    const rows = 8
    const boardW = cols * (tw * 0.72)
    const startX = (Math.min(window.innerWidth, 420) - boardW) / 2
    const startY = 8

    // Layer 0 - base 12x8 = 96
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        positions.push({
          x: startX + c * (tw * 0.72),
          y: startY + r * (th * 0.72),
          z: 0
        })
      }
    }
    // Layer 1 - 10x6 = 60
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 10; c++) {
        positions.push({
          x: startX + (tw * 0.72) + c * (tw * 0.72),
          y: startY + (th * 0.72) + r * (th * 0.72),
          z: 1
        })
      }
    }
    // Layer 2 - 8x4 = 32
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 8; c++) {
        positions.push({
          x: startX + 2 * (tw * 0.72) + c * (tw * 0.72),
          y: startY + 2 * (th * 0.72) + r * (th * 0.72),
          z: 2
        })
      }
    }
    // Layer 3 - 6x4 = 24
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 6; c++) {
        positions.push({
          x: startX + 3 * (tw * 0.72) + c * (tw * 0.72),
          y: startY + 2 * (th * 0.72) + r * (th * 0.72),
          z: 3
        })
      }
    }
    // Layer 4 - top 4x4 = 16 → total 96+60+32+24+16 = 228
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        positions.push({
          x: startX + 4 * (tw * 0.72) + c * (tw * 0.72),
          y: startY + 2 * (th * 0.72) + r * (th * 0.72),
          z: 4
        })
      }
    }
    // Side free columns to reach 288 (60 more)
    // Left side 6x5 = 30
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 5; c++) {
        positions.push({
          x: startX - (c + 1) * (tw * 0.55),
          y: startY + r * (th * 0.72),
          z: 0
        })
      }
    }
    // Right side 6x5 = 30
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 5; c++) {
        positions.push({
          x: startX + boardW + c * (tw * 0.55),
          y: startY + r * (th * 0.72),
          z: 0
        })
      }
    }
    // exactly 288
    return positions.slice(0, TOTAL)
  }

  const initGame = useCallback(() => {
    calcSize()
    const tw = Math.max(26, Math.min(Math.floor((Math.min(window.innerWidth, 420) - 16) / 12), 36))
    const th = Math.floor(tw * 1.25)
    const positions = buildPositions(tw, th)
    const deck = buildDeck()
    const list = positions.map((p, i) => ({
      id: i,
      x: p.x,
      y: p.y,
      z: p.z,
      emoji: deck[i],
      removed: false
    }))
    setTiles(list)
    setSlots([])
    setScore(0)
    setRemaining(TOTAL)
    setGameOver(false)
    setWon(false)
    setTileW(tw)
    setTileH(th)
  }, [])

  useEffect(() => {
    initGame()
    const onResize = () => calcSize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [initGame])

  const isFreeTile = (tile, all) => {
    if (tile.removed) return false
    const others = all.filter(t => !t.removed && t.id !== tile.id)
    // blocked from above?
    const blockedTop = others.some(t =>
      t.z > tile.z &&
      Math.abs(t.x - tile.x) < tileW * 0.7 &&
      Math.abs(t.y - tile.y) < tileH * 0.7
    )
    if (blockedTop) return false
    // left or right must be free
    const left = others.some(t =>
      t.z === tile.z &&
      t.x < tile.x && tile.x - t.x < tileW * 0.85 &&
      Math.abs(t.y - tile.y) < tileH * 0.7
    )
    const right = others.some(t =>
      t.z === tile.z &&
      t.x > tile.x && t.x - tile.x < tileW * 0.85 &&
      Math.abs(t.y - tile.y) < tileH * 0.7
    )
    return !left || !right
  }

  const onTileClick = (tile) => {
    if (gameOver || won || tile.removed) return
    if (!isFreeTile(tile, tiles)) return

    // add to slots
    let newSlots = [...slots, { id: tile.id, emoji: tile.emoji }]
    const newTiles = tiles.map(t => t.id === tile.id ? { ...t, removed: true } : t)
    let newRemaining = remaining - 1

    // check match-3
    const counts = {}
    newSlots.forEach(s => { counts[s.emoji] = (counts[s.emoji] || 0) + 1 })
    for (const emoji of Object.keys(counts)) {
      if (counts[emoji] >= 3) {
        // remove 3 of this emoji
        let removed = 0
        newSlots = newSlots.filter(s => {
          if (s.emoji === emoji && removed < 3) { removed++; return false }
          return true
        })
      }
    }

    // score
    const percent = (TOTAL - newRemaining) / TOTAL
    const pts = Math.floor(pool * percent)
    const display = isFree ? Math.floor(pts / 10) : pts
    setScore(display)

    setTiles(newTiles)
    setSlots(newSlots)
    setRemaining(newRemaining)

    // win
    if (newRemaining === 0) {
      setWon(true)
      const finalPts = isFree
        ? Math.floor((pool + finishBonus) / 10)
        : pool + finishBonus
      addPoints(finalPts)
      setScore(finalPts)
      return
    }
    // lose - slots full
    if (newSlots.length >= MAX_SLOTS) {
      setGameOver(true)
    }
  }

  const undo = () => {
    // simple: restart for now
    if (slots.length === 0) return
    initGame()
  }

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: 'radial-gradient(circle at center, #1e5e32, #0a2a14)',
      overflow: 'hidden', position: 'relative'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', background: 'rgba(0,0,0,0.4)', zIndex: 50
      }}>
        <button onClick={() => navigate('/')} style={{
          background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff',
          width: 36, height: 36, borderRadius: '50%', fontSize: 18
        }}>←</button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>🀄 {isFree ? 'ফ্রি মাহজং' : 'মাহজং'}</div>
          <div style={{ fontSize: 12, color: '#FFB800' }}>
            বাকি {remaining} | ⭐ {score}
          </div>
        </div>
        <div style={{ fontSize: 12, color: '#94a3b8' }}>
          {isFree ? 'ফ্রি' : `${settings?.mahjong_entry_fee || 50}🪙`}
        </div>
      </div>

      {/* Slot bar */}
      <div style={{
        display: 'flex', justifyContent: 'center', gap: 4,
        padding: '8px 12px', zIndex: 40
      }}>
        {Array.from({ length: MAX_SLOTS }).map((_, i) => (
          <div key={i} style={{
            width: tileW, height: tileH,
            background: slots[i] ? 'linear-gradient(to bottom,#fffef5,#f0e6d3)' : 'rgba(0,0,0,0.3)',
            border: slots[i] ? '1px solid #c9bda5' : '1px dashed rgba(255,255,255,0.2)',
            borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: Math.floor(tileW * 0.65)
          }}>
            {slots[i]?.emoji || ''}
          </div>
        ))}
      </div>

      {/* Board */}
      <div ref={boardRef} style={{
        flex: 1, position: 'relative', overflow: 'hidden',
        margin: '0 auto', width: '100%', maxWidth: 420
      }}>
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
                width: tileW,
                height: tileH,
                zIndex: tile.z + 1,
                background: free
                  ? 'linear-gradient(to bottom, #fffef8, #f5e6c8)'
                  : 'linear-gradient(to bottom, #d0d0d0, #a8a8a8)',
                border: '1px solid #c9bda5',
                borderRadius: 5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: Math.floor(tileW * 0.62),
                cursor: free ? 'pointer' : 'default',
                opacity: free ? 1 : 0.55,
                boxShadow: free
                  ? '2px 2px 4px rgba(0,0,0,0.35)'
                  : '1px 1px 2px rgba(0,0,0,0.2)',
                transform: `translateZ(0)`,
                userSelect: 'none',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              {tile.emoji}
            </div>
          )
        })}
      </div>

      {/* Bottom controls */}
      <div style={{
        display: 'flex', justifyContent: 'center', gap: 16,
        padding: '10px 16px 20px', background: 'rgba(0,0,0,0.35)'
      }}>
        <button onClick={initGame} style={{
          width: 48, height: 48, borderRadius: '50%', border: 'none',
          background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', color: '#fff', fontSize: 20
        }}>🔄</button>
        <button onClick={undo} style={{
          width: 48, height: 48, borderRadius: '50%', border: 'none',
          background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', color: '#fff', fontSize: 20
        }}>↩️</button>
      </div>

      {/* Win / Lose overlay */}
      {(won || gameOver) && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          zIndex: 100, padding: 24
        }}>
          <div style={{ fontSize: 48 }}>{won ? '🎉' : '💥'}</div>
          <div style={{ fontSize: 22, fontWeight: 700, margin: '12px 0', color: won ? '#22C55E' : '#EF4444' }}>
            {won ? 'আপনি জিতেছেন!' : 'গেম ওভার'}
          </div>
          {won && <div style={{ color: '#FFB800', fontSize: 18, marginBottom: 16 }}>⭐ +{score} পয়েন্ট</div>}
          {!won && <div style={{ color: '#94a3b8', marginBottom: 16 }}>স্লট ভরে গেছে</div>}
          <button onClick={initGame} className="btn btn-primary" style={{ padding: '14px 32px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#6C3CE9,#8B5CF6)', color: '#fff', fontWeight: 600, fontSize: 16 }}>
            আবার খেলুন
          </button>
          <button onClick={() => navigate('/')} style={{ marginTop: 12, background: 'none', border: 'none', color: '#94a3b8', fontSize: 14 }}>
            হোমে ফিরে যান
          </button>
        </div>
      )}
    </div>
  )
    }
