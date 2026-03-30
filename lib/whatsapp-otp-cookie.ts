/**
 * Sealed OTP challenge in an HttpOnly cookie (serverless-friendly; no DB).
 * Requires WHATSAPP_OTP_SECRET (long random string).
 */

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";

export const WA_OTP_COOKIE = "shaka_wa_otp";

const SALT = Buffer.from("shaka-wa-otp-v1", "utf8");
const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

export type WaOtpPayload = {
  orderPhone10: string;
  waToDigits: string;
  orderId: string;
  code: string;
  exp: number;
};

function getKey(): Buffer {
  const secret = process.env.WHATSAPP_OTP_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("WHATSAPP_OTP_SECRET must be set (min 16 chars)");
  }
  return scryptSync(secret, SALT, 32);
}

export function sealWaOtpPayload(p: WaOtpPayload): string {
  const key = getKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const json = JSON.stringify(p);
  const enc = Buffer.concat([cipher.update(json, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64url");
}

export function unsealWaOtpPayload(sealed: string): WaOtpPayload | null {
  try {
    const key = getKey();
    const buf = Buffer.from(sealed, "base64url");
    const iv = buf.subarray(0, IV_LEN);
    const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
    const enc = buf.subarray(IV_LEN + TAG_LEN);
    const decipher = createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    const json = Buffer.concat([decipher.update(enc), decipher.final()]).toString(
      "utf8"
    );
    return JSON.parse(json) as WaOtpPayload;
  } catch {
    return null;
  }
}

export function codesEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a.trim(), "utf8");
  const bb = Buffer.from(b.trim(), "utf8");
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export const WA_OTP_COOKIE_MAX_AGE = 600;
