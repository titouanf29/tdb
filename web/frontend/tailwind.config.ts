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
        profit: "#26D07C",
        loss: "#FF4D4D",
        warning: "#E8A820",
        bull: "#26D07C",
        bear: "#FF4D4D",
        // Neon accents
        /* Terminal palette — gold is the identity, cyan is secondary data */
        neon: {
          blue:   "#E8A820",
          cyan:   "#5FC9DC",
          purple: "#B8863A",
          green:  "#26D07C",
          gold:   "#E8A820",
        },
      },
      fontFamily: {
        sans: ["var(--font-public-sans)", "system-ui", "-apple-system", "sans-serif"],
        display: ["var(--font-public-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      /* Terminal theme: square. The whole scale collapses to hairline radii so
         legacy rounded-xl / rounded-2xl markup stops looking like a bubble UI. */
      borderRadius: {
        none: "0px",
        sm: "1px",
        DEFAULT: "2px",
        md: "2px",
        lg: "2px",
        xl: "3px",
        "2xl": "3px",
        "3xl": "4px",
        full: "9999px",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "glass": "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)",
        "glow": "radial-gradient(circle at center, rgba(99, 102, 241, 0.15) 0%, transparent 70%)",
      },
      /* No neon. Terminal depth is a hard shadow or nothing at all. */
      boxShadow: {
        glow:          "none",
        "glow-sm":     "none",
        "glow-cyan":   "none",
        "glow-purple": "none",
        "glow-gold":   "none",
        glass:         "0 8px 24px rgba(0, 0, 0, 0.6)",
        "neon-card":   "none",
      },
      animation: {
        "pulse-slow":    "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "float":         "float 6s ease-in-out infinite",
        "float-slow":    "float 10s ease-in-out infinite",
        "glow":          "glow 2s ease-in-out infinite alternate",
        "slide-up":      "slideUp 0.5s cubic-bezier(0.22, 1, 0.36, 1)",
        "slide-down":    "slideDown 0.5s cubic-bezier(0.22, 1, 0.36, 1)",
        "slide-in-left": "slideInLeft 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
        "fade-in":       "fadeIn 0.5s ease-out",
        "fade-up":       "fadeUp 0.5s cubic-bezier(0.22, 1, 0.36, 1)",
        "scale-in":      "scaleIn 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
        "shimmer":       "shimmer 2s linear infinite",
        "spin-slow":     "spin 8s linear infinite",
        "ping-slow":     "ping 3s cubic-bezier(0, 0, 0.2, 1) infinite",
        "bounce-sm":     "bounceSm 1.5s ease-in-out infinite",
        "wiggle":        "wiggle 0.5s ease-in-out",
        "pop-in":        "popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "gradient-x":    "gradientX 4s ease infinite",
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
        slideInLeft: {
          "0%": { transform: "translateX(-20px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        bounceSm: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(-3deg)" },
          "50%": { transform: "rotate(3deg)" },
        },
        popIn: {
          "0%": { transform: "scale(0.8)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        gradientX: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
