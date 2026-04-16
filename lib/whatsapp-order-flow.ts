/**
 * WhatsApp ordering conversation state machine.
 *
 * States:
 *   idle            → default / after order complete
 *   awaiting_qty    → user picked an item, waiting for quantity
 *   cart            → items in cart, showing "Add more / Checkout"
 *   awaiting_address→ waiting for delivery address or live location
 *   awaiting_name   → waiting for customer name
 *   awaiting_confirm→ order summary shown, waiting for "yes"
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { menuItems } from "@/data/menuData";
import { sendWhatsAppMessage, sendMenu } from "@/lib/whatsapp";
import { getAllStock, decrementItemStock, type StockMap } from "@/lib/stock";

type CartItem = { id: string; name: string; price: number; qty: number };

type Session = {
  phone: string;
  state: string;
  cart: CartItem[];
  pending_item_id: string | null;
  address: string | null;
  customer_name: string | null;
  location_lat: number | null;
  location_lng: number | null;
};

const MENU_BY_ID = new Map(menuItems.map((m) => [m.id, m]));

/** Keywords to match each menu item for free-text parsing. */
const ITEM_KEYWORDS: { item: (typeof menuItems)[number]; words: string[] }[] =
  menuItems.map((m, idx) => ({
    item: m,
    words: [
      m.name.toLowerCase(),
      ...m.name.toLowerCase().split(/\s+/),
      String(idx + 1),
    ],
  }));

/**
 * Parse free-text like "2 paneer, 3 veg dum, 1 raita" into cart items.
 * Returns empty array if nothing matched.
 */
function parseMultiItemText(
  text: string
): { id: string; name: string; price: number; qty: number }[] {
  const results: { id: string; name: string; price: number; qty: number }[] = [];
  const segments = text
    .toLowerCase()
    .split(/[,;&\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const seg of segments) {
    const qtyMatch = seg.match(/^(\d+)\s*[x×*]?\s*(.+)/);
    const qty = qtyMatch ? Math.min(Math.max(parseInt(qtyMatch[1], 10), 1), 20) : 1;
    const itemText = qtyMatch ? qtyMatch[2].trim() : seg.trim();

    let best: (typeof menuItems)[number] | null = null;
    let bestScore = 0;

    for (const { item, words } of ITEM_KEYWORDS) {
      if (itemText === item.name.toLowerCase()) {
        best = item;
        bestScore = 100;
        break;
      }
      for (const w of words) {
        if (w.length >= 3 && itemText.includes(w) && w.length > bestScore) {
          best = item;
          bestScore = w.length;
        }
      }
    }

    if (best) {
      const existing = results.find((r) => r.id === best!.id);
      if (existing) {
        existing.qty += qty;
      } else {
        results.push({ id: best.id, name: best.name, price: best.price, qty });
      }
    }
  }

  return results;
}

function itemIdFromListReply(listReplyId: string): string | null {
  if (!listReplyId.startsWith("ITEM_")) return null;
  return listReplyId
    .replace(/^ITEM_/, "")
    .toLowerCase()
    .replace(/_/g, "-");
}

async function getSession(
  db: SupabaseClient,
  phone: string
): Promise<Session> {
  const { data } = await db
    .from("whatsapp_order_sessions")
    .select("state,cart,pending_item_id,address,customer_name,location_lat,location_lng")
    .eq("phone", phone)
    .single();

  if (data) {
    return {
      phone,
      state: data.state ?? "idle",
      cart: Array.isArray(data.cart) ? data.cart : [],
      pending_item_id: data.pending_item_id ?? null,
      address: data.address ?? null,
      customer_name: data.customer_name ?? null,
      location_lat: data.location_lat ?? null,
      location_lng: data.location_lng ?? null,
    };
  }

  return {
    phone,
    state: "idle",
    cart: [],
    pending_item_id: null,
    address: null,
    customer_name: null,
    location_lat: null,
    location_lng: null,
  };
}

/** Save session and send message in parallel to cut latency. */
async function saveAndSend(
  db: SupabaseClient,
  s: Session,
  phone: string,
  message: string
): Promise<void> {
  await Promise.all([
    db.from("whatsapp_order_sessions").upsert(
      {
        phone: s.phone,
        state: s.state,
        cart: s.cart,
        pending_item_id: s.pending_item_id,
        address: s.address,
        customer_name: s.customer_name,
        location_lat: s.location_lat,
        location_lng: s.location_lng,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "phone" }
    ),
    sendWhatsAppMessage(phone, message),
  ]);
}

async function saveSession(
  db: SupabaseClient,
  s: Session
): Promise<void> {
  await db.from("whatsapp_order_sessions").upsert(
    {
      phone: s.phone,
      state: s.state,
      cart: s.cart,
      pending_item_id: s.pending_item_id,
      address: s.address,
      customer_name: s.customer_name,
      location_lat: s.location_lat,
      location_lng: s.location_lng,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "phone" }
  );
}

function cartSummary(cart: CartItem[]): string {
  if (cart.length === 0) return "Your cart is empty.";
  const lines = cart.map((c) => `  ${c.qty}× ${c.name} — ₹${c.price * c.qty}`);
  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);
  return `🛒 *Your Cart*\n${lines.join("\n")}\n\n*Total: ₹${total}*`;
}

