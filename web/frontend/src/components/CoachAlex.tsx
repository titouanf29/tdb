"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Bot, ChevronRight, ChevronLeft, BarChart2, Globe,
  Lightbulb, Trophy, Sparkles, TrendingUp, Target, Zap,
  BookOpen, Search, MessageSquare, ArrowRight
} from "lucide-react";
import { useUserLevel } from "@/hooks/useUserLevel";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GuidedStep {
  icon: React.ReactNode;
  emoji: string;
  title: string;
  body: string;
  tip?: string;
  cta?: { label: string; href?: string; action?: () => void };
}

interface MenuAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  color: string;
}

// ─── Guided Flow: Analyser un actif ───────────────────────────────────────────

const ANALYSE_STEPS: GuidedStep[] = [
  {
    icon: <Globe className="w-6 h-6" />,
    emoji: "🌍",
    title: "Étape 1 — Les marchés",
    body: "Rendez-vous sur l'onglet **Marchés** pour voir tous les actifs disponibles : crypto, forex, actions, indices et matières premières.",
    tip: "Commencez par les actifs les plus liquides comme BTC/USD ou EUR/USD.",
    cta: { label: "Voir les Marchés", href: "/markets" },
  },
  {
    icon: <Search className="w-6 h-6" />,
    emoji: "🔍",
    title: "Étape 2 — Choisir un actif",
    body: "Choisissez un actif qui vous intéresse. Cherchez une valeur avec du **volume** et de la liquidité. Évitez les petites cryptos peu connues au début.",
    tip: "BTC, ETH, EUR/USD ou SPY sont de bons choix pour débuter.",
    cta: { label: "Scanner les opportunités", href: "/scanner" },
  },
  {
    icon: <BarChart2 className="w-6 h-6" />,
    emoji: "📊",
    title: "Étape 3 — Ouvrir l'analyse",
    body: "Cliquez sur **Analyser** à côté de l'actif, ou tapez son symbole dans la barre de recherche. Vous accédez aux graphiques et indicateurs.",
    cta: { label: "Aller à l'Analyse", href: "/analysis" },
  },
  {
    icon: <TrendingUp className="w-6 h-6" />,
    emoji: "📈",
    title: "Étape 4 — Lire le RSI",
    body: "Le **RSI** est votre premier indicateur. Au-dessus de **70** → l'actif est suracheté (prudence sur les achats). En dessous de **30** → survendu (possible rebond).",
    tip: "RSI entre 40 et 60 = zone neutre, attendez un signal plus clair.",
  },
  {
    icon: <Target className="w-6 h-6" />,
    emoji: "🎯",
    title: "Étape 5 — Supports & Résistances",
    body: "Repérez les **niveaux clés** sur le graphique : les supports (planchers où le prix rebondit) et les résistances (plafonds où il bute).",
    tip: "Un support cassé devient souvent une résistance. Notez ces niveaux !",
  },
  {
    icon: <MessageSquare className="w-6 h-6" />,
    emoji: "🤖",
    title: "Étape 6 — Analyse IA",
    body: "Utilisez l'**Assistant IA** pour une analyse complète. Il évalue le RSI, le MACD, les tendances et vous donne un avis contextualisé en temps réel.",
    tip: "Demandez : 'Analyse BTC maintenant' ou 'Est-ce un bon moment pour acheter EUR/USD ?'",
    cta: { label: "Ouvrir l'Assistant IA", href: "/assistant" },
  },
];

// ─── Menu actions ─────────────────────────────────────────────────────────────

const MENU_ACTIONS: MenuAction[] = [
  {
    id: "analyse",
    icon: <BarChart2 className="w-5 h-5" />,
    label: "Analyser un actif",
    description: "Guide pas à pas pour analyser votre premier actif",
    color: "from-[#638CFF]/20 to-[#638CFF]/5 border-[#638CFF]/30 text-[#638CFF]",
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
    color: "from-purple-400/20 to-purple-400/5 border-purple-400/30 text-purple-300",
  },
];

