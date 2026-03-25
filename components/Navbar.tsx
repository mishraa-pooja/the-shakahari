/**
 * Sticky navbar with logo and Order Now CTA that smooth-scrolls to menu.
 */

"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { ShoppingBag } from "lucide-react";
import { useCartStore } from "@/store/cartStore";

const MENU_SECTION_ID = "menu";

export function Navbar() {
  const { items, openDrawer } = useCartStore();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const count = mounted ? items.reduce((acc, i) => acc + i.quantity, 0) : 0;

  const scrollToMenu = () => {
    document.getElementById(MENU_SECTION_ID)?.scrollIntoView({
      behavior: "smooth",
    });
  };

  return (
    <header
      className="sticky top-0 z-40 w-full border-b border-gold/20 bg-forest/95 backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-300"
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="relative h-16 w-36 shrink-0 sm:w-48">
          <Image
            src="/images/LogoSH.png"
            alt="THE SHAKA-HARI"
            fill
            className="object-contain object-left"
            priority
            sizes="112px"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openDrawer}
            className="relative flex h-10 w-10 items-center justify-center rounded-md border border-gold bg-gold/20 text-gold transition hover:bg-gold/30 focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2 focus:ring-offset-forest"
            aria-label={`Open cart, ${count} items`}
          >
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-[10px] font-bold text-forest">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={scrollToMenu}
            className="rounded-md border border-gold/40 bg-transparent px-4 py-2 text-sm font-medium text-gold/80 transition-colors hover:bg-gold/10 hover:text-gold focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2 focus:ring-offset-forest"
          >
            Order Now
          </button>
        </div>
      </nav>
    </header>
  );
}
