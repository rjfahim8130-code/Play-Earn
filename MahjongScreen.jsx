import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from './UserContext.jsx'

const EMOJIS = [
  '🀄', '🐉', '🎋', '🌸', '⚪',
  '🔴', '🟢', '🔵', '⭐', '🌙',
  '☀️', '🀅', '🀆', '🌺', '🍀'
]
const MAX_SLOTS = 7
const WIN_POINTS = 300

export default function MahjongScreen() {
  const { addPoints } = useUser()
  const navigate = useNavigate()
  const boardRef = useRef(null)

  const [tiles, setTiles] = useState([])
  const [slots, setSlots] = useState([])
  const [score, setScore] = useState(0)
  const [history, setHistory] = useState([])
  const [isGameOver, setIsGameOver] = useState(false)
  const [isWin, setIsWin] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [tileSize, setTileSize] = useState({ w: 36, h: 46, stepX: 31, stepY: 38 })

  const calcSize = useCallback(() => {
    const w = Math.min(window.innerWidth, 480)
    const h = window.innerHeight - 200
    const availW = w * 0.96
    const cols = 10
    let TILE_W = Math.floor((availW / (cols + 0.3)) / 0.86)
    let TILE_H = Math.floor(TILE_W * 1.26)
    if (TILE_W < 30) { TILE_W = 30; TILE_H = Math.floor(30 * 1.26) }
    if (TILE_W > 44) { TILE_W = 44; TILE_H = Math.floor(44 * 1.26) }
    return {
      w: TILE_W,
      h: TILE_H,
      stepX: TILE_W * 0.86,
      stepY: TILE_H * 0.82
    }
  }, [])

  const generatePattern = useCallback((size) => {
    const positions = []
    // Layer 1
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 10; c++) {
        if ((r === 0 || r === 8) && (c === 0 || c === 9)) continue
        positions.push({ x: c, y: r, layer: 1 })
      }
    }
    // Layer 2
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        positions.push({ x: c + 1, y: r + 0.5, layer: 2 })
      }
    }
    // Layer 3
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        positions.push({ x: c + 1.5, y: r + 1, layer: 3 })
      }
    }
    // Layer 4
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        positions.push({ x: c + 2, y: r + 1.5, layer: 4 })
      }
    }
    // Layer 5
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        positions.push({ x: c + 2.5, y: r + 2, layer: 5 })
      }
    }
    // Layer 6
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 6; c++) {
        positions.push({ x: c + 2, y: r + 2.5, layer: 6 })
      }
    }

    const final = positions.slice(0, 288)
    const boardW = Math.min(window.innerWidth, 480)
    const boardH = window.innerHeight - 210

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    final.forEach(p => {
      if (p.x < minX) minX = p.x
      if (p.x > maxX) maxX = p.x
      if (p.y < minY) minY = p.y
      if (p.y > maxY) maxY = p.y
    })

    const patternW = (maxX - minX) * size.stepX + size.w
    const patternH = (maxY - minY) * size.stepY + size.h
    let startX = (boardW - patternW) / 2 - minX * size.stepX
    let startY = (boardH - patternH) / 2 - minY * size.stepY
    if (startX < 6) startX = 6
    if (startY < 6) startY = 6

    return final.map((p, i) => ({
      id: i,
      x: startX + p.x * size.stepX,
      y: startY + p.y * size.stepY,
      layer: p.layer
    }))
  }, [])

  const initGame = useCallback(() => {
    const size = calcSize()
    setTileSize(size)
    const positions = generatePattern(size)
    const total = positions.length

    const deck = []
    const triplets = Math.floor(total / 3)
    for (let i = 0; i < triplets; i++) {
      const e = EMOJIS[i % EMOJIS.length]
      deck.push(e, e, e)
    }
    while (deck.length < total) deck.push(EMOJIS[deck.length % EMOJIS.length])
    deck.sort(() => Math.random() - 0.5)

    const newTiles = positions.map((pos, idx) => ({
      id: idx,
      emoji: deck[idx],
      x: pos.x,
      y: pos.y,
      layer: pos.layer,
      isLocked: false,
      isRemoved: false
    }))

    setTiles(newTiles)
    setSlots([])
    setScore(0)
    setHistory([])
    setIsGameOver(false)
    setIsWin(false)
    setShowResult(false)
  }, [calcSize, generatePattern])

  useEffect(() => {
    initGame()
  }, [initGame])

  // Check locks
  useEffect(() => {
    if (tiles.length === 0) return
    const thX = tileSize.w * 0.80
    const thY = tileSize.h * 0.80

    setTiles(prev => {
      const updated = prev.map(t1 => {
        if (t1.isRemoved) return t1
        let locked = false
        for (const t2 of prev) {
          if (t2.isRemoved || t1.id === t2.id) continue
          if (t2.layer > t1.layer) {
            const dx = Math.abs(t1.x - t2.x)
            const dy = Math.abs(t1.y - t2.y)
            if (dx < thX && dy < thY) {
              locked = true
              break
            }
          }
        }
        return { ...t1, isLocked: locked }
      })
      return updated
    })
  }, [tiles.filter(t => t.isRemoved).length, tileSize]) // re-check when tiles removed

  const onTileClick = (tile) => {
    if (isGameOver || tile.isLocked || tile.isRemoved) return
    if (slots.length >= MAX_SLOTS) return

    setHistory(h => [...h, { tileId: tile.id, prevSlots: [...slots] }])
    setTiles(prev => prev.map(t => t.id === tile.id ? { ...t, isRemoved: true } : t))
    const newSlots = [...slots, tile].sort((a, b) => a.emoji.localeCompare(b.emoji))
    setSlots(newSlots)

    // Check match after short delay
    setTimeout(() => {
      const counts = {}
      newSlots.forEach(t => { counts[t.emoji] = (counts[t.emoji] || 0) + 1 })
      let matched = null
      for (const e in counts) {
        if (counts[e] >= 3) { matched = e; break }
      }

      if (matched) {
        setScore(s => s + 30)
        let removed = 0
        const filtered = newSlots.filter(t => {
          if (t.emoji === matched && removed < 3) { removed++; return false }
          return true
        })
        setSlots(filtered)

        // Check win
        setTiles(current => {
          const allGone = current.every(t => t.id === tile.id || t.isRemoved)
          if (allGone && filtered.length === 0) {
            setIsWin(true)
            setIsGameOver(true)
            setShowResult(true)
            addPoints(WIN_POINTS)
          }
          return current
        })
      } else if (newSlots.length >= MAX_SLOTS) {
        setIsGameOver(true)
        setShowResult(true)
      }
    }, 80)
  }

  const undo = () => {
    if (isGameOver || history.length === 0) return
    const last = history[history.length - 1]
    setHistory(h => h.slice(0, -1))
    setTiles(prev => prev.map(t => t.id === last.tileId ? { ...t, isRemoved: false } : t))
    setSlots(last.prevSlots)
  }

  const shuffle = () => {
    if (isGameOver) return
    setTiles(prev => {
      const active = prev.filter(t => !t.isRemoved)
      const emos = active.map(t => t.emoji).sort(() => Math.random() - 0.5)
      let i = 0
      return prev.map(t => {
        if (t.isRemoved) return t
        return { ...t, emoji: emos[i++] }
      })
    })
  }

  const remaining = tiles.filter(t => !t.isRemoved).length

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'radial-gradient(circle at center, #1e5e32, #0a2a14)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '10px 16px',
        color: 'white',
        zIndex: 50
      }}>
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'rgba(0,0,0,0.4)',
            border: 'none',
            color: 'white',
            width: 36,
            height: 36,
            borderRadius: '50%',
            fontSize: 16
          }}
        >←</button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 12, opacity: 0.8 }}>স্কোর / বাকি</div>
          <div style={{ fontSize: 18, color: '#FFB800', fontWeight: 700 }}>
            {score} / {remaining}
          </div>
        </div>
        <div style={{ width: 36 }} />
      </div>

      {/* Slots */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 4,
        padding: '0 12px 8px',
        zIndex: 50
      }}>
        {Array.from({ length: MAX_SLOTS }).map((_, i) => (
          <div key={i} style={{
            width: 40,
            height: 40,
            borderRadius: 6,
            background: slots[i] ? '#fff' : 'rgba(255,255,255,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            boxShadow: 'inset 0 0 4px rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            {slots[i]?.emoji || ''}
          </div>
        ))}
      </div>

      {/* Board */}
      <div ref={boardRef} style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden'
      }}>
        {tiles.filter(t => !t.isRemoved).sort((a, b) => a.layer - b.layer).map(tile => (
          <div
            key={tile.id}
            onClick={() => onTileClick(tile)}
            style={{
              position: 'absolute',
              left: tile.x,
              top: tile.y,
              width: tileSize.w,
              height: tileSize.h,
              background: 'linear-gradient(to bottom, #fff, #e0e0e0)',
              borderRadius: 4,
              border: '1px solid #999',
              boxShadow: '0 2px 0 #777, 1px 3px 4px rgba(0,0,0,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: Math.max(14, Math.floor(tileSize.w * 0.52)),
              zIndex: tile.layer * 10 + 10,
              cursor: tile.isLocked ? 'not-allowed' : 'pointer',
              filter: tile.isLocked ? 'brightness(0.4) contrast(0.85)' : 'none',
              transition: 'transform 0.1s'
            }}
          >
            {tile.emoji}
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-around',
        padding: '10px 16px 24px',
        zIndex: 50
      }}>
        <button onClick={undo} style={ctrlBtnStyle}>↩️</button>
        <button onClick={shuffle} style={ctrlBtnStyle}>🔀</button>
        <button onClick={initGame} style={ctrlBtnStyle}>🔄</button>
      </div>

      {/* Result Overlay */}
      {showResult && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200
        }}>
          <div style={{
            background: '#1c1c1c',
            border: `2px solid ${isWin ? '#22C55E' : '#EF4444'}`,
            borderRadius: 20,
            padding: 28,
            textAlign: 'center',
            width: '86%',
            maxWidth: 320,
            color: 'white'
          }}>
            <h2 style={{ fontSize: 26, marginBottom: 10, color: isWin ? '#22C55E' : '#EF4444' }}>
              {isWin ? '🎉 আপনি জিতেছেন!' : '💥 গেম ওভার'}
            </h2>
            <p style={{ color: '#ccc', marginBottom: 16, fontSize: 15 }}>
              {isWin ? `অসাধারণ! +${WIN_POINTS} পয়েন্ট পেয়েছেন।` : 'স্লট ভরে গেছে! আবার চেষ্টা করুন।'}
            </p>
            <button
              onClick={() => navigate('/')}
              style={{
                background: '#6C3CE9',
                color: 'white',
                border: 'none',
                padding: 14,
                width: '100%',
                borderRadius: 12,
                fontSize: 16,
                fontWeight: 700
              }}
            >
              হোমে ফিরে যান
            </button>
            {!isWin && (
              <button
                onClick={initGame}
                style={{
                  background: 'transparent',
                  color: '#FFB800',
                  border: '2px solid #FFB800',
                  padding: 12,
                  width: '100%',
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: 600,
                  marginTop: 10
                }}
              >
                আবার খেলুন
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const ctrlBtnStyle = {
  width: 52,
  height: 52,
  borderRadius: '50%',
  background: 'linear-gradient(to bottom, #4a90e2, #1e5aa8)',
  border: '3px solid #fff',
  color: 'white',
  fontSize: 22,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 4px 10px rgba(0,0,0,0.4)'
}
