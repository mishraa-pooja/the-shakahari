/**
 * Reactive hook that syncs local addresses → Supabase whenever
 * the profile is WhatsApp-verified and addresses change.
 *
 * Place in a component that is always mounted (e.g. Navbar).
 */

"use client";

import { useEffect, useRef } from "react";
import { useDeliveryProfileStore } from "@/store/deliveryProfileStore";
import { saveAddressesToServer } from "@/lib/sync-addresses";

export function useAddressSync() {
  const profile = useDeliveryProfileStore((s) => s.profile);
  const lastFingerprintRef = useRef<string | null>(null);

  useEffect(() => {
    if (!profile?.whatsapp_verified_at) return;
    if (profile.addresses.length === 0) return;

    const fingerprint = JSON.stringify(
      profile.addresses.map((a) => `${a.id}|${a.updated_at}`)
    );

    if (fingerprint === lastFingerprintRef.current) return;
    lastFingerprintRef.current = fingerprint;

    saveAddressesToServer(
      profile.phone,
      profile.addresses,
      profile.full_name
    ).catch(() => {});
  }, [profile]);
}
