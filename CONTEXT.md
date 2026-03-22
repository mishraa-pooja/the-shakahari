# The Shaka-Hari — Full Project Context

> **Purpose:** This document extracts all important technical and business information from the conversation about building "The Shaka-Hari" — a veg dum biryani delivery business and its Next.js web app. Use this as context for any new AI chat or developer onboarding.

---

## 1. Business Context

### Brand
- **Name:** The Shaka-Hari (also written as THE SHAKA-HARI in logo)
- **Descriptor:** Veg Dum Biryani Co.
- **Tagline:** "Pure Veg. Proper Dum." / "Veg, taken seriously."
- **Domain:** theshakahari.com (bought via GoDaddy, 3 years)

### Product
- **What it sells:** Premium veg dum biryani (Andhra-inspired style, NOT "Meghana-style" — never mention Meghana publicly)
- **Style:** Masala-forward, layered, dum-sealed, spicy, grain-separated
- **Pure vegetarian kitchen** — no non-veg, ever

### Target Areas
- **Primary:** Kharghar (founder lives here)
- **Expansion:** Belapur, Vashi (Navi Mumbai)
- **Future:** Mumbai, Jaipur, North India

### Menu Items (Current / Planned)
- **Phase 1:** Paneer Dum Biryani, Mushroom Dum Biryani, Soya Chunk Biryani
- **Later:** Dum Aloo, Mutter Paneer Biryani, Mix-Veg
- **Sides:** Raita (included), Salan (optional add-on later)
- **Spice:** Normal, Extra Spicy (add-on heat layer, not separate batch)

### Business Model
- Cloud kitchen / delivery-only
- WhatsApp ordering + website ordering
- COD (Cash on Delivery) primary
- Limited batch cooking (Sunday dum batches)
- Operator-ready from day one (cook follows SOP, founder QA)

### Pricing (Discussed)
| Item | Trial/Intro | Standard Direct | Aggregator (Swiggy/Zomato) |
|------|-------------|-----------------|----------------------------|
| Single (Paneer/Mushroom) | ₹249 | ₹269–279 | ₹329–349 |
| Soya | ₹220–230 | — | — |
| Family Pack (serves 2) | — | ₹449–459 | ₹499–529 |
| Delivery | ₹30 (free above ₹500) | — | — |

- **Food cost:** ~₹90/box (rice + paneer + raita)
- **Portion:** 125g raw rice + 85g paneer/mushroom per person

### Marketing Strategy
- Society-first, not app-first (Kharghar)
- WhatsApp broadcast, society groups, PG outreach
- "Limited 15/40 handis" scarcity messaging
- Fixed "Biryani Days" (Wed, Fri, Sun)
- Bypass Swiggy/Zomato initially; add later with higher MRP
- Jain / pure veg days as lever

### Packaging (Discussed)
- Kraft box lined with banana leaf (₹6–7.5/packet)
- Matte black or kraft brown, gold logo sticker
- No cheap transparent lids

---

## 2. Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| State | Zustand (cart) + `persist` middleware → localStorage |
| Database | Supabase (PostgreSQL) |
| Validation | Zod |
| Forms | React Hook Form + @hookform/resolvers |
| UI Components | Radix UI (Dialog, Sheet, Select, etc.) |
| Animations | Framer Motion |
| Toasts | Sonner |
| Maps | @react-google-maps/api (location picker) |

---

## 3. Project Structure

### Key Files & Purposes

