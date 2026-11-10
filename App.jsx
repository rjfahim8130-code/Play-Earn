import React from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { UserProvider, useUser } from './UserContext.jsx'
import BottomNav from './BottomNav.jsx'
import HomeScreen from './HomeScreen.jsx'
import EarnScreen from './EarnScreen.jsx'
import SpinScreen from './SpinScreen.jsx'
import MahjongScreen from './MahjongScreen.jsx'
import TasksScreen from './TasksScreen.jsx'
import ProfileScreen from './ProfileScreen.jsx'
import AdminPanel from './AdminPanel.jsx'

function AppContent() {
  const { loading, isAdmin } = useUser()
  if (loading) return <div className="loading">লোড হচ্ছে...</div>

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/earn" element={<EarnScreen />} />
        <Route path="/spin" element={<SpinScreen />} />
        <Route path="/mahjong" element={<MahjongScreen />} />
        <Route path="/tasks" element={<TasksScreen />} />
        <Route path="/profile" element={<ProfileScreen />} />
        <Route path="/admin" element={isAdmin ? <AdminPanel /> : <Navigate to="/" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BottomNav />
    </div>
  )
}

export default function App() {
  return (
    <HashRouter>
      <UserProvider>
        <AppContent />
      </UserProvider>
    </HashRouter>
  )
}
