/**
 * Admin orders API — list and update orders.
 * Protected by ADMIN_SECRET header check (not Supabase auth).
 *
 * GET  /api/admin/orders         — list orders (newest first)
 * PATCH /api/admin/orders        — update order status
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
  const status = searchParams.get("status");
  const limit = Math.min(Number(searchParams.get("limit")) || 50, 200);
  const offset = Number(searchParams.get("offset")) || 0;

  const db = getDb();
  let query = db
    .from("orders")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("admin orders list:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }

  return NextResponse.json({ orders: data, total: count });
}

export async function PATCH(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { orderId, status } = body as {
      orderId?: string;
      status?: string;
    };

    if (!orderId || !status) {
      return NextResponse.json(
        { error: "orderId and status required" },
        { status: 400 }
      );
    }

    const validStatuses = [
      "pending",
      "confirmed",
      "preparing",
      "out_for_delivery",
      "delivered",
      "cancelled",
    ];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    const db = getDb();
    const { data, error } = await db
      .from("orders")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("order_id", orderId)
      .select()
      .single();

    if (error) {
      console.error("admin order update:", error);
      return NextResponse.json(
        { error: "Failed to update order" },
        { status: 500 }
      );
    }

    // Send WhatsApp notification for key status changes
    const phone = data?.phone;
    const oid = data?.order_id ?? orderId;
    if (phone) {
      const statusMessages: Record<string, string> = {
        confirmed: `✅ *Order Confirmed*\n\nHi ${data?.name ?? ""}! Your order *${oid}* has been confirmed. We're getting it ready!\n\n— The Shaka-Hari`,
        preparing: `👨‍🍳 *Preparing Your Order*\n\nYour order *${oid}* is being freshly prepared!\n\n— The Shaka-Hari`,
        out_for_delivery: `🚗 *Out for Delivery!*\n\nYour order *${oid}* is on its way to you. Please keep your phone handy!\n\n— The Shaka-Hari`,
        delivered: `🎉 *Delivered!*\n\nYour order *${oid}* has been delivered. Enjoy your meal! We'd love to hear your feedback.\n\n— The Shaka-Hari`,
        cancelled: `❌ *Order Cancelled*\n\nYour order *${oid}* has been cancelled. If you have questions, reach out to us on WhatsApp.\n\n— The Shaka-Hari`,
      };

      const msg = statusMessages[status];
      if (msg) {
        const waResult = await sendWhatsAppMessage(phone, msg);
        if (!waResult.ok) {
          console.error("admin: WhatsApp notify failed", waResult.error);
        }
      }
    }

    return NextResponse.json({ order: data });
  } catch (e) {
    console.error("admin PATCH error:", e);
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
