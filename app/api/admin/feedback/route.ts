/**
 * Admin feedback API — list WhatsApp messages and send feedback requests.
 *
 * GET  /api/admin/feedback               — list recent inbound messages
 * POST /api/admin/feedback               — send a feedback request to a customer
 */

import { NextResponse, type NextRequest } from "next/server";
import { getSupabase, getSupabaseServiceRole } from "@/lib/supabase";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

function getDb() {
  return getSupabaseServiceRole() ?? getSupabase();
}

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return true;
  const header = request.headers.get("x-admin-secret");
  if (!header) return false;
  return header === secret;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(
    parseInt(searchParams.get("limit") ?? "50", 10) || 50,
    200
  );

  const db = getDb();

  const { data, error } = await db
    .from("whatsapp_messages")
    .select("id, phone, message, message_id, timestamp, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }

  // Also get delivered orders to enable "ask for feedback"
  const { data: deliveredOrders } = await db
    .from("orders")
    .select("order_id, name, phone, total, created_at, status")
    .eq("status", "delivered")
    .order("created_at", { ascending: false })
    .limit(50);

  return NextResponse.json({
    messages: data ?? [],
    deliveredOrders: deliveredOrders ?? [],
  });
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { phone?: string; orderId?: string; customerName?: string; customMessage?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { phone, orderId, customerName, customMessage } = body;
  if (!phone) {
    return NextResponse.json(
      { error: "Phone number is required" },
      { status: 400 }
    );
  }

  const digits = phone.replace(/\D/g, "");
  const to = digits.startsWith("91") ? digits : `91${digits}`;

  const name = customerName || "there";
  const message =
    customMessage ||
    (orderId
      ? `Hi ${name}! Thanks for ordering from The Shaka-Hari (Order: *${orderId}*).\n\nWe'd love your feedback! How was the biryani? Reply with:\n\n\u2B50 Rating (1-5)\n\uD83D\uDCAC What you liked or what we can improve\n\nYour feedback helps us make every box better. \uD83C\uDF3F\n\n— The Shaka-Hari Team`
      : `Hi ${name}! Thanks for trying The Shaka-Hari.\n\nWe'd love to hear from you! How was your experience?\n\n\u2B50 Rating (1-5)\n\uD83D\uDCAC What you liked or what we can improve\n\nYour feedback means the world to us. \uD83C\uDF3F\n\n— The Shaka-Hari Team`);

  const result = await sendWhatsAppMessage(to, message);
  if (!result.ok) {
    return NextResponse.json(
      { error: "Failed to send", details: result.error },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, sent: true });
}
