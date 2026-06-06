import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Forest / emerald green — inspired by the Healora/Medivine reference.
        brand: {
          50: "#eef6f2",
          100: "#d6eee3",
          200: "#aeddc8",
          300: "#7cc4a6",
          400: "#4ba582",
          500: "#2f8765",
          600: "#1f6f52",
          700: "#1a5a43",
          800: "#174c39",
          900: "#133d2f",
        },
        mint: {
          200: "#c9f0d8",
          300: "#a7e6c0",
          400: "#7ad9a3",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
          "50%": { transform: "translateY(-22px) rotate(6deg)" },
        },
        floatSlow: {
          "0%, 100%": { transform: "translateY(0) translateX(0)" },
          "50%": { transform: "translateY(-30px) translateX(14px)" },
        },
        blob: {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "33%": { transform: "translate(30px, -40px) scale(1.1)" },
          "66%": { transform: "translate(-20px, 20px) scale(0.95)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseRing: {
          "0%": { transform: "scale(0.9)", opacity: "0.7" },
          "100%": { transform: "scale(1.8)", opacity: "0" },
        },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        "float-slow": "floatSlow 9s ease-in-out infinite",
        blob: "blob 14s ease-in-out infinite",
        shimmer: "shimmer 2s infinite",
        "fade-up": "fadeUp 0.5s ease-out both",
        "pulse-ring": "pulseRing 1.5s ease-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
