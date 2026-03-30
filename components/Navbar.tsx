/**
 * Sticky navbar: logo, account/addresses, cart, Order Now.
 */

"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShoppingBag, LogOut, User, ChevronDown, MapPin, Trash2, Plus } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { useDeliveryProfileStore } from "@/store/deliveryProfileStore";
import { useAuth } from "@/components/AuthProvider";
import { LoginModal } from "@/components/LoginModal";
import { AddAddressModal } from "@/components/AddAddressModal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAddressSync } from "@/hooks/useAddressSync";

const MENU_SECTION_ID = "menu";

export function Navbar() {
  useAddressSync();
  const { items, openDrawer } = useCartStore();
  const { user, signOut, loading: authLoading } = useAuth();
  const savedLocal = useDeliveryProfileStore((s) => s.profile);
  const removeAddress = useDeliveryProfileStore((s) => s.removeAddress);
  const setActiveAddress = useDeliveryProfileStore((s) => s.setActiveAddress);
  const clearProfile = useDeliveryProfileStore((s) => s.clearProfile);
  const [mounted, setMounted] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [addAddressOpen, setAddAddressOpen] = useState(false);
  const [addrPanelOpen, setAddrPanelOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);
  const count = mounted ? items.reduce((acc, i) => acc + i.quantity, 0) : 0;

  useEffect(() => {
    if (!addrPanelOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setAddrPanelOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [addrPanelOpen]);

  const scrollToMenu = () => {
    document.getElementById(MENU_SECTION_ID)?.scrollIntoView({
      behavior: "smooth",
    });
  };

  const showGuestSaved = !user && Boolean(savedLocal?.phone);
  const displayName =
    user
      ? "Signed in"
      : savedLocal?.full_name
        ? savedLocal.full_name.split(" ")[0]
        : "Signed in";

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-gold/20 bg-forest/95 backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-300">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
          <Link
            href="/"
            className="relative block h-16 min-w-0 flex-1 sm:w-48 sm:flex-none"
            aria-label="THE SHAKA-HARI — Home"
          >
            <Image
              src="/images/LogoSH.png"
              alt="THE SHAKA-HARI"
              fill
              className="object-contain object-left"
              priority
              sizes="112px"
            />
          </Link>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            {!authLoading && (
              <>
                {user ? (
                  <div className="flex items-center gap-1.5">
                    <span className="max-w-[4.5rem] truncate text-[10px] font-medium leading-tight text-gold/85 sm:max-w-[7rem] sm:text-xs md:max-w-[9rem]">
                      Signed in
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 shrink-0 text-gold/80"
                      onClick={() => void signOut()}
                      aria-label="Sign out"
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </div>
                ) : showGuestSaved ? (
                  <div className="relative" ref={panelRef}>
                    <button
                      type="button"
                      className="flex items-center gap-1 rounded-md px-2 py-1.5 text-gold/85 transition hover:bg-gold/10"
                      onClick={() => setAddrPanelOpen((o) => !o)}
                    >
                      <User className="h-4 w-4 shrink-0" />
                      <span className="max-w-[5rem] truncate text-[10px] font-medium sm:max-w-[8rem] sm:text-xs">
                        {displayName}
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-3 w-3 transition-transform",
                          addrPanelOpen && "rotate-180"
                        )}
                      />
                    </button>

                    {addrPanelOpen && savedLocal && (
                      <div className="absolute right-0 top-full z-50 mt-1 w-72 rounded-lg border border-gold/30 bg-forest shadow-xl sm:w-80">
                        <div className="border-b border-gold/20 px-4 py-3">
                          <p className="text-sm font-semibold text-gold">
                            {savedLocal.full_name || "Guest"}
                          </p>
                          <p className="text-xs text-gold/60">
                            {savedLocal.phone}
                          </p>
                        </div>

                        <div className="max-h-48 overflow-y-auto p-2">
                          {savedLocal.addresses.map((addr) => (
                            <div
                              key={addr.id}
                              className={cn(
                                "group flex items-start gap-2 rounded-md p-2 transition",
                                addr.id === savedLocal.activeAddressId
                                  ? "bg-gold/15"
                                  : "hover:bg-gold/5"
                              )}
                            >
                              <button
                                type="button"
                                className="flex flex-1 items-start gap-2 text-left"
                                onClick={() => {
                                  setActiveAddress(addr.id);
                                  setAddrPanelOpen(false);
                                }}
                              >
                                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold/60" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-medium text-gold/90">
                                    {addr.label}
                                  </p>
                                  <p className="truncate text-[10px] text-gold/55">
                                    {addr.address}, {addr.pincode}
                                  </p>
                                </div>
                              </button>
                              {savedLocal.addresses.length > 1 && (
                                <button
                                  type="button"
                                  className="mt-0.5 rounded p-0.5 text-gold/30 opacity-0 transition hover:text-red-400 group-hover:opacity-100"
                                  onClick={() => removeAddress(addr.id)}
                                  aria-label="Remove address"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>

                        <div className="border-t border-gold/20 p-2 space-y-1">
                          <button
                            type="button"
                            className="flex w-full items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-gold/70 transition hover:bg-gold/10 hover:text-gold"
                            onClick={() => {
                              setAddrPanelOpen(false);
                              setAddAddressOpen(true);
                            }}
                          >
                            <Plus className="h-3 w-3" />
                            Add new address
                          </button>
                          <button
                            type="button"
                            className="flex w-full items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-gold/50 transition hover:bg-gold/10 hover:text-gold"
                            onClick={() => {
                              clearProfile();
                              setAddrPanelOpen(false);
                            }}
                          >
                            <LogOut className="h-3 w-3" />
                            Sign out
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 shrink-0 text-gold/80 sm:hidden"
                      onClick={() => setLoginOpen(true)}
                      aria-label="Sign in"
                    >
                      <User className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="hidden h-9 shrink-0 border-gold/40 text-sm text-gold/90 sm:inline-flex"
                      onClick={() => setLoginOpen(true)}
                    >
                      <User className="mr-1.5 h-4 w-4" />
                      Sign in
                    </Button>
                  </>
                )}
              </>
            )}
            <button
              type="button"
              onClick={openDrawer}
              className={cn(
                "relative flex h-10 items-center justify-center gap-1.5 rounded-md border border-gold bg-gold/20 px-2.5 text-gold transition hover:bg-gold/30 focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2 focus:ring-offset-forest sm:px-3",
                count > 0 && "cart-btn-has-items border-gold-light bg-gold/25"
              )}
              aria-label={`Cart, ${count} items`}
            >
              <ShoppingBag className="h-5 w-5 shrink-0" />
              <span className="text-xs font-semibold tracking-wide sm:text-sm">
                Cart
              </span>
              {count > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex min-w-[1.125rem] items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold leading-none text-forest">
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={scrollToMenu}
              className="rounded-md border border-gold/40 bg-transparent px-3 py-2 text-xs font-medium text-gold/80 transition-colors hover:bg-gold/10 hover:text-gold focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2 focus:ring-offset-forest sm:px-4 sm:text-sm"
            >
              Order Now
            </button>
          </div>
        </nav>
      </header>
      <LoginModal open={loginOpen} onOpenChange={setLoginOpen} />
      <AddAddressModal
        open={addAddressOpen}
        onOpenChange={setAddAddressOpen}
        profile={savedLocal}
      />
    </>
  );
}
