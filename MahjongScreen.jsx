import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useUser } from './UserContext.jsx'

// ১৫ ধরনের ইমোজি - কালারফুল রাখতে CSS .tile এ গ্রেডিয়েন্ট দেওয়া হয়েছে
const EMOJIS = ['🀄','🐉','🎋','🌸','🔴','🟢','🔵','⭐','🌙','☀️','🌺','🍀','💛','💜','🧡']

const TILE_WIDTH = 34
const TILE_HEIGHT = 44
const GRID_COLS = 16
const GRID_ROWS = 10
const TOTAL_TILES_LIMIT = 288 // ২৮৮ টাইল নিশ্চিত করা হয়েছে

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

  // লেআউট এবং ডেক তৈরি করা (মেমোরাইজড)
  const initializeGame = useCallback(() => {
    let positions = []
    const xOff = (window.innerWidth - GRID_COLS * (TILE_WIDTH + 2)) / 2

    // একটি বেসিক লেআউট - 4 লেয়ার
    for (let layer = 0; layer < 4; layer++) {
      for (let r = layer; r < GRID_ROWS - layer; r++) {
        for (let c = layer; c < GRID_COLS - layer; c++) {
          positions.push({ x: c * (TILE_WIDTH + 1) + xOff, y: r * (TILE_HEIGHT + 2) + 120, z: layer })
        }
      }
    }
    // এলোমেলো করে ২৮৮টি অবস্থান নেওয়া
    positions.sort(() => Math.random() - 0.5)
    const finalPositions = positions.slice(0, TOTAL_TILES_LIMIT) // অবশ্যই 288

    // ডেক তৈরি (প্রতিটি ইমোজি ৩ এর গুণিতক)
    const deck = []
    // 288 / 3 = 96 triplets
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
      status: 'visible' // 'visible', 'matched'
    }))

    setTiles(finalTiles)
    setSelectedTileId(null)
    setIsWon(false)
    setCurrentScoreDisplay(0)
  }, [])

  useEffect(() => {
    initializeGame()
  }, [initializeGame])

  // ম্যাচ চেক করার হেল্পার ফাংশন
  const isSelectable = (tile, allTiles) => {
    const visibleTiles = allTiles.filter(t => t.status === 'visible')
    // উপরে কোনো টাইল আছে কি না চেক
    const blockedTop = visibleTiles.some(t => 
      t.z > tile.z && 
      Math.abs(t.x - tile.x) < TILE_WIDTH && 
      Math.abs(t.y - tile.y) < TILE_HEIGHT
    )
    if (blockedTop) return false

    // বামে বা ডানে ফাঁকা কি না চেক
    const blockedLeft = visibleTiles.some(t =>
      t.z === tile.z &&
      t.x < tile.x && t.x > tile.x - TILE_WIDTH &&
      Math.abs(t.y - tile.y) < TILE_HEIGHT
    )
    const blockedRight = visibleTiles.some(t =>
      t.z === tile.z &&
      t.x > tile.x && t.x < tile.x + TILE_WIDTH &&
      Math.abs(t.y - tile.y) < TILE_HEIGHT
    )
    return !blockedLeft || !blockedRight
  }

  const handleTileClick = async (id) => {
    const clickedTile = tiles.find(t => t.id === id)
    if (!clickedTile || clickedTile.status !== 'visible') return
    
    // টাইলটি ব্লকড কি না চেক
    if (!isSelectable(clickedTile, tiles)) {
      alert('এই টাইলটি ব্লক করা আছে! এটি আগে মুক্ত করুন।')
      return
    }

    if (selectedTileId === null) {
      setSelectedTileId(id)
    } else {
      const firstTile = tiles.find(t => t.id === selectedTileId)
      if (firstTile.id === id) {
        // একই টাইল দুইবার ক্লিক - ডিসিলেক্ট
        setSelectedTileId(null)
        return
      }

      if (firstTile.emoji === clickedTile.emoji) {
        // MATCH!
        const newTiles = tiles.map(t => 
          (t.id === firstTile.id || t.id === clickedTile.id) 
            ? { ...t, status: 'matched' } 
            : t
        )
        setTiles(newTiles)
        setSelectedTileId(null)

        // স্কোরিং লজিক আপডেট
        const baseWin = settings.mahjong_win_points || 300
        const finishBonus = Math.floor(baseWin * 0.2) // ২০% এক্সট্রা বোনাস
        const divisiblePool = baseWin - finishBonus

        const totalTiles = newTiles.length
        const remainingTiles = newTiles.filter(t => t.status === 'visible').length
        const matchedTiles = totalTiles - remainingTiles

        // গেম চলাকালীন প্রোগ্রেসিভ পয়েন্ট
        const percentDone = (totalTiles - remainingTiles) / totalTiles
        let currentPoints = Math.floor(divisiblePool * percentDone)

        if (remainingTiles === 0) {
          // জয়! সব পয়েন্ট প্লাস বোনাস
          setIsWon(true)
          const finalPoints = isFree
            ? Math.floor((divisiblePool + finishBonus) / 10) // ফ্রি = ১/১০
            : divisiblePool + finishBonus
          await addPoints(finalPoints)
          alert(`অভিনন্দন! আপনি গেমটি শেষ করেছেন। আপনার মোট পয়েন্ট: +${finalPoints} ⭐`)
          initializeGame() // খেলা রিসেট
        } else {
          // সাধারণ ম্যাচ
          // ফ্রি মোডে ১/১০ পয়েন্ট প্রদর্শন
          const displayScore = isFree ? Math.floor(currentPoints / 10) : currentPoints
          setCurrentScoreDisplay(displayScore)
        }

      } else {
        // NOT A MATCH - প্রথমটি ডিসিলেক্ট করে দ্বিতীয়টি সিলেক্ট
        setSelectedTileId(id)
      }
    }
  }

  // কালারফুল টাইল স্টাইল CSS
  const tileStyle = {
    position: 'absolute',
    width: TILE_WIDTH,
    height: TILE_HEIGHT,
    background: 'linear-gradient(to bottom, #fffef5, #f0e6d3)', // টাইল কালারফুল রাখতে গ্রেডিয়েন্ট
    border: '1px solid #c9bda5',
    borderRadius: 5,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: 26,
    cursor: 'pointer',
    transition: 'all .2s ease',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    zIndex: 10,
    userSelect: 'none'
  }

  const selectedStyle = {
    border: '3px solid var(--secondary)',
    boxShadow: '0 0 10px rgba(255,184,0,0.6)'
  }

  const matchedStyle = {
    opacity: 0,
    pointerEvents: 'none'
  }

  const remaining = tiles.filter(t => t.status === 'visible').length

  return (
    <div className="screen-container scroll-area" style={{ paddingBottom: 140 }}>
      <div className="header" style={{ position: 'fixed', top: 0, left: 0, right: 0, padding: '16px 20px', zIndex: 50, background: 'rgba(15,23,42,0.9)' }}>
        <button onClick={() => navigate('/')} className="back-btn">←</button>
        <h2>{isFree ? '🀄 ফ্রি মাহজং' : '🀄 মাহজং'}</h2>
        <div style={{ width: 40 }} />
      </div>

      <div style={{ position: 'fixed', top: 70, left: 0, right: 0, padding: '10px 16px', zIndex: 40, background: 'rgba(15,23,42,0.8)' }}>
        <div className="stats-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(0,0,0,0.3)', borderRadius: 10 }}>
          <span>কয়েন: <b>🪙 {user?.coins || 0}</b></span>
          <span>বেট: <b>{isFree ? 'ফ্রি' : entryFee}</b></span>
        </div>
        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, marginTop: 10 }}>
          টাইল বাকি: <strong>{remaining} / {TOTAL_TILES_LIMIT}</strong> &nbsp;|&nbsp; 
          স্কোর: <strong>⭐ {currentScoreDisplay}</strong>
        </p>
      </div>

      <div style={{ position: 'relative', marginTop: 180, height: 600 }}>
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
