/**
 * Hero: full-width, brand wordmark, headline, subtext, gold underline animation, CTA.
 */

"use client";

const MENU_SECTION_ID = "menu";

export function HeroSection() {
  const scrollToMenu = () => {
    document.getElementById(MENU_SECTION_ID)?.scrollIntoView({
      behavior: "smooth",
    });
  };

  return (
    <section className="relative flex min-h-[85vh] flex-col items-center justify-center px-4 py-16 text-center">
      {/* Brand lockup: wordmark + subtitle */}
      <div
        className="animate-in fade-in duration-500 fill-mode-backwards"
        style={{ animationDelay: "50ms", animationFillMode: "backwards", textAlign: "center" }}
      >
        <div className="brand-wordmark" style={{ fontSize: "clamp(44px, 8vw, 56px)" }}>
          SHAKA<span>-</span>HARI
        </div>
        <div className="brand-subtitle">
          <strong>Veg Dum Biryani</strong> Co.
        </div>
      </div>

      <h1
        className="h1 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-backwards"
        style={{ animationDelay: "100ms", animationFillMode: "backwards" }}
      >
        Andhra-Inspired Veg Dum Biryani
      </h1>
      <p
        className="body mt-4 max-w-[560px] mx-auto animate-in fade-in duration-500 fill-mode-backwards"
        style={{ animationDelay: "200ms", animationFillMode: "backwards" }}
      >
        Slow-cooked in the dum style. Pure veg. No compromise on flavour.
      </p>
      <div
        className="mt-6 h-0.5 w-24 rounded-full bg-gold animate-in fade-in duration-500 fill-mode-backwards"
        style={{ animationDelay: "300ms", animationFillMode: "backwards" }}
      />
      <div
        className="animate-in fade-in duration-500 fill-mode-backwards"
        style={{ animationDelay: "400ms", animationFillMode: "backwards" }}
      >
        <button
          type="button"
          onClick={scrollToMenu}
          className="btn-primary mt-8 focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2 focus:ring-offset-forest"
        >
          Order Now
        </button>
      </div>
    </section>
  );
}
