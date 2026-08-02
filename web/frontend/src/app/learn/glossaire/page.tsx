"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { TRADING_TOOLTIPS, type TooltipDefinition } from "@/components/LearnTooltip";
import { useUserLevel } from "@/hooks/useUserLevel";
import { cn } from "@/lib/utils";

// Additional glossary terms beyond TRADING_TOOLTIPS
const EXTRA_TERMS: Record<string, TooltipDefinition> = {
  "Chandelier japonais": {
    simple: "Un graphique qui affiche l'ouverture, le haut, le bas et la fermeture d'un actif pour une période donnée.",
    standard: "Représentation visuelle des données de prix OHLC sur une période. Le corps montre ouv/clôt, les mèches montrent les extrêmes.",
    technical: "OHLC candle: corps = |Open − Close|, couleur = bullish (Close > Open) ou bearish. Mèche sup/inf = High/Low. Patterns: doji, marteau, englobante...",
    example: "Un marteau sur support = potentiel signal d'achat.",
    learnLink: "/learn",
  },
  "Volume": {
    simple: "Le nombre de transactions effectuées sur un actif pendant une période. Un fort volume confirme un mouvement de prix.",
    standard: "Volume = nb d'unités échangées. Volume élevé sur cassure = confirmation. Volume faible sur tendance = tendance fragile.",
    technical: "Volume Profile, VWAP, OBV (On-Balance Volume). Divergence volume/prix = signal de retournement.",
    example: "Cassure de résistance avec volume ×3 = signal haussier fiable.",
    learnLink: "/learn",
  },
  "Tendance": {
    simple: "La direction générale dans laquelle évolue le prix d'un actif : hausse, baisse ou horizontal.",
    standard: "Tendance haussière : sommets et creux plus hauts. Baissière : sommets et creux plus bas. Identification via EMA ou trendlines.",
    technical: "Théorie de Dow. Tendance primaire (mois-années), secondaire (semaines), tertiaire (jours). Structure en vagues (Elliott).",
    example: "Prix fait 3 plus hauts successifs → tendance haussière confirmée.",
    learnLink: "/learn",
  },
  "Levier": {
    simple: "Emprunter de l'argent au broker pour amplifier vos positions. x2 = gains et pertes doublés.",
    standard: "Levier = capital total / capital propre. x10 sur 1000€ = position 10 000€. Risque de liquidation si perte > capital.",
    technical: "Margin call = appel de marge quand equity < maintenance margin. Liquidation automatique = position fermée de force.",
    example: "Levier x10 sur BTC à 60k avec 1000€ = liquidation si BTC chute de 10%.",
    learnLink: "/learn",
  },
  "Swing Trading": {
    simple: "Garder des positions plusieurs jours à quelques semaines pour profiter des fluctuations de marché.",
    standard: "Horizon : 2 jours à 6 semaines. Analyse daily/H4. Objectif : capturer un swing complet (TP = prochain niveau clé).",
    technical: "Setup type : retracement sur support + confirmation chandelier + RSI divergence. R/R minimum 1:2. SL sous structure.",
    example: "BTC revient sur EMA 50 en daily avec RSI oversold → setup swing achat.",
    learnLink: "/learn",
  },
  "Scalping": {
    simple: "Ouvrir et fermer des positions très rapidement (secondes à minutes) pour cumuler de petits gains.",
    standard: "Timeframe : M1-M5. Nombreux trades par jour. Spread critique → broker ECN recommandé. Discipline extrême requise.",
    technical: "Focus sur Order Flow, DOM (Depth of Market), bid-ask spread. Indicateurs : VWAP, Level 2, tape reading.",
    example: "10 trades par jour à +0.2% chacun → +2% journalier (avant frais).",
    learnLink: "/learn",
  },
  "Day Trading": {
    simple: "Ouvrir et fermer toutes ses positions dans la même journée, sans garder de positions ouvertes la nuit.",
    standard: "Pas d'exposition overnight. Analyse M15-H1. Horaires clés : ouverture London (9h), ouverture NY (15h30).",
    technical: "Gap risk éliminé. Focus sur sessions liquides. PDH/PDL (Previous Day High/Low) comme niveaux clés.",
    example: "Achat EUR/USD à 9h30 Paris, vente à 11h → clôture avant 17h.",
    learnLink: "/learn",
  },
  "R/R (Risk/Reward)": {
    simple: "Le rapport entre ce que vous risquez de perdre et ce que vous espérez gagner. Un bon ratio est au moins 1:2.",
    standard: "R/R = distance TP / distance SL. Ratio 1:2 → 2€ gagnés pour 1€ risqué. Avec 50% de winrate, profitable à 1:2.",
    technical: "Expected Value = (WinRate × R) − ((1−WinRate) × 1). EV positif requis pour stratégie viable long terme.",
    example: "SL = 50 pips, TP = 150 pips → R/R = 1:3. Profitable même avec 40% de winrate.",
    learnLink: "/learn",
  },
  "Liquidité": {
    simple: "La facilité avec laquelle on peut acheter ou vendre un actif sans trop faire bouger son prix.",
    standard: "Actif liquide = spread serré, volume élevé, exécution rapide. Crypto small cap = faible liquidité = slippage élevé.",
    technical: "Market depth, bid-ask spread, market impact. Smart money chasse la liquidité (stops hunt, liquidity sweep).",
    example: "EUR/USD = très liquide (spread 0.1 pip). Petite crypto = illiquide (spread 5%).",
    learnLink: "/learn",
  },
  "PnL": {
    simple: "Profit and Loss — vos gains et pertes. PnL positif = vous gagnez, négatif = vous perdez.",
    standard: "PnL réalisé = clôtures. PnL non réalisé = positions ouvertes. PnL net = après frais et commissions.",
    technical: "PnL% = (Exit − Entry) / Entry × 100 × levier. Drawdown = max PnL négatif depuis le dernier pic.",
    example: "Achat BTC à 60k, vente à 63k → PnL = +5% (hors frais).",
    learnLink: "/learn",
  },
};

