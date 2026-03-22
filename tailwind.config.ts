import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          DEFAULT: "#1B3D2F",
          dark: "#152a20",
        },
        gold: {
          DEFAULT: "#C9A84C",
          light: "#D4B96A",
          dark: "#A88B3A",
        },
      },
      fontFamily: {
        playfair: ["var(--font-brand-serif-alt)", "serif"],
        "brand-serif": ["var(--font-brand-serif)", "var(--font-brand-serif-alt)", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "linen-texture":
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='1' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
