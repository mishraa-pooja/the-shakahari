/**
 * Hardcoded menu items for Phase 1. Easy to swap for Supabase later.
 * TODO Phase 4: Dynamic menu from Supabase
 */

import type { MenuItem } from "@/types";

export const menuItems: MenuItem[] = [
  {
    id: "paneer-biryani",
    name: "Royal Paneer Dum Biryani",
    description:
      "Soft paneer layered with rich Andhra masala, slow-cooked in dum style",
    price: 329,
    originalPrice: 329,
    badge: "\u{1F49B} Chef's Recommendation",
    image: "/images/PaneerBiryani.png",
  },
  {
    id: "veg-dum-biryani",
    name: "Shaka-Hari Signature Dum Biryani",
    description:
      "Masala-loaded Andhra dum biryani crafted for bold flavour lovers",
    price: 299,
    originalPrice: 329,
    image: "/images/SpecialVegBiryani.png",
  },
  {
    id: "soya-chaap-biryani",
    name: "Dumdaar Soya Chaap Biryani",
    description:
      "Juicy soya chaap coated in smoky spices and rich dum gravy",
    price: 329,
    originalPrice: 329,
    badge: "\u{1F525} New Launch",
    image: "/images/SoyaChaapBiryani.png",
  },
  {
    id: "mushroom-biryani",
    name: "Smoked Mushroom Dum Biryani",
    description:
      "Earthy mushrooms infused with deep, slow-cooked dum flavours",
    price: 329,
    originalPrice: 329,
    image: "/images/MushroomBiryani.png",
  },
  {
    id: "raita",
    name: "Cooling Mint Raita",
    description: "Cooling yogurt with cucumber and a hint of mint.",
    price: 40,
    image: "/images/Raita2.png",
  },
  {
    id: "gulab-jamun",
    name: "Warm Gulab Jamun (2 pcs)",
    description: "Two soft dumplings in rose-cardamom syrup.",
    price: 60,
    image: "/images/GulabJamun2.png",
  },
];
