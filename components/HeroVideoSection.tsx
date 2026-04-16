"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";

const MENU_SECTION_ID = "menu";
const WA_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, "");

export function HeroVideoSection() {
  const [showVideo, setShowVideo] = useState(false);
  const [stock, setStock] = useState<number | null>(null);

  useEffect(() => {
    setShowVideo(true);
    fetch("/api/stock", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setStock(d.total ?? 0))
      .catch(() => {});
  }, []);

  const scrollToMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById(MENU_SECTION_ID)?.scrollIntoView({
      behavior: "smooth",
    });
  };

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{ minHeight: "calc(100vh - 72px)" }}
    >
      {/* Background: poster SSR + first paint; video only after mount avoids hydration mismatch */}
      <div className="heroVideo absolute inset-0">
        {showVideo ? (
          <video
            className="h-full w-full object-cover"
            src="/videos/paneer-hero.mp4"
            poster="/images/Paneer-hero.png"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
          />
        ) : (
          <Image
            src="/images/Paneer-hero.png"
            alt=""
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        )}
      </div>

      {/* Overlay */}
      <div className="heroOverlay absolute inset-0" />

      {/* Texture */}
      <div
        className="absolute inset-0 opacity-20 mix-blend-overlay"
        style={{
          backgroundImage: "url(/images/Linen.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      {/* Content */}
      <div
        className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-6 text-center"
        style={{ paddingTop: "120px" }}
      >
        {/* "First time in Kharghar" tag */}
        <span
          className="mb-4 inline-block rounded-full border border-gold/40 bg-gold/10 px-5 py-1.5 text-xs font-bold uppercase tracking-[0.25em] text-gold backdrop-blur-sm"
        >
          First Time in Kharghar
        </span>

        {/* Logo + Wordmark */}
        <div className="flex items-center justify-center" style={{ gap: 0 }}>
          <div
            className="relative shrink-0"
            style={{
              width: "clamp(130px, 15vw, 210px)",
              height: "clamp(87px, 10vw, 140px)",
            }}
          >
            <Image
              src="/images/LogoSH.png"
              alt="THE SHAKA-HARI"
              fill
              className="object-contain"
              priority
              sizes="210px"
            />
          </div>
          <div className="flex flex-col items-center">
            <div
              className="uppercase text-center"
              style={{
                fontFamily: "var(--font-heritage)",
                letterSpacing: "0.12em",
                fontWeight: 800,
                color: "#f0d878",
                lineHeight: 1,
                textShadow:
                  "0 2px 0 rgba(0,0,0,0.5), 0 6px 20px rgba(0,0,0,0.4), 0 16px 50px rgba(0,0,0,0.5)",
              }}
            >
              <span
                style={{
                  fontSize: "clamp(15px, 1.8vw, 22px)",
                  letterSpacing: "0.35em",
                  fontWeight: 700,
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                THE
              </span>
              <span style={{ fontSize: "clamp(40px, 5vw, 72px)" }}>
                SHAKA-HARI
              </span>
            </div>
            <p
              className="mt-2 text-center text-sm tracking-wide text-gold/70"
              style={{
                fontFamily:
                  "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
              }}
            >
              A brand by Kaironovas Pvt Ltd
            </p>
            <div
              className="mt-2 uppercase text-center"
              style={{
                fontFamily: "var(--font-heritage)",
                letterSpacing: "0.32em",
                fontSize: "clamp(11px, 1vw, 14px)",
                fontWeight: 600,
                color: "rgba(240, 216, 120, 0.80)",
              }}
            >
              Veg Dum Biryani Co.
            </div>
          </div>
          <div
            className="shrink-0"
            style={{ width: "clamp(130px, 15vw, 210px)" }}
            aria-hidden="true"
          />
        </div>

        {/* Scarcity line — live stock */}
        <p
          className="mt-6 max-w-xl font-semibold"
          style={{
            fontFamily:
              "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
            color: stock !== null && stock <= 0 ? "#f87171" : "#f0d878",
            fontSize: "17px",
            lineHeight: 1.6,
            letterSpacing: "0.03em",
          }}
        >
          {stock === null
            ? "Limited boxes today. That\u2019s it."
            : stock <= 0
              ? "Sorry, we\u2019re sold out for today!"
              : `Only ${stock} ${stock === 1 ? "box" : "boxes"} left today. That\u2019s it.`}
        </p>

        {/* Value reassurance */}
        <p
          className="mt-2 max-w-xl"
          style={{
            fontFamily:
              "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
            color: "rgba(255,255,255,0.88)",
            fontSize: "15px",
            lineHeight: 1.7,
            letterSpacing: "0.04em",
          }}
        >
          Feels full. Tastes premium. Worth every bite.
        </p>

        {/* Divider */}
        <div
          className="mt-5"
          style={{
            width: 80,
            height: 2,
            background:
              "linear-gradient(90deg, transparent, rgba(240, 216, 120, 0.6), transparent)",
          }}
        />

        {/* CTAs */}
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <a
            href={`#${MENU_SECTION_ID}`}
            onClick={scrollToMenu}
            className="hero-cta-primary inline-flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #f0d878, #d4a93c)",
              color: "#0e1f17",
              padding: "15px 32px",
              borderRadius: 14,
              fontWeight: 800,
              fontSize: "16px",
              letterSpacing: "0.04em",
              boxShadow:
                "0 4px 20px rgba(214, 177, 91, 0.3), 0 20px 50px rgba(0,0,0,0.4)",
              transition:
                "transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow =
                "0 6px 28px rgba(214, 177, 91, 0.45), 0 24px 60px rgba(0,0,0,0.45)";
              e.currentTarget.style.filter = "brightness(1.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow =
                "0 4px 20px rgba(214, 177, 91, 0.3), 0 20px 50px rgba(0,0,0,0.4)";
              e.currentTarget.style.filter = "brightness(1)";
            }}
          >
            {stock !== null && stock <= 0 ? "View Menu" : "Reserve Your Box Now"}
          </a>

          <a
            href={
              WA_NUMBER
                ? `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent("Hi! I'd like to place an order.")}`
                : `#${MENU_SECTION_ID}`
            }
            target={WA_NUMBER ? "_blank" : undefined}
            rel={WA_NUMBER ? "noopener noreferrer" : undefined}
            onClick={WA_NUMBER ? undefined : scrollToMenu}
            className="inline-flex items-center justify-center transition-all duration-200"
            style={{
              background: "rgba(240, 216, 120, 0.08)",
              color: "rgba(240, 216, 120, 0.95)",
              padding: "15px 32px",
              borderRadius: 14,
              fontWeight: 800,
              fontSize: "16px",
              border: "1px solid rgba(240, 216, 120, 0.4)",
              letterSpacing: "0.04em",
              backdropFilter: "blur(4px)",
            }}
          >
            Order on WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}
