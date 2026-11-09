import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = 'https://zfknptpwzmvogskfwdph.supabase.co'
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpma25wdHB3em12b2dza2Z3ZHBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM3NTI3NDEsImV4cCI6MjEwOTMyODc0MX0.sNtcuOaBuSHgTrAZPlegJ05MxEvASdkUz3ExwKP4aAg'
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export const ADMIN_TG_ID = 8251893998
export const BOT_USERNAME = 'PlayAndEarnGame_bot'

export const DEFAULT_SETTINGS = {
  reward_ad_coins: 50,
  popup_ad_coins: 20,
  ad_cooldown_minutes: 5,
  session_cooldown_minutes: 45,
  max_sessions_per_day: 5,
  spin_entry_fee: 10,
  mahjong_entry_fee: 50,
  mahjong_win_points: 300,
  daily_task_sessions: 3,
  daily_task_reward: 200,
  referral_bonus_coins: 500,
  referral_commission_percent: 10,
  silver_card_points: 50000,
  gold_card_points: 100000,
  starting_coins: 100,
  // Redeem conditions
  redeem_min_points: 50000,
  redeem_min_sessions: 10,
  redeem_min_active_refs: 3,
  // Free daily
  free_spin_per_day: 1,
  free_game_per_day: 1,
  free_spin_reward_coins: 5,
  free_game_reward_coins: 10
}