const DAILY_TIPS = [
  "Ne risquez jamais plus de 1-2% de votre capital sur un seul trade.",
  "La tendance est votre amie. Ne tradez pas contre la tendance principale.",
  "Un bon plan de trading inclut toujours un Stop Loss avant d'entrer en position.",
  "La patience est une compétence. Attendez le bon setup plutôt que de forcer.",
  "Journalisez chaque trade pour identifier vos patterns gagnants et perdants.",
  "Le RSI diverge souvent avant un retournement — surveillez ces signaux.",
  "En trading, protéger son capital est plus important que faire des gains.",
  "Ne tradez jamais sous stress émotionnel ou avec de l'argent que vous ne pouvez pas perdre.",
];

// ─── Main Component ───────────────────────────────────────────────────────────

export function CoachOverlay() {
  const { showCoach } = useUserLevel();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"menu" | "analyse" | "tip" | "markets">("menu");
  const [step, setStep] = useState(0);
  const [hasNotif, setHasNotif] = useState(true);
  const [dailyTip] = useState(() => DAILY_TIPS[new Date().getDay() % DAILY_TIPS.length]);
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const t = setTimeout(() => document.addEventListener("mousedown", handleClick), 100);
    return () => { clearTimeout(t); document.removeEventListener("mousedown", handleClick); };
  }, [open]);

  // Reset to menu when reopening
  useEffect(() => {
    if (!open) {
      setTimeout(() => { setView("menu"); setStep(0); }, 300);
    }
  }, [open]);

  const dismiss = useCallback(() => {
    setHasNotif(false);
    setOpen(false);
  }, []);

  if (!showCoach) return null;

  const handleAction = (id: string) => {
    if (id === "missions") { setOpen(false); return; }
    setView(id as any);
    setStep(0);
  };

  return (
    <div className="fixed bottom-4 left-4 z-50" ref={panelRef}>
      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.92 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="absolute bottom-16 left-0 w-80 sm:w-96"
          >
            {/* Glow */}
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-br from-[#638CFF]/20 to-[#00D4AA]/10 blur-xl pointer-events-none" />

            <div className="relative rounded-2xl border border-white/10 bg-[#080d1a]/95 backdrop-blur-2xl shadow-2xl overflow-hidden">
              {/* Top header */}
              <div className="relative flex items-center gap-3 px-4 py-3 border-b border-white/5"
                style={{ background: "linear-gradient(135deg, rgba(99,140,255,0.12) 0%, rgba(0,212,170,0.06) 100%)" }}>
                {/* Back button when in sub-view */}
                {view !== "menu" && (
                  <button
                    onClick={() => setView("menu")}
                    className="text-gray-400 hover:text-white transition-colors mr-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}

                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#638CFF] to-[#00D4AA] flex items-center justify-center shadow-lg shadow-[#638CFF]/30">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#00D4AA] border-2 border-[#080d1a]" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white leading-none">Alex</p>
                  <p className="text-xs text-[#00D4AA] mt-0.5">Coach Trading · En ligne</p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="text-gray-500 hover:text-gray-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content */}
              <AnimatePresence mode="wait">
                {view === "menu" && <MenuView key="menu" onAction={handleAction} />}
                {view === "analyse" && (
                  <AnalyseView
                    key="analyse"
                    step={step}
                    setStep={setStep}
                    onClose={() => setOpen(false)}
                  />
                )}
                {view === "tip" && <TipView key="tip" tip={dailyTip} />}
                {view === "markets" && <MarketsView key="markets" onClose={() => setOpen(false)} />}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB */}
      <motion.button
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => setOpen((v) => !v)}
        className="relative w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl"
        style={{
          background: open
            ? "linear-gradient(135deg, #638CFF 0%, #00D4AA 100%)"
            : "linear-gradient(135deg, #1a2444 0%, #0f1e35 100%)",
          border: "1px solid rgba(99,140,255,0.4)",
          boxShadow: "0 4px 24px rgba(99,140,255,0.25), 0 1px 3px rgba(0,0,0,0.5)",
        }}
      >
        {/* Pulse rings */}
        {!open && (
          <>
            <motion.span
              className="absolute inset-0 rounded-2xl border border-[#638CFF]/40"
              animate={{ scale: [1, 1.35], opacity: [0.5, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
            />
            <motion.span
              className="absolute inset-0 rounded-2xl border border-[#638CFF]/20"
              animate={{ scale: [1, 1.6], opacity: [0.3, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.4 }}
            />
          </>
        )}

        <AnimatePresence mode="wait">
          {open ? (
            <motion.div key="close" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }}>
              <X className="w-5 h-5 text-white" />
            </motion.div>
          ) : (
            <motion.div key="bot" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
              <Bot className="w-6 h-6 text-[#638CFF]" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Notification dot */}
        {hasNotif && !open && (
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#FF4757] border-2 border-[#080d1a]">
            <motion.span
              className="absolute inset-0 rounded-full bg-[#FF4757]"
              animate={{ scale: [1, 1.5], opacity: [1, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </span>
        )}
      </motion.button>
    </div>
  );
}

// ─── Sub-views ─────────────────────────────────────────────────────────────────

function MenuView({ onAction }: { onAction: (id: string) => void }) {
  return (
    <motion.div
      key="menu"
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      transition={{ duration: 0.18 }}
      className="p-4 space-y-3"
    >
      {/* Welcome message */}
      <div className="flex gap-2.5 p-3 rounded-xl bg-[#638CFF]/8 border border-[#638CFF]/15">
        <Sparkles className="w-4 h-4 text-[#638CFF] shrink-0 mt-0.5" />
        <p className="text-sm text-gray-300 leading-relaxed">
          Bonjour ! Je suis <span className="text-white font-semibold">Alex</span>, votre coach trading.
          Que souhaitez-vous apprendre aujourd'hui ?
        </p>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        {MENU_ACTIONS.map((action, i) => (
          <motion.button
            key={action.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            onClick={() => action.id === "missions" ? undefined : onAction(action.id)}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-xl border bg-gradient-to-r transition-all text-left group hover:scale-[1.01]",
              action.color
            )}
          >
            {action.id === "missions" ? (
              <Link href="/learn/missions" className="flex items-center gap-3 w-full">
                <div className="shrink-0">{action.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{action.label}</p>
                  <p className="text-xs text-gray-400 truncate">{action.description}</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-gray-500 shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            ) : (
              <>
                <div className="shrink-0">{action.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{action.label}</p>
                  <p className="text-xs text-gray-400 truncate">{action.description}</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-gray-500 shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </motion.button>
        ))}
      </div>

      {/* Footer */}
      <div className="pt-1 border-t border-white/5 flex items-center justify-between">
        <Link
          href="/learn"
          className="text-xs text-gray-500 hover:text-[#638CFF] transition-colors flex items-center gap-1"
        >
          <BookOpen className="w-3 h-3" />
          Aller à la Formation
        </Link>
        <p className="text-xs text-gray-600">Alex v2.0</p>
      </div>
    </motion.div>
  );
}

// ─── Guided Analysis Flow ─────────────────────────────────────────────────────

function AnalyseView({ step, setStep, onClose }: {
  step: number;
  setStep: (s: number) => void;
  onClose: () => void;
}) {
  const current = ANALYSE_STEPS[step];
  const isLast = step === ANALYSE_STEPS.length - 1;

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.18 }}
      className="p-4"
    >
      {/* Step dots */}
      <div className="flex items-center gap-1.5 mb-4">
        {ANALYSE_STEPS.map((_, i) => (
          <button
            key={i}
            onClick={() => setStep(i)}
            className={cn(
              "rounded-full transition-all",
              i === step
                ? "w-6 h-2 bg-[#638CFF]"
                : i < step
                  ? "w-2 h-2 bg-[#00D4AA]/60"
                  : "w-2 h-2 bg-white/15"
            )}
          />
        ))}
        <span className="ml-auto text-xs text-gray-500">{step + 1}/{ANALYSE_STEPS.length}</span>
      </div>

      {/* Step card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="space-y-3"
        >
          {/* Icon + title */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#638CFF]/20 to-[#00D4AA]/10 border border-[#638CFF]/20 flex items-center justify-center text-[#638CFF] shrink-0">
              {current.icon}
            </div>
            <div>
              <p className="text-xs text-[#638CFF] font-medium">{current.emoji} {current.title}</p>
            </div>
          </div>

          {/* Body — parse **bold** */}
          <p className="text-sm text-gray-300 leading-relaxed">
            {current.body.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
              part.startsWith("**") ? (
                <strong key={i} className="text-white font-semibold">
                  {part.slice(2, -2)}
                </strong>
              ) : (
                <span key={i}>{part}</span>
              )
            )}
          </p>

          {/* Tip box */}
          {current.tip && (
            <div className="flex gap-2 p-2.5 rounded-lg bg-yellow-400/8 border border-yellow-400/20">
              <Lightbulb className="w-3.5 h-3.5 text-yellow-300 shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-200/80 leading-relaxed">{current.tip}</p>
            </div>
          )}

          {/* CTA */}
          {current.cta && (
            <Link
              href={current.cta.href!}
              onClick={onClose}
              className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-gradient-to-r from-[#638CFF] to-[#00D4AA] text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              {current.cta.label}
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
        <button
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-30"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Précédent
        </button>

        {isLast ? (
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-xs font-medium text-[#00D4AA] hover:text-[#00D4AA]/80 transition-colors"
          >
            <Zap className="w-3.5 h-3.5" />
            Terminer !
          </button>
        ) : (
          <button
            onClick={() => setStep(Math.min(ANALYSE_STEPS.length - 1, step + 1))}
            className="flex items-center gap-1.5 text-xs text-[#638CFF] hover:text-[#638CFF]/80 transition-colors"
          >
            Suivant
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ─── Tip View ─────────────────────────────────────────────────────────────────

function TipView({ tip }: { tip: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.18 }}
      className="p-4"
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center">
            <Lightbulb className="w-4 h-4 text-yellow-300" />
          </div>
          <p className="text-sm font-semibold text-white">Conseil du jour</p>
        </div>

        <div className="p-4 rounded-xl bg-gradient-to-br from-yellow-400/10 to-orange-400/5 border border-yellow-400/20">
          <p className="text-sm text-gray-200 leading-relaxed italic">"{tip}"</p>
        </div>

        <div className="flex flex-col gap-2">
          <Link
            href="/learn"
            className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm text-gray-300 transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            Approfondir dans la Formation
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Markets View ─────────────────────────────────────────────────────────────

const MARKET_OVERVIEW = [
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
    color: "text-blue-400 bg-blue-400/10 border-blue-400/20",
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

function MarketsView({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.18 }}
      className="p-4 space-y-3"
    >
      <p className="text-sm text-gray-400">Les 4 grandes familles de marchés sur CaptentDB :</p>

      <div className="space-y-2">
        {MARKET_OVERVIEW.map((m, i) => (
          <motion.div
            key={m.name}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.07 }}
            className={cn("flex items-start gap-3 p-3 rounded-xl border bg-gradient-to-r from-transparent", m.color)}
          >
            <span className="text-lg shrink-0">{m.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-white">{m.name}</p>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-gray-400">
                  Risque {m.risk}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">{m.examples}</p>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">{m.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <Link
        href="/markets"
        onClick={onClose}
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-[#638CFF] to-[#00D4AA] text-white text-sm font-medium hover:opacity-90 transition-opacity"
      >
        <Globe className="w-4 h-4" />
        Explorer les marchés
      </Link>
    </motion.div>
  );
}
