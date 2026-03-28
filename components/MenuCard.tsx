/**
 * Single menu item card: optional photo, name, description, price, Add to Cart / qty controls.
 */

"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
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
      className="flex flex-col overflow-hidden rounded-lg border border-gold/50 bg-forest-dark/60 shadow-lg transition-transform duration-200 hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      {item.image ? (
        <div className="relative aspect-[4/3] w-full shrink-0 bg-forest">
          <Image
            src={item.image}
            alt={item.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
      ) : null}
      <div className="flex flex-col p-5">
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
      </div>
    </article>
  );
}
