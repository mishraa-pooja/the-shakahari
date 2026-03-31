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
    .select("*")
    .eq("phone", phone)
    .single();

  if (data) {
    return {
      phone: data.phone,
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
    await saveSession(db, s);
    await sendWhatsAppMessage(phone, "Order cancelled. Send *hi* to start again.");
    return true;
  }

  // ── State: idle ──────────────────────────────────────────────────
  if (s.state === "idle") {
    const itemId = itemIdFromListReply(listReplyId);
    if (itemId) {
      const item = MENU_BY_ID.get(itemId);
      if (item) {
        s.pending_item_id = item.id;
        s.state = "awaiting_qty";
        await saveSession(db, s);
        await sendWhatsAppMessage(
          phone,
          `*${item.name}* — ₹${item.price}\n\nHow many would you like? Reply with a number (e.g. *1*, *2*, *3*)`
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
      await sendWhatsAppMessage(
        phone,
        "Please reply with a number between 1 and 20."
      );
      return true;
    }

    const item = MENU_BY_ID.get(s.pending_item_id ?? "");
    if (!item) {
      s.state = "idle";
      s.pending_item_id = null;
      await saveSession(db, s);
      await sendWhatsAppMessage(phone, "Something went wrong. Send *menu* to try again.");
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
    await saveSession(db, s);

    const summary = cartSummary(s.cart);
    await sendWhatsAppMessage(
      phone,
      `Added ${qty}× ${item.name}!\n\n${summary}\n\nReply:\n*1* — Add more items\n*2* — Checkout`
    );
    return true;
  }

  // ── State: cart ──────────────────────────────────────────────────
  if (s.state === "cart") {
    if (lower === "1" || lower === "add" || lower === "more" || lower === "add more") {
      s.state = "idle";
      await saveSession(db, s);
      await sendMenu(phone);
      return true;
    }

    if (lower === "2" || lower === "checkout" || lower === "done") {
      s.state = "awaiting_address";
      await saveSession(db, s);
      await sendWhatsAppMessage(
        phone,
        "📍 *Where should we deliver?*\n\n" +
          "Send your *live location* 📎 → Location\n" +
          "Or type your full delivery address."
      );
      return true;
    }

    const itemId = itemIdFromListReply(listReplyId);
    if (itemId) {
      const item = MENU_BY_ID.get(itemId);
      if (item) {
        s.pending_item_id = item.id;
        s.state = "awaiting_qty";
        await saveSession(db, s);
        await sendWhatsAppMessage(
          phone,
          `*${item.name}* — ₹${item.price}\n\nHow many? Reply with a number.`
        );
        return true;
      }
    }

    await sendWhatsAppMessage(
      phone,
      `${cartSummary(s.cart)}\n\nReply *1* to add more or *2* to checkout.`
    );
    return true;
  }

  // ── State: awaiting_address ──────────────────────────────────────
  if (s.state === "awaiting_address") {
    if (text.trim().length >= 5) {
      s.address = text.trim();
      s.state = "awaiting_name";
      await saveSession(db, s);
      await sendWhatsAppMessage(
        phone,
        "👤 What name should we put on the order?"
      );
      return true;
    }

    await sendWhatsAppMessage(
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
      await saveSession(db, s);
      await sendWhatsAppMessage(phone, orderSummary(s));
      return true;
    }

    await sendWhatsAppMessage(phone, "Please enter your name.");
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

      const orderPayload = {
        order_id: orderId,
        name: s.customer_name ?? "WhatsApp Customer",
        phone: s.phone.replace(/^91/, ""),
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

      // Check if first order for this phone
      const phone10 = s.phone.replace(/^91/, "");
      const { count } = await db
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("phone", phone10);
      if (count === 0) {
        orderPayload.is_first_order = true;
      }

      const { error: insertErr } = await db
        .from("orders")
        .insert(orderPayload);

      if (insertErr) {
        console.error("whatsapp order insert:", insertErr);
        await sendWhatsAppMessage(
          phone,
          "Sorry, something went wrong placing your order. Please try again or order online at theshakahari.com"
        );
        return true;
      }

      // Reset session
      s.state = "idle";
      s.cart = [];
      s.pending_item_id = null;
      s.address = null;
      s.customer_name = null;
      s.location_lat = null;
      s.location_lng = null;
      await saveSession(db, s);

      await sendWhatsAppMessage(
        phone,
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
      await saveSession(db, s);
      await sendWhatsAppMessage(phone, "Order cancelled. Send *hi* to start again.");
      return true;
    }

    await sendWhatsAppMessage(
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
    await saveSession(db, s);
    await sendWhatsAppMessage(
      phone,
      "📍 Location received!\n\n👤 What name should we put on the order?"
    );
    return true;
  }

  return false;
}
