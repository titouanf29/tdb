"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap, TrendingUp, Zap, ArrowRight, RotateCcw,
  Check, Sparkles, Bot, X
} from "lucide-react";
import { TradingLevel } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface LevelChangeModalProps {
  fromLevel: TradingLevel;
  toLevel: TradingLevel;
  onClose: () => void;
  onStartBeginnerAssistant?: () => void;
  onStartTour?: (level: TradingLevel) => void;
  lang?: "fr" | "en";
}

type ChangeDirection = "upgrade" | "downgrade" | "same";

function getDirection(from: TradingLevel, to: TradingLevel): ChangeDirection {
  const order: Record<TradingLevel, number> = { beginner: 0, intermediate: 1, expert: 2 };
  const diff = order[to] - order[from];
  if (diff > 0) return "upgrade";
  if (diff < 0) return "downgrade";
  return "same";
}

const CONFIGS = {
  upgrade_intermediate: {
    emoji: "📈",
    gradient: "from-blue-600 to-indigo-700",
    glow: "shadow-blue-500/30",
    borderColor: "border-blue-500/30",
    title: { fr: "Niveau Intermédiaire débloqué !", en: "Intermediate level unlocked!" },
    subtitle: {
      fr: "Vous avez accès à des fonctionnalités plus puissantes.",
      en: "You now have access to more powerful features.",
    },
    points: {
      fr: ["Scanner avec 6 indicateurs simultanés", "Analyse technique avancée", "Tooltips concis sur les termes clés"],
      en: ["Scanner with 6 simultaneous indicators", "Advanced technical analysis", "Concise tooltips on key terms"],
    },
  },
  upgrade_expert: {
    emoji: "🏆",
    gradient: "from-purple-600 to-pink-700",
    glow: "shadow-purple-500/30",
    borderColor: "border-purple-500/30",
    title: { fr: "Mode Expert activé !", en: "Expert mode activated!" },
    subtitle: {
      fr: "Interface épurée, données brutes. Vous êtes en plein contrôle.",
      en: "Clean interface, raw data. You're in full control.",
    },
    points: {
      fr: ["Pas de tutoriels intrusifs", "Accès direct aux outils avancés", "Dashboard professionnel"],
      en: ["No intrusive tutorials", "Direct access to advanced tools", "Professional dashboard"],
    },
  },
  downgrade_beginner: {
    emoji: "🌱",
    gradient: "from-emerald-600 to-teal-700",
    glow: "shadow-emerald-500/30",
    borderColor: "border-emerald-500/30",
    title: { fr: "Retour aux bases", en: "Back to basics" },
    subtitle: {
      fr: "Mode Débutant réactivé. L'assistant Alex est de retour pour vous guider.",
      en: "Beginner mode reactivated. Coach Alex is back to guide you.",
    },
    points: {
      fr: ["Coach Alex réactivé en bas à gauche", "Parcours d'apprentissage guidé", "Tooltips pédagogiques sur tous les termes"],
      en: ["Coach Alex reactivated bottom-left", "Guided learning path", "Educational tooltips on all terms"],
    },
  },
};

export function LevelChangeModal({
  fromLevel,
  toLevel,
  onClose,
  onStartBeginnerAssistant,
  onStartTour,
  lang = "fr",
}: LevelChangeModalProps) {
  const direction = getDirection(fromLevel, toLevel);

  let configKey: keyof typeof CONFIGS;
  if (direction === "upgrade" && toLevel === "intermediate") configKey = "upgrade_intermediate";
  else if (direction === "upgrade" && toLevel === "expert") configKey = "upgrade_expert";
  else if (direction === "downgrade" && toLevel === "beginner") configKey = "downgrade_beginner";
  else {
    onClose();
    return null;
  }

  const config = CONFIGS[configKey];
  const isDowngrade = direction === "downgrade";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.88, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.88, y: 24 }}
        transition={{ type: "spring", stiffness: 280, damping: 22 }}
        className="w-full max-w-sm"
      >
        <div
          className={cn(
            "rounded-3xl overflow-hidden shadow-2xl",
            config.glow,
            "border",
            config.borderColor
          )}
          style={{ background: "hsl(220 50% 5.5%)" }}
        >
          {/* Animated banner */}
          <div className={cn("relative p-7 pb-5 text-center bg-gradient-to-br", config.gradient)}>
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X className="w-3.5 h-3.5 text-white" />
            </button>

            {/* Particles */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1.5 h-1.5 rounded-full bg-white/30"
                style={{ left: `${15 + i * 14}%`, bottom: 0 }}
                animate={{ y: [-40, -80], opacity: [0.6, 0], scale: [1, 0.5] }}
                transition={{ duration: 1.2, delay: i * 0.1, repeat: 1 }}
              />
            ))}

            <motion.div
              initial={{ scale: 0, rotate: -15 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 16, delay: 0.05 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/15 backdrop-blur mb-3 text-3xl shadow-lg"
            >
              {config.emoji}
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-xl font-bold text-white"
            >
              {config.title[lang]}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22 }}
              className="text-white/80 text-xs mt-1.5 leading-relaxed"
            >
              {config.subtitle[lang]}
            </motion.p>
          </div>

          {/* Features */}
          <div className="p-5 space-y-4">
            <ul className="space-y-2.5">
              {config.points[lang].map((point, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                  className="flex items-center gap-2.5 text-sm text-gray-300"
                >
                  <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-white/70" />
                  </div>
                  {point}
                </motion.li>
              ))}
            </ul>

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
              className="pt-1 space-y-2"
            >
              {isDowngrade ? (
                <>
                  <button
                    onClick={() => {
                      onStartBeginnerAssistant?.();
                      onClose();
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                  >
                    <Bot className="w-4 h-4" />
                    {lang === "fr" ? "Relancer l'assistant débutant" : "Restart beginner assistant"}
                  </button>
                  {onStartTour && (
                    <button
                      onClick={() => {
                        onStartTour(toLevel);
                        onClose();
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 text-sm text-gray-400 hover:text-white hover:border-white/20 transition-all"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      {lang === "fr" ? "Relancer la visite guidée" : "Restart guided tour"}
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="w-full text-xs text-gray-600 hover:text-gray-400 transition-colors py-1"
                  >
                    {lang === "fr" ? "Fermer" : "Close"}
                  </button>
                </>
              ) : (
                <>
                  {onStartTour && (
                    <button
                      onClick={() => {
                        onStartTour(toLevel);
                        onClose();
                      }}
                      className={cn(
                        "w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-opacity bg-gradient-to-r",
                        config.gradient
                      )}
                    >
                      <Sparkles className="w-4 h-4" />
                      {lang === "fr" ? "Découvrir les nouvelles fonctions" : "Discover new features"}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="w-full py-2.5 rounded-xl border border-white/10 text-sm text-gray-400 hover:text-gray-200 hover:border-white/20 transition-all"
                  >
                    {lang === "fr" ? "Continuer sans visite" : "Continue without tour"}
                  </button>
                </>
              )}
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
