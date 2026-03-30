/**
 * Floating WhatsApp button — fixed bottom-right.
 * Opens wa.me direct chat with prefilled message.
 * This is a manual contact path only; no API calls, no Supabase writes.
 */

"use client";

import { cn } from "@/lib/utils";

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";
const PREFILLED_MESSAGE =
  "Hi The Shaka-Hari,\nI'd like to know more / place an order.";

export function FloatingWhatsApp() {
  if (!WHATSAPP_NUMBER) return null;

  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(PREFILLED_MESSAGE)}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title="Need help? Chat on WhatsApp"
      aria-label="Need help? Chat on WhatsApp"
      className={cn(
        "group fixed z-[60] flex items-end gap-2 touch-manipulation",
        /* Base offset + iOS/Android safe areas (notch / home bar) */
        "bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] right-[calc(1.25rem+env(safe-area-inset-right,0px))]",
        /* More breathing room on larger screens */
        "sm:bottom-[calc(2rem+env(safe-area-inset-bottom,0px))] sm:right-[calc(2rem+env(safe-area-inset-right,0px))]"
      )}
    >
      {/* Tooltip — visible on hover (desktop) */}
      <span className="mb-1 hidden max-w-[11rem] rounded-lg border border-gold/20 bg-brand-green px-3 py-2 text-xs font-medium leading-snug text-gold shadow-lg sm:group-hover:block">
        Need help? Chat on WhatsApp
      </span>

      {/* Button — 60px mobile / 72px desktop for easier taps */}
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full border-2 border-gold/35 bg-brand-green shadow-[0_6px_24px_rgba(0,0,0,0.35)] transition-transform active:scale-95 sm:hover:scale-105",
          "h-[3.75rem] w-[3.75rem] sm:h-[4.5rem] sm:w-[4.5rem]"
        )}
      >
        <svg
          viewBox="0 0 32 32"
          className="h-[1.75rem] w-[1.75rem] fill-gold sm:h-10 sm:w-10"
          aria-hidden
        >
          <path d="M16.004 0h-.008C7.174 0 .002 7.174.002 16.002c0 3.5 1.129 6.745 3.047 9.381L1.058 31.58l6.396-1.963A15.9 15.9 0 0 0 16.004 32C24.83 32 32 24.826 32 15.998S24.83 0 16.004 0Zm9.33 22.616c-.39 1.1-1.932 2.013-3.168 2.28-.844.18-1.946.323-5.66-1.217-4.752-1.97-7.806-6.79-8.04-7.105-.226-.315-1.898-2.527-1.898-4.82s1.2-3.42 1.627-3.888c.427-.468.933-.585 1.244-.585.312 0 .623.003.895.016.287.014.673-.109.953.727.293.872 1 2.44 1.087 2.617.087.176.146.383.029.617-.117.234-.176.38-.35.585-.176.205-.37.457-.527.614-.176.176-.36.367-.154.72.205.35.912 1.504 1.958 2.438 1.343 1.198 2.475 1.57 2.825 1.744.35.176.555.146.76-.088.205-.234.878-1.024 1.113-1.375.234-.35.468-.293.79-.176.322.117 2.042.963 2.393 1.137.35.176.585.263.672.41.088.146.088.848-.302 1.948Z" />
        </svg>
      </span>
    </a>
  );
}
