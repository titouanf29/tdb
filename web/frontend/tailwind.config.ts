import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Custom trading colors
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        border: "hsl(var(--border))",
        ring: "hsl(var(--ring))",
        // Trading specific
        profit: "#10b981",
        loss: "#ef4444",
        warning: "#f59e0b",
        bull: "#22c55e",
        bear: "#ef4444",
        // Neon accents
        neon: {
          blue:   "#638cff",
          cyan:   "#00d2ff",
          purple: "#a855f7",
          green:  "#00ff9d",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "glass": "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)",
        "glow": "radial-gradient(circle at center, rgba(99, 102, 241, 0.15) 0%, transparent 70%)",
      },
      boxShadow: {
        glow:          "0 0 40px rgba(99, 140, 255, 0.35)",
        "glow-sm":     "0 0 20px rgba(99, 140, 255, 0.25)",
        "glow-cyan":   "0 0 24px rgba(0, 210, 255, 0.35)",
        "glow-purple": "0 0 24px rgba(139, 92, 246, 0.35)",
        glass:         "0 8px 32px rgba(0, 0, 0, 0.4)",
        "neon-card":   "0 0 20px rgba(99,140,255,0.10), inset 0 1px 0 rgba(255,255,255,0.05)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "float": "float 6s ease-in-out infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
        "slide-up": "slideUp 0.5s ease-out",
        "slide-down": "slideDown 0.5s ease-out",
        "fade-in": "fadeIn 0.5s ease-out",
        "scale-in": "scaleIn 0.3s ease-out",
        "shimmer": "shimmer 2s linear infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        glow: {
          "0%": { boxShadow: "0 0 20px rgba(99, 102, 241, 0.2)" },
          "100%": { boxShadow: "0 0 40px rgba(99, 102, 241, 0.4)" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideDown: {
          "0%": { transform: "translateY(-20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        scaleIn: {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
