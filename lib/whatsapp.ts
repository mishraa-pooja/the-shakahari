/**
 * WhatsApp Cloud API — outbound text messages (server-side only).
 * Used by webhooks and other API routes. Not for wa.me links.
 */

const GRAPH_VERSION = "v19.0";

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * Send a text message via WhatsApp Cloud API.
 * `to` should be digits only (country code + number), no + prefix.
 */
export async function sendWhatsAppMessage(
  to: string,
  message: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    console.error("whatsapp: missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID");
    return { ok: false, error: "WhatsApp not configured" };
  }

  const toDigits = normalizePhone(to);
  if (!toDigits) {
    return { ok: false, error: "Invalid recipient" };
  }

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: toDigits,
        type: "text",
        text: { body: message },
      }),
    });

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

    if (!res.ok) {
      const errMsg =
        typeof data.error === "object" &&
        data.error !== null &&
        "message" in data.error
          ? String((data.error as { message?: string }).message)
          : res.statusText;
      console.error("whatsapp send failed:", res.status, data);
      return { ok: false, error: errMsg };
    }

    return { ok: true };
  } catch (e) {
    console.error("whatsapp send exception:", e);
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

/**
 * True if `from` matches our business WhatsApp number (ignore self-echo edge cases).
 */
export function isLikelyOwnNumber(from: string): boolean {
  const our = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  if (!our) return false;
  return normalizePhone(from) === normalizePhone(our);
}
