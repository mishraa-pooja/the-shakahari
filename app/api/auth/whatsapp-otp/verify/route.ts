/**
 * POST — verify 6-digit code against sealed cookie; clears cookie on success.
 * Upserts public.phone_verified_profiles (order phone) when SUPABASE_SERVICE_ROLE_KEY is set.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  codesEqual,
  unsealWaOtpPayload,
  WA_OTP_COOKIE,
} from "@/lib/whatsapp-otp-cookie";
import { getSupabaseServiceRole } from "@/lib/supabase";

export const runtime = "nodejs";

async function recordPhoneVerification(
  phone10: string,
  fullName?: string | null
): Promise<{ isFirstVerification: boolean; dbUpdated: boolean }> {
  const sb = getSupabaseServiceRole();
  if (!sb) {
    console.warn(
      "whatsapp-otp verify: SUPABASE_SERVICE_ROLE_KEY not set; skipping phone_verified_profiles upsert"
    );
    return { isFirstVerification: true, dbUpdated: false };
  }

  const { data: existing, error: selErr } = await sb
    .from("phone_verified_profiles")
    .select("phone, verification_count")
    .eq("phone", phone10)
    .maybeSingle();

  if (selErr) {
    console.error("phone_verified_profiles select:", selErr);
    return { isFirstVerification: true, dbUpdated: false };
  }

  const now = new Date().toISOString();
  const isFirstVerification = !existing;

  if (isFirstVerification) {
    const { error: insErr } = await sb.from("phone_verified_profiles").insert({
      phone: phone10,
      whatsapp_verified_at: now,
      first_verified_at: now,
      last_verified_at: now,
      verification_count: 1,
      full_name: fullName?.trim() || null,
      updated_at: now,
    });
    if (insErr) {
      console.error("phone_verified_profiles insert:", insErr);
      return { isFirstVerification: true, dbUpdated: false };
    }
  } else {
    const nextCount =
      typeof existing.verification_count === "number"
        ? existing.verification_count + 1
        : 2;
    const patch: Record<string, unknown> = {
      whatsapp_verified_at: now,
      last_verified_at: now,
      verification_count: nextCount,
      updated_at: now,
    };
    if (fullName?.trim()) patch.full_name = fullName.trim();
    const { error: upErr } = await sb
      .from("phone_verified_profiles")
      .update(patch)
      .eq("phone", phone10);
    if (upErr) {
      console.error("phone_verified_profiles update:", upErr);
      return { isFirstVerification: false, dbUpdated: false };
    }
  }

  return { isFirstVerification, dbUpdated: true };
}

export async function POST(req: NextRequest) {
  const sealed = req.cookies.get(WA_OTP_COOKIE)?.value;
  if (!sealed) {
    return NextResponse.json(
      { error: "No active code. Tap resend or place a new order." },
      { status: 400 }
    );
  }

  const payload = unsealWaOtpPayload(sealed);

  if (!payload || Date.now() > payload.exp) {
    const res = NextResponse.json({ error: "Code expired. Request a new one." }, { status: 400 });
    res.cookies.set(WA_OTP_COOKIE, "", { maxAge: 0, path: "/" });
    return res;
  }

  const body = (await req.json()) as { code?: string; full_name?: string };
  const code =
    typeof body.code === "string" ? body.code.replace(/\s/g, "") : "";
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json(
      { error: "Enter the 6-digit code from WhatsApp." },
      { status: 400 }
    );
  }

  if (!codesEqual(code, payload.code)) {
    return NextResponse.json({ error: "Incorrect code." }, { status: 401 });
  }

  const fullName =
    typeof body.full_name === "string" ? body.full_name : undefined;

  const { isFirstVerification, dbUpdated } = await recordPhoneVerification(
    payload.orderPhone10,
    fullName
  );

  const res = NextResponse.json({
    ok: true,
    /** False if SUPABASE_SERVICE_ROLE_KEY missing or DB error — then first/returning flags are omitted. */
    dbUpdated,
    ...(dbUpdated
      ? {
          isFirstVerification,
          isReturningVerification: !isFirstVerification,
        }
      : {}),
  });
  res.cookies.set(WA_OTP_COOKIE, "", { maxAge: 0, path: "/" });
  return res;
}
