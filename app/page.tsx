/**
 * Single-page landing: Video hero banner + Menu + Footer. Cart drawer and checkout live here.
 */

import { Navbar } from "@/components/Navbar";
import { HeroVideoSection } from "@/components/HeroVideoSection";
import { AboutSection } from "@/components/AboutSection";
import { MenuSection } from "@/components/MenuSection";
import { Footer } from "@/components/Footer";
import { CartDrawer } from "@/components/CartDrawer";
import { FloatingWhatsApp } from "@/components/FloatingWhatsApp";

export default function Home() {
  return (
    <main className="relative min-h-screen">
      <Navbar />
      <HeroVideoSection />
      <AboutSection />
      <MenuSection />
      <Footer />
      <CartDrawer />
      <FloatingWhatsApp />
    </main>
  );
}
