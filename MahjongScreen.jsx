import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useUser } from './UserContext.jsx'

// ১৫ ধরনের ইমোজি
const EMOJIS = ['🀄','🐉','🎋','🌸','🔴','🟢','🔵','⭐','🌙','☀️','🌺','🍀','💛','💜','🧡']

const TILE_WIDTH = 36
const TILE_HEIGHT = 46
const TOTAL_TILES_LIMIT = 288 // নির্দিষ্ট ২৮৮ টাইল

export default function MahjongScreen() {
  const { user, settings, addPoints } = useUser()
  const navigate = useNavigate()
  const location = useLocation()

  const isFree = new URLSearchParams(location.search).get('mode') === 'free'
  const entryFee = settings.mahjong_entry_fee || 50

  const [tiles, setTiles] = useState([])
  const [selectedTileId, setSelectedTileId] = useState(null)
  const [isWon, setIsWon] = useState(false)
  const [currentScoreDisplay, setCurrentScoreDisplay] = useState(0)

  // লেআউট এবং ডেক তৈরি (২৮৮ টাইল এবং ট্রিপ্লেট লজিক)
  const initializeGame = useCallback(() => {
    let positions = []
    const screenWidth = window.innerWidth > 500 ? 450 : window.innerWidth
    const startX = (screenWidth - 12 * TILE_WIDTH) / 2
    const startY = 110

    // ৪টি লেয়ারের পজিশন জেনারেট
    for (let z = 0; z < 4; z++) {
      const layerRows = 8 - z
      const layerCols = 12 - z
      for (let r = 0; r < layerRows; r++) {
        for (let c = 0; c < layerCols; c++) {
          positions.push({
            x: startX + c * (TILE_WIDTH - 4) + z * 10,
            y: startY + r * (TILE_HEIGHT - 6) + z * 10,
            z: z
          })
        }
      }
    }

    // পজিশন ২৮৮ পূর্ণ করা
    let extraIndex = 0
    while (positions.length < TOTAL_TILES_LIMIT) {
      positions.push({
        x: startX + (extraIndex % 12) * (TILE_WIDTH - 4) + 5,
        y: startY + Math.floor(extraIndex / 12) * (TILE_HEIGHT - 6) + 15,
        z: 4
      })
      extraIndex++
    }

    positions.sort(() => Math.random() - 0.5)
    const finalPositions = positions.slice(0, TOTAL_TILES_LIMIT) // অবশ্যই 288

    // ডেক তৈরি (প্রতিটি ইমোজি ৩ এর গুণিতক: 288 / 3 = 96 triplets)
    const deck = []
    for (let i = 0; i < TOTAL_TILES_LIMIT / 3; i++) {
      const e = EMOJIS[i % EMOJIS.length]
      deck.push(e, e, e)
    }
    deck.sort(() => Math.random() - 0.5)

    const finalTiles = finalPositions.map((pos, i) => ({
      id: i,
      x: pos.x,
      y: pos.y,
      z: pos.z,
      emoji: deck[i],
      status: 'visible'
    }))

    setTiles(finalTiles)
    setSelectedTileId(null)
    setIsWon(false)
    setCurrentScoreDisplay(0)
  }, [])

  useEffect(() => {
    initializeGame()
  }, [initializeGame])

  const isSelectable = (tile, allTiles) => {
    const visibleTiles = allTiles.filter(t => t.status === 'visible')
    
    const blockedTop = visibleTiles.some(t => 
      t.z > tile.z && 
      Math.abs(t.x - tile.x) < TILE_WIDTH - 5 && 
      Math.abs(t.y - tile.y) < TILE_HEIGHT - 5
    )
    if (blockedTop) return false

    const blockedLeft = visibleTiles.some(t =>
      t.z === tile.z &&
      t.x < tile.x && t.x > tile.x - TILE_WIDTH &&
      Math.abs(t.y - tile.y) < TILE_HEIGHT - 5
    )
    const blockedRight = visibleTiles.some(t =>
      t.z === tile.z &&
      t.x > tile.x && t.x < tile.x + TILE_WIDTH &&
      Math.abs(t.y - tile.y) < TILE_HEIGHT - 5
    )

    return !blockedLeft || !blockedRight
  }

  const handleTileClick = async (id) => {
    const clickedTile = tiles.find(t => t.id === id)
    if (!clickedTile || clickedTile.status !== 'visible') return
    
    if (!isSelectable(clickedTile, tiles)) {
      alert('এই টাইলটি ব্লক করা আছে!')
      return
    }

    if (selectedTileId === null) {
      setSelectedTileId(id)
    } else {
      const firstTile = tiles.find(t => t.id === selectedTileId)
      if (firstTile.id === id) {
        setSelectedTileId(null)
        return
      }

      if (firstTile.emoji === clickedTile.emoji) {
        // টাইল ম্যাচ হয়েছে
        const newTiles = tiles.map(t => 
          (t.id === firstTile.id || t.id === clickedTile.id) 
            ? { ...t, status: 'matched' } 
            : t
        )
        setTiles(newTiles)
        setSelectedTileId(null)

        // আপনার দেওয়া স্কোরিং লজিক
        const baseWin = settings.mahjong_win_points || 300
        const finishBonus = Math.floor(baseWin * 0.2)  // ২০% এক্সট্রা বোনাস
        const divisiblePool = baseWin - finishBonus

        const remaining = newTiles.filter(t => t.status === 'visible').length

        // গেম চলাকালীন প্রোগ্রেসিভ স্কোর
        const percentDone = (TOTAL_TILES_LIMIT - remaining) / TOTAL_TILES_LIMIT
        const currentPoints = Math.floor(divisiblePool * percentDone)

        if (remaining === 0) {
          setIsWon(true)
          // জিতলে পয়েন্ট হিসাব
          const finalPoints = isFree
            ? Math.floor((divisiblePool + finishBonus) / 10)  // ফ্রি = ১/১০
            : divisiblePool + finishBonus

          await addPoints(finalPoints)
          alert(`অভিনন্দন! মাহজং সম্পন্ন হয়েছে। আপনি পেয়েছেন: +${finalPoints} ⭐`)
          initializeGame()
        } else {
          const displayScore = isFree ? Math.floor(currentPoints / 10) : currentPoints
          setCurrentScoreDisplay(displayScore)
        }

      } else {
        setSelectedTileId(id)
      }
    }
  }

  // টাইল কালারফুল রাখতে গ্রেডিয়েন্ট স্টাইল
  const tileStyle = {
    position: 'absolute',
    width: TILE_WIDTH,
    height: TILE_HEIGHT,
    background: 'linear-gradient(to bottom, #fffef5, #f0e6d3)',
    border: '1px solid #c9bda5',
    borderRadius: 6,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: 24,
    cursor: 'pointer',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
    boxShadow: '0 3px 6px rgba(0,0,0,0.3)',
    userSelect: 'none'
  }

  const selectedStyle = {
    border: '3px solid var(--secondary)',
    transform: 'scale(1.05)',
    boxShadow: '0 0 12px rgba(255,184,0,0.7)'
  }

  const matchedStyle = {
    opacity: 0,
    pointerEvents: 'none'
  }

  const remaining = tiles.filter(t => t.status === 'visible').length

  return (
    <div className="screen-container scroll-area" style={{ paddingBottom: 140 }}>
      <div className="header" style={{ position: 'fixed', top: 0, left: 0, right: 0, padding: '14px 20px', zIndex: 50, background: '#0f172a', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <button onClick={() => navigate('/')} className="back-btn">←</button>
        <h2 style={{ fontSize: 18 }}>{isFree ? '🀄 ফ্রি মাহজং' : '🀄 মাহজং চ্যালেঞ্জ'}</h2>
        <div style={{ width: 40 }} />
      </div>

      <div style={{ position: 'fixed', top: 68, left: 0, right: 0, padding: '10px 16px', zIndex: 40, background: '#0f172a' }}>
        <div className="stats-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)' }}>
          <span>কয়েন: <b>🪙 {user?.coins || 0}</b></span>
          <span>মোড: <b>{isFree ? 'ফ্রি (১/১০)' : `${entryFee} কয়েন`}</b></span>
        </div>
        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, marginTop: 8 }}>
          টাইল বাকি: <strong style={{ color: 'var(--secondary)' }}>{remaining} / {TOTAL_TILES_LIMIT}</strong> &nbsp;|&nbsp; 
          স্কোর: <strong style={{ color: '#a78bfa' }}>⭐ {currentScoreDisplay}</strong>
        </p>
      </div>

      <div style={{ position: 'relative', marginTop: 170, height: 520, width: '100%', maxWidth: 450, marginInline: 'auto' }}>
        {tiles.map(tile => (
          <div
            key={tile.id}
            onClick={() => handleTileClick(tile.id)}
            style={{
              ...tileStyle,
              left: tile.x,
              top: tile.y,
              zIndex: tile.z + 10,
              ...(selectedTileId === tile.id ? selectedStyle : {}),
              ...(tile.status === 'matched' ? matchedStyle : {})
            }}
          >
            {tile.emoji}
          </div>
        ))}
      </div>
    </div>
  )
                                   }
