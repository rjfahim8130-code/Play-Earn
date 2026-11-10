import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase, ADMIN_TG_ID, DEFAULT_SETTINGS } from './supabase.js'

const UserContext = createContext(null)

function generateRefCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length))
  return code
}

export function UserProvider({ children }) {
  const [user, setUser] = useState(null)
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const init = async () => {
      try {
        const { data: settingsData } = await supabase.from('settings').select('*').single()
        if (settingsData) setSettings({ ...DEFAULT_SETTINGS, ...settingsData })

        const tg = window.Telegram?.WebApp
        if (tg) {
          tg.ready()
          tg.expand()
        }

        const tgId = tg?.initDataUnsafe?.user?.id || 0
        const username = tg?.initDataUnsafe?.user?.username || 'Player'
        const startParam = tg?.initDataUnsafe?.start_param || null

        if (tgId === ADMIN_TG_ID) setIsAdmin(true)

        if (!tgId) {
          setUser({ 
            id: 'local', 
            tg_id: 0, 
            username: 'DevPlayer', 
            coins: 500, 
            points: 0, 
            sessions_today: 0, 
            referral_code: 'DEV123', 
            is_banned: false, 
            free_spin_used: 0, 
            free_mahjong_used: 0,
            reward_sessions: 0,
            popup_sessions: 0
          })
          setLoading(false)
          return
        }

        let { data: existing } = await supabase.from('users').select('*').eq('tg_id', tgId).single()

        if (!existing) {
          let refCode = generateRefCode()
          const { data: newUser } = await supabase.from('users').insert({
            tg_id: tgId, 
            username, 
            coins: settings.starting_coins || 100, 
            sessions_today: 0, 
            free_spin_used: 0,
            free_mahjong_used: 0,
            reward_sessions: 0,
            popup_sessions: 0,
            referral_code: refCode, 
            referred_by: startParam
          }).select().single()

          if (newUser) {
            setUser(newUser)
            if (startParam) {
              const { data: referrer } = await supabase.from('users').select('id').eq('referral_code', startParam).single()
              if (referrer) {
                await supabase.from('referrals').insert({ referrer_id: referrer.id, referred_id: newUser.id, status: 'pending' })
              }
            }
          } else {
            // ইনসার্ট ফেল করলে ফলব্যাক ইউজার
            setUser({
              id: 'local',
              tg_id: tgId,
              username,
              coins: 100,
              points: 0,
              sessions_today: 0,
              referral_code: generateRefCode(),
              is_banned: false,
              free_spin_used: 0,
              free_mahjong_used: 0,
              reward_sessions: 0,
              popup_sessions: 0
            })
          }
        } else {
          const last = existing.last_session_at ? new Date(existing.last_session_at) : null
          if (last && last.toDateString() !== new Date().toDateString()) {
            const { data: updated } = await supabase.from('users').update({ 
              sessions_today: 0, 
              free_spin_used: 0, 
              free_mahjong_used: 0,
              reward_sessions: 0,
              popup_sessions: 0,
              daily_bonus_claimed: false 
            }).eq('id', existing.id).select().single()
            setUser(updated || existing)
          } else {
            setUser(existing)
          }
        }
      } catch (err) {
        console.error(err)
        // ফলব্যাক — যাতে স্ক্রিন ফাঁকা না হয়ে যায়
        setUser({
          id: 'local',
          tg_id: 0,
          username: 'Player',
          coins: 100,
          points: 0,
          sessions_today: 0,
          referral_code: 'LOCAL001',
          is_banned: false,
          free_spin_used: 0,
          free_mahjong_used: 0,
          reward_sessions: 0,
          popup_sessions: 0
        })
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  const updateUser = useCallback(async (updates) => {
    if (!user) return
    const newUser = { ...user, ...updates }
    setUser(newUser)
    if (user.id !== 'local') {
      await supabase.from('users').update(updates).eq('id', user.id)
    }
  }, [user])

  const addPoints = useCallback(async (amount) => {
    if (!user) return
    await updateUser({ points: (user.points || 0) + amount })
    if (user.id !== 'local') {
      await supabase.from('game_history').insert({ user_id: user.id, game_type: 'game_win', won_points: amount })
    }
  }, [user, updateUser])

  const refreshSettings = useCallback(async () => {
    const { data } = await supabase.from('settings').select('*').single()
    if (data) setSettings({ ...DEFAULT_SETTINGS, ...data })
  }, [])

  return (
    <UserContext.Provider value={{ user, settings, loading, isAdmin, updateUser, addPoints, setUser, refreshSettings }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  return useContext(UserContext)
}
