/**
 * Root layout: fonts (Cinzel, Cormorant, Playfair, Inter), metadata, Toaster, brand theme.
 */

import type { Metadata, Viewport } from "next";
import { Cinzel, Cormorant_Garamond, Playfair_Display, Inter } from "next/font/google";
import { Toaster } from "sonner";
import { AuthProvider } from "@/components/AuthProvider";
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

const siteTitle = "THE SHAKA-HARI | Veg Dum Biryani Co.";
const siteDescription =
  "The Shaka-Hari — premium veg dum biryani, owned and operated by Kaironovas Pvt Ltd. Andhra-inspired flavors. Pure veg kitchen.";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  ...(process.env.NEXT_PUBLIC_SITE_URL
    ? { metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL) }
    : {}),
  title: siteTitle,
  description: siteDescription,
  icons: {
    icon: [{ url: "/images/LogoSH.png", type: "image/png" }],
    shortcut: "/images/LogoSH.png",
    apple: "/images/LogoSH.png",
  },
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    type: "website",
    locale: "en_IN",
    images: [
      {
        url: "/images/LogoSH.png",
        width: 512,
        height: 512,
        alt: "THE SHAKA-HARI",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: siteTitle,
    description: siteDescription,
    images: ["/images/LogoSH.png"],
  },
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
        <AuthProvider>
          {children}
        </AuthProvider>
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
