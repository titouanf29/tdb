"use client";

import { useEffect, useRef, useCallback } from "react";
import { useUserLevel } from "@/hooks/useUserLevel";
import { useAuth } from "@/lib/AuthContext";
import type { TradingLevel } from "@/lib/auth";

type DriverStep = {
  element?: string;
  popover: {
    title: string;
    description: string;
    side?: "top" | "bottom" | "left" | "right";
    align?: "start" | "center" | "end";
  };
};

const BEGINNER_STEPS: DriverStep[] = [
  {
    popover: {
      title: "👋 Bienvenue sur CaptenTDB !",
      description: "Je suis Alex, votre coach trading. Laissez-moi vous faire découvrir la plateforme en 2 minutes.",
    },
  },
  {
    element: "[data-tour='dashboard']",
    popover: {
      title: "📊 Tableau de bord",
      description: "Votre hub central : résumé des marchés, positions ouvertes et performance globale.",
      side: "right",
    },
  },
  {
    element: "[data-tour='learn']",
    popover: {
      title: "🎓 Formation",
      description: "Apprenez les bases du trading avec des cours structurés, des quiz et des parcours guidés.",
      side: "right",
    },
  },
  {
    element: "[data-tour='markets']",
    popover: {
      title: "🌍 Marchés",
      description: "Explorez tous les actifs disponibles : crypto, forex, actions, indices, matières premières.",
      side: "right",
    },
  },
  {
    element: "[data-tour='scanner']",
    popover: {
      title: "🔍 Scanner",
      description: "Détectez les meilleures opportunités du marché avec nos algorithmes d'analyse technique.",
      side: "right",
    },
  },
  {
    element: "[data-tour='analysis']",
    popover: {
      title: "📈 Analyse",
      description: "Analysez n'importe quel actif : graphiques, RSI, MACD, supports/résistances et IA.",
      side: "right",
    },
  },
  {
    element: "[data-tour='wallet']",
    popover: {
      title: "💼 Portefeuille",
      description: "Suivez vos positions ouvertes, votre performance et votre historique de trades.",
      side: "right",
    },
  },
  {
    popover: {
      title: "🤖 Coach Alex — votre allié",
      description: "Retrouvez Alex en bas à gauche à tout moment pour obtenir des conseils et un guidage pas à pas.",
    },
  },
  {
    popover: {
      title: "🚀 C'est parti !",
      description: "Commencez par la section Formation. Bonne chance sur les marchés !",
    },
  },
];

const INTERMEDIATE_STEPS: DriverStep[] = [
  {
    popover: {
      title: "⚡ Bienvenue en mode Intermédiaire !",
      description: "Voici un aperçu rapide des fonctionnalités avancées à votre disposition.",
    },
  },
  {
    element: "[data-tour='scanner']",
    popover: {
      title: "🔍 Scanner avancé",
      description: "6 indicateurs techniques simultanés. Filtrez par marché, volatilité et force de signal.",
      side: "right",
    },
  },
  {
    element: "[data-tour='analysis']",
    popover: {
      title: "📊 Analyse multi-timeframe",
      description: "Combinez RSI, MACD, Bollinger et EMA sur plusieurs unités de temps pour des setups précis.",
      side: "right",
    },
  },
  {
    element: "[data-tour='assistant']",
    popover: {
      title: "🤖 IA contextuelle",
      description: "L'IA connaît les marchés en temps réel et analyse vos actifs avec une précision experte.",
      side: "right",
    },
  },
  {
    popover: {
      title: "✅ Tout est prêt !",
      description: "Explorez les marchés et lancez une analyse. Bonne session de trading !",
    },
  },
];

export const TOUR_KEY = "tdb_onboarding_done";

interface OnboardingTourProps {
  /** If set, force-starts the tour for the given level (bypasses localStorage check) */
  forceLevel?: TradingLevel | null;
  onTourDone?: () => void;
}

export function OnboardingTour({ forceLevel, onTourDone }: OnboardingTourProps = {}) {
  const { level } = useUserLevel();
  const { user } = useAuth();
  const driverRef = useRef<any>(null);
  const startedRef = useRef(false);

  const runTour = useCallback(async (tourLevel: TradingLevel | "beginner", force = false) => {
    if (typeof window === "undefined") return;
    if (!force && localStorage.getItem(TOUR_KEY)) return;
    if (tourLevel === "expert") return;

    try {
      const { driver } = await import("driver.js");

      const steps = tourLevel === "beginner" ? BEGINNER_STEPS : INTERMEDIATE_STEPS;

      driverRef.current = driver({
        animate: true,
        showProgress: true,
        showButtons: ["next", "previous", "close"],
        nextBtnText: "Suivant →",
        prevBtnText: "← Retour",
        doneBtnText: "Commencer !",
        progressText: "Étape {{current}} / {{total}}",
        onDestroyed: () => {
          localStorage.setItem(TOUR_KEY, "1");
          onTourDone?.();
        },
        steps: steps.map((s) => ({
          element: s.element,
          popover: { ...s.popover, showButtons: ["next", "previous", "close"] },
        })),
      });

      setTimeout(() => driverRef.current?.drive(), 600);
    } catch {
      // driver.js load failed silently
    }
  }, [onTourDone]);

  // Force-start when forceLevel is provided (after onboarding modal)
  useEffect(() => {
    if (!forceLevel) return;
    runTour(forceLevel, true);
    return () => driverRef.current?.destroy();
  }, [forceLevel, runTour]);

  // Auto-start on first login (if not already done)
  useEffect(() => {
    if (forceLevel) return; // handled above
    if (!user || startedRef.current) return;
    if (level === "expert") return;
    startedRef.current = true;
    runTour(level, false);
    return () => driverRef.current?.destroy();
  }, [user, level, forceLevel, runTour]);

  return null;
}

/** Reset and restart tour (e.g. from Help button or settings) */
export function restartTour() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOUR_KEY);
    window.location.reload();
  }
}
