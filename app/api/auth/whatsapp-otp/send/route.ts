/**
 * POST — send 6-digit OTP to customer's WhatsApp via Cloud API; sets HttpOnly cookie with sealed challenge.
 */

import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "node:crypto";
import { sendWhatsAppTemplateOtp } from "@/lib/whatsapp";
import {
  sealWaOtpPayload,
  WA_OTP_COOKIE,
  WA_OTP_COOKIE_MAX_AGE,
} from "@/lib/whatsapp-otp-cookie";

export const runtime = "nodejs";

function indianMobile10(s: string): string | null {
  const d = s.replace(/\D/g, "");
  if (/^[6-9]\d{9}$/.test(d)) return d;
  if (d.length === 12 && d.startsWith("91")) return d.slice(2, 12);
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      orderId?: string;
      orderPhone?: string;
      waPhone?: string;
    };

    const orderId =
      typeof body.orderId === "string" ? body.orderId.trim() : "";
    const orderPhone =
      typeof body.orderPhone === "string" ? body.orderPhone : "";
    const waPhoneAlt =
      typeof body.waPhone === "string" ? body.waPhone.trim() : "";

    const order10 = indianMobile10(orderPhone);
    if (!orderId || !order10) {
      return NextResponse.json(
        { error: "Invalid order or phone number." },
        { status: 400 }
      );
    }

    const dest10 = waPhoneAlt ? indianMobile10(waPhoneAlt) : order10;
    if (!dest10) {
      return NextResponse.json(
        { error: "Invalid WhatsApp number (use 10 digits)." },
        { status: 400 }
      );
    }

    const waToDigits = `91${dest10}`;
    const code = String(randomInt(100000, 1000000));
    const exp = Date.now() + WA_OTP_COOKIE_MAX_AGE * 1000;

    let sealed: string;
    try {
      sealed = sealWaOtpPayload({
        orderPhone10: order10,
        waToDigits,
        orderId,
        code,
        exp,
      });
    } catch (e) {
      console.error("whatsapp-otp seal:", e);
      return NextResponse.json(
        {
          error:
            "WhatsApp OTP is not configured. Set WHATSAPP_OTP_SECRET on the server.",
        },
        { status: 503 }
      );
    }

    const send = await sendWhatsAppTemplateOtp(waToDigits, code);
    if (!send.ok) {
      return NextResponse.json(
        { error: send.error || "Failed to send WhatsApp message." },
        { status: 502 }
      );
    }

    const res = NextResponse.json({
      ok: true,
      sentTo: `+91 ${dest10}`,
    });

    res.cookies.set(WA_OTP_COOKIE, sealed, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: WA_OTP_COOKIE_MAX_AGE,
      path: "/",
    });

    return res;
  } catch (e) {
    console.error("whatsapp-otp send:", e);
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
