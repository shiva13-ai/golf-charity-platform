-- ============================================================
-- Golf Charity Subscription Platform — Supabase Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── CHARITIES ───────────────────────────────────────────────
CREATE TABLE charities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  website_url TEXT,
  featured BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── USER PROFILES ───────────────────────────────────────────
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── SUBSCRIPTIONS ───────────────────────────────────────────
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('monthly', 'yearly')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'lapsed', 'pending')),
  amount NUMERIC(10,2) NOT NULL,
  charity_id UUID REFERENCES charities(id),
  charity_percentage NUMERIC(5,2) DEFAULT 10.00,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── GOLF SCORES ─────────────────────────────────────────────
CREATE TABLE golf_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 45),
  score_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Only keep latest 5 scores per user (trigger)
CREATE OR REPLACE FUNCTION enforce_max_scores()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM golf_scores
  WHERE user_id = NEW.user_id
    AND id NOT IN (
      SELECT id FROM golf_scores
      WHERE user_id = NEW.user_id
      ORDER BY score_date DESC, created_at DESC
      LIMIT 5
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_max_scores
AFTER INSERT ON golf_scores
FOR EACH ROW EXECUTE FUNCTION enforce_max_scores();

-- ─── DRAWS ───────────────────────────────────────────────────
CREATE TABLE draws (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  draw_month TEXT NOT NULL, -- e.g. "2026-04"
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'simulated', 'published')),
  draw_type TEXT DEFAULT 'random' CHECK (draw_type IN ('random', 'algorithmic')),
  winning_numbers INTEGER[] DEFAULT '{}',
  jackpot_amount NUMERIC(10,2) DEFAULT 0,
  pool_4match NUMERIC(10,2) DEFAULT 0,
  pool_3match NUMERIC(10,2) DEFAULT 0,
  jackpot_rolled_over BOOLEAN DEFAULT false,
  previous_draw_id UUID REFERENCES draws(id),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── DRAW ENTRIES ────────────────────────────────────────────
CREATE TABLE draw_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  draw_id UUID REFERENCES draws(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  scores_snapshot INTEGER[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(draw_id, user_id)
);

-- ─── DRAW WINNERS ────────────────────────────────────────────
CREATE TABLE draw_winners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  draw_id UUID REFERENCES draws(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  match_type TEXT NOT NULL CHECK (match_type IN ('5-match', '4-match', '3-match')),
  matched_numbers INTEGER[],
  prize_amount NUMERIC(10,2) DEFAULT 0,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'verified', 'paid', 'rejected')),
  proof_url TEXT,
  submitted_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PRIZE POOL TRACKER ──────────────────────────────────────
CREATE TABLE prize_pool_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  draw_id UUID REFERENCES draws(id),
  user_id UUID REFERENCES profiles(id),
  contribution NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE golf_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE draws ENABLE ROW LEVEL SECURITY;
ALTER TABLE draw_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE draw_winners ENABLE ROW LEVEL SECURITY;
ALTER TABLE charities ENABLE ROW LEVEL SECURITY;

-- Profiles: users see own, admins see all
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update all profiles" ON profiles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Subscriptions
CREATE POLICY "Users view own subscription" ON subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage own subscription" ON subscriptions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins manage all subscriptions" ON subscriptions FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Golf scores
CREATE POLICY "Users manage own scores" ON golf_scores FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins manage all scores" ON golf_scores FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Draws: anyone authenticated can view published
CREATE POLICY "Anyone can view published draws" ON draws FOR SELECT USING (status = 'published' OR 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins manage draws" ON draws FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Draw entries
CREATE POLICY "Users manage own entries" ON draw_entries FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins manage all entries" ON draw_entries FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Draw winners
CREATE POLICY "Users view own winnings" ON draw_winners FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users submit proof" ON draw_winners FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins manage winners" ON draw_winners FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Charities: public read
CREATE POLICY "Public can view charities" ON charities FOR SELECT USING (active = true);
CREATE POLICY "Admins manage charities" ON charities FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ─── AUTO-CREATE PROFILE ON SIGNUP ───────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── SEED DATA: CHARITIES ─────────────────────────────────────
INSERT INTO charities (name, description, image_url, featured, active) VALUES
('Golf Foundation', 'Opening golf to young people from all backgrounds. We fund coaching, equipment, and access to courses for children who would otherwise never swing a club.', 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=600', true, true),
('Cancer Research UK', 'Funding pioneering research to beat cancer sooner. Every subscription contributes directly to life-saving clinical trials and patient support.', 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600', true, true),
('RNLI Lifeboats', 'Saving lives at sea since 1824. Our volunteer crew operate 24/7 to rescue those in danger on the water around the UK and Ireland.', 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=600', false, true),
('Macmillan Cancer Support', 'Providing medical, emotional, practical and financial support to people living with cancer and those around them.', 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=600', false, true),
('Age UK', 'Improving later life for everyone through our information and advice, services, campaigns, products and research.', 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=600', false, true),
('British Heart Foundation', 'Fighting cardiovascular disease, funding pioneering research and providing life saving information and support.', 'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=600', false, true);

-- ─── SEED DATA: INITIAL DRAW ──────────────────────────────────
INSERT INTO draws (draw_month, status, jackpot_amount, pool_4match, pool_3match) VALUES
('2026-04', 'pending', 0, 0, 0);

-- ─── ADMIN USER (set after running schema) ───────────────────
-- After running this schema, sign up at /auth/signup with admin@golfcharity.com
-- Then run this in SQL editor to promote to admin:
-- UPDATE profiles SET role = 'admin' WHERE email = 'admin@golfcharity.com';

-- ─── FIXES (run these if you already ran the schema above) ───────────────────

-- Fix 1: Make charities readable without auth (public landing page needs this)
DROP POLICY IF EXISTS "Public can view charities" ON charities;
CREATE POLICY "Public can view charities" ON charities
  FOR SELECT USING (active = true);

-- Allow anon role to read charities
GRANT SELECT ON charities TO anon;
GRANT SELECT ON charities TO authenticated;

-- Fix 2: Robust trigger that never blocks user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(COALESCE(NEW.email, ''), '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW; -- Never fail user creation even if profile insert errors
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Fix 3: Add stripe fields to subscriptions if not present
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
