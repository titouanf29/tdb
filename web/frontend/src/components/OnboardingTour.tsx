"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useUserLevel } from "@/hooks/useUserLevel";
import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/LanguageContext";
import type { TradingLevel } from "@/lib/auth";
import { AlexTour, type TourStepDef } from "./AlexTour";

// ── Bilingual step definitions ────────────────────────────────────────────────

function getBeginnerSteps(lang: "fr" | "en"): TourStepDef[] {
  if (lang === "en") {
    return [
      {
        emoji: "👋",
        title: "Welcome to CaptenTDB!",
        description: "I'm Alex, your trading coach. Let me show you around the platform in 2 minutes, I promise it'll be quick!",
      },
      {
        element: "[data-tour='dashboard']",
        emoji: "📊",
        title: "Dashboard",
        description: "Your central hub: market overview, open positions and overall performance. Everything you need at a glance.",
      },
      {
        element: "[data-tour='learn']",
        emoji: "🎓",
        title: "Learning Center",
        description: "Learn trading fundamentals with structured courses, quizzes and guided paths. Start here if you're new to trading!",
      },
      {
        element: "[data-tour='markets']",
        emoji: "🌍",
        title: "Markets",
        description: "Explore all assets: crypto, forex, stocks, indices, commodities. Add your favorites and track them in real time.",
      },
      {
        element: "[data-tour='scanner']",
        emoji: "🔍",
        title: "Opportunity Scanner",
        description: "Automatically detect the best market opportunities using our technical analysis algorithms. Never miss a signal again.",
      },
      {
        element: "[data-tour='analysis']",
        emoji: "📈",
        title: "Technical Analysis",
        description: "Analyse any asset: candlestick charts, RSI, MACD, supports/resistances and AI assistance. Your trading laboratory.",
      },
      {
        element: "[data-tour='wallet']",
        emoji: "💼",
        title: "Portfolio",
        description: "Track your open positions, performance and trade history. Measure your progress and learn from every trade.",
      },
      {
        emoji: "🤖",
        title: "I'm always here for you!",
        description: "Find me in the bottom-left corner at any time. I can guide you to analyse an asset, give tips, or explain any module.",
      },
      {
        emoji: "🚀",
        title: "Let's go!",
        description: "Start with the Learning Center to build your foundations. Good luck on the markets, I'll be here if you need me!",
      },
    ];
  }

  return [
    {
      emoji: "👋",
      title: "Bienvenue sur CaptenTDB !",
      description: "Je suis Alex, votre coach trading. Laissez-moi vous faire découvrir la plateforme en 2 minutes, promis, c'est rapide !",
    },
    {
      element: "[data-tour='dashboard']",
      emoji: "📊",
      title: "Tableau de bord",
      description: "Votre hub central : résumé des marchés, positions ouvertes et performance globale. Tout ce dont vous avez besoin d'un coup d'œil.",
    },
    {
      element: "[data-tour='learn']",
      emoji: "🎓",
      title: "Formation",
      description: "Apprenez les bases du trading avec des cours structurés, des quiz et des parcours guidés. Commencez ici si vous débutez !",
    },
    {
      element: "[data-tour='markets']",
      emoji: "🌍",
      title: "Marchés",
      description: "Explorez tous les actifs : crypto, forex, actions, indices, matières premières. Ajoutez vos favoris et suivez-les en temps réel.",
    },
    {
      element: "[data-tour='scanner']",
      emoji: "🔍",
      title: "Scanner d'opportunités",
      description: "Détectez automatiquement les meilleures opportunités du marché grâce à nos algorithmes d'analyse technique. Ne ratez plus aucun signal.",
    },
    {
      element: "[data-tour='analysis']",
      emoji: "📈",
      title: "Analyse technique",
      description: "Analysez n'importe quel actif : graphiques en chandeliers, RSI, MACD, supports/résistances et IA. Votre laboratoire de trading.",
    },
    {
      element: "[data-tour='wallet']",
      emoji: "💼",
      title: "Portefeuille",
      description: "Suivez vos positions ouvertes, votre performance et votre historique de trades. Mesurez vos progrès et apprenez de chaque trade.",
    },
    {
      emoji: "🤖",
      title: "Je suis là pour vous !",
      description: "Retrouvez-moi en bas à gauche à tout moment. Je peux vous guider pour analyser un actif, vous donner un conseil, ou vous expliquer n'importe quel module.",
    },
    {
      emoji: "🚀",
      title: "À vous de jouer !",
      description: "Commencez par la Formation pour acquérir les bases. Bonne chance sur les marchés, je serai là si vous avez besoin !",
    },
  ];
}