| File | Purpose |
|------|---------|
| `app/layout.tsx` | Root layout: fonts (Cinzel, Cormorant Garamond, Playfair Display, Inter), metadata, Toaster |
| `app/page.tsx` | Single-page landing: Navbar, HeroVideoSection, MenuSection, Footer, CartDrawer |
| `app/api/orders/route.ts` | POST: validate → save Supabase → notify business via WhatsApp Cloud API → return orderId |
| `app/globals.css` | Theme vars, brand texture, hero video styles, vignette overlay |
| `components/Navbar.tsx` | Sticky nav, logo, Order Now CTA, cart count (mounted state for hydration) |
| `components/HeroVideoSection.tsx` | Video hero banner, overlay, brand wordmark, scroll-to-menu CTA |
| `components/BrandLockup.tsx` | Logo + wordmark horizontal lockup |
| `components/MenuSection.tsx` | Menu grid, MenuCard components |
| `components/MenuCard.tsx` | Product card, add-to-cart, quantity controls (mounted state) |
| `components/CartDrawer.tsx` | Slide-in cart (Sheet), quantity, subtotal, Checkout CTA |
| `components/CheckoutModal.tsx` | Form: name, phone, address, landmark, pincode, slot, notes, LocationPicker |
| `components/LocationPicker.tsx` | Google Maps place autocomplete, lat/lng capture |
| `components/Footer.tsx` | Dark green, gold text, logo, tagline, social placeholders |
| `store/cartStore.ts` | Zustand cart with persist (localStorage key: `shaka-hari-cart`) |
| `lib/supabase.ts` | Supabase client (server-side) |
| `lib/whatsapp.ts` | WhatsApp message formatter, wa.me link builder |
| `lib/notifyBusiness.ts` | WhatsApp Cloud API — auto-notify business owner on new order |
| `lib/validations.ts` | Zod schemas for checkout form and order payload |
| `lib/orderId.ts` | Order ID generator (e.g. SH-YYYYMMDD-XXXX) |
| `data/menuData.ts` | Hardcoded menu items (Phase 1) |
| `types/index.ts` | MenuItem, CartItem, Order types |
| `types/supabase.ts` | Supabase orders table types |

---

## 4. Brand Design

### Fonts
- **Cinzel** — heritage/wordmark (regal, carved, temple feel)
- **Cormorant Garamond** — brand serif
- **Playfair Display** — headings, premium
- **Inter** — body text

### Color Palette (CSS Variables)
```css
--forest: #1b3d2f;
--gold: #c9a84c;
--brand-green: #0e2a22;
--brand-green-2: #123227;
--brand-gold: #d6b15b;
--brand-gold-soft: rgba(214, 177, 91, 0.85);
```

### Aesthetic
- Premium, royal, elegant Indian restaurant
- Dark green + gold, minimal, high contrast
- Subtle linen/fabric texture on backgrounds
- Logo: SH monogram inside gold matka, double gold ring, forest green inner fill

### Video Hero Section
- Background video: `/videos/paneer-hero.mp4`, poster `/images/Paneer-hero.png`
- Multi-layer vignette overlay (radial gradients for darker edges, lighter center)
- Subtle texture overlay (linen)
- Cinematic zoom animation (25s ease-in-out infinite alternate)
- Brand lockup: logo left, wordmark right

### Logo Usage
- **Primary:** Horizontal lockup (crest + THE SHAKA-HARI + Veg Dum Biryani Co.)
- **Icon:** Crest only (SH inside gold matka) for DP, favicon, stamps
- **3:2 aspect ratio** for logo sizing

---

## 5. Features Implemented

| Feature | Status |
|---------|--------|
| Video hero banner with overlay and brand wordmark | ✅ |
| Menu section with add-to-cart | ✅ |
| Cart with Zustand + localStorage persistence | ✅ |
| Hydration fix (mounted state for cart count / quantity) | ✅ |
| Checkout modal with form validation | ✅ |
| Supabase order storage | ✅ |
| WhatsApp Cloud API auto-notification to business owner | ✅ (requires env vars) |
| Google Maps location picker in checkout | ✅ |
| Delivery slots: 12 PM, 1 PM, 2 PM, 3 PM | ✅ |
| COD payment method | ✅ |
| Floating WhatsApp button | ✅ (wa.me link) |

---

## 6. Supabase Setup

### Orders Table Schema
```sql
CREATE TABLE orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id text UNIQUE NOT NULL,
  name text NOT NULL,
  phone text NOT NULL,
  address text NOT NULL,
  landmark text,
  pincode text NOT NULL,
  slot text NOT NULL,
  notes text,
  items jsonb NOT NULL,
  total numeric NOT NULL,
  payment_method text DEFAULT 'COD',
  status text DEFAULT 'pending',
  latitude numeric,
  longitude numeric,
  created_at timestamptz DEFAULT now()
);

-- Delivery slots in validations: ["12 PM", "1 PM", "2 PM", "3 PM"]
```

