/**
 * Menu section: Our Menu heading, responsive grid of MenuCards.
 */

import { menuItems } from "@/data/menuData";
import { MenuCard } from "@/components/MenuCard";

export function MenuSection() {
  return (
    <section
      id="menu"
      className="scroll-mt-20 px-4 py-16 sm:px-6"
      aria-labelledby="menu-heading"
    >
      <div className="mx-auto max-w-6xl">
        <h2
          id="menu-heading"
          className="font-playfair text-3xl font-semibold text-gold sm:text-4xl"
        >
          Our Menu
        </h2>
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {menuItems.map((item) => (
            <MenuCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
