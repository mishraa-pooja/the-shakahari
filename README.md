# The Shaka-Hari — Veg Dum Biryani Co.

Premium single-page ordering site with two clean paths:

1. **Website Order** — Cart → Checkout → Supabase (structured, standalone)
2. **WhatsApp Contact** — Floating button → wa.me direct chat (manual, no DB writes)

## Tech stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn-style UI, Framer Motion
- **State:** Zustand (cart, persisted to localStorage)
- **Forms:** React Hook Form + Zod
- **Toasts:** Sonner
- **Backend:** Next.js Route Handlers (`/api/orders`)
- **Database:** Supabase (Postgres)
- **Maps:** Google Maps API (location picker in checkout)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Logo

Place your logo at:

```text
public/images/LogoSH.png
```

### 3. Environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

| Variable | Where to get it |
|----------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon public key |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Your business number with country code (e.g. `919876543210`) |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | Google Cloud Console → APIs & Services → Credentials |

### 4. Supabase: create `orders` table

In the Supabase **SQL Editor**, run:

```sql
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

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous insert orders"
  ON public.orders FOR INSERT TO anon WITH CHECK (true);
```

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 6. Deploy to Vercel

1. Push to GitHub
2. Import in Vercel, set Framework to Next.js
3. Add the same env vars under Environment Variables
4. Deploy

## Order flows

### Path 1: Website Order (primary)
Customer adds items → opens cart → fills checkout form → clicks **"Place Order"** → order saved to Supabase → clean confirmation with Order ID + COD badge.

### Path 2: WhatsApp Contact (secondary)
Customer taps floating WhatsApp button (bottom-right) → opens `wa.me` with prefilled message → chats directly with business. Nothing saved to Supabase.

## Project structure

```text
app/
  layout.tsx            # Root layout, fonts, metadata, Toaster
  page.tsx              # Landing: Hero + Menu + Footer + CartDrawer + FloatingWhatsApp
  globals.css           # Theme vars, hero video styles, vignette overlay
  api/orders/route.ts   # POST: validate → save to Supabase → return orderId
components/
  Navbar.tsx            # Sticky nav, logo, Order Now CTA, cart count
  HeroVideoSection.tsx  # Video hero, overlay, brand wordmark, scroll CTA
  BrandLockup.tsx       # Logo + wordmark horizontal lockup
  MenuSection.tsx       # Menu grid
  MenuCard.tsx          # Product card, add-to-cart, quantity controls
  CartDrawer.tsx        # Slide-in cart, line items, subtotal, checkout CTA
  CheckoutModal.tsx     # Checkout form → Supabase order → confirmation
  LocationPicker.tsx    # Google Maps pin delivery location
  FloatingWhatsApp.tsx  # Floating wa.me button (manual contact only)
  Footer.tsx            # Dark green footer, logo, tagline
  ui/                   # Button, Input, Label, Textarea, Select, Dialog, Sheet
store/
  cartStore.ts          # Zustand cart with persist (localStorage)
lib/
  supabase.ts           # getSupabase()
  validations.ts        # Zod schemas for checkout + order payload
  orderId.ts            # SH-YYYYMMDD-XXXX generator
  utils.ts              # cn()
data/
  menuData.ts           # Hardcoded menu items (Phase 1)
types/
  index.ts              # MenuItem, CartItem, OrderPayload, OrderRecord
  supabase.ts           # Database types
public/
  images/               # Logo, menu images
  videos/               # Hero background video
```

## Placeholders (not implemented)

- **Phase 2:** Online payments (Razorpay / UPI)
- **Phase 3:** Admin orders dashboard
- **Phase 4:** Dynamic menu from Supabase
- **Phase 5:** Order status tracking page
