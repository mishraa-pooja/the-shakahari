/**
 * WhatsApp Cloud API webhook (Meta).
 *
 * GET  — Meta verification (hub.mode, hub.verify_token, hub.challenge)
 * POST — Incoming messages → Supabase → optional auto-reply
 *
 * Deploy: set Callback URL to https://<your-domain>/api/webhooks/whatsapp
 *         subscribe to messages field in Meta app dashboard.
 */

import { NextResponse } from "next/server";
import { getSupabase, getSupabaseServiceRole } from "@/lib/supabase";
import {
  sendWhatsAppMessage,
  isLikelyOwnNumber,
} from "@/lib/whatsapp";

const AUTO_REPLY = `Hi! Welcome to The Shaka-Hari 🌿

Please share:
- Name
- Address
- Items

Or order directly on our website:
https://theshakahari.com`;

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

/**
 * Extract inbound text messages from Meta payload (best-effort, no throw).
 */
function extractInboundTextMessages(
  body: unknown
): Array<{
  from: string;
  messageId: string;
  text: string;
  timestamp: string;
}> {
  const out: Array<{
    from: string;
    messageId: string;
    text: string;
    timestamp: string;
  }> = [];

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
          if (type !== "text") continue;
          const textObj = msg.text;
          const textBody =
            isRecord(textObj) && typeof textObj.body === "string"
              ? textObj.body
              : "";
          const from = getString(msg, "from") ?? "";
          const id = getString(msg, "id") ?? "";
          const ts = getString(msg, "timestamp") ?? "";
          if (!from || !id) continue;
          out.push({
            from,
            messageId: id,
            text: textBody,
            timestamp: ts,
          });
        }
      }
    }
  } catch (e) {
    console.error("whatsapp webhook: parse error", e);
  }

  return out;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    console.error("whatsapp webhook: invalid JSON body");
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  const messages = extractInboundTextMessages(body);
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

    const { error: insertError } = await supabase.from("whatsapp_messages").insert({
      phone: m.from,
      message: m.text,
      message_id: m.messageId,
      timestamp: m.timestamp,
    });

    if (insertError) {
      const code = String(insertError.code ?? "");
      const isDup =
        code === "23505" ||
        insertError.message?.toLowerCase().includes("duplicate");
      if (isDup) {
        console.log("whatsapp webhook: duplicate message_id, skip reply", m.messageId);
        continue;
      }
      console.error("whatsapp webhook: supabase insert", insertError);
      continue;
    }

    const send = await sendWhatsAppMessage(m.from, AUTO_REPLY);
    if (!send.ok) {
      console.error("whatsapp webhook: auto-reply failed", send.error);
    }
  }

  return NextResponse.json({ ok: true, processed: messages.length }, { status: 200 });
}