function orderSummary(s: Session): string {
  const cart = cartSummary(s.cart);
  const total = s.cart.reduce((sum, c) => sum + c.price * c.qty, 0);
  return (
    `📋 *Order Summary*\n\n` +
    `${cart}\n\n` +
    `📍 *Delivery:* ${s.address ?? "—"}\n` +
    `👤 *Name:* ${s.customer_name ?? "—"}\n` +
    `💳 *Payment:* Cash on Delivery\n\n` +
    `*Total: ₹${total}*\n\n` +
    `Reply *YES* to confirm your order, or *CANCEL* to start over.`
  );
}

function generateOrderId(): string {
  const d = new Date();
  const date = d.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `SH-${date}-${rand}`;
}

/**
 * Handle an inbound WhatsApp message within the ordering flow.
 * Returns true if the message was handled (caller should NOT run default routing).
 */
export async function handleOrderFlow(
  db: SupabaseClient,
  phone: string,
  text: string,
  buttonReplyId: string,
  listReplyId: string
): Promise<boolean> {
  const s = await getSession(db, phone);
  const lower = text.trim().toLowerCase();

  // ── Global commands (work in any state) ──────────────────────────
  if (lower === "cancel" || lower === "0") {
    s.state = "idle";
    s.cart = [];
    s.pending_item_id = null;
    s.address = null;
    s.customer_name = null;
    s.location_lat = null;
    s.location_lng = null;
    await saveAndSend(db, s, phone, "Order cancelled. Send *hi* to start again.");
    return true;
  }

  // ── State: idle ──────────────────────────────────────────────────
  if (s.state === "idle") {
    // Per-item stock check — block new orders if all sold out
    const stockMap = await getAllStock(db);
    const totalStock = Object.values(stockMap).reduce((a, b) => a + b, 0);
    if (totalStock <= 0) {
      const hasInput = listReplyId || (text.trim().length >= 2 && parseMultiItemText(text).length > 0);
      if (hasInput) {
        void sendWhatsAppMessage(
          phone,
          "Sorry, we're *sold out for today!* \u{1F64F}\n\nAll boxes have been claimed. Reply *notify* to get a WhatsApp message when we're back. \u{1F33F}"
        );
        return true;
      }
      return false;
    }

    // Single item via interactive list tap
    const itemId = itemIdFromListReply(listReplyId);
    if (itemId) {
      const item = MENU_BY_ID.get(itemId);
      if (item) {
        s.pending_item_id = item.id;
        s.state = "awaiting_qty";
        await saveAndSend(
          db, s, phone,
          `*${item.name}* — ₹${item.price}\n\nHow many would you like? Reply with a number (e.g. *1*, *2*, *3*)`
        );
        return true;
      }
    }

    // Multi-item free text (e.g. "2 paneer, 1 veg dum, 1 raita")
    if (text.trim().length >= 2) {
      const parsed = parseMultiItemText(text);
      if (parsed.length > 0) {
        for (const p of parsed) {
          const existing = s.cart.find((c) => c.id === p.id);
          if (existing) existing.qty += p.qty;
          else s.cart.push(p);
        }
        s.state = "cart";
        const addedLines = parsed
          .map((p) => `  ${p.qty}× ${p.name}`)
          .join("\n");
        await saveAndSend(
          db, s, phone,
          `Added:\n${addedLines}\n\n${cartSummary(s.cart)}\n\nReply:\n*1* — Add more items\n*2* — Checkout`
        );
        return true;
      }
    }

    return false;
  }

  // ── State: awaiting_qty ──────────────────────────────────────────
  if (s.state === "awaiting_qty") {
    const qty = parseInt(text.trim(), 10);
    if (isNaN(qty) || qty < 1 || qty > 20) {
      void sendWhatsAppMessage(phone, "Please reply with a number between 1 and 20.");
      return true;
    }

    const item = MENU_BY_ID.get(s.pending_item_id ?? "");
    if (!item) {
      s.state = "idle";
      s.pending_item_id = null;
      await saveAndSend(db, s, phone, "Something went wrong. Send *menu* to try again.");
      return true;
    }

    const existing = s.cart.find((c) => c.id === item.id);
    if (existing) {
      existing.qty += qty;
    } else {
      s.cart.push({ id: item.id, name: item.name, price: item.price, qty });
    }

    s.pending_item_id = null;
    s.state = "cart";
    await saveAndSend(
      db, s, phone,
      `Added ${qty}× ${item.name}!\n\n${cartSummary(s.cart)}\n\nReply:\n*1* — Add more items\n*2* — Checkout`
    );
    return true;
  }

  // ── State: cart ──────────────────────────────────────────────────
  if (s.state === "cart") {
    if (lower === "1" || lower === "add" || lower === "more" || lower === "add more") {
      s.state = "idle";
      const curStock = await getAllStock(db);
      await Promise.all([saveSession(db, s), sendMenu(phone, curStock)]);
      return true;
    }

    if (lower === "2" || lower === "checkout" || lower === "done") {
      s.state = "awaiting_address";
      await saveAndSend(
        db, s, phone,
        "📍 *Where should we deliver?*\n\n" +
          "Send your *live location* 📎 → Location\n" +
          "Or type your full delivery address."
      );
      return true;
    }

    // Single item via interactive list tap
    const itemId = itemIdFromListReply(listReplyId);
    if (itemId) {
      const item = MENU_BY_ID.get(itemId);
      if (item) {
        s.pending_item_id = item.id;
        s.state = "awaiting_qty";
        await saveAndSend(
          db, s, phone,
          `*${item.name}* — ₹${item.price}\n\nHow many? Reply with a number.`
        );
        return true;
      }
    }

    // Multi-item free text while in cart
    if (text.trim().length >= 2) {
      const parsed = parseMultiItemText(text);
      if (parsed.length > 0) {
        for (const p of parsed) {
          const existing = s.cart.find((c) => c.id === p.id);
          if (existing) existing.qty += p.qty;
          else s.cart.push(p);
        }
        const addedLines = parsed
          .map((p) => `  ${p.qty}× ${p.name}`)
          .join("\n");
        await saveAndSend(
          db, s, phone,
          `Added:\n${addedLines}\n\n${cartSummary(s.cart)}\n\nReply:\n*1* — Add more items\n*2* — Checkout`
        );
        return true;
      }
    }

    void sendWhatsAppMessage(
      phone,
      `${cartSummary(s.cart)}\n\nReply *1* to add more or *2* to checkout.\nOr type items directly: e.g. _2 paneer, 1 raita_`
    );
    return true;
  }

  // ── State: awaiting_address ──────────────────────────────────────
  if (s.state === "awaiting_address") {
    if (text.trim().length >= 5) {
      s.address = text.trim();
      s.state = "awaiting_name";
      await saveAndSend(db, s, phone, "👤 What name should we put on the order?");
      return true;
    }

    void sendWhatsAppMessage(
      phone,
      "Please send your delivery address (at least a few words) or share your live location."
    );
    return true;
  }

  // ── State: awaiting_name ─────────────────────────────────────────
  if (s.state === "awaiting_name") {
    if (text.trim().length >= 2) {
      s.customer_name = text.trim();
      s.state = "awaiting_confirm";
      await saveAndSend(db, s, phone, orderSummary(s));
      return true;
    }

    void sendWhatsAppMessage(phone, "Please enter your name.");
    return true;
  }

  // ── State: awaiting_confirm ──────────────────────────────────────
  if (s.state === "awaiting_confirm") {
    if (
      lower === "yes" ||
      lower === "y" ||
      lower === "confirm" ||
      lower === "ok"
    ) {
      const orderId = generateOrderId();
      const total = s.cart.reduce((sum, c) => sum + c.price * c.qty, 0);
      const phone10 = s.phone.replace(/^91/, "");

      const orderPayload = {
        order_id: orderId,
        name: s.customer_name ?? "WhatsApp Customer",
        phone: phone10,
        address: s.address ?? "",
        landmark: null,
        pincode: "",
        slot: "ASAP",
        notes: "Ordered via WhatsApp",
        items: s.cart.map((c) => ({
          id: c.id,
          name: c.name,
          price: c.price,
          quantity: c.qty,
        })),
        total,
        payment_method: "COD",
        status: "pending",
        is_first_order: false,
        source: "whatsapp",
        latitude: s.location_lat,
        longitude: s.location_lng,
      };

      // Per-item stock check before placing
      const biryanisInCart = s.cart.filter(
        (c) => c.id !== "raita" && c.id !== "gulab-jamun"
      );

      if (biryanisInCart.length > 0) {
        const curStock: StockMap = await getAllStock(db);
        const insufficientItems: string[] = [];
        for (const c of biryanisInCart) {
          if ((curStock[c.id] ?? 0) < c.qty) {
            const avail = curStock[c.id] ?? 0;
            insufficientItems.push(
              avail <= 0
                ? `\u274C *${c.name}* — sold out`
                : `\u26A0\uFE0F *${c.name}* — only ${avail} left (you ordered ${c.qty})`
            );
          }
        }

        if (insufficientItems.length > 0) {
          void sendWhatsAppMessage(
            phone,
            `Sorry, we can't fulfil your order as-is:\n\n${insufficientItems.join("\n")}\n\n` +
              `Please adjust your quantities and reply *YES* again, or *CANCEL* to start over.`
          );
          return true;
        }

        // Decrement all items
        for (const c of biryanisInCart) {
          const result = await decrementItemStock(db, c.id, c.qty);
          if (result < 0) {
            void sendWhatsAppMessage(
              phone,
              `Sorry, *${c.name}* just sold out while we were processing. Please try again.`
            );
            return true;
          }
        }
      }

      // Check first-order status and insert in parallel
      const [{ count }, { error: insertErr }] = await Promise.all([
        db
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("phone", phone10),
        (async () => {
          return db.from("orders").insert(orderPayload);
        })(),
      ]);

      if (count === 0 && !insertErr) {
        void db
          .from("orders")
          .update({ is_first_order: true })
          .eq("order_id", orderId);
      }

      if (insertErr) {
        console.error("whatsapp order insert:", insertErr);
        void sendWhatsAppMessage(
          phone,
          "Sorry, something went wrong placing your order. Please try again or order online at theshakahari.com"
        );
        return true;
      }

      // Reset session and send confirmation in parallel
      s.state = "idle";
      s.cart = [];
      s.pending_item_id = null;
      s.address = null;
      s.customer_name = null;
      s.location_lat = null;
      s.location_lng = null;
      await saveAndSend(
        db, s, phone,
        `🎉 *Order Confirmed!*\n\n` +
          `Order ID: *${orderId}*\n` +
          `Total: *₹${total}* (Cash on Delivery)\n\n` +
          `We'll contact you shortly to confirm delivery. Thank you for choosing The Shaka-Hari! 🌿`
      );
      return true;
    }

    if (lower === "no" || lower === "cancel") {
      s.state = "idle";
      s.cart = [];
      s.pending_item_id = null;
      s.address = null;
      s.customer_name = null;
      await saveAndSend(db, s, phone, "Order cancelled. Send *hi* to start again.");
      return true;
    }

    void sendWhatsAppMessage(
      phone,
      "Reply *YES* to confirm your order or *CANCEL* to start over."
    );
    return true;
  }

  return false;
}

/**
 * Handle incoming WhatsApp location messages.
 */
export async function handleLocationMessage(
  db: SupabaseClient,
  phone: string,
  lat: number,
  lng: number
): Promise<boolean> {
  const s = await getSession(db, phone);

  if (s.state === "awaiting_address") {
    s.address = `📍 Live location: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    s.location_lat = lat;
    s.location_lng = lng;
    s.state = "awaiting_name";
    await saveAndSend(
      db, s, phone,
      "📍 Location received!\n\n👤 What name should we put on the order?"
    );
    return true;
  }

  return false;
}
