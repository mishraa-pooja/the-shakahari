/**
 * About strip — brand + Kaironovas ownership (verification-friendly copy).
 */

export function AboutSection() {
  return (
    <section
      className="border-y border-gold/10 bg-forest/40 px-4 py-14 sm:px-6"
      aria-labelledby="about-heading"
    >
      <div className="mx-auto max-w-2xl text-center">
        <h2
          id="about-heading"
          className="font-playfair text-2xl font-semibold tracking-tight text-gold sm:text-3xl"
        >
          About
        </h2>
        <p className="mt-5 text-sm leading-relaxed text-gold/80 sm:text-base sm:leading-relaxed">
          The Shaka-Hari is a premium veg dum biryani brand owned and operated
          by Kaironovas Pvt Ltd, focused on delivering rich, authentic
          Andhra-inspired flavors.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-gold/75 sm:text-base">
          Pure vegetarian kitchen. Dum-cooked. Crafted for those who take veg
          seriously.
        </p>
      </div>
    </section>
  );
}
