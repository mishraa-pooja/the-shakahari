/**
 * Zustand cart store with localStorage persistence.
 * Manages items, quantity updates, and totals.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, MenuItem } from "@/types";

interface CartState {
  items: CartItem[];
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  setDrawerOpen: (open: boolean) => void;
  addItem: (item: MenuItem, quantity?: number) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  getQuantity: (id: string) => number;
  getTotal: () => number;
  clearCart: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isDrawerOpen: false,
      openDrawer: () => set({ isDrawerOpen: true }),
      closeDrawer: () => set({ isDrawerOpen: false }),
      setDrawerOpen: (open: boolean) => set({ isDrawerOpen: open }),

      addItem: (item: MenuItem, quantity = 1) => {
        set((state) => {
          const existing = state.items.find((i) => i.id === item.id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.id === item.id
                  ? { ...i, quantity: i.quantity + quantity }
                  : i
              ),
            };
          }
          return {
            items: [...state.items, { ...item, quantity }],
          };
        });
      },

      removeItem: (id: string) => {
        set((state) => ({
          items: state.items.filter((i) => i.id !== id),
        }));
      },

      updateQuantity: (id: string, quantity: number) => {
        if (quantity < 1) {
          get().removeItem(id);
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.id === id ? { ...i, quantity } : i
          ),
        }));
      },

      getQuantity: (id: string) => {
        const item = get().items.find((i) => i.id === id);
        return item?.quantity ?? 0;
      },

      getTotal: () => {
        return get().items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        );
      },

      clearCart: () => set({ items: [] }),
    }),
    {
      name: "shaka-hari-cart",
      partialize: (state) => ({ items: state.items }),
    }
  )
);
