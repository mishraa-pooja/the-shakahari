/**
 * WhatsApp Cloud API webhook (Meta).
 *
 * GET  — Meta verification (hub.mode, hub.verify_token, hub.challenge)
 * POST — Incoming messages → Supabase → routed auto-reply
 *
 * Deploy: set Callback URL to https://<your-domain>/api/webhooks/whatsapp
 *         subscribe to messages field in Meta app dashboard.
 */

import { NextResponse } from "next/server";
import { getSupabase, getSupabaseServiceRole } from "@/lib/supabase";
import {
  sendWhatsAppMessage,
  sendGreeting,
  sendMenu,
  isLikelyOwnNumber,
} from "@/lib/whatsapp";
import { getAllStock } from "@/lib/stock";
import {
  handleOrderFlow,
  handleLocationMessage,
} from "@/lib/whatsapp-order-flow";

/** Meta GET verification */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  if (!verifyToken) {
    console.error("whatsapp webhook: WHATSAPP_VERIFY_TOKEN is not set");
    return new NextResponse("Server misconfigured", { status: 500 });
  }

  if (mode === "subscribe" && token === verifyToken && challenge) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

type UnknownRecord = Record<string, unknown>;

function isRecord(v: unknown): v is UnknownRecord {
  return typeof v === "object" && v !== null;
}

function getString(obj: unknown, key: string): string | undefined {
  if (!isRecord(obj)) return undefined;
  const v = obj[key];
  return typeof v === "string" ? v : undefined;
}

function getArray(obj: unknown, key: string): unknown[] {
  if (!isRecord(obj)) return [];
  const v = obj[key];
  return Array.isArray(v) ? v : [];
}

type InboundMessage = {
  from: string;
  messageId: string;
  text: string;
  timestamp: string;
  buttonReplyId: string;
  listReplyId: string;
  locationLat: number | null;
  locationLng: number | null;
};

/**
 * Extract inbound messages from Meta payload (text + interactive replies).
 */
function extractInboundMessages(body: unknown): InboundMessage[] {
  const out: InboundMessage[] = [];

  try {
    const entries = getArray(body, "entry");
    for (const entry of entries) {
      const changes = getArray(entry, "changes");
      for (const change of changes) {
        if (!isRecord(change)) continue;
        const value = change.value;
        if (!isRecord(value)) continue;
        const messages = getArray(value, "messages");
        for (const msg of messages) {
          if (!isRecord(msg)) continue;
          const type = getString(msg, "type");
          const from = getString(msg, "from") ?? "";
          const id = getString(msg, "id") ?? "";
          const ts = getString(msg, "timestamp") ?? "";
          if (!from || !id) continue;

          let text = "";
          let buttonReplyId = "";
          let listReplyId = "";
          let locationLat: number | null = null;
          let locationLng: number | null = null;

          if (type === "text") {
            const textObj = msg.text;
            text =
              isRecord(textObj) && typeof textObj.body === "string"
                ? textObj.body
                : "";
          } else if (type === "interactive") {
            const interactive = msg.interactive;
            if (isRecord(interactive)) {
              const btnReply = interactive.button_reply;
              if (isRecord(btnReply)) {
                buttonReplyId = getString(btnReply, "id") ?? "";
              }
              const lstReply = interactive.list_reply;
              if (isRecord(lstReply)) {
                listReplyId = getString(lstReply, "id") ?? "";
              }
            }
          } else if (type === "location") {
            const loc = msg.location;
            if (isRecord(loc)) {
              locationLat = typeof loc.latitude === "number" ? loc.latitude : null;
              locationLng = typeof loc.longitude === "number" ? loc.longitude : null;
            }
          } else {
            continue;
          }

          out.push({
            from,
            messageId: id,
            text,
            timestamp: ts,
            buttonReplyId,
            listReplyId,
            locationLat,
            locationLng,
          });
        }
      }
    }
  } catch (e) {
    console.error("whatsapp webhook: parse error", e);
  }

  return out;
}

const LOCATION_MSG = `📍 The Shaka-Hari\n\nAddress: (coming soon)\nTimings: 12 PM – 3 PM (delivery only)\n\nOrder online: https://theshakahari.com`;

const SOLD_OUT_MSG =
  "Sorry, we're *sold out for today!* 🙏\n\n" +
  "All biryani boxes have been claimed.\n\n" +
  "Reply *notify* and we'll WhatsApp you as soon as fresh boxes are ready. 🌿\n\n" +
  "— The Shaka-Hari";

/** Fire-and-forget: log bot reply to admin_chat_messages for the admin chat window. */
function logBotReply(
  db: ReturnType<typeof getSupabase>,
  phone: string,
  message: string
) {
  void db
    .from("admin_chat_messages")
    .insert({ phone, direction: "outbound", message, admin_name: "Bot" })
    .then(() => null);
}

