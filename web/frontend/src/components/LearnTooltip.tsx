"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, BookOpen, X } from "lucide-react";
import { useUserLevel, type VocabularyMode } from "@/hooks/useUserLevel";
import { cn } from "@/lib/utils";

export interface TooltipDefinition {
  simple: string;
  standard: string;
  technical: string;
  example?: string;
  learnLink?: string;
}

export const TRADING_TOOLTIPS: Record<string, TooltipDefinition> = {
  RSI: {
    simple: "Un indicateur qui mesure si un actif est trop acheté (risque de baisse) ou trop vendu (risque de hausse). Valeur entre 0 et 100.",
    standard: "Le RSI (Relative Strength Index) est un oscillateur de momentum (14 périodes par défaut). RSI > 70 = surachat, RSI < 30 = survente.",
    technical: "RSI = 100 − 100/(1 + RS), où RS = moyenne des gains / moyenne des pertes sur N périodes. Divergences RSI/prix = signal de retournement prioritaire.",
    example: "RSI à 75 sur BTC → signal de surachat, prudence sur nouveaux achats.",
    learnLink: "/learn",
  },
  MACD: {
    simple: "Un indicateur qui montre quand une tendance commence ou se termine, en comparant deux moyennes mobiles.",
    standard: "MACD = EMA(12) − EMA(26). Signal = EMA(9) du MACD. Croisement MACD/Signal = signal d'entrée/sortie.",
    technical: "Convergence/Divergence des Moyennes Mobiles. Histogramme = MACD − Signal. Zero-cross + divergence = confirmation de tendance.",
    example: "MACD croise au-dessus de la ligne signal → signal haussier.",
    learnLink: "/learn",
  },
  EMA: {
    simple: "Une moyenne des prix récents qui donne plus d'importance aux prix récents. Permet de voir la tendance.",
    standard: "Moyenne Mobile Exponentielle. Réagit plus vite aux changements de prix que la SMA. EMA 20/50/200 = repères clés.",
    technical: "EMAₜ = Priceₜ × k + EMAₜ₋₁ × (1−k), k = 2/(N+1). Croisements dorés (EMA 50 > EMA 200) et croisements de la mort.",
    example: "Prix au-dessus de l'EMA 200 → tendance haussière long terme.",
    learnLink: "/learn",
  },
  support: {
    simple: "Un niveau de prix où les acheteurs arrivent souvent et empêchent le prix de descendre plus bas.",
    standard: "Zone de support = niveau où la demande dépasse l'offre. Plus un support est testé, plus il devient important (et fragile).",
    technical: "Support statique (niveau horizontal) vs dynamique (EMA, trendline). Pullback post-cassure = retest du support en résistance.",
    example: "BTC revient sur 60 000$ pour la 3e fois → support majeur à surveiller.",
    learnLink: "/learn",
  },
  resistance: {
    simple: "Un niveau de prix où les vendeurs arrivent souvent et empêchent le prix de monter plus haut.",
    standard: "Zone de résistance = niveau où l'offre dépasse la demande. Une résistance cassée devient souvent un support.",
    technical: "Résistance = ancien support + rejet répété + volumes vendeurs élevés au niveau. Breakout = cassure avec volume confirmé.",
    example: "L'or bloque à 2 500$/oz depuis 3 semaines → résistance majeure.",
    learnLink: "/learn",
  },
  stopLoss: {
    simple: "Un ordre automatique qui ferme votre position si le prix va dans le mauvais sens, pour limiter vos pertes.",
    standard: "Stop Loss = ordre de vente déclenché si le prix atteint un seuil défini. Protège le capital en cas de mouvement adverse.",
    technical: "Placement optimal : au-delà de la structure (support/résistance) pour éviter les faux signaux. ATR × 1.5 = méthode dynamique courante.",
    example: "Achat BTC à 60k, SL à 58k → perte maximale de 3.3% du capital engagé.",
    learnLink: "/learn",
  },
  takeProfit: {
    simple: "Un ordre automatique qui ferme votre position quand vous avez atteint votre objectif de gain.",
    standard: "Take Profit = ordre de clôture à un niveau de gain défini. Permet de sécuriser les profits sans surveiller en permanence.",
    technical: "TP placement : niveau de résistance suivant, extension de Fibonacci (1.618x), ou ratio R/R ≥ 2:1 par rapport au SL.",
    example: "SL à -50$, TP à +100$ → ratio risque/récompense de 1:2.",
    learnLink: "/learn",
  },
  Bollinger: {
    simple: "Des bandes autour du prix qui s'élargissent quand le marché est agité et se resserrent quand il est calme.",
    standard: "Bandes de Bollinger = EMA(20) ± 2×écart-type. Squeeze (bandes serrées) précède souvent une explosion de volatilité.",
    technical: "Calcul : Bande sup = SMA(20) + 2σ, Bande inf = SMA(20) − 2σ. %B = (Prix − Bande inf) / (Bande sup − Bande inf). Marcheurs sur bande = tendance forte.",
    example: "Squeeze Bollinger sur EUR/USD → attente d'un breakout imminent.",
    learnLink: "/learn",
  },
  Stochastique: {
    simple: "Un indicateur qui compare le prix actuel au range des derniers prix pour détecter des retournements.",
    standard: "Stochastique (14,3,3) : %K = (Fermeture − Bas min) / (Haut max − Bas min) × 100. >80 = surachat, <20 = survente.",
    technical: "Stochastique lent vs rapide. Signal : croisement %K/%D en zone extrême + divergence avec le prix = setup haute probabilité.",
    example: "Stochastique sous 20 avec divergence haussière → potentiel rebond.",
    learnLink: "/learn",
  },
  ATR: {
    simple: "Un indicateur qui mesure l'amplitude des mouvements de prix. Élevé = marché agité, faible = marché calme.",
    standard: "Average True Range : moyenne des True Range (max-min, max-clôt préc., min-clôt préc.) sur N périodes. Utilisé pour calibrer les SL.",
    technical: "ATR = EMA(TR, 14). TR = max(H−L, |H−C prev|, |L−C prev|). Stop ATR : SL = entrée − 1.5×ATR(14). Non directionnel.",
    example: "ATR BTC à 2 000$ → SL minimum de 3 000$ pour éviter le bruit.",
    learnLink: "/learn",
  },
  Ichimoku: {
    simple: "Un système d'analyse complet qui montre la tendance, le support, la résistance et le momentum en un seul coup d'œil.",
    standard: "5 lignes : Tenkan (9), Kijun (26), Chikou, Senkou A&B. Le Kumo (nuage) = zone de support/résistance principale.",
    technical: "TK-cross, Kijun bounce, breakout kumo = 3 signaux classiques. Lagging span (Chikou) confirme. Kumo twist = alerte retournement.",
    example: "Prix au-dessus du Kumo + TK haussier + Chikou libre = tendance haussière confirmée.",
    learnLink: "/learn",
  },
};

