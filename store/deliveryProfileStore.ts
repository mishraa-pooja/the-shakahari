/**
 * Delivery details persisted on this device via localStorage.
 * Supports multiple saved addresses and WhatsApp verification status.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SavedAddress = {
  id: string;
  label: string;
  full_name: string;
  phone: string;
  address: string;
  landmark: string;
  pincode: string;
  updated_at: string;
};

export type SavedDeliveryProfile = {
  full_name: string;
  phone: string;
  addresses: SavedAddress[];
  /** Currently selected address id for checkout prefill */
  activeAddressId: string | null;
  updated_at: string;
  whatsapp_verified_at?: string | null;
};

type DeliveryProfileState = {
  profile: SavedDeliveryProfile | null;

  /** Save/update profile after an order (creates or updates address) */
  setProfile: (p: {
    full_name: string;
    phone: string;
    address: string;
    landmark?: string | null;
    pincode: string;
  }) => void;

  /** Add a new address to existing profile */
  addAddress: (addr: Omit<SavedAddress, "id" | "updated_at">) => void;

  /** Remove an address by id */
  removeAddress: (id: string) => void;

  /** Set the active address for checkout */
  setActiveAddress: (id: string) => void;

  markWhatsappVerified: () => void;
  clearProfile: () => void;
};

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function findMatchingAddress(
  addresses: SavedAddress[],
  pincode: string,
  address: string
): SavedAddress | undefined {
  return addresses.find(
    (a) =>
      a.pincode === pincode &&
      a.address.toLowerCase().trim() === address.toLowerCase().trim()
  );
}

export const useDeliveryProfileStore = create<DeliveryProfileState>()(
  persist(
    (set) => ({
      profile: null,

      setProfile: (p) =>
        set((state) => {
          const now = new Date().toISOString();
          const existingAddresses = state.profile?.addresses ?? [];
          const match = findMatchingAddress(
            existingAddresses,
            p.pincode,
            p.address
          );

          let addresses: SavedAddress[];
          let activeId: string;

          if (match) {
            addresses = existingAddresses.map((a) =>
              a.id === match.id
                ? {
                    ...a,
                    full_name: p.full_name,
                    phone: p.phone,
                    address: p.address,
                    landmark: (p.landmark ?? "").trim(),
                    pincode: p.pincode,
                    updated_at: now,
                  }
                : a
            );
            activeId = match.id;
          } else {
            const newId = generateId();
            addresses = [
              ...existingAddresses,
              {
                id: newId,
                label:
                  existingAddresses.length === 0
                    ? "Home"
                    : `Address ${existingAddresses.length + 1}`,
                full_name: p.full_name,
                phone: p.phone,
                address: p.address,
                landmark: (p.landmark ?? "").trim(),
                pincode: p.pincode,
                updated_at: now,
              },
            ];
            activeId = newId;
          }

          const samePhone =
            state.profile?.phone === p.phone &&
            Boolean(state.profile?.whatsapp_verified_at);

          return {
            profile: {
              full_name: p.full_name,
              phone: p.phone,
              addresses,
              activeAddressId: activeId,
              updated_at: now,
              whatsapp_verified_at: samePhone
                ? state.profile!.whatsapp_verified_at
                : null,
            },
          };
        }),

      addAddress: (addr) =>
        set((state) => {
          if (!state.profile) return {};
          const newId = generateId();
          const now = new Date().toISOString();
          return {
            profile: {
              ...state.profile,
              full_name: addr.full_name.trim() || state.profile.full_name,
              phone: addr.phone.trim() || state.profile.phone,
              updated_at: now,
              addresses: [
                ...state.profile.addresses,
                {
                  ...addr,
                  id: newId,
                  updated_at: now,
                },
              ],
              activeAddressId: newId,
            },
          };
        }),

      removeAddress: (id) =>
        set((state) => {
          if (!state.profile) return {};
          const filtered = state.profile.addresses.filter((a) => a.id !== id);
          if (filtered.length === 0) return { profile: null };
          return {
            profile: {
              ...state.profile,
              addresses: filtered,
              activeAddressId:
                state.profile.activeAddressId === id
                  ? filtered[0].id
                  : state.profile.activeAddressId,
            },
          };
        }),

      setActiveAddress: (id) =>
        set((state) =>
          state.profile
            ? { profile: { ...state.profile, activeAddressId: id } }
            : {}
        ),

      markWhatsappVerified: () =>
        set((state) =>
          state.profile
            ? {
                profile: {
                  ...state.profile,
                  whatsapp_verified_at: new Date().toISOString(),
                },
              }
            : {}
        ),

      clearProfile: () => set({ profile: null }),
    }),
    {
      name: "shaka-hari-delivery-profile",
      version: 2,
      migrate: (persisted: unknown, version: number) => {
        if (version < 2) {
          const old = persisted as Record<string, unknown> | null;
          if (old && typeof old === "object" && "profile" in old) {
            const p = old.profile as Record<string, string> | null;
            if (p && p.phone) {
              const id = generateId();
              return {
                profile: {
                  full_name: p.full_name ?? "",
                  phone: p.phone,
                  addresses: [
                    {
                      id,
                      label: "Home",
                      full_name: p.full_name ?? "",
                      phone: p.phone,
                      address: p.address ?? "",
                      landmark: p.landmark ?? "",
                      pincode: p.pincode ?? "",
                      updated_at: p.updated_at ?? new Date().toISOString(),
                    },
                  ],
                  activeAddressId: id,
                  updated_at: p.updated_at ?? new Date().toISOString(),
                  whatsapp_verified_at: p.whatsapp_verified_at ?? null,
                },
              };
            }
          }
        }
        return persisted as DeliveryProfileState;
      },
    }
  )
);
