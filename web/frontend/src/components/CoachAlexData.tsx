"use client";

import { BarChart2, Globe, Lightbulb, Trophy, Search, TrendingUp, Target, MessageSquare } from "lucide-react";
import type React from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GuidedStep {
  icon: React.ReactNode;
  emoji: string;
  title: string;
  body: string;
  tip?: string;
  cta?: { label: string; href?: string; action?: () => void };
}

export interface MenuAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  color: string;
}

// ─── Guided Flow: Analyser un actif ───────────────────────────────────────────

export const ANALYSE_STEPS: GuidedStep[] = [
  {
    icon: <Globe className="w-6 h-6" />,
    emoji: "🌍",
    title: "Étape 1, Les marchés",
    body: "Rendez-vous sur l'onglet **Marchés** pour voir tous les actifs disponibles : crypto, forex, actions, indices et matières premières.",
    tip: "Commencez par les actifs les plus liquides comme BTC/USD ou EUR/USD.",
    cta: { label: "Voir les Marchés", href: "/markets" },
  },
  {
    icon: <Search className="w-6 h-6" />,
    emoji: "🔍",
    title: "Étape 2, Choisir un actif",
    body: "Choisissez un actif qui vous intéresse. Cherchez une valeur avec du **volume** et de la liquidité. Évitez les petites cryptos peu connues au début.",
    tip: "BTC, ETH, EUR/USD ou SPY sont de bons choix pour débuter.",
    cta: { label: "Scanner les opportunités", href: "/scanner" },
  },
  {
    icon: <BarChart2 className="w-6 h-6" />,
    emoji: "📊",
    title: "Étape 3, Ouvrir l'analyse",
    body: "Cliquez sur **Analyser** à côté de l'actif, ou tapez son symbole dans la barre de recherche. Vous accédez aux graphiques et indicateurs.",
    cta: { label: "Aller à l'Analyse", href: "/analysis" },
  },
  {
    icon: <TrendingUp className="w-6 h-6" />,
    emoji: "📈",
    title: "Étape 4, Lire le RSI",
    body: "Le **RSI** est votre premier indicateur. Au-dessus de **70** → l'actif est suracheté (prudence sur les achats). En dessous de **30** → survendu (possible rebond).",
    tip: "RSI entre 40 et 60 = zone neutre, attendez un signal plus clair.",
  },
  {
    icon: <Target className="w-6 h-6" />,
    emoji: "🎯",
    title: "Étape 5, Supports & Résistances",
    body: "Repérez les **niveaux clés** sur le graphique : les supports (planchers où le prix rebondit) et les résistances (plafonds où il bute).",
    tip: "Un support cassé devient souvent une résistance. Notez ces niveaux !",
  },
  {
    icon: <MessageSquare className="w-6 h-6" />,
    emoji: "🤖",
    title: "Étape 6, Analyse IA",
    body: "Utilisez l'**Assistant IA** pour une analyse complète. Il évalue le RSI, le MACD, les tendances et vous donne un avis contextualisé en temps réel.",
    tip: "Demandez : 'Analyse BTC maintenant' ou 'Est-ce un bon moment pour acheter EUR/USD ?'",
    cta: { label: "Ouvrir l'Assistant IA", href: "/assistant" },
  },
];

// ─── Menu actions ─────────────────────────────────────────────────────────────

export const MENU_ACTIONS: MenuAction[] = [
  {
    id: "analyse",
    icon: <BarChart2 className="w-5 h-5" />,
    label: "Analyser un actif",
    description: "Guide pas à pas pour analyser votre premier actif",
    color: "from-[#E8A820]/20 to-[#E8A820]/5 border-[#E8A820]/30 text-[#E8A820]",
  },
  {
    id: "markets",
    icon: <Globe className="w-5 h-5" />,
    label: "Explorer les marchés",
    description: "Découvrez les différents marchés disponibles",
    color: "from-[#00D4AA]/20 to-[#00D4AA]/5 border-[#00D4AA]/30 text-[#00D4AA]",
  },
  {
    id: "tip",
    icon: <Lightbulb className="w-5 h-5" />,
    label: "Conseil du jour",
    description: "Un tip trading pour progresser aujourd'hui",
    color: "from-yellow-400/20 to-yellow-400/5 border-yellow-400/30 text-yellow-300",
  },
  {
    id: "missions",
    icon: <Trophy className="w-5 h-5" />,
    label: "Mes missions",
    description: "Voir votre progression et vos badges XP",
    color: "from-neon-purple/20 to-neon-purple/5 border-neon-purple/30 text-neon-purple",
  },
];

export const MARKET_OVERVIEW = [
  {
    icon: "₿",
    name: "Crypto",
    examples: "BTC, ETH, SOL",
    desc: "Marché ouvert 24h/24, 7j/7. Très volatil = gains et pertes amplifiés.",
    color: "text-orange-400 bg-orange-400/10 border-orange-400/20",
    risk: "Élevé",
  },
  {
    icon: "€",
    name: "Forex",
    examples: "EUR/USD, GBP/USD",
    desc: "Le plus grand marché du monde. Ouvert 24h/5 (lun-ven). Spreads serrés.",
    color: "text-primary bg-primary/10 border-primary/20",
    risk: "Moyen",
  },
  {
    icon: "📈",
    name: "Actions",
    examples: "Apple, Tesla, LVMH",
    desc: "Parts d'entreprises. Marché ouvert en journée (9h30-16h NY).",
    color: "text-green-400 bg-green-400/10 border-green-400/20",
    risk: "Moyen",
  },
  {
    icon: "🥇",
    name: "Matières premières",
    examples: "Or, Pétrole, Blé",
    desc: "Actifs tangibles. L'or est souvent une valeur refuge en période d'incertitude.",
    color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
    risk: "Variable",
  },
];
