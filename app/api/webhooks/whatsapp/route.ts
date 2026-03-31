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

async function routeReply(
  m: InboundMessage,
  db: ReturnType<typeof getSupabase>
): Promise<void> {
  const textLower = m.text.trim().toLowerCase();
  const bid = m.buttonReplyId;
  const lid = m.listReplyId;

  // Handle live location messages for ordering flow
  if (m.locationLat !== null && m.locationLng !== null) {
    const handled = await handleLocationMessage(
      db,
      m.from,
      m.locationLat,
      m.locationLng
    );
    if (handled) return;
  }

  // Let the order flow state machine handle if there's an active session
  const handled = await handleOrderFlow(
    db,
    m.from,
    m.text,
    bid,
    lid
  );
  if (handled) return;

  // ── Default routing (idle state, no active order) ──
  if (
    bid === "MENU" ||
    textLower === "1" ||
    textLower === "menu"
  ) {
    const r = await sendMenu(m.from);
    if (!r.ok) console.error("whatsapp webhook: sendMenu failed", r.error);
    return;
  }

  if (bid === "ORDER" || textLower === "2" || textLower === "order") {
    const r = await sendWhatsAppMessage(
      m.from,
      "🛒 Order online: https://theshakahari.com\n\nOr reply *menu* to order right here on WhatsApp!"
    );
    if (!r.ok) console.error("whatsapp webhook: order link failed", r.error);
    return;
  }

  if (bid === "LOCATION" || textLower === "3" || textLower === "location") {
    const r = await sendWhatsAppMessage(m.from, LOCATION_MSG);
    if (!r.ok) console.error("whatsapp webhook: location msg failed", r.error);
    return;
  }

  const r = await sendGreeting(m.from);
  if (!r.ok) console.error("whatsapp webhook: greeting failed", r.error);
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

  for (const m of messages) {
    if (isLikelyOwnNumber(m.from)) {
      console.log("whatsapp webhook: skip self-number", m.messageId);
      continue;
    }

    const dbText = m.text || m.buttonReplyId || m.listReplyId || "(interactive)";
    const { error: insertError } = await supabase
      .from("whatsapp_messages")
      .insert({
        phone: m.from,
        message: dbText,
        message_id: m.messageId,
        timestamp: m.timestamp,
      });

    if (insertError) {
      const code = String(insertError.code ?? "");
      const isDup =
        code === "23505" ||
        insertError.message?.toLowerCase().includes("duplicate");
      if (isDup) {
        console.log(
          "whatsapp webhook: duplicate message_id, skip reply",
          m.messageId
        );
        continue;
      }
      console.error("whatsapp webhook: supabase insert", insertError);
    }

    await routeReply(m, supabase);
  }

  return NextResponse.json(
    { ok: true, processed: messages.length },
    { status: 200 }
  );
}
