import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useUser } from './UserContext.jsx'

// ৮ রকমের পেইড ও ফ্রি ভ্যালু অ্যারে
const PAID_VALUES = [5, 10, 15, 20, 50, 100, 200, 500]
const FREE_VALUES = [0.5, 1, 1.5, 2, 5, 10, 20, 50]
const ITEM_HEIGHT = 90

// প্রবাবিলিটি ওয়েট লজিক ফাংশন
function pickWeighted(values) {
  const n = values.length
  const midCount = n - 2
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
  const { user, updateUser, addPoints } = useUser()
  const navigate = useNavigate()
  const location = useLocation()

  // URL থেকে মোড চেক করা (?mode=free অথবা paid)
  const searchParams = new URLSearchParams(location.search)
  const mode = searchParams.get('mode') || 'paid'
  const isFree = mode === 'free'

  const NUMBERS = isFree ? FREE_VALUES : PAID_VALUES

  const [isSpinning, setIsSpinning] = useState(false)
  const [history, setHistory] = useState([])
  const [leverPulled, setLeverPulled] = useState(false)
  const [resultText, setResultText] = useState('')

  const reelRef = useRef(null)

  // রিলে প্রাথমিক সংখ্যাগুলো তৈরি করা (৫ সেট)
  useEffect(() => {
    if (!reelRef.current) return
    reelRef.current.innerHTML = ''
    for (let i = 0; i < 5; i++) {
      NUMBERS.forEach(num => {
        const div = document.createElement('div')
        div.className = 'reel-item'
        div.innerText = num
        reelRef.current.appendChild(div)
      })
    }
    reelRef.current.style.transform = `translateY(0px)`
  }, [isFree])

  const pullLever = async () => {
    if (isSpinning) return
    if (!user) return

    // যদি পেইড মোড হয়, তবে এন্ট্রি ফি চেক করা (হোম স্ক্রিন থেকে অলরেডি ফি কাটা হয়ে থাকলে এখানে ডিরেক্ট স্পিন হতে পারে, অথবা চেক করতে পারেন)
    // যেহেতু HomeScreen থেকে ফি কেটে রাউট করা হয়েছে, তাই এখানে আর আলাদা ফি কাটছি না। তবে ফ্রি মোড হলে ফ্রি লিমিট চেক করতে পারেন।

    setIsSpinning(true)
    setResultText('')

    // লিভার অ্যানিমেশন
    setLeverPulled(true)
    setTimeout(() => setLeverPulled(false), 300)

    // ১. প্রবাবিলিটি ওয়েট অনুযায়ী উইনিং ভ্যালু নির্ধারণ
    const wonAmount = pickWeighted(NUMBERS)
    const targetValueIndex = NUMBERS.indexOf(wonAmount)

    // ২. রিল ঘোরানোর ক্যালকুলেশন (৮টি আইটেম * ৫ সেট = ৪০ আইটেম)
    const totalItems = 40 
    const targetIndex = totalItems - (8 - targetValueIndex) - 8

    // বর্তমান পজিশন রিসেট
    reelRef.current.style.transition = 'none'
    reelRef.current.style.transform = `translateY(0px)`
    
    // force reflow
    void reelRef.current.offsetHeight

    // অ্যানিমেশন শুরু
    reelRef.current.style.transition = 'transform 4s cubic-bezier(0.1, 0.7, 0.1, 1)'
    const finalY = -(targetIndex * ITEM_HEIGHT)
    reelRef.current.style.transform = `translateY(${finalY}px)`

    // ৩. ৪ সেকেন্ড পর রেজাল্ট দেখানো
    setTimeout(async () => {
      setIsSpinning(false)
      
      setResultText(`+${wonAmount} ⭐ পয়েন্ট!`)
      
      // হিস্টোরি আপডেট
      setHistory(prev => {
        const newHistory = [wonAmount, ...prev]
        return newHistory.slice(0, 5)
      })

      // সুপাবেসে পয়েন্ট যোগ করা
      await addPoints(wonAmount)

      // রিল রিসেট করা
      setTimeout(() => {
        reelRef.current.style.transition = 'none'
        reelRef.current.style.transform = `translateY(0px)`
      }, 100)

    }, 4000)
  }

  return (
    <div className="screen-container scroll-area" style={{ paddingBottom: 140 }}>
      <div className="header">
        <button onClick={() => navigate('/')} className="back-btn">←</button>
        <h2>{isFree ? '🎰 ফ্রি স্পিন' : '🎰 স্পিন অ্যান্ড উইন'}</h2>
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
          <div className={`lever-container ${leverPulled ? 'lever-pulled' : ''}`} onClick={pullLever}>
            <div className="lever-handle"></div>
            <div className="lever-rod"></div>
          </div>
        </div>
        <div className="machine-base"></div>
      </div>

      <div className="ui-panel">
        <div className="stats-row">
          <span>কয়েন: <b>🪙 {user?.coins || 0}</b></span>
          <span>পয়েন্ট: <b>⭐ {user?.points || 0}</b></span>
        </div>

        <div style={{ height: 40, textAlign: 'center', marginBottom: 10 }}>
          {resultText && <span className="result-text">{resultText}</span>}
        </div>
        
        <button 
          className="btn-spin" 
          onClick={pullLever} 
          disabled={isSpinning}
        >
          {isSpinning ? 'ঘুরছে...' : (isFree ? 'ফ্রি স্পিন করুন' : 'স্পিন করুন')}
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
