"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gem, BarChart2, Activity, Zap, Newspaper, Bot,
  ChevronRight, ChevronLeft, Check, TrendingUp,
  Shield, DollarSign,
} from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

const STORAGE_KEY = "gold_hub_guide_seen";

export function hasSeenGoldGuide(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY) === "true";
}

export function markGoldGuideSeen(): void {
  localStorage.setItem(STORAGE_KEY, "true");
}

const SLIDES_FR = [
  {
    icon: Gem,
    color: "#eab308",
    title: "Bienvenue dans le Gold Hub",
    subtitle: "Ton espace dédié au trading de l'or (XAU/USD)",
    desc: "Le Gold Hub regroupe tout ce dont tu as besoin pour analyser, comprendre et trader l'or — en un seul endroit. Voici un tour rapide de ce qui t'attend.",
  },
  {
    icon: BarChart2,
    color: "#f59e0b",
    title: "Graphique & Signal technique",
    subtitle: "Analyse en temps réel sur GC=F",
    desc: "Un graphique avancé avec bougies japonaises, EMA 50/200, bandes de Bollinger et niveaux de support/résistance. Un score technique sur 100 te donne le signal du moment (LONG, SHORT, NEUTRE) avec un niveau de confiance.",
    tip: "Utilise les timeframes (1h, 1J, 1S…) pour adapter l'analyse à ta stratégie.",
  },
  {
    icon: Activity,
    color: "#f97316",
    title: "Corrélations en direct",
    subtitle: "DXY · Taux 10 ans · VIX · Pétrole · EUR/USD · Bitcoin",
    desc: "L'or ne bouge jamais seul. Cette section affiche l'impact en temps réel des grands actifs sur le cours de l'or — avec une explication claire pour chaque corrélation.",
    tip: "Survole une carte pour voir pourquoi cet actif influence l'or.",
  },
  {
    icon: Zap,
    color: "#eab308",
    title: "Recommandation & Paper trading",
    subtitle: "Signal personnalisé selon ton profil",
    desc: "Choisis ton style (Scalper, Day Trader, Swing…) et ton niveau d'agressivité. La plateforme calcule un TP, un SL et une taille de position adaptés. Ouvre des positions LONG ou SHORT en paper trading, sans risque réel.",
    tip: "Tes positions sont visibles dans ton portefeuille — tu peux les suivre en temps réel.",
  },
  {
    icon: Bot,
    color: "#f59e0b",
    title: "Assistant IA Gold",
    subtitle: "Contexte marché à portée de main",
    desc: "Un assistant IA spécialisé sur l'or, alimenté par les données du moment : prix, RSI, MACD, VIX, DXY. Pose-lui n'importe quelle question sur le marché — il répond avec le contexte live.",
    tip: "Des suggestions de questions sont proposées selon ton style de trading.",
  },
  {
    icon: Newspaper,
    color: "#f97316",
    title: "Actualités & Macro",
    subtitle: "Les vrais drivers de l'or",
    desc: "Les actualités filtrées sur l'or : Fed, inflation, géopolitique, banques centrales. Plus le contexte macro live avec les taux réels, la prochaine réunion Fed et le positionnement des banques centrales.",
    tip: "Les données macro influencent l'or sur le long terme — lis-les avant d'ouvrir une position.",
  },
  {
    icon: Shield,
    color: "#eab308",
    title: "Tu es prêt !",
    subtitle: "Bonne chance sur les marchés",
    desc: "Le Gold Hub est maintenant à toi. Explore les différentes sections, affine ton profil de trading et utilise toutes les données à ta disposition pour prendre de meilleures décisions.",
    cta: true,
  },
];

const SLIDES_EN = [
  {
    icon: Gem,
    color: "#eab308",
    title: "Welcome to the Gold Hub",
    subtitle: "Your dedicated space for gold trading (XAU/USD)",
    desc: "The Gold Hub brings everything you need to analyze, understand and trade gold — all in one place. Here's a quick tour of what's waiting for you.",
  },
  {
    icon: BarChart2,
    color: "#f59e0b",
    title: "Chart & Technical Signal",
    subtitle: "Real-time analysis on GC=F",
    desc: "An advanced chart with Japanese candlesticks, EMA 50/200, Bollinger Bands and support/resistance levels. A technical score out of 100 gives you the current signal (LONG, SHORT, NEUTRAL) with a confidence level.",
    tip: "Use timeframes (1h, 1D, 1W…) to match the analysis to your strategy.",
  },
  {
    icon: Activity,
    color: "#f97316",
    title: "Live Correlations",
    subtitle: "DXY · 10Y Yield · VIX · Oil · EUR/USD · Bitcoin",
    desc: "Gold never moves alone. This section shows the real-time impact of major assets on the gold price — with a clear explanation for each correlation.",
    tip: "Hover over a card to see why that asset influences gold.",
  },
  {
    icon: Zap,
    color: "#eab308",
    title: "Recommendation & Paper Trading",
    subtitle: "Personalized signal based on your profile",
    desc: "Choose your style (Scalper, Day Trader, Swing…) and your aggression level. The platform calculates a TP, SL and position size tailored for you. Open LONG or SHORT paper trades with no real risk.",
    tip: "Your positions are visible in your portfolio — track them in real time.",
  },
  {
    icon: Bot,
    color: "#f59e0b",
    title: "Gold AI Assistant",
    subtitle: "Market context at your fingertips",
    desc: "An AI assistant specialized in gold, powered by live data: price, RSI, MACD, VIX, DXY. Ask it anything about the market — it answers with live context.",
    tip: "Suggested questions are shown based on your trading style.",
  },
  {
    icon: Newspaper,
    color: "#f97316",
    title: "News & Macro",
    subtitle: "Gold's real drivers",
    desc: "Filtered gold news: Fed, inflation, geopolitics, central banks. Plus live macro context with real rates, the next Fed meeting and central bank positioning.",
    tip: "Macro data influences gold in the long term — read it before opening a position.",
  },
  {
    icon: Shield,
    color: "#eab308",
    title: "You're all set!",
    subtitle: "Good luck on the markets",
    desc: "The Gold Hub is now yours. Explore the different sections, refine your trading profile and use all the available data to make better decisions.",
    cta: true,
  },
];

