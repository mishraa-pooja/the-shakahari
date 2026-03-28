-- Run this in Supabase Dashboard → SQL Editor → New query
-- Creates the orders table and policies for Shaka-Hari
-- Safe to re-run: policies are dropped before recreate if they already exist.

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
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Index for listing orders by date (for future admin)
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_order_id ON public.orders (order_id);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 4. Policy: allow anonymous inserts (your Next.js API uses anon key to create orders)
DROP POLICY IF EXISTS "Allow anonymous insert orders" ON public.orders;
CREATE POLICY "Allow anonymous insert orders"
  ON public.orders
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- 5. Policy: allow anonymous to read their own orders by order_id (optional, for order status page later)
-- Uncomment if you add a "Track order" feature:
-- CREATE POLICY "Allow read by order_id"
--   ON public.orders
--   FOR SELECT
--   TO anon
--   USING (true);

-- 6. For admin dashboard later: use a separate role or service key to SELECT/UPDATE all orders.
-- For now, you can use the service_role key in a backend-only route to list/update orders.

COMMENT ON TABLE public.orders IS 'Customer orders from Shaka-Hari checkout';

-- If you already created the table and need to add location columns:
-- ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
-- ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

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

-- Server can insert via anon (orders pattern) OR use SUPABASE_SERVICE_ROLE_KEY (recommended).
DROP POLICY IF EXISTS "Allow insert whatsapp_messages anon" ON public.whatsapp_messages;
CREATE POLICY "Allow insert whatsapp_messages anon"
  ON public.whatsapp_messages
  FOR INSERT
  TO anon
  WITH CHECK (true);

COMMENT ON TABLE public.whatsapp_messages IS 'Inbound WhatsApp Cloud API text messages';