async function routeReply(
  m: InboundMessage,
  db: ReturnType<typeof getSupabase>
): Promise<void> {
  const textLower = m.text.trim().toLowerCase();
  const bid = m.buttonReplyId;
  const lid = m.listReplyId;

  // "notify" — join stock waitlist
  if (textLower === "notify" || textLower === "notify me") {
    const phone10 = m.from.replace(/^91/, "");
    await db
      .from("stock_waitlist")
      .upsert(
        { phone: phone10, created_at: new Date().toISOString() },
        { onConflict: "phone" }
      );
    const reply = "You're on the list! We'll WhatsApp you the moment fresh boxes are ready. \uD83C\uDF3F";
    void sendWhatsAppMessage(m.from, reply);
    logBotReply(db, m.from, reply);
    return;
  }

  // Location messages → order flow
  if (m.locationLat !== null && m.locationLng !== null) {
    const handled = await handleLocationMessage(
      db, m.from, m.locationLat, m.locationLng
    );
    if (handled) return;
  }

  // Order flow state machine (handles active sessions)
  const handled = await handleOrderFlow(db, m.from, m.text, bid, lid);
  if (handled) return;

  // Check per-item stock for menu/order requests
  const stockMap = await getAllStock(db);
  const totalStock = Object.values(stockMap).reduce((a, b) => a + b, 0);

  // Default routing (idle state, no active order)
  if (bid === "MENU" || textLower === "1" || textLower === "menu") {
    if (totalStock <= 0) {
      void sendWhatsAppMessage(m.from, SOLD_OUT_MSG);
      logBotReply(db, m.from, SOLD_OUT_MSG);
    } else {
      void sendMenu(m.from, stockMap);
      logBotReply(db, m.from, "[Menu sent with item list]");
    }
    return;
  }

  if (bid === "ORDER" || textLower === "2" || textLower === "order") {
    if (totalStock <= 0) {
      void sendWhatsAppMessage(m.from, SOLD_OUT_MSG);
      logBotReply(db, m.from, SOLD_OUT_MSG);
    } else {
      const reply =
        `\uD83D\uDED2 Order online: https://theshakahari.com\n\nOr reply *menu* to order right here on WhatsApp!\n\n\uD83D\uDD25 *${totalStock} boxes left today*`;
      void sendWhatsAppMessage(m.from, reply);
      logBotReply(db, m.from, reply);
    }
    return;
  }

  if (bid === "LOCATION" || textLower === "3" || textLower === "location") {
    void sendWhatsAppMessage(m.from, LOCATION_MSG);
    logBotReply(db, m.from, LOCATION_MSG);
    return;
  }

  void sendGreeting(m.from);
  logBotReply(db, m.from, "[Greeting sent with buttons]");
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    console.error("whatsapp webhook: invalid JSON body");
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  const messages = extractInboundMessages(body);
  if (messages.length === 0) {
    return NextResponse.json({ ok: true, processed: 0 }, { status: 200 });
  }

  let supabase;
  try {
    supabase = getSupabaseServiceRole() ?? getSupabase();
  } catch (e) {
    console.error("whatsapp webhook: supabase config", e);
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  const seen = new Set<string>();

  await Promise.all(
    messages.map(async (m) => {
      if (isLikelyOwnNumber(m.from)) return;
      if (seen.has(m.messageId)) return;
      seen.add(m.messageId);

      // Log message to DB and route reply in parallel
      const dbText =
        m.text || m.buttonReplyId || m.listReplyId || "(interactive)";

      const insertP = supabase
        .from("whatsapp_messages")
        .insert({
          phone: m.from,
          message: dbText,
          message_id: m.messageId,
          timestamp: m.timestamp,
        })
        .then(({ error }) => {
          if (!error) return "ok";
          const isDup =
            String(error.code ?? "") === "23505" ||
            error.message?.toLowerCase().includes("duplicate");
          return isDup ? "dup" : "err";
        });

      // Also log to admin_chat_messages for the chat window
      const chatInsertP = (async () => {
        try {
          await supabase.from("admin_chat_messages").insert({
            phone: m.from,
            direction: "inbound",
            message: dbText,
            wa_message_id: m.messageId,
          });
        } catch { /* non-critical */ }
      })();

      // Start routing immediately — don't wait for the insert
      const routeP = routeReply(m, supabase);

      const [insertStatus] = await Promise.all([insertP, routeP, chatInsertP]);

      if (insertStatus === "dup") {
        console.log("whatsapp webhook: dup", m.messageId);
      }
    })
  );

  return NextResponse.json(
    { ok: true, processed: messages.length },
    { status: 200 }
  );
}
