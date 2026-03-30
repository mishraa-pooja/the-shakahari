/**
 * Client-side helpers to sync addresses with Supabase via /api/auth/sync-addresses.
 */

import type { SavedAddress } from "@/store/deliveryProfileStore";

export async function saveAddressesToServer(
  phone: string,
  addresses: SavedAddress[],
  fullName?: string
): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/sync-addresses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "save",
        phone,
        addresses,
        ...(fullName ? { full_name: fullName } : {}),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchAddressesFromServer(
  phone: string
): Promise<{ addresses: SavedAddress[]; full_name: string | null }> {
  try {
    const res = await fetch("/api/auth/sync-addresses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "fetch", phone }),
    });
    if (!res.ok) return { addresses: [], full_name: null };
    const data = await res.json();
    return {
      addresses: Array.isArray(data.addresses) ? data.addresses : [],
      full_name: data.full_name ?? null,
    };
  } catch {
    return { addresses: [], full_name: null };
  }
}
