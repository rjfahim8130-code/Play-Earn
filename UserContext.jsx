import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase, ADMIN_TG_ID, DEFAULT_SETTINGS } from './supabase.js'

const UserContext = createContext(null)

function generateRefCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length))
  return code
}

function fallbackUser(tgId = 0, username = 'Player') {
  return {
    id: 'local',
    tg_id: tgId,
    username,
    first_name: username,
    last_name: '',
    photo_url: null,
    coins: 100,
    points: 0,
    sessions_today: 0,
    referral_code: 'LOCAL001',
    is_banned: false,
    free_spin_used: 0,
    free_mahjong_used: 0,
    reward_phase: 0,
    popup_phase: 0,
    reward_cd_until: null,
    popup_cd_until: null,
    reward_cycle_done: false,
    popup_cycle_done: false,
    daily_bonus_claimed: false
  }
}

export function UserProvider({ children }) {
  const [user, setUser] = useState(null)
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  // Settings: initial + every 12s so admin changes apply live
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data } = await supabase.from('settings').select('*').single()
        if (data) setSettings({ ...DEFAULT_SETTINGS, ...data })
      } catch (_) {}
    }
    loadSettings()
    const t = setInterval(loadSettings, 12000)
    return () => clearInterval(t)
  }, [])

  // User init
  useEffect(() => {
    const init = async () => {
      try {
        const tg = window.Telegram?.WebApp
        if (tg) {
          try { tg.ready(); tg.expand() } catch (_) {}
        }

        const tgUser = tg?.initDataUnsafe?.user
        const tgId = tgUser?.id || 0
        const username = tgUser?.username || tgUser?.first_name || 'Player'
        const firstName = tgUser?.first_name || username
        const lastName = tgUser?.last_name || ''
        const photoUrl = tgUser?.photo_url || null
        const startParam = tg?.initDataUnsafe?.start_param || null

        if (tgId && tgId === ADMIN_TG_ID) setIsAdmin(true)

        if (!tgId) {
          setUser(fallbackUser(0, 'DevPlayer'))
          setLoading(false)
          return
        }

        let { data: existing } = await supabase
          .from('users')
          .select('*')
          .eq('tg_id', tgId)
          .maybeSingle()

        if (!existing) {
          const refCode = generateRefCode()
          const startCoins = settings.starting_coins || 100
          const { data: newUser, error } = await supabase.from('users').insert({
            tg_id: tgId,
            username,
            first_name: firstName,
            last_name: lastName,
            photo_url: photoUrl,
            coins: startCoins,
            sessions_today: 0,
            free_spin_used: 0,
            free_mahjong_used: 0,
            reward_phase: 0,
            popup_phase: 0,
            reward_cycle_done: false,
            popup_cycle_done: false,
            daily_bonus_claimed: false,
            referral_code: refCode,
            referred_by: startParam
          }).select().single()

          if (newUser && !error) {
            setUser(newUser)
            if (startParam) {
              const { data: referrer } = await supabase
                .from('users')
                .select('id')
                .eq('referral_code', startParam)
                .maybeSingle()
              if (referrer) {
                await supabase.from('referrals').insert({
                  referrer_id: referrer.id,
                  referred_id: newUser.id,
                  status: 'pending'
                })
              }
            }
          } else {
            setUser({
              ...fallbackUser(tgId, username),
              first_name: firstName,
              last_name: lastName,
              photo_url: photoUrl
            })
          }
        } else {
          // Update profile fields from Telegram if changed
          const profileUpdates = {}
          if (firstName && existing.first_name !== firstName) profileUpdates.first_name = firstName
          if (lastName && existing.last_name !== lastName) profileUpdates.last_name = lastName
          if (photoUrl && existing.photo_url !== photoUrl) profileUpdates.photo_url = photoUrl
          if (username && existing.username !== username) profileUpdates.username = username

          // Daily reset
          const last = existing.last_session_at ? new Date(existing.last_session_at) : null
          const isNewDay = !last || last.toDateString() !== new Date().toDateString()
          if (isNewDay) {
            Object.assign(profileUpdates, {
              sessions_today: 0,
              free_spin_used: 0,
              free_mahjong_used: 0,
              reward_phase: 0,
              popup_phase: 0,
              reward_cycle_done: false,
              popup_cycle_done: false,
              daily_bonus_claimed: false
            })
          }

          if (Object.keys(profileUpdates).length > 0) {
            const { data: updated } = await supabase
              .from('users')
              .update(profileUpdates)
              .eq('id', existing.id)
              .select()
              .single()
            setUser(updated || { ...existing, ...profileUpdates })
          } else {
            setUser(existing)
          }
        }
      } catch (err) {
        console.error('UserContext init error:', err)
        setUser(fallbackUser())
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
    if (user.id && user.id !== 'local') {
      try {
        await supabase.from('users').update(updates).eq('id', user.id)
      } catch (e) {
        console.error('updateUser error', e)
      }
    }
  }, [user])

  const addPoints = useCallback(async (amount) => {
    if (!user || !amount) return
    const pts = Number(amount) || 0
    await updateUser({ points: (user.points || 0) + pts })

    if (user.id && user.id !== 'local') {
      try {
        await supabase.from('game_history').insert({
          user_id: user.id,
          game_type: 'game_win',
          won_points: pts
        })

        // Referral commission
        const { data: refRow } = await supabase
          .from('referrals')
          .select('referrer_id')
          .eq('referred_id', user.id)
          .maybeSingle()

        if (refRow?.referrer_id) {
          const percent = settings.referral_commission_percent || 10
          const commission = Math.floor(pts * (percent / 100))
          if (commission > 0) {
            const { data: referrer } = await supabase
              .from('users')
              .select('points')
              .eq('id', refRow.referrer_id)
              .single()
            if (referrer) {
              await supabase
                .from('users')
                .update({ points: (referrer.points || 0) + commission })
                .eq('id', refRow.referrer_id)
            }
          }
        }
      } catch (e) {
        console.error('addPoints side-effects', e)
      }
    }
  }, [user, updateUser, settings.referral_commission_percent])

  const refreshSettings = useCallback(async () => {
    const { data } = await supabase.from('settings').select('*').single()
    if (data) setSettings({ ...DEFAULT_SETTINGS, ...data })
  }, [])

  return (
    <UserContext.Provider value={{
      user, settings, loading, isAdmin,
      updateUser, addPoints, setUser, refreshSettings
    }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  return useContext(UserContext)
          }
