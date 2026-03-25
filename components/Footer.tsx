/**
 * Footer: dark green, gold text, logo, tagline, contact placeholders, socials,
 * and subtle legal / ownership line (Kaironovas Pvt Ltd).
 */

import Image from "next/image";
import { MapPin, Phone, Instagram } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-gold/20 bg-forest-dark px-4 py-12 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 text-center">
        <div className="relative h-10 w-32">
          <Image
            src="/images/LogoSH.png"
            alt="THE SHAKA-HARI"
            fill
            className="object-contain opacity-90"
            sizes="112px"
          />
        </div>
        <p className="font-playfair text-lg font-medium text-gold">
          Pure Veg. Pure Love. Pure Biryani.
        </p>
        <div className="flex flex-col gap-2 text-sm text-gold/80">
          <span className="inline-flex items-center justify-center gap-2">
            <MapPin className="h-4 w-4 shrink-0" />
            Address placeholder — City, Pincode
          </span>
          <span className="inline-flex items-center justify-center gap-2">
            <Phone className="h-4 w-4 shrink-0" />
            +91 XXXXX XXXXX
          </span>
        </div>
        <div className="flex gap-4">
          <a
            href="#"
            className="rounded-full p-2 text-gold/80 transition hover:text-gold"
            aria-label="Instagram"
          >
            <Instagram className="h-5 w-5" />
          </a>
          <a
            href="#"
            className="rounded-full p-2 text-gold/80 transition hover:text-gold"
            aria-label="Google Maps"
          >
            <MapPin className="h-5 w-5" />
          </a>
        </div>

        {/* Legal & ownership — readable for users and verification */}
        <div className="mt-2 flex max-w-xl flex-col gap-3 border-t border-gold/20 pt-8 text-center">
          <p className="text-sm leading-relaxed text-gold/80">
            The Shaka-Hari is a brand owned and operated by Kaironovas Pvt Ltd.
          </p>
          <p className="text-sm font-medium text-gold/85">
            © 2026 Kaironovas Pvt Ltd. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
