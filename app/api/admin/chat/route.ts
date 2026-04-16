/**
 * Admin chat API — two-way WhatsApp messaging.
 *
 * GET  /api/admin/chat              — list conversations (unique phones with last message)
 * GET  /api/admin/chat?phone=91xxx  — get chat history for one phone
 * POST /api/admin/chat              — send a message to a phone
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
  return request.headers.get("x-admin-secret") === secret;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const phone = searchParams.get("phone");
  const db = getDb();

  if (phone) {
    // Chat history for one phone
    const { data, error } = await db
      .from("admin_chat_messages")
      .select("id, phone, direction, message, admin_name, created_at")
      .eq("phone", phone)
      .order("created_at", { ascending: true })
      .limit(200);

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch messages" },
        { status: 500 }
      );
    }

    // Also get customer name from orders or profiles
    const { data: orderData } = await db
      .from("orders")
      .select("name")
      .eq("phone", phone.replace(/^91/, ""))
      .order("created_at", { ascending: false })
      .limit(1);

    return NextResponse.json({
      messages: data ?? [],
      customerName: orderData?.[0]?.name ?? null,
    });
  }

  // List all conversations — get distinct phones with last message
  const { data, error } = await db
    .from("admin_chat_messages")
    .select("phone, direction, message, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }

  // Group by phone, keep the latest message per phone
  const convMap = new Map<
    string,
    {
      phone: string;
      lastMessage: string;
      lastDirection: string;
      lastAt: string;
      unread: number;
    }
  >();

  for (const row of data ?? []) {
    if (!convMap.has(row.phone)) {
      convMap.set(row.phone, {
        phone: row.phone,
        lastMessage: row.message,
        lastDirection: row.direction,
        lastAt: row.created_at,
        unread: 0,
      });
    }
    if (row.direction === "inbound") {
      const conv = convMap.get(row.phone)!;
      // Count inbound messages newer than last outbound as "unread"
      if (conv.lastDirection === "inbound") {
        conv.unread++;
      }
    }
  }

  // Sort by latest message time descending
  const conversations = Array.from(convMap.values()).sort(
    (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime()
  );

  // Enrich with customer names from orders
  const phones10 = conversations.map((c) => c.phone.replace(/^91/, ""));
  const { data: orderNames } = await db
    .from("orders")
    .select("phone, name")
    .in("phone", phones10)
    .order("created_at", { ascending: false });

  const nameMap = new Map<string, string>();
  for (const o of orderNames ?? []) {
    if (!nameMap.has(o.phone)) nameMap.set(o.phone, o.name);
  }

  const enriched = conversations.map((c) => ({
    ...c,
    customerName: nameMap.get(c.phone.replace(/^91/, "")) ?? null,
  }));

  return NextResponse.json({ conversations: enriched });
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { phone?: string; message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { phone, message } = body;
  if (!phone || !message?.trim()) {
    return NextResponse.json(
      { error: "phone and message are required" },
      { status: 400 }
    );
  }

  const digits = phone.replace(/\D/g, "");
  const to = digits.startsWith("91") ? digits : `91${digits}`;

  // Send via WhatsApp
  const result = await sendWhatsAppMessage(to, message.trim());
  if (!result.ok) {
    return NextResponse.json(
      { error: `WhatsApp send failed: ${result.error}` },
      { status: 500 }
    );
  }

  // Log outbound message
  const db = getDb();
  await db.from("admin_chat_messages").insert({
    phone: to,
    direction: "outbound",
    message: message.trim(),
    admin_name: "Admin",
  });

  return NextResponse.json({ ok: true });
}
