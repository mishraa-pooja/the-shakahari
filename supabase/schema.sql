-- Run this in Supabase Dashboard → SQL Editor → New query
-- Creates the orders table and policies for Shaka-Hari
-- Safe to re-run: policies are dropped before recreate if they already exist.

-- ─────────────────────────────────────────────────────────────────────────────
-- Custom types
-- ─────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.order_status AS ENUM (
    'pending',
    'confirmed',
    'preparing',
    'out_for_delivery',
    'delivered',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 1. Orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  landmark TEXT,
  pincode TEXT NOT NULL,
  slot TEXT NOT NULL,
  notes TEXT,
  items JSONB NOT NULL,
  total NUMERIC NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'COD',
  status TEXT NOT NULL DEFAULT 'pending',
  is_first_order BOOLEAN NOT NULL DEFAULT false,
  source TEXT NOT NULL DEFAULT 'website',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Migration helpers for existing tables
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_first_order BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'website';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_order_id ON public.orders (order_id);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON public.orders (phone);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (status);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 4. Policy: allow anonymous inserts (Next.js API uses anon key to create orders)
DROP POLICY IF EXISTS "Allow anonymous insert orders" ON public.orders;
CREATE POLICY "Allow anonymous insert orders"
  ON public.orders
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- 5. Allow service_role full access (used by admin API routes)
DROP POLICY IF EXISTS "Service role full access orders" ON public.orders;
CREATE POLICY "Service role full access orders"
  ON public.orders
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 6. Allow anon SELECT for order tracking / admin (protected by API key in headers)
DROP POLICY IF EXISTS "Allow anon select orders" ON public.orders;
CREATE POLICY "Allow anon select orders"
  ON public.orders
  FOR SELECT
  TO anon
  USING (true);

-- 7. Allow anon UPDATE for status changes via admin API
DROP POLICY IF EXISTS "Allow anon update orders" ON public.orders;
CREATE POLICY "Allow anon update orders"
  ON public.orders
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.orders IS 'Customer orders from Shaka-Hari checkout';

-- ─────────────────────────────────────────────────────────────────────────────
-- WhatsApp inbound messages (Cloud API webhook)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL,
  message TEXT NOT NULL,
  message_id TEXT NOT NULL UNIQUE,
  timestamp TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created_at
  ON public.whatsapp_messages (created_at DESC);

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow insert whatsapp_messages anon" ON public.whatsapp_messages;
CREATE POLICY "Allow insert whatsapp_messages anon"
  ON public.whatsapp_messages
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow service_role full access
DROP POLICY IF EXISTS "Service role full access whatsapp_messages" ON public.whatsapp_messages;
CREATE POLICY "Service role full access whatsapp_messages"
  ON public.whatsapp_messages FOR ALL TO service_role
  USING (true) WITH CHECK (true);

COMMENT ON TABLE public.whatsapp_messages IS 'Inbound WhatsApp Cloud API text messages';

-- ─────────────────────────────────────────────────────────────────────────────
-- WhatsApp / phone verification (no auth.users — separate from public.profiles)
-- Rows are upserted from /api/auth/whatsapp-otp/verify using SUPABASE_SERVICE_ROLE_KEY.
-- Use: CRM, “returning customer”, ops. First vs repeat verification = first_verified_at vs count.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.phone_verified_profiles (
  phone TEXT NOT NULL PRIMARY KEY CHECK (phone ~ '^[6-9][0-9]{9}$'),
  whatsapp_verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  first_verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verification_count INTEGER NOT NULL DEFAULT 1 CHECK (verification_count >= 1),
  full_name TEXT,
  saved_addresses JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Migration for existing tables
ALTER TABLE public.phone_verified_profiles
  ADD COLUMN IF NOT EXISTS saved_addresses JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_phone_verified_profiles_last_verified
  ON public.phone_verified_profiles (last_verified_at DESC);

ALTER TABLE public.phone_verified_profiles ENABLE ROW LEVEL SECURITY;

-- No anon/authenticated policies: server writes only via service_role (bypasses RLS).

-- Service role full access for server-side writes
DROP POLICY IF EXISTS "Service role full access phone_verified_profiles" ON public.phone_verified_profiles;
CREATE POLICY "Service role full access phone_verified_profiles"
  ON public.phone_verified_profiles FOR ALL TO service_role
  USING (true) WITH CHECK (true);

COMMENT ON TABLE public.phone_verified_profiles IS
  'Phone numbers that completed WhatsApp OTP; not linked to auth.users';

-- ─────────────────────────────────────────────────────────────────────────────
-- WhatsApp ordering sessions (conversation state for chatbot flow)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.whatsapp_order_sessions (
  phone TEXT NOT NULL PRIMARY KEY,
  state TEXT NOT NULL DEFAULT 'idle',
  cart JSONB NOT NULL DEFAULT '[]'::jsonb,
  pending_item_id TEXT,
  address TEXT,
  customer_name TEXT,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_order_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access whatsapp_order_sessions" ON public.whatsapp_order_sessions;
CREATE POLICY "Service role full access whatsapp_order_sessions"
  ON public.whatsapp_order_sessions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

COMMENT ON TABLE public.whatsapp_order_sessions IS
  'Conversation state for WhatsApp ordering flow; server writes via service_role';

-- ─────────────────────────────────────────────────────────────────────────────
-- Per-phone order stats for analytics (updated by POST /api/orders with service_role)
-- dish_totals: { "menu-item-id": { "name": "Display name", "units": 12 } }
-- top_dishes: sorted snapshot [{ id, name, units }, ...] max 15
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.customer_order_analytics (
  phone TEXT NOT NULL PRIMARY KEY CHECK (phone ~ '^[6-9][0-9]{9}$'),
  total_orders INTEGER NOT NULL DEFAULT 0 CHECK (total_orders >= 0),
  dish_totals JSONB NOT NULL DEFAULT '{}'::jsonb,
  top_dishes JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_customer_name TEXT,
  first_order_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_order_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_order_analytics_last_order
  ON public.customer_order_analytics (last_order_at DESC);

CREATE INDEX IF NOT EXISTS idx_customer_order_analytics_total_orders
  ON public.customer_order_analytics (total_orders DESC);

ALTER TABLE public.customer_order_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access customer_order_analytics" ON public.customer_order_analytics;
CREATE POLICY "Service role full access customer_order_analytics"
  ON public.customer_order_analytics FOR ALL TO service_role
  USING (true) WITH CHECK (true);

COMMENT ON TABLE public.customer_order_analytics IS
  'Aggregated order counts and dish frequency per phone; server writes via service_role';

-- ─────────────────────────────────────────────────────────────────────────────
-- Store config (key-value for stock count, settings, etc.)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.store_config (
  key TEXT NOT NULL PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.store_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon select store_config" ON public.store_config;
CREATE POLICY "Allow anon select store_config"
  ON public.store_config FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "Service role full access store_config" ON public.store_config;
CREATE POLICY "Service role full access store_config"
  ON public.store_config FOR ALL TO service_role
  USING (true) WITH CHECK (true);

INSERT INTO public.store_config (key, value)
VALUES
  ('stock:paneer-biryani', '5'),
  ('stock:veg-dum-biryani', '5'),
  ('stock:soya-chaap-biryani', '5'),
  ('stock:mushroom-biryani', '5')
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE public.store_config IS 'Key-value config: biryani_stock, etc.';

-- ─────────────────────────────────────────────────────────────────────────────
-- Stock waitlist — notify these phones when stock is back
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.stock_waitlist (
  phone TEXT NOT NULL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stock_waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon insert stock_waitlist" ON public.stock_waitlist;
CREATE POLICY "Allow anon insert stock_waitlist"
  ON public.stock_waitlist FOR INSERT TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access stock_waitlist" ON public.stock_waitlist;
CREATE POLICY "Service role full access stock_waitlist"
  ON public.stock_waitlist FOR ALL TO service_role
  USING (true) WITH CHECK (true);

COMMENT ON TABLE public.stock_waitlist IS 'Phones to notify when biryani stock is replenished';

-- ─────────────────────────────────────────────────────────────────────────────
-- Admin chat messages (two-way WhatsApp conversation log)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message TEXT NOT NULL,
  admin_name TEXT DEFAULT 'Admin',
  wa_message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_chat_messages_phone_created
  ON public.admin_chat_messages (phone, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_chat_messages_created
  ON public.admin_chat_messages (created_at DESC);

ALTER TABLE public.admin_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access admin_chat_messages" ON public.admin_chat_messages;
CREATE POLICY "Service role full access admin_chat_messages"
  ON public.admin_chat_messages FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon insert admin_chat_messages" ON public.admin_chat_messages;
CREATE POLICY "Allow anon insert admin_chat_messages"
  ON public.admin_chat_messages FOR INSERT TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon select admin_chat_messages" ON public.admin_chat_messages;
CREATE POLICY "Allow anon select admin_chat_messages"
  ON public.admin_chat_messages FOR SELECT TO anon
  USING (true);

COMMENT ON TABLE public.admin_chat_messages IS 'Two-way WhatsApp chat log for admin direct messaging';

-- ─────────────────────────────────────────────────────────────────────────────
-- User profiles (Supabase Auth)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  address TEXT,
  landmark TEXT,
  pincode TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles select own" ON public.profiles;
CREATE POLICY "Profiles select own"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Profiles insert own" ON public.profiles;
CREATE POLICY "Profiles insert own"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Profiles update own" ON public.profiles;
CREATE POLICY "Profiles update own"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id);

COMMENT ON TABLE public.profiles IS 'Delivery details linked to auth.users';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'full_name'), '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();
