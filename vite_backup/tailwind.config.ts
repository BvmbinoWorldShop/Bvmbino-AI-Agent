import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
	],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#e8a912",
          foreground: "#0a0800",
        },
        secondary: {
          DEFAULT: "#1a2030",
          foreground: "#f0e8d0",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "#131820",
          foreground: "#9aa0b0",
        },
        accent: {
          DEFAULT: "rgba(232,169,18,0.08)",
          foreground: "#ffc842",
        },
        popover: {
          DEFAULT: "#0d1014",
          foreground: "#f0e8d0",
        },
        card: {
          DEFAULT: "#0d1014",
          foreground: "#f0e8d0",
        },
        gold: {
          50: "#fff8e6",
          100: "#ffedcc",
          200: "#ffdb99",
          300: "#ffc866",
          400: "#ffb633",
          500: "#e8a912",
          600: "#b9870e",
          700: "#8a650b",
          800: "#5c4307",
          900: "#2e2104",
        },
        obsidian: {
          dark: "#06080a",
          surface: "#0d1014",
          elevated: "#131820",
        }
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        mono: ["Space Mono", "monospace"],
        head: ["Syne", "sans-serif"],
        quantico: ["Quantico", "sans-serif"],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "ring-pulse": {
          "0%, 100%": { opacity: "0.8", transform: "scale(1)" },
          "50%": { opacity: "0.2", transform: "scale(1.05)" },
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "float": "float 3s ease-in-out infinite",
        "ring-pulse": "ring-pulse 3s ease infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
