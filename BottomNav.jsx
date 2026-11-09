import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useUser } from './UserContext.jsx'

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAdmin } = useUser()

  if (location.pathname === '/spin' || location.pathname === '/mahjong' || location.pathname === '/admin') {
    return null
  }

  const items = [
    { path: '/', icon: '🏠', label: 'হোম' },
    { path: '/earn', icon: '📺', label: 'কয়েন' }, // নতুন
    { path: '/tasks', icon: '📋', label: 'টাস্ক' },
    { path: '/profile', icon: '👤', label: 'প্রোফাইল' },
  ]
  if (isAdmin) items.push({ path: '/admin', icon: '👑', label: 'অ্যাডমিন' })

  return (
    <nav className="bottom-nav">
      {items.map(item => (
        <button
          key={item.path}
          className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
          onClick={() => navigate(item.path)}
        >
          <span>{item.icon}</span>
          {item.label}
        </button>
      ))}
    </nav>
  )
     }
