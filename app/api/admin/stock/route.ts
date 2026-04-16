/**
 * Admin per-item stock management.
 *
 * GET   /api/admin/stock — all item stocks + waitlist count
 * PATCH /api/admin/stock — set stock for one item (notifies waitlist on restock from all-zero)
 */

import { NextResponse, type NextRequest } from "next/server";
import { getSupabase, getSupabaseServiceRole } from "@/lib/supabase";
import { getAllStock, setItemStock, TRACKED_IDS } from "@/lib/stock";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

function getDb() {
  const sr = getSupabaseServiceRole();
  if (!sr) {
    console.warn("admin/stock: SUPABASE_SERVICE_ROLE_KEY not set, writes will fail");
  }
  return sr ?? getSupabase();
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

  const db = getDb();
  const [items, { count: waitlistCount }] = await Promise.all([
    getAllStock(db),
    db.from("stock_waitlist").select("phone", { count: "exact", head: true }),
  ]);

  const total = Object.values(items).reduce((a, b) => a + b, 0);

  return NextResponse.json({ items, total, waitlistCount: waitlistCount ?? 0 });
}

export async function PATCH(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { itemId?: string; stock?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { itemId, stock: newStock } = body;

  if (!itemId || !TRACKED_IDS.includes(itemId)) {
    return NextResponse.json(
      { error: `itemId must be one of: ${TRACKED_IDS.join(", ")}` },
      { status: 400 }
    );
  }
  if (newStock == null || newStock < 0) {
    return NextResponse.json(
      { error: "stock must be a non-negative number" },
      { status: 400 }
    );
  }

  const db = getDb();

  // Get old stocks to detect all-zero → some-available transition
  const oldItems = await getAllStock(db);
  const oldTotal = Object.values(oldItems).reduce((a, b) => a + b, 0);

  try {
    await setItemStock(db, itemId, newStock);
  } catch (e) {
    console.error("admin stock PATCH setItemStock:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to update stock" },
      { status: 500 }
    );
  }

  let notified = 0;
  const newTotal = oldTotal - (oldItems[itemId] ?? 0) + newStock;

  // When going from total 0 → >0, notify waitlist
  if (oldTotal === 0 && newTotal > 0) {
    const { data: waitlist } = await db
      .from("stock_waitlist")
      .select("phone");

    if (waitlist && waitlist.length > 0) {
      const msg =
        `\u{1F389} *We're Back!*\n\n` +
        `Fresh biryani boxes are ready!\n\n` +
        `Order now before they're gone:\n` +
        `\u{1F310} https://theshakahari.com\n` +
        `Or reply *menu* to order here.\n\n` +
        `\u2014 The Shaka-Hari \u{1F33F}`;

      const sends = waitlist.map((w) =>
        sendWhatsAppMessage(`91${w.phone}`, msg).catch(() => null)
      );
      await Promise.all(sends);
      notified = waitlist.length;

      await db.from("stock_waitlist").delete().neq("phone", "");
    }
  }

  const items = await getAllStock(db);

  return NextResponse.json({
    ok: true,
    items,
    total: Object.values(items).reduce((a, b) => a + b, 0),
    notified,
  });
}
