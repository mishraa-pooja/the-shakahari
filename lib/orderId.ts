/**
 * Generates a unique order ID in format SH-YYYYMMDD-XXXX (4-digit random).
 */

export function generateOrderId(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `SH-${y}${m}${d}-${random}`;
}
