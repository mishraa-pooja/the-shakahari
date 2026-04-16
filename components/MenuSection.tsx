/**
 * Menu section with live per-item stock counter and sold-out overlay.
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { menuItems } from "@/data/menuData";
import { MenuCard } from "@/components/MenuCard";

const biryanis = menuItems.filter(
  (i) => i.id !== "raita" && i.id !== "gulab-jamun"
);
const sides = menuItems.filter(
  (i) => i.id === "raita" || i.id === "gulab-jamun"
);

const WA_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, "");

type StockData = { items: Record<string, number>; total: number };

export function MenuSection() {
  const [stockData, setStockData] = useState<StockData | null>(null);

  const fetchStock = useCallback(async () => {
    try {
      const res = await fetch("/api/stock", { cache: "no-store" });
      const data = await res.json();
      if (data.items) {
        setStockData({
          items: data.items,
          total: data.total ?? Object.values(data.items as Record<string, number>).reduce((a: number, b: number) => a + b, 0),
        });
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    void fetchStock();
    const id = setInterval(fetchStock, 30_000);
    return () => clearInterval(id);
  }, [fetchStock]);

  const totalStock = stockData?.total ?? null;
  const allSoldOut = totalStock !== null && totalStock <= 0;

  const notifyWhatsAppUrl = WA_NUMBER
    ? `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent("notify")}`
    : "#";

  return (
    <section
      id="menu"
      className="scroll-mt-20 px-4 py-16 sm:px-6"
      aria-labelledby="menu-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2
              id="menu-heading"
              className="font-playfair text-3xl font-semibold text-gold sm:text-4xl"
            >
              Our Menu
            </h2>
            <p className="mt-2 text-sm text-gold/60">
              Dum-cooked. Pure veg. Andhra soul. Delivered in 30 minutes.
            </p>
          </div>

          {totalStock !== null && (
            <div className="flex items-center gap-2">
              {allSoldOut ? (
                <span className="rounded-full bg-red-500/20 px-4 py-1.5 text-sm font-bold text-red-300 animate-pulse">
                  Sold Out for Today
                </span>
              ) : (
                <span className="rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5 text-sm font-semibold text-gold">
                  {totalStock} {totalStock === 1 ? "box" : "boxes"} left today
                </span>
              )}
            </div>
          )}
        </div>

        {/* Sold-out overlay */}
        {allSoldOut && (
          <div className="mt-8 rounded-lg border border-red-500/30 bg-forest-dark/90 px-6 py-10 text-center">
            <p className="text-3xl font-extrabold text-red-400">
              Sorry, we&apos;re closed for today!
            </p>
            <p className="mx-auto mt-3 max-w-md text-base text-gold/70">
              All biryani boxes have been sold. We&apos;ll notify you on
              WhatsApp the moment fresh boxes are ready.
            </p>
            <a
              href={notifyWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#25D366]/20 px-8 py-3 text-sm font-bold text-[#25D366] transition hover:bg-[#25D366]/30"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.612.638l4.68-1.318A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.153 0-4.19-.562-5.977-1.61l-.254-.152-2.634.742.672-2.553-.166-.263A9.96 9.96 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/>
              </svg>
              Notify Me on WhatsApp
            </a>
          </div>
        )}

        {/* Biryanis */}
        <div
          className={`mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2 ${
            allSoldOut ? "pointer-events-none opacity-40" : ""
          }`}
        >
          {biryanis.map((item) => (
            <MenuCard
              key={item.id}
              item={item}
              stockLeft={stockData?.items[item.id] ?? null}
            />
          ))}
        </div>

        {/* Sides & Desserts */}
        {sides.length > 0 && (
          <>
            <h3 className="mt-12 font-playfair text-xl font-semibold text-gold/80">
              Sides &amp; Desserts
            </h3>
            <div
              className={`mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2 ${
                allSoldOut ? "pointer-events-none opacity-40" : ""
              }`}
            >
              {sides.map((item) => (
                <MenuCard key={item.id} item={item} stockLeft={null} />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