const ALL_TERMS = { ...TRADING_TOOLTIPS, ...EXTRA_TERMS };

export default function GlossairePage() {
  const { vocabularyMode } = useUserLevel();
  const [search, setSearch] = useState("");
  const [activeMode, setActiveMode] = useState<"simple" | "standard" | "technical">(vocabularyMode);
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return Object.entries(ALL_TERMS).filter(([term]) =>
      !q || term.toLowerCase().includes(q)
    ).sort(([a], [b]) => a.localeCompare(b, "fr"));
  }, [search]);

  const alphabet = useMemo(() => {
    const letters = new Set(filtered.map(([t]) => t[0].toUpperCase()));
    return Array.from(letters).sort();
  }, [filtered]);

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/learn" className="text-gray-400 hover:text-white transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-[#E8A820]" />
            Glossaire du Trading
          </h1>
          <p className="text-sm text-gray-400">{Object.keys(ALL_TERMS).length} termes définis</p>
        </div>
      </div>

      {/* Search + mode */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Rechercher un terme..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#E8A820]/50 focus:ring-1 focus:ring-[#E8A820]/20"
          />
        </div>
        <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
          {(["simple", "standard", "technical"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setActiveMode(m)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize",
                activeMode === m ? "bg-[#E8A820]/20 text-[#E8A820] border border-[#E8A820]/30" : "text-gray-400 hover:text-gray-300"
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Quick alphabet nav */}
      {!search && (
        <div className="flex flex-wrap gap-1">
          {alphabet.map((letter) => (
            <a
              key={letter}
              href={`#letter-${letter}`}
              className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-xs font-mono text-gray-400 hover:text-white transition-all"
            >
              {letter}
            </a>
          ))}
        </div>
      )}

      {/* Terms list grouped by letter */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Aucun terme trouvé pour "{search}"
          </div>
        )}
        {filtered.map(([term, def], idx) => {
          const letter = term[0].toUpperCase();
          const prevLetter = idx > 0 ? filtered[idx - 1][0][0].toUpperCase() : "";
          const showDivider = !search && letter !== prevLetter;

          return (
            <div key={term}>
              {showDivider && (
                <div id={`letter-${letter}`} className="flex items-center gap-3 py-2">
                  <span className="text-lg font-bold text-[#E8A820]">{letter}</span>
                  <div className="flex-1 h-px bg-white/5" />
                </div>
              )}
              <motion.div
                layout
                className={cn(
                  "rounded-xl border cursor-pointer transition-all",
                  expanded === term
                    ? "border-[#E8A820]/30 bg-[#E8A820]/5"
                    : "border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]"
                )}
                onClick={() => setExpanded(expanded === term ? null : term)}
              >
                <div className="flex items-center justify-between px-4 py-3 gap-3">
                  <span className="font-semibold text-sm text-white">{term}</span>
                  <ChevronRight
                    className={cn(
                      "w-4 h-4 text-gray-500 transition-transform shrink-0",
                      expanded === term && "rotate-90"
                    )}
                  />
                </div>

                <AnimatePresence>
                  {expanded === term && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
                        <p className="text-sm text-gray-300 leading-relaxed">{def[activeMode]}</p>

                        {def.example && (
                          <div className="rounded-lg bg-white/5 border border-white/5 p-2.5 text-gray-400 text-xs italic">
                            💡 {def.example}
                          </div>
                        )}

                        {def.learnLink && (
                          <Link
                            href={def.learnLink}
                            className="inline-flex items-center gap-1 text-xs text-[#E8A820] hover:text-[#E8A820]/80 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <BookOpen className="w-3 h-3" />
                            Voir le cours
                          </Link>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
