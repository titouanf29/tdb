"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bot, ChevronRight } from "lucide-react";
import { useUserLevel } from "@/hooks/useUserLevel";
import { cn } from "@/lib/utils";
import Link from "next/link";

export interface CoachTrigger {
  id: string;
  message: string;
  /** Optional CTA button */
  cta?: { label: string; href?: string; action?: () => void };
  /** Auto-dismiss after ms (default: never) */
  autoDismiss?: number;
}

export const COACH_TRIGGERS: Record<string, CoachTrigger> = {
  welcome: {
    id: "welcome",
    message: "Bonjour ! Je suis Alex, votre coach trading. Commencez par la Formation pour apprendre les bases !",
    cta: { label: "Aller à la Formation", href: "/learn" },
    autoDismiss: 8000,
  },
  first_scan: {
    id: "first_scan",
    message: "Bien joué ! Vous avez lancé votre premier scan. Regardez les indicateurs RSI et MACD pour détecter les opportunités.",
    cta: { label: "En savoir plus", href: "/learn" },
    autoDismiss: 10000,
  },
  first_analysis: {
    id: "first_analysis",
    message: "Excellent ! L'analyse technique est la base du trading. Commencez par identifier les supports et résistances.",
    autoDismiss: 8000,
  },
  low_lessons: {
    id: "low_lessons",
    message: "Vous avez complété 1 cours sur 10. Continuez votre progression pour débloquer des fonctionnalités avancées !",
    cta: { label: "Continuer la formation", href: "/learn" },
  },
  rsi_hint: {
    id: "rsi_hint",
    message: "💡 Astuce : Le RSI sous 30 indique un actif potentiellement survendu. Attendez une confirmation avant d'acheter !",
    autoDismiss: 10000,
  },
  streak_broken: {
    id: "streak_broken",
    message: "Vous avez manqué votre série ! Reconnectez-vous chaque jour pour maintenir votre streak et gagner des XP.",
    autoDismiss: 8000,
  },
};

const DISMISSED_KEY = "tdb_coach_dismissed";

function getDismissed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]") as string[]);
  } catch {
    return new Set();
  }
}

function saveDismissed(set: Set<string>) {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify(Array.from(set)));
}

interface CoachBubbleProps {
  trigger: CoachTrigger;
  onDismiss: () => void;
}

function CoachBubble({ trigger, onDismiss }: CoachBubbleProps) {
  useEffect(() => {
    if (!trigger.autoDismiss) return;
    const t = setTimeout(onDismiss, trigger.autoDismiss);
    return () => clearTimeout(t);
  }, [trigger, onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 40, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="fixed bottom-24 right-4 z-50 max-w-xs w-full"
    >
      <div className="relative rounded-2xl border border-[#638CFF]/30 bg-[#0f1729]/95 backdrop-blur-xl p-4 shadow-2xl">
        {/* Alex avatar */}
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#638CFF] to-[#00D4AA] flex items-center justify-center shrink-0 shadow-lg">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[#638CFF] mb-1">Alex — Coach Trading</p>
            <p className="text-sm text-gray-300 leading-relaxed">{trigger.message}</p>
            {trigger.cta && (
              <div className="mt-2">
                {trigger.cta.href ? (
                  <Link
                    href={trigger.cta.href}
                    className="inline-flex items-center gap-1 text-xs text-[#00D4AA] hover:text-[#00D4AA]/80 font-medium transition-colors"
                    onClick={onDismiss}
                  >
                    {trigger.cta.label}
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                ) : (
                  <button
                    onClick={() => { trigger.cta?.action?.(); onDismiss(); }}
                    className="inline-flex items-center gap-1 text-xs text-[#00D4AA] hover:text-[#00D4AA]/80 font-medium transition-colors"
                  >
                    {trigger.cta.label}
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>
          <button
            onClick={onDismiss}
            className="text-gray-500 hover:text-gray-300 transition-colors shrink-0 mt-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Speech bubble tail */}
        <div className="absolute bottom-[-8px] right-8 w-4 h-4 rotate-45 bg-[#0f1729] border-r border-b border-[#638CFF]/30" />
      </div>
    </motion.div>
  );
}

// ─── CoachFAB ─────────────────────────────────────────────────────────────────

interface CoachFABProps {
  onTrigger?: (triggerId: string) => void;
}

export function CoachFAB({ onTrigger }: CoachFABProps) {
  const { showCoach } = useUserLevel();
  const [open, setOpen] = useState(false);

  if (!showCoach) return null;

  const quickTips = [
    { id: "rsi_hint", label: "💡 Conseil RSI" },
    { id: "first_analysis", label: "📈 Analyser un actif" },
  ];

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex flex-col gap-1.5 items-end"
          >
            {quickTips.map((tip) => (
              <button
                key={tip.id}
                onClick={() => { onTrigger?.(tip.id); setOpen(false); }}
                className="px-3 py-1.5 rounded-lg bg-[#0f1729] border border-white/10 text-sm text-gray-200 hover:border-[#638CFF]/40 transition-all whitespace-nowrap shadow"
              >
                {tip.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all",
          "bg-gradient-to-br from-[#638CFF] to-[#00D4AA] text-white",
          open && "ring-2 ring-white/20"
        )}
      >
        <Bot className="w-6 h-6" />
      </motion.button>
    </div>
  );
}

// ─── useCoach hook ─────────────────────────────────────────────────────────────

export function useCoach() {
  const { showCoach } = useUserLevel();
  const [activeTrigger, setActiveTrigger] = useState<CoachTrigger | null>(null);

  const trigger = useCallback((id: string) => {
    if (!showCoach) return;
    const def = COACH_TRIGGERS[id];
    if (!def) return;
    const dismissed = getDismissed();
    if (dismissed.has(id)) return;
    setActiveTrigger(def);
  }, [showCoach]);

  const dismiss = useCallback(() => {
    if (!activeTrigger) return;
    const dismissed = getDismissed();
    dismissed.add(activeTrigger.id);
    saveDismissed(dismissed);
    setActiveTrigger(null);
  }, [activeTrigger]);

  return { trigger, dismiss, activeTrigger };
}

// ─── CoachProvider ────────────────────────────────────────────────────────────

export function CoachOverlay() {
  const { showCoach } = useUserLevel();
  const { activeTrigger, dismiss, trigger } = useCoach();

  if (!showCoach) return null;

  return (
    <>
      <AnimatePresence>
        {activeTrigger && (
          <CoachBubble trigger={activeTrigger} onDismiss={dismiss} />
        )}
      </AnimatePresence>
      <CoachFAB onTrigger={trigger} />
    </>
  );
}
