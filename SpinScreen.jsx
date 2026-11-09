import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useUser } from './UserContext.jsx'

const NUMBERS = [5, 10, 15, 20, 50, 100, 200, 500]
const ITEM_HEIGHT = 90

export default function SpinScreen() {
  const { user, addPoints } = useUser()
  const navigate = useNavigate()
  const location = useLocation()
  const isFree = new URLSearchParams(location.search).get('free') === 'true'

  const [balance, setBalance] = useState(1000) // ডেমো ব্যালেন্স, পরে সুপাবেস থেকে আসবে
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
  }, [])

  const pullLever = async () => {
    if (isSpinning) return
    if (balance < 10) {
      alert('পর্যাপ্ত ব্যালেন্স নেই!')
      return
    }

    setIsSpinning(true)
    setResultText('')
    setBalance(prev => prev - 10) // বেট কাটা হলো

    // লিভার অ্যানিমেশন
    setLeverPulled(true)
    setTimeout(() => setLeverPulled(false), 300)

    // ১. র‍্যান্ডম রেজাল্ট নির্ধারণ
    const randomIndex = Math.floor(Math.random() * NUMBERS.length)
    const wonAmount = NUMBERS[randomIndex]

    // ২. রিল ঘোরানোর ক্যালকুলেশন
    const totalItems = 40 // ৫ সেট * ৮
    const targetIndex = totalItems - (8 - randomIndex) - 8

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
      
      // ফ্রি খেললে অর্ধেক পয়েন্ট
      const finalPoints = isFree ? Math.floor(wonAmount / 2) : wonAmount
      
      setBalance(prev => prev + wonAmount)
      setResultText(`+${finalPoints} ⭐ পয়েন্ট!`)
      
      // হিস্টোরি আপডেট
      setHistory(prev => {
        const newHistory = [wonAmount, ...prev]
        return newHistory.slice(0, 5)
      })

      // সুপাবেসে পয়েন্ট যোগ করা
      await addPoints(finalPoints)

      // রিল রিসেট করা
      setTimeout(() => {
        reelRef.current.style.transition = 'none'
        reelRef.current.style.transform = `translateY(0px)`
      }, 100)

    }, 4000)
  }

  return (
    <div className="screen-container">
      <div className="header">
        <button onClick={() => navigate('/')} className="back-btn">←</button>
        <h2>{isFree ? '🎰 ফ্রি স্পিন' : '🎰 Spin & Win'}</h2>
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
          <span>ব্যালেন্স: <b>{balance}</b></span>
          <span>বেট: <b>10</b></span>
        </div>

        <div style={{ height: 40, textAlign: 'center', marginBottom: 10 }}>
          {resultText && <span className="result-text">{resultText}</span>}
        </div>
        
        <button 
          className="btn-spin" 
          onClick={pullLever} 
          disabled={isSpinning}
        >
          {isSpinning ? 'ঘুরছে...' : 'SPIN (10)'}
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
