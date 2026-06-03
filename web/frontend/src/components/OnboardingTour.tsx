"use client";

import { useEffect, useRef, useCallback } from "react";
import { useUserLevel } from "@/hooks/useUserLevel";
import { useAuth } from "@/lib/AuthContext";

// driver.js is loaded dynamically to avoid SSR issues
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
      title: "👋 Bienvenue sur CaptentDB !",
      description: "Je suis Alex, votre coach trading. Laissez-moi vous faire découvrir la plateforme en 2 minutes.",
    },
  },
  {
    element: "[data-tour='dashboard']",
    popover: {
      title: "📊 Tableau de bord",
      description: "Votre hub central : résumé des marchés, positions ouvertes, et performance globale.",
      side: "right",
    },
  },
  {
    element: "[data-tour='learn']",
    popover: {
      title: "🎓 Espace Formation",
      description: "Apprenez les bases du trading avec des cours structurés, des quiz et des exemples concrets.",
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
    element: "[data-tour='wallet']",
    popover: {
      title: "💼 Portefeuille",
      description: "Suivez vos positions ouvertes, votre performance et votre historique de trades.",
      side: "right",
    },
  },
  {
    element: "[data-tour='analysis']",
    popover: {
      title: "📈 Analyse",
      description: "Analysez n'importe quel actif : graphiques, indicateurs techniques, et insights IA.",
      side: "right",
    },
  },
  {
    element: "[data-tour='ai-chat']",
    popover: {
      title: "🤖 Assistant IA",
      description: "Posez vos questions de trading à notre IA 24h/24. Elle connaît les marchés en temps réel.",
      side: "top",
    },
  },
  {
    popover: {
      title: "🚀 C'est parti !",
      description: "Vous êtes prêt. Commencez par la section Formation pour maîtriser les bases. Bonne chance !",
    },
  },
];

const INTERMEDIATE_STEPS: DriverStep[] = [
  {
    popover: {
      title: "⚡ Bienvenue !",
      description: "Vous avez un niveau intermédiaire. Voici les fonctionnalités avancées à votre disposition.",
    },
  },
  {
    element: "[data-tour='scanner']",
    popover: {
      title: "🔍 Scanner avancé",
      description: "Accédez à 6 indicateurs techniques simultanément et filtrez par marché, volatilité et signaux.",
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
    element: "[data-tour='ai-chat']",
    popover: {
      title: "🤖 IA contextuelle",
      description: "L'IA analyse vos positions et vous suggère des améliorations basées sur votre profil.",
      side: "top",
    },
  },
];

const TOUR_KEY = "tdb_onboarding_done";

export function OnboardingTour() {
  const { level } = useUserLevel();
  const { user } = useAuth();
  const driverRef = useRef<any>(null);
  const startedRef = useRef(false);

  const startTour = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(TOUR_KEY)) return;

    try {
      const { driver } = await import("driver.js");

      const steps = level === "beginner" ? BEGINNER_STEPS : INTERMEDIATE_STEPS;

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
        },
        steps: steps.map((s) => ({
          element: s.element,
          popover: {
            ...s.popover,
            showButtons: ["next", "previous", "close"],
          },
        })),
      });

      // Small delay to let the page fully render
      setTimeout(() => {
        driverRef.current?.drive();
      }, 800);
    } catch {
      // driver.js unavailable or already done
    }
  }, [level]);

  useEffect(() => {
    if (!user || startedRef.current) return;
    if (level === "expert") return; // skip for experts
    startedRef.current = true;
    startTour();

    return () => {
      driverRef.current?.destroy();
    };
  }, [user, level, startTour]);

  return null;
}

/** Programmatically restart the tour (e.g. from Help button) */
export function restartTour() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOUR_KEY);
    window.location.reload();
  }
}
