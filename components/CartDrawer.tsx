/**
 * Floating cart button with badge; Sheet drawer with item list, qty, total, Proceed to Checkout.
 */

"use client";

import { useState } from "react";
import { ShoppingBag, Plus, Minus, X } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
} from "@/components/ui/sheet";
import { CheckoutModal } from "@/components/CheckoutModal";

export function CartDrawer() {
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const { items, updateQuantity, removeItem, getTotal, isDrawerOpen, setDrawerOpen } = useCartStore();
  const total = getTotal();

  const openCheckout = () => {
    setDrawerOpen(false);
    setCheckoutOpen(true);
  };

  return (
    <>
      <Sheet open={isDrawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="flex flex-col">
          <SheetHeader>
            <SheetTitle>Your Cart</SheetTitle>
          </SheetHeader>
          <SheetBody className="flex flex-1 flex-col gap-4">
            {items.length === 0 ? (
              <p className="py-8 text-center text-gold/70">
                Your cart is empty. Add something from the menu!
              </p>
            ) : (
              <>
                <ul className="space-y-4">
                  {items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-2 border-b border-gold/20 pb-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gold">{item.name}</p>
                        <p className="text-sm text-gold/70">
                          ₹{item.price} × {item.quantity} = ₹
                          {item.price * item.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity - 1)
                          }
                          aria-label="Decrease"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-6 text-center text-gold">
                          {item.quantity}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity + 1)
                          }
                          aria-label="Increase"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(item.id)}
                          aria-label="Remove"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto border-t border-gold/30 pt-4">
                  <p className="flex justify-between text-lg font-semibold text-gold">
                    <span>Total</span>
                    <span>₹{total}</span>
                  </p>
                  <Button
                    type="button"
                    className="mt-4 w-full"
                    onClick={openCheckout}
                  >
                    Proceed to Checkout
                  </Button>
                </div>
              </>
            )}
          </SheetBody>
        </SheetContent>
      </Sheet>

      <CheckoutModal open={checkoutOpen} onOpenChange={setCheckoutOpen} />
    </>
  );
}
