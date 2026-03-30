/**
 * Client-safe wa.me links and order message text (no Cloud API).
 */

import type { OrderItemPayload } from "@/types";

export interface OrderWhatsAppParams {
  orderId: string;
  name: string;
  phone: string;
  address: string;
  landmark?: string;
  pincode: string;
  slot: string;
  notes?: string;
  items: OrderItemPayload[];
  total: number;
  latitude?: number;
  longitude?: number;
}

export function buildOrderWhatsAppMessage(p: OrderWhatsAppParams): string {
  const addressLine = [p.address, p.landmark, p.pincode].filter(Boolean).join(", ");
  const lines: string[] = [
    "Hi The Shaka-Hari,",
    "",
    `Please confirm my website order *${p.orderId}*`,
    "",
    `Name: ${p.name}`,
    `Phone: ${p.phone}`,
    `Address: ${addressLine}`,
    `Slot: ${p.slot}`,
  ];
  if (p.latitude != null && p.longitude != null) {
    lines.push(`Map: https://www.google.com/maps?q=${p.latitude},${p.longitude}`);
  }
  if (p.notes) lines.push(`Notes: ${p.notes}`);
  lines.push("", "Items:");
  for (const i of p.items) {
    lines.push(`- ${i.name} x${i.quantity} — ₹${i.price * i.quantity}`);
  }
  lines.push("", `Total: ₹${p.total}`, "Payment: COD");
  return lines.join("\n");
}

export function getWhatsAppDeepLink(message: string): string | null {
  const num = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, "");
  if (!num) return null;
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
}