export function GoldHubGuide({ onDismiss }: { onDismiss: () => void }) {
  const { lang } = useLanguage();
  const [step, setStep] = useState(0);

  const slides = lang === "fr" ? SLIDES_FR : SLIDES_EN;
  const slide = slides[step];
  const isLast = step === slides.length - 1;
  const Icon = slide.icon;

  const dismiss = () => {
    markGoldGuideSeen();
    onDismiss();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-amber-500/8 blur-3xl" />
      </div>

      <motion.div
        key={step}
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -16, scale: 0.97 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="relative z-10 w-full max-w-lg"
      >
        {/* Gold border glow */}
        <div className="absolute -inset-px rounded-2xl"
          style={{ background: `linear-gradient(135deg, ${slide.color}50, ${slide.color}20, ${slide.color}40)` }} />

        <div className="relative rounded-2xl overflow-hidden"
          style={{ background: "linear-gradient(160deg, hsl(220 50% 6%) 0%, hsl(220 45% 5%) 100%)", border: "1px solid rgba(234,179,8,0.15)" }}>

          {/* Progress bar */}
          <div className="h-0.5 bg-white/5">
            <motion.div
              className="h-full"
              initial={{ width: `${(step / (slides.length - 1)) * 100}%` }}
              animate={{ width: `${((step + 1) / slides.length) * 100}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              style={{ background: "linear-gradient(90deg, #eab308, #f97316)" }}
            />
          </div>

          <div className="p-7 space-y-5">
            {/* Icon */}
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{
                    background: `${slide.color}18`,
                    border: `1px solid ${slide.color}40`,
                    boxShadow: `0 0 24px ${slide.color}25`,
                  }}
                >
                  <Icon className="w-7 h-7" style={{ color: slide.color }} />
                </div>
                {/* Step counter */}
                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                  style={{ background: slide.color, color: "#000" }}>
                  {step + 1}
                </div>
              </div>

              <div className="min-w-0">
                <h2 className="font-bold text-lg leading-tight"
                  style={{
                    background: `linear-gradient(135deg, #fff7aa, ${slide.color}, #f97316)`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}>
                  {slide.title}
                </h2>
                <p className="text-xs text-white/45 mt-0.5 font-medium">{slide.subtitle}</p>
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-white/70 leading-relaxed">{slide.desc}</p>

            {/* Tip */}
            {"tip" in slide && slide.tip && (
              <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl"
                style={{ background: "rgba(234,179,8,0.07)", border: "1px solid rgba(234,179,8,0.18)" }}>
                <TrendingUp className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-300/70 leading-snug">{slide.tip}</p>
              </div>
            )}

            {/* Dots */}
            <div className="flex items-center justify-center gap-1.5 pt-1">
              {slides.map((_, i) => (
                <button key={i} onClick={() => setStep(i)}
                  className="transition-all duration-300 rounded-full"
                  style={{
                    width: i === step ? 20 : 6,
                    height: 6,
                    background: i === step ? slide.color : "rgba(255,255,255,0.15)",
                  }}
                />
              ))}
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-3 pt-1">
              {step > 0 && (
                <button
                  onClick={() => setStep(s => s - 1)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all text-white/50 hover:text-white/80 hover:bg-white/5"
                >
                  <ChevronLeft className="w-4 h-4" />
                  {lang === "fr" ? "Retour" : "Back"}
                </button>
              )}

              <div className="flex-1" />

              {isLast ? (
                <button
                  onClick={dismiss}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all text-black"
                  style={{
                    background: "linear-gradient(135deg, #fde68a, #eab308, #f97316)",
                    boxShadow: "0 0 20px rgba(234,179,8,0.4)",
                  }}
                >
                  <Check className="w-4 h-4" />
                  {lang === "fr" ? "C'est compris !" : "Got it!"}
                </button>
              ) : (
                <button
                  onClick={() => setStep(s => s + 1)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all"
                  style={{
                    background: `${slide.color}20`,
                    border: `1px solid ${slide.color}40`,
                    color: slide.color,
                  }}
                >
                  {lang === "fr" ? "Suivant" : "Next"}
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
