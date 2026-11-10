-- Play & Earn Full Schema — Supabase SQL Editor এ রান করো

CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tg_id BIGINT UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  photo_url TEXT,
  coins INTEGER DEFAULT 100,
  points INTEGER DEFAULT 0,
  sessions_today INTEGER DEFAULT 0,
  free_spin_used INTEGER DEFAULT 0,
  free_mahjong_used INTEGER DEFAULT 0,
  free_game_used INTEGER DEFAULT 0,
  reward_sessions INTEGER DEFAULT 0,
  popup_sessions INTEGER DEFAULT 0,
  reward_phase INTEGER DEFAULT 0,
  popup_phase INTEGER DEFAULT 0,
  reward_cd_until TIMESTAMPTZ,
  popup_cd_until TIMESTAMPTZ,
  daily_bonus_claimed BOOLEAN DEFAULT FALSE,
  referral_code TEXT UNIQUE,
  referred_by TEXT,
  is_banned BOOLEAN DEFAULT FALSE,
  last_session_at TIMESTAMPTZ,
  last_reward_ad_at TIMESTAMPTZ,
  last_popup_ad_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- পুরনো টেবিলে কলাম যোগ
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS free_mahjong_used INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reward_sessions INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS popup_sessions INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reward_phase INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS popup_phase INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reward_cd_until TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS popup_cd_until TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_bonus_claimed BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_reward_ad_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_popup_ad_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reward_ad_coins INTEGER DEFAULT 50,
  popup_ad_coins INTEGER DEFAULT 20,
  ad_cooldown_minutes INTEGER DEFAULT 5,
  session_cooldown_minutes INTEGER DEFAULT 45,
  max_sessions_per_day INTEGER DEFAULT 5,
  spin_entry_fee INTEGER DEFAULT 10,
  mahjong_entry_fee INTEGER DEFAULT 50,
  mahjong_win_points INTEGER DEFAULT 300,
  daily_task_sessions INTEGER DEFAULT 3,
  daily_task_reward INTEGER DEFAULT 200,
  referral_bonus_coins INTEGER DEFAULT 500,
  referral_commission_percent INTEGER DEFAULT 10,
  silver_card_points INTEGER DEFAULT 50000,
  gold_card_points INTEGER DEFAULT 100000,
  starting_coins INTEGER DEFAULT 100,
  redeem_min_points INTEGER DEFAULT 50000,
  redeem_min_sessions INTEGER DEFAULT 10,
  redeem_min_active_refs INTEGER DEFAULT 3,
  free_spin_per_day INTEGER DEFAULT 2,
  free_game_per_day INTEGER DEFAULT 2,
  free_mahjong_per_day INTEGER DEFAULT 2,
  free_spin_reward_coins INTEGER DEFAULT 5,
  free_game_reward_coins INTEGER DEFAULT 10,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO settings DEFAULT VALUES
ON CONFLICT DO NOTHING;

-- যদি settings খালি থাকে
INSERT INTO settings (
  reward_ad_coins, popup_ad_coins, ad_cooldown_minutes, session_cooldown_minutes,
  max_sessions_per_day, spin_entry_fee, mahjong_entry_fee, mahjong_win_points,
  daily_task_sessions, daily_task_reward, referral_bonus_coins, referral_commission_percent,
  silver_card_points, gold_card_points, starting_coins, redeem_min_points,
  redeem_min_sessions, redeem_min_active_refs, free_spin_per_day, free_game_per_day
)
SELECT 50,20,5,45,5,10,50,300,3,200,500,10,50000,100000,100,50000,10,3,2,2
WHERE NOT EXISTS (SELECT 1 FROM settings LIMIT 1);

CREATE TABLE IF NOT EXISTS ads_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ad_type TEXT,
  coins_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS game_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  game_type TEXT,
  won_points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  referred_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  reward_given BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(referrer_id, referred_id)
);

CREATE TABLE IF NOT EXISTS cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  card_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS redeem_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  points_spent INTEGER,
  bkash_name TEXT,
  bkash_number TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_tg_id ON users(tg_id);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE redeem_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "p1" ON users;
DROP POLICY IF EXISTS "p2" ON settings;
DROP POLICY IF EXISTS "p3" ON ads_log;
DROP POLICY IF EXISTS "p4" ON game_history;
DROP POLICY IF EXISTS "p5" ON referrals;
DROP POLICY IF EXISTS "p6" ON cards;
DROP POLICY IF EXISTS "p7" ON redeem_requests;

CREATE POLICY "p1" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "p2" ON settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "p3" ON ads_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "p4" ON game_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "p5" ON referrals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "p6" ON cards FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "p7" ON redeem_requests FOR ALL USING (true) WITH CHECK (true);
