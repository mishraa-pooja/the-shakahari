/**
 * Single menu item card with badge, per-item stock, premium pricing, and photo.
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
  /** null = not tracked (sides/desserts), 0 = sold out, >0 = available */
  stockLeft?: number | null;
}

export function MenuCard({ item, stockLeft }: MenuCardProps) {
  const { addItem, updateQuantity, getQuantity } = useCartStore();
  const qty = getQuantity(item.id);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const showStrike =
    item.originalPrice != null && item.originalPrice > item.price;

  const itemSoldOut = stockLeft !== null && stockLeft !== undefined && stockLeft <= 0;
  const isTracked = stockLeft !== null && stockLeft !== undefined;

  return (
    <article
      className={`relative flex flex-col overflow-hidden rounded-lg border shadow-lg transition-transform duration-200 animate-in fade-in slide-in-from-bottom-4 duration-300 ${
        itemSoldOut
          ? "border-red-500/30 opacity-60"
          : "border-gold/50 bg-forest-dark/60 hover:-translate-y-1"
      }`}
    >
      {/* Badge */}
      {item.badge && !itemSoldOut && (
        <span className="absolute left-3 top-3 z-10 rounded-full bg-forest/90 px-3 py-1 text-xs font-semibold text-gold shadow-md backdrop-blur-sm border border-gold/30">
          {item.badge}
        </span>
      )}

      {/* Per-item stock badge */}
      {isTracked && (
        <span
          className={`absolute right-3 top-3 z-10 rounded-full px-3 py-1 text-xs font-bold shadow-md backdrop-blur-sm ${
            itemSoldOut
              ? "bg-red-500/90 text-white border border-red-400/50"
              : stockLeft! <= 3
                ? "bg-orange-500/90 text-white border border-orange-400/50"
                : "bg-forest/90 text-gold border border-gold/30"
          }`}
        >
          {itemSoldOut
            ? "Sold Out"
            : `${stockLeft} left`}
        </span>
      )}

      {item.image ? (
        <div className="relative aspect-[4/3] w-full shrink-0 bg-forest">
          <Image
            src={item.image}
            alt={item.name}
            fill
            className={`object-cover scale-110 ${itemSoldOut ? "grayscale" : ""}`}
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
          <div className="flex items-baseline gap-2">
            {showStrike && (
              <span className="text-xs text-gold/50 line-through">
                ₹{item.originalPrice}
              </span>
            )}
            <span className="text-lg font-bold text-gold">
              ₹{item.price}
            </span>
          </div>

          {itemSoldOut ? (
            <span className="rounded-md bg-red-500/20 px-4 py-2 text-sm font-bold text-red-300">
              Sold Out
            </span>
          ) : !mounted || qty === 0 ? (
            <Button
              type="button"
              size="sm"
              onClick={() => addItem(item)}
              className="shrink-0"
            >
              <Plus className="mr-1 h-4 w-4" />
              Add to Cart&nbsp;&bull;&nbsp;30 min
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