### RLS
- Configure RLS policies as needed for admin access; anon key used for inserts from API route.

---

## 7. Environment Variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `WHATSAPP_CLOUD_API_TOKEN` | Meta permanent access token |
| `WHATSAPP_CLOUD_PHONE_ID` | Phone Number ID from Meta dashboard |
| `WHATSAPP_NOTIFY_NUMBER` | Business owner's WhatsApp (country code, no +) |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | Google Maps API key |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | For wa.me links (customer-facing) |

---

## 8. Key Design Decisions & Fixes

### Hydration Error Fix
- **Problem:** Zustand persist hydrates from localStorage after SSR, causing mismatch.
- **Solution:** `mounted` state pattern — only render cart-dependent UI after `useEffect` sets `mounted = true`.
- **Files:** `MenuCard.tsx`, `Navbar.tsx`

### Logo Sizing
- 3:2 aspect ratio for logo
- Use `clamp(130px, 15vw, 210px)` for width, proportional height

### Brand Lockup Alignment
- Invisible spacer used for alignment between crest and wordmark

### Video Hero Overlay
- Multi-layer vignette: `radial-gradient` + `linear-gradient` for darker edges, lighter center behind text

### SWC Binary Fix (if needed)
- If Next.js build fails with SWC: `xattr -cr node_modules`

---

## 9. Current State

### Working
- Website with video hero, menu, cart, checkout
- Supabase order storage
- WhatsApp Cloud API notification (when env vars set)
- Google Maps location picker
- COD flow
- Premium green + gold theme

### Setup Required
- **WhatsApp Cloud API:** Meta Developer Portal — create Business app, add WhatsApp product, get Phone Number ID + token. Note: Same number cannot run WhatsApp Business App and Cloud API; use second SIM for API or Meta test number for dev.
- **Google Maps API:** Enable Places API, create key, add to env.

### Not Yet Implemented (TODO)
- Razorpay / UPI payment
- Admin dashboard (view/update orders)
- Dynamic menu from Supabase
- Order status tracking page
- Auth / customer login
- Delivery radius enforcement
- Slots limit (e.g. 15 orders max per batch)

---

## 10. Business Strategy & Operations

### SOP / Consistency
- Recipe as code: measure oil (ml), salt (g), spices (g), rice (g)
- Pre-mix spice packets, fixed portions
- Cook training: 7–10 days before selling
- No customisation (no mild/extra mild) — suggest raita for spice balance

### Expansion Logic
- Dominate Kharghar first (50+ orders/day)
- Expand to Vashi only when 60+ stable orders, cook trained, SOP documented
- Do NOT expand at 50 orders/day — expand at 70–80 steady

### Review Handling
- Categorise: Noise (ignore) vs Signal (investigate) vs Logistics (fix immediately)
- Change recipe only if >20% feedback points to same issue
- For "too spicy" → suggest raita, don't reduce base spice

### WhatsApp Strategy (Current)
- **Floating button:** "Order on WhatsApp" — wa.me with prefilled message
- **After order:** "Confirm on WhatsApp" opens wa.me with order details; customer taps Send
- **Cloud API:** Auto-notify business owner on new order (optional, needs second number or test number)
- Keep WhatsApp Business App for manual chat; use second number for Cloud API if automating

---

## Quick Reference: Menu Data (Current)

From `data/menuData.ts`:
- Veg Dum Biryani — ₹180
- Paneer Biryani — ₹220
- Mushroom Biryani — ₹200
- Veg Shorba — ₹60
- Raita — ₹40
- Gulab Jamun — ₹50

*Note: Conversation discussed ₹249 founders batch for Paneer/Mushroom; menuData may reflect different phase.*

---

*Last updated from conversation analysis. Use this as the single source of context for continuing development.*