function getIntermediateSteps(lang: "fr" | "en"): TourStepDef[] {
  if (lang === "en") {
    return [
      {
        emoji: "⚡",
        title: "Welcome to Intermediate mode!",
        description: "You've unlocked advanced features. Here's a quick tour of the tools that will supercharge your trading.",
      },
      {
        element: "[data-tour='scanner']",
        emoji: "🔍",
        title: "Advanced Scanner",
        description: "6 technical indicators simultaneously, RSI, MACD, EMA, Bollinger, Volume, ATR. Filter by market, volatility and signal strength.",
      },
      {
        element: "[data-tour='analysis']",
        emoji: "📊",
        title: "Multi-timeframe Analysis",
        description: "Combine RSI, MACD, Bollinger and EMA across multiple timeframes to identify precise setups with maximum confluence.",
      },
      {
        element: "[data-tour='assistant']",
        emoji: "🤖",
        title: "Contextual AI",
        description: "The AI analyses your assets in real time with expert precision: trends, key levels, momentum and personalised trading insight.",
      },
      {
        emoji: "✅",
        title: "All set!",
        description: "Explore the markets, run an analysis, and don't hesitate to ask Alex to refine your setups. Happy trading!",
      },
    ];
  }

  return [
    {
      emoji: "⚡",
      title: "Bienvenue en mode Intermédiaire !",
      description: "Vous avez débloqué des fonctionnalités avancées. Voici un tour rapide des outils qui vont booster votre trading.",
    },
    {
      element: "[data-tour='scanner']",
      emoji: "🔍",
      title: "Scanner avancé",
      description: "6 indicateurs techniques simultanés, RSI, MACD, EMA, Bollinger, Volume, ATR. Filtrez par marché, volatilité et force de signal.",
    },
    {
      element: "[data-tour='analysis']",
      emoji: "📊",
      title: "Analyse multi-timeframe",
      description: "Combinez RSI, MACD, Bollinger et EMA sur plusieurs unités de temps pour identifier des setups précis avec une confluence maximale.",
    },
    {
      element: "[data-tour='assistant']",
      emoji: "🤖",
      title: "IA contextuelle",
      description: "L'IA analyse vos actifs en temps réel avec une précision experte : tendances, niveaux clés, momentum et avis de trading personnalisé.",
    },
    {
      emoji: "✅",
      title: "Tout est prêt !",
      description: "Explorez les marchés, lancez une analyse, et n'hésitez pas à consulter Alex pour affiner vos setups. Bonne session de trading !",
    },
  ];
}

// ── Public API ────────────────────────────────────────────────────────────────

export const TOUR_KEY = "tdb_onboarding_done";

interface OnboardingTourProps {
  /** Force-starts the tour for the given level, bypassing the localStorage check */
  forceLevel?: TradingLevel | null;
  onTourDone?: () => void;
}

export function OnboardingTour({ forceLevel, onTourDone }: OnboardingTourProps = {}) {
  const { level } = useUserLevel();
  const { user } = useAuth();
  const { lang } = useLanguage();
  const [active, setActive] = useState(false);
  const [steps, setSteps] = useState<TourStepDef[]>([]);
  const startedRef = useRef(false);

  const startTour = useCallback(
    (tourLevel: TradingLevel | "beginner", force = false) => {
      if (typeof window === "undefined") return;
      if (!force && localStorage.getItem(TOUR_KEY)) return;
      if (tourLevel === "expert") return;
      const tourSteps =
        tourLevel === "beginner"
          ? getBeginnerSteps(lang)
          : getIntermediateSteps(lang);
      setSteps(tourSteps);
      setActive(true);
    },
    [lang]
  );

  const handleDone = useCallback(() => {
    if (typeof window !== "undefined") localStorage.setItem(TOUR_KEY, "1");
    setActive(false);
    onTourDone?.();
  }, [onTourDone]);

  // Force-start when forceLevel prop is set (called from OnboardingModal / settings)
  useEffect(() => {
    if (!forceLevel) return;
    startTour(forceLevel, true);
  }, [forceLevel, startTour]);

  // Auto-start for users who have a level set but haven't done the tour yet
  // (does NOT run for brand-new users with trading_level==null — OnboardingModal handles those)
  useEffect(() => {
    if (forceLevel) return;
    if (!user || startedRef.current) return;
    if (level === "expert") return;
    if (user.trading_level == null) return; // let OnboardingModal handle new users
    startedRef.current = true;
    // Small delay so the layout is fully painted before the tour starts
    const t = setTimeout(() => startTour(level, false), 800);
    return () => clearTimeout(t);
  }, [user, level, forceLevel, startTour]);

  if (!active || steps.length === 0) return null;

  return <AlexTour steps={steps} onDone={handleDone} />;
}
