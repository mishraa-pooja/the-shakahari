/**
 * Hardcoded menu items for Phase 1. Easy to swap for Supabase later.
 * TODO Phase 4: Dynamic menu from Supabase
 */

import type { MenuItem } from "@/types";

export const menuItems: MenuItem[] = [
  {
    id: "paneer-biryani",
    name: "Paneer Biryani",
    description: "Tender paneer and long-grain rice with aromatic spices.",
    price: 269,
    image: "/images/PaneerBiryani.png",
  },
  {
    id: "mushroom-biryani",
    name: "Mushroom Biryani",
    description: "Earthly mushrooms and basmati in a rich biryani masala.",
    price: 269,
    image: "/images/MushroomBiryani.png",
  },
  {
    id: "veg-dum-biryani",
    name: "Veg Dum Biryani",
    description: "Fragrant basmati with seasonal vegetables, slow-cooked dum style.",
    price: 249,
    image: "/images/SpecialVegBiryani.png",
  },
  // {
  //   id: "veg-shorba",
  //   name: "Veg Shorba",
  //   description: "Light, warming soup with vegetables and mild spices.",
  //   price: 60,
  // },
  {
    id: "raita",
    name: "Raita",
    description: "Cooling yogurt with cucumber and a hint of mint.",
    price: 40,
    image: "/images/Raita2.png",
  },
  {
    id: "gulab-jamun",
    name: "Gulab Jamun",
    description: "Two soft dumplings in rose-cardamom syrup.",
    price: 60,
    image: "/images/GulabJamun2.png",
  },
];
