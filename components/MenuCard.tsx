/**
 * Single menu item card: name, description, price, Add to Cart / qty controls.
 */

"use client";

import { useState, useEffect } from "react";
import { Plus, Minus } from "lucide-react";
import type { MenuItem } from "@/types";
import { useCartStore } from "@/store/cartStore";
import { Button } from "@/components/ui/button";

export interface MenuCardProps {
  item: MenuItem;
}

export function MenuCard({ item }: MenuCardProps) {
  const { addItem, updateQuantity, getQuantity } = useCartStore();
  const qty = getQuantity(item.id);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <article
      className="flex flex-col rounded-lg border border-gold/50 bg-forest-dark/60 p-5 shadow-lg transition-transform duration-200 hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <h3 className="font-playfair text-xl font-semibold text-gold">
        {item.name}
      </h3>
      <p className="mt-1 text-sm text-gold/80">{item.description}</p>
      <div className="mt-4 flex items-center justify-between gap-4">
        <span className="font-semibold text-gold">₹{item.price}</span>
        {!mounted || qty === 0 ? (
          <Button
            type="button"
            size="sm"
            onClick={() => addItem(item)}
            className="shrink-0"
          >
            <Plus className="mr-1 h-4 w-4" />
            Add to Cart
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => updateQuantity(item.id, qty - 1)}
              aria-label="Decrease quantity"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="min-w-[1.5rem] text-center font-medium text-gold">
              {qty}
            </span>
            <Button
              type="button"
              size="icon"
              onClick={() => updateQuantity(item.id, qty + 1)}
              aria-label="Increase quantity"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </article>
  );
}