interface LearnTooltipProps {
  term: string;
  children?: React.ReactNode;
  className?: string;
  position?: "top" | "bottom" | "left" | "right";
}

export function LearnTooltip({ term, children, className, position = "top" }: LearnTooltipProps) {
  const { showTooltips, vocabularyMode } = useUserLevel();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const definition = TRADING_TOOLTIPS[term];

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (!definition || !showTooltips) {
    return <>{children ?? <span className={className}>{term}</span>}</>;
  }

  const text = definition[vocabularyMode as VocabularyMode];

  return (
    <span ref={ref} className="relative inline-block">
      <button
        type="button"
        className={cn(
          "inline-flex items-center gap-1 border-b border-dashed border-blue-400/60 text-blue-300 hover:text-blue-200 transition-colors cursor-help",
          className
        )}
        onClick={() => setOpen((v) => !v)}
      >
        {children ?? term}
        <HelpCircle className="w-3 h-3 opacity-70 shrink-0" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: position === "top" ? 6 : -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: position === "top" ? 6 : -6, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute z-50 w-72 rounded-xl border border-white/10 bg-[#0f1729]/95 backdrop-blur-xl p-4 shadow-2xl text-sm",
              position === "top" ? "bottom-full mb-2 left-1/2 -translate-x-1/2" : "top-full mt-2 left-1/2 -translate-x-1/2",
              "max-w-[calc(100vw-2rem)]"
            )}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="font-semibold text-white">{term}</span>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-gray-300 leading-relaxed">{text}</p>

            {definition.example && (
              <div className="mt-2 rounded-lg bg-white/5 border border-white/5 p-2 text-gray-400 text-xs italic">
                {definition.example}
              </div>
            )}

            {definition.learnLink && (
              <a
                href={definition.learnLink}
                className="mt-2 inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                onClick={() => setOpen(false)}
              >
                <BookOpen className="w-3 h-3" />
                Apprendre plus
              </a>
            )}

            {/* vocabulary mode label */}
            <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between">
              <span className="text-xs text-gray-600 capitalize">{vocabularyMode}</span>
              <div className="flex gap-0.5">
                {(["simple", "standard", "technical"] as VocabularyMode[]).map((m) => (
                  <div
                    key={m}
                    className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      m === vocabularyMode ? "bg-blue-400" : "bg-white/10"
                    )}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}
