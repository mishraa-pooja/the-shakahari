/**
 * WhatsApp Cloud API — outbound messaging (server-side only).
 * Supports: text, interactive buttons, interactive lists, template OTP.
 */

const GRAPH_VERSION = "v19.0";

function getBaseUrl(): string {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  return `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`;
}

function getHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
    "Content-Type": "application/json",
  };
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

function ensureConfigured(): string | null {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) return "WhatsApp not configured";
  return null;
}

type WaResult = { ok: true } | { ok: false; error: string };

async function postMessage(payload: object): Promise<WaResult> {
  const configErr = ensureConfigured();
  if (configErr) return { ok: false, error: configErr };

  try {
    const res = await fetch(getBaseUrl(), {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
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
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

/** True if `from` matches our business WhatsApp number. */
export function isLikelyOwnNumber(from: string): boolean {
  const our = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  if (!our) return false;
  return normalizePhone(from) === normalizePhone(our);
}

/** Send a plain text message. */
export async function sendWhatsAppMessage(
  to: string,
  message: string
): Promise<WaResult> {
  const toDigits = normalizePhone(to);
  if (!toDigits) return { ok: false, error: "Invalid recipient" };

  return postMessage({
    to: toDigits,
    type: "text",
    text: { body: message },
  });
}

/** Welcome greeting with 3 interactive buttons. */
export async function sendGreeting(to: string): Promise<WaResult> {
  const toDigits = normalizePhone(to);
  if (!toDigits) return { ok: false, error: "Invalid recipient" };

  return postMessage({
    to: toDigits,
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text: "Hi! Welcome to Shaka-Hari 🌿\n\nHow can we help you today?",
      },
      action: {
        buttons: [
          { type: "reply", reply: { id: "MENU", title: "🍽️ View Menu" } },
          { type: "reply", reply: { id: "ORDER", title: "🛒 Order Online" } },
          {
            type: "reply",
            reply: { id: "LOCATION", title: "📍 Location" },
          },
        ],
      },
    },
  });
}

/** Interactive list with menu sections — items sourced from menuData. */
export async function sendMenu(to: string): Promise<WaResult> {
  const toDigits = normalizePhone(to);
  if (!toDigits) return { ok: false, error: "Invalid recipient" };

  const { menuItems } = await import("@/data/menuData");

  const biryanis = menuItems.filter((i) =>
    i.name.toLowerCase().includes("biryani")
  );
  const others = menuItems.filter(
    (i) => !i.name.toLowerCase().includes("biryani")
  );

  const toRow = (item: (typeof menuItems)[number]) => ({
    id: `ITEM_${item.id.toUpperCase().replace(/-/g, "_")}`,
    title: item.name,
    description: `₹${item.price} — ${item.description.slice(0, 60)}`,
  });

  const sections: { title: string; rows: ReturnType<typeof toRow>[] }[] = [];
  if (biryanis.length > 0) {
    sections.push({ title: "Biryanis", rows: biryanis.map(toRow) });
  }
  if (others.length > 0) {
    sections.push({ title: "Sides & Desserts", rows: others.map(toRow) });
  }

  return postMessage({
    to: toDigits,
    type: "interactive",
    interactive: {
      type: "list",
      body: {
        text: "Here's our menu 🌿 Tap a category to explore:",
      },
      action: {
        button: "View Menu",
        sections,
      },
    },
  });
}

/**
 * Send OTP via an approved Cloud API template.
 * Falls back to plain text if WHATSAPP_OTP_TEMPLATE_NAME is not set.
 */
export async function sendWhatsAppTemplateOtp(
  to: string,
  code: string
): Promise<WaResult> {
  const templateName = process.env.WHATSAPP_OTP_TEMPLATE_NAME?.trim();
  const lang = process.env.WHATSAPP_OTP_TEMPLATE_LANG?.trim() || "en";

  if (!templateName) {
    const body = `Your Shaka-Hari verification code is *${code}*. Valid 10 minutes. Do not share this code.`;
    return sendWhatsAppMessage(to, body);
  }

  const configErr = ensureConfigured();
  if (configErr) return { ok: false, error: configErr };

  const toDigits = normalizePhone(to);
  if (!toDigits) return { ok: false, error: "Invalid recipient" };

  return postMessage({
    to: toDigits,
    type: "template",
    template: {
      name: templateName,
      language: { code: lang },
      components: [
        {
          type: "body",
          parameters: [{ type: "text", text: code }],
        },
        {
          type: "button",
          sub_type: "url",
          index: "0",
          parameters: [{ type: "text", text: code }],
        },
      ],
    },
  });
}
