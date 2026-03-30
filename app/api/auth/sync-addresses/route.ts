/**
 * POST — sync saved addresses between client and phone_verified_profiles.
 *
 * Body: { action: "save", phone, addresses, full_name? }
 *     → upserts saved_addresses into DB
 *
 * Body: { action: "fetch", phone }
 *     → returns saved_addresses from DB
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceRole } from "@/lib/supabase";

export const runtime = "nodejs";

function indianMobile10(s: string): string | null {
  const d = s.replace(/\D/g, "");
  if (/^[6-9]\d{9}$/.test(d)) return d;
  if (d.length === 12 && d.startsWith("91")) return d.slice(2, 12);
  return null;
}

interface AddressPayload {
  id: string;
  label: string;
  full_name: string;
  phone: string;
  address: string;
  landmark: string;
  pincode: string;
  updated_at: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action as string;
    const phone10 = typeof body.phone === "string" ? indianMobile10(body.phone) : null;

    if (!phone10) {
      return NextResponse.json({ error: "Invalid phone" }, { status: 400 });
    }

    const db = getSupabaseServiceRole();
    if (!db) {
      return NextResponse.json(
        { error: "Server not configured for address sync" },
        { status: 500 }
      );
    }

    if (action === "fetch") {
      const { data, error } = await db
        .from("phone_verified_profiles")
        .select("saved_addresses, full_name")
        .eq("phone", phone10)
        .single();

      if (error || !data) {
        return NextResponse.json({ addresses: [], full_name: null });
      }

      return NextResponse.json({
        addresses: Array.isArray(data.saved_addresses) ? data.saved_addresses : [],
        full_name: data.full_name ?? null,
      });
    }

    if (action === "save") {
      const addresses = body.addresses as AddressPayload[] | undefined;
      const fullName = typeof body.full_name === "string" ? body.full_name.trim() : undefined;

      if (!Array.isArray(addresses)) {
        return NextResponse.json({ error: "addresses must be an array" }, { status: 400 });
      }

      const sanitized = addresses.slice(0, 10).map((a) => ({
        id: String(a.id ?? ""),
        label: String(a.label ?? ""),
        full_name: String(a.full_name ?? ""),
        phone: String(a.phone ?? ""),
        address: String(a.address ?? ""),
        landmark: String(a.landmark ?? ""),
        pincode: String(a.pincode ?? ""),
        updated_at: String(a.updated_at ?? new Date().toISOString()),
      }));

      const now = new Date().toISOString();

      const { error } = await db
        .from("phone_verified_profiles")
        .upsert(
          {
            phone: phone10,
            saved_addresses: sanitized,
            ...(fullName ? { full_name: fullName } : {}),
            updated_at: now,
          },
          { onConflict: "phone" }
        );

      if (error) {
        console.error("sync-addresses save:", error);
        return NextResponse.json({ error: "Failed to save" }, { status: 500 });
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error("sync-addresses error:", e);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
