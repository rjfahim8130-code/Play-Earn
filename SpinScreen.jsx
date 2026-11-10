import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from './UserContext.jsx'

const PAID_VALUES = [5, 10, 15, 20, 50, 100, 200, 500]
const FREE_VALUES = [0.5, 1, 1.5, 2, 5, 10, 20, 50]
const ITEM_HEIGHT = 90

function pickWeighted(values) {
  const n = values.length
  const midCount = Math.max(1, n - 2)
  const weights = values.map((_, i) => {
    if (i === 0) return 10
    if (i === n - 1) return 5
    return (85 / midCount) * ((midCount - (i - 1)) / ((midCount + 1) / 2))
  })
  const total = weights.reduce((a, b) => a + b, 0)
  let r = Math.random() * total
  for (let i = 0; i < n; i++) {
    r -= weights[i]
    if (r <= 0) return values[i]
  }
  return values[0]
}

export default function SpinScreen() {
  const { user, settings, updateUser, addPoints } = useUser()
  const navigate = useNavigate()

  const entryFee = settings?.spin_entry_fee || 10
  const maxFree = settings?.free_spin_per_day || 2
  const freeUsed = user?.free_spin_used || 0
  const freeLeft = Math.max(0, maxFree - freeUsed)
  const coins = user?.coins || 0

  const canPaid = coins >= entryFee
  const canFree = freeLeft > 0
  const canSpin = canPaid || canFree
  const willUseFree = !canPaid && canFree

  const [isSpinning, setIsSpinning] = useState(false)
  const [history, setHistory] = useState([])
  const [leverPulled, setLeverPulled] = useState(false)
  const [resultText, setResultText] = useState('')
  const reelRef = useRef(null)

  useEffect(() => {
    if (!reelRef.current) return
    const nums = willUseFree ? FREE_VALUES : PAID_VALUES
    reelRef.current.innerHTML = ''
    for (let i = 0; i < 5; i++) {
      nums.forEach(num => {
        const div = document.createElement('div')
        div.className = 'reel-item'
        div.innerText = String(num)
        reelRef.current.appendChild(div)
      })
    }
    reelRef.current.style.transform = 'translateY(0px)'
  }, [willUseFree])

  const pullLever = async () => {
    if (isSpinning || !user) return

    const currentCoins = user.coins || 0
    const currentFreeUsed = user.free_spin_used || 0
    const currentFreeLeft = maxFree - currentFreeUsed
    const usePaid = currentCoins >= entryFee
    const useFree = !usePaid && currentFreeLeft > 0

    if (!usePaid && !useFree) {
      alert('কয়েন নেই এবং আজকের ফ্রি স্পিনও শেষ!')
      return
    }

    if (usePaid) {
      await updateUser({ coins: currentCoins - entryFee })
    } else {
      await updateUser({ free_spin_used: currentFreeUsed + 1 })
    }

    const numbers = useFree ? FREE_VALUES : PAID_VALUES

    setIsSpinning(true)
    setResultText('')
    setLeverPulled(true)
    setTimeout(() => setLeverPulled(false), 300)

    const wonAmount = pickWeighted(numbers)
    const targetValueIndex = numbers.indexOf(wonAmount)
    const totalItems = 40
    const targetIndex = totalItems - (8 - targetValueIndex) - 8

    if (reelRef.current) {
      reelRef.current.style.transition = 'none'
      reelRef.current.style.transform = 'translateY(0px)'
      void reelRef.current.offsetHeight
      reelRef.current.style.transition = 'transform 4s cubic-bezier(0.1, 0.7, 0.1, 1)'
      reelRef.current.style.transform = `translateY(${-(targetIndex * ITEM_HEIGHT)}px)`
    }

    setTimeout(async () => {
      setIsSpinning(false)
      setResultText(`+${wonAmount} ⭐ পয়েন্ট!`)
      setHistory(prev => [wonAmount, ...prev].slice(0, 5))
      await addPoints(wonAmount)
      setTimeout(() => {
        if (reelRef.current) {
          reelRef.current.style.transition = 'none'
          reelRef.current.style.transform = 'translateY(0px)'
        }
      }, 100)
    }, 4000)
  }

  return (
    <div className="screen-container scroll-area" style={{ paddingBottom: 40 }}>
      <div className="header">
        <button onClick={() => navigate('/')} className="back-btn">←</button>
        <h2>🎰 স্পিন</h2>
        <div style={{ width: 40 }} />
      </div>

      <div className="machine-container">
        <div className="machine-hood">
          <div className="hood-light"></div>
        </div>
        <div className="machine-body">
          <div className="reel-window">
            <div className="reel" ref={reelRef}></div>
          </div>
          <div
            className={`lever-container ${leverPulled ? 'lever-pulled' : ''}`}
            onClick={pullLever}
          >
            <div className="lever-handle"></div>
            <div className="lever-rod"></div>
          </div>
        </div>
        <div className="machine-base"></div>
      </div>

      <div className="ui-panel">
        <div className="stats-row">
          <span>কয়েন: <b>🪙 {user?.coins ?? coins}</b></span>
          <span>ফ্রি: <b>{Math.max(0, maxFree - (user?.free_spin_used || 0))}/{maxFree}</b></span>
        </div>

        <div style={{ textAlign: 'center', fontSize: 13, color: '#94a3b8', marginBottom: 8 }}>
          {canPaid
            ? `প্রতি স্পিনে ${entryFee} কয়েন কাটা হবে`
            : canFree
              ? `কয়েন নেই — ফ্রি স্পিন চালু (${freeLeft} বাকি)`
              : 'কয়েন ও ফ্রি স্পিন শেষ'}
        </div>

        <div style={{ height: 40, textAlign: 'center', marginBottom: 10 }}>
          {resultText && <span className="result-text">{resultText}</span>}
        </div>

        <button
          className="btn-spin"
          onClick={pullLever}
          disabled={isSpinning || !canSpin}
        >
          {isSpinning
            ? 'ঘুরছে...'
            : canPaid
              ? `SPIN (${entryFee} 🪙)`
              : canFree
                ? `ফ্রি স্পিন (${freeLeft} বাকি)`
                : 'স্পিন বন্ধ'}
        </button>

        <div className="history-section">
          <span>সর্বশেষ ফলাফল:</span>
          <div className="history-list">
            {history.length === 0 ? (
              <span style={{ color: '#666', fontSize: 12 }}>এখনো কোনো স্পিন নেই</span>
            ) : (
              history.map((h, i) => (
                <div key={i} className="history-item">{h}</div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
