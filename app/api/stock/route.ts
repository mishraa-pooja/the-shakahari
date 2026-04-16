/**
 * GET  /api/stock  — public: per-item stock counts
 * POST /api/stock  — public: add phone to restock waitlist
 */

import { NextResponse, type NextRequest } from "next/server";
import { getSupabase, getSupabaseServiceRole } from "@/lib/supabase";
import { getAllStock } from "@/lib/stock";

export async function GET() {
  const db = getSupabaseServiceRole() ?? getSupabase();
  const items = await getAllStock(db);
  const total = Object.values(items).reduce((a, b) => a + b, 0);
  return NextResponse.json({ items, total });
}

export async function POST(request: NextRequest) {
  let body: { phone?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const phone = body.phone?.replace(/\D/g, "").slice(-10);
  if (!phone || phone.length !== 10) {
    return NextResponse.json(
      { error: "Valid 10-digit phone required" },
      { status: 400 }
    );
  }

  const db = getSupabaseServiceRole() ?? getSupabase();
  await db
    .from("stock_waitlist")
    .upsert(
      { phone, created_at: new Date().toISOString() },
      { onConflict: "phone" }
    );

  return NextResponse.json({
    ok: true,
    message: "You'll be notified when we're back!",
  });
}
