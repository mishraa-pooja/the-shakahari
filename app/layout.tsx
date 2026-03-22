/**
 * Root layout: fonts (Cinzel, Cormorant, Playfair, Inter), metadata, Toaster, brand theme.
 */

import type { Metadata } from "next";
import { Cinzel, Cormorant_Garamond, Playfair_Display, Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cinzel",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-brand-serif",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-brand-serif-alt",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Shaka-Hari | Veg Dum Biryani Co.",
  description:
    "Andhra-inspired veg dum biryani. Pure veg. Pure love. Pure biryani.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${cinzel.variable} ${cormorant.variable} ${playfair.variable} ${inter.variable}`}
    >
      <body className="min-h-screen font-sans bg-shaka">
        {children}
        <Toaster
          theme="dark"
          toastOptions={{
            style: {
              background: "var(--forest)",
              border: "1px solid var(--gold)",
              color: "var(--gold)",
            },
          }}
        />
      </body>
    </html>
  );
}
