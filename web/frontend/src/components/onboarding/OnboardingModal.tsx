"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap, TrendingUp, Zap, ChevronRight, BookOpen,
  BarChart2, Briefcase, Check, Bot, Map, Sparkles, ArrowRight,
  Trophy, Target, Shield, Star
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/LanguageContext";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { TradingLevel } from "@/lib/auth";
import { cn } from "@/lib/utils";

// ─── Level definitions ────────────────────────────────────────────────────────

type LevelDef = {
  id: TradingLevel;
  icon: React.ElementType;
  emoji: string;
  label: { fr: string; en: string };
  tagline: { fr: string; en: string };
  color: string;
  glow: string;
  accentColor: string;
  changes: { fr: string; en: string }[];
  welcomeTitle: { fr: string; en: string };
  welcomeSubtitle: { fr: string; en: string };
  welcomeFeatures: { icon: React.ElementType; fr: string; en: string }[];
  tourLabel: { fr: string; en: string };
  skipLabel: { fr: string; en: string };
  hasTour: boolean;
};

const LEVELS: LevelDef[] = [
  {
    id: "beginner",
    icon: GraduationCap,
    emoji: "🌱",
    label: { fr: "Débutant", en: "Beginner" },
    tagline: { fr: "Je débute dans le trading", en: "I'm new to trading" },
    color: "from-emerald-500/20 to-teal-500/20 border-emerald-500/40",
    glow: "shadow-emerald-500/20",
    accentColor: "text-emerald-400",
    changes: [
      { fr: "Explications détaillées sur chaque actif", en: "Detailed explanations for each asset" },
      { fr: "Glossaire intégré au survol des termes", en: "Built-in glossary on term hover" },
      { fr: "Accès prioritaire à la section Apprendre", en: "Priority access to the Learn section" },
      { fr: "Parcours d'apprentissage guidé pas à pas", en: "Step-by-step guided learning path" },
      { fr: "Quiz et exercices pour progresser", en: "Quizzes and exercises to improve" },
    ],
    welcomeTitle: { fr: "Vous êtes au bon endroit !", en: "You're in the right place!" },
    welcomeSubtitle: {
      fr: "Mode Débutant activé. Voici ce qui vous attend :",
      en: "Beginner mode activated. Here's what awaits you:",
    },
    welcomeFeatures: [
      { icon: Bot, fr: "Coach Alex disponible à tout moment (bas gauche)", en: "Coach Alex always available (bottom left)" },
      { icon: Map, fr: "Parcours guidé pas à pas dans la Formation", en: "Step-by-step guided path in Learning" },
      { icon: Sparkles, fr: "Infobulles pédagogiques sur tous les termes", en: "Educational tooltips on all terms" },
      { icon: Trophy, fr: "Missions & XP pour progresser rapidement", en: "Missions & XP to progress quickly" },
    ],
    tourLabel: { fr: "Démarrer la visite guidée (2 min)", en: "Start the guided tour (2 min)" },
    skipLabel: { fr: "Passer directement au dashboard", en: "Go directly to dashboard" },
    hasTour: true,
  },
  {
    id: "intermediate",
    icon: TrendingUp,
    emoji: "⚡",
    label: { fr: "Intermédiaire", en: "Intermediate" },
    tagline: { fr: "Je connais les bases", en: "I know the basics" },
    color: "from-primary/20 to-neon-purple/20 border-primary/40",
    glow: "shadow-primary/20",
    accentColor: "text-primary",
    changes: [
      { fr: "Infobulles concises sur les termes avancés", en: "Concise tooltips on advanced terms" },
      { fr: "Accès à toutes les ressources pédagogiques", en: "Access to all educational resources" },
      { fr: "Analyse technique avec explications", en: "Technical analysis with explanations" },
      { fr: "Exercices de niveau intermédiaire", en: "Intermediate-level exercises" },
      { fr: "Dashboard complet avec métriques clés", en: "Full dashboard with key metrics" },
    ],
    welcomeTitle: { fr: "Bienvenue niveau Intermédiaire !", en: "Welcome, Intermediate level!" },
    welcomeSubtitle: {
      fr: "Vous avez accès à des outils plus puissants :",
      en: "You have access to more powerful tools:",
    },
    welcomeFeatures: [
      { icon: BarChart2, fr: "Scanner avancé avec 6 indicateurs simultanés", en: "Advanced scanner with 6 simultaneous indicators" },
      { icon: Target, fr: "Analyse technique multi-timeframes", en: "Multi-timeframe technical analysis" },
      { icon: BookOpen, fr: "Tous les modules de formation débloqués", en: "All training modules unlocked" },
      { icon: Sparkles, fr: "Tooltips avancés disponibles sur demande", en: "Advanced tooltips available on demand" },
    ],
    tourLabel: { fr: "Visite rapide des fonctions clés (1 min)", en: "Quick tour of key features (1 min)" },
    skipLabel: { fr: "Aller au dashboard", en: "Go to dashboard" },
    hasTour: true,
  },
  {
    id: "expert",
    icon: Zap,
    emoji: "🏆",
    label: { fr: "Expert", en: "Expert" },
    tagline: { fr: "Je maîtrise le trading", en: "I master trading" },
    color: "from-neon-purple/20 to-neon-cyan/20 border-neon-purple/40",
    glow: "shadow-neon-purple/20",
    accentColor: "text-neon-purple",
    changes: [
      { fr: "Interface épurée sans explications basiques", en: "Clean interface without basic explanations" },
      { fr: "Accès direct aux outils avancés", en: "Direct access to advanced tools" },
      { fr: "Données brutes et analyses complètes", en: "Raw data and complete analyses" },
      { fr: "Pas de tutoriels intrusifs", en: "No intrusive tutorials" },
      { fr: "Expérience professionnelle complète", en: "Full professional experience" },
    ],
    welcomeTitle: { fr: "Mode Expert activé !", en: "Expert mode activated!" },
    welcomeSubtitle: {
      fr: "Interface épurée, données brutes, vous contrôlez tout.",
      en: "Clean interface, raw data, you're in full control.",
    },
    welcomeFeatures: [
      { icon: Zap, fr: "Accès direct à tous les outils avancés", en: "Direct access to all advanced tools" },
      { icon: BarChart2, fr: "Données brutes sans sur-simplification", en: "Raw data without over-simplification" },
      { icon: Shield, fr: "Pas de tutoriels ni d'explications basiques", en: "No tutorials or basic explanations" },
      { icon: Star, fr: "Dashboard full-power configuré pour les pros", en: "Full-power dashboard for professionals" },
    ],
    tourLabel: { fr: "Accéder au dashboard", en: "Go to dashboard" },
    skipLabel: { fr: "Accéder au dashboard", en: "Go to dashboard" },
    hasTour: false,
  },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface OnboardingModalProps {
  onClose: () => void;
  /** Called when user wants to start the tour after level selection */
  onStartTour?: (level: TradingLevel) => void;
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export function OnboardingModal({ onClose, onStartTour }: OnboardingModalProps) {
  const { setTradingLevel } = useAuth();
  const { lang } = useLanguage();
  const [step, setStep] = useState<"select" | "welcome">("select");
  const [hovered, setHovered] = useState<TradingLevel | null>(null);
  const [selected, setSelected] = useState<TradingLevel | null>(null);
  const [chosenLevel, setChosenLevel] = useState<LevelDef | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSelect = async (level: TradingLevel) => {
    if (isLoading) return;
    setSelected(level);
    setIsLoading(true);
    try {
      await setTradingLevel(level);
      const def = LEVELS.find((l) => l.id === level)!;
      setChosenLevel(def);
      await new Promise((r) => setTimeout(r, 400));
      setStep("welcome");
    } catch {
      setIsLoading(false);
      setSelected(null);
    }
  };

  const handleStartTour = () => {
    onClose();
    if (chosenLevel?.hasTour && onStartTour) {
      onStartTour(chosenLevel.id);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  const preview = hovered ? (LEVELS.find((l) => l.id === hovered) ?? null) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <AnimatePresence mode="wait">
        {step === "select" && (
          <SelectStep
            key="select"
            lang={lang}
            preview={preview}
            selected={selected}
            isLoading={isLoading}
            hovered={hovered}
            setHovered={setHovered}
            onSelect={handleSelect}
          />
        )}
        {step === "welcome" && chosenLevel && (
          <WelcomeStep
            key="welcome"
            level={chosenLevel}
            lang={lang}
            onStartTour={handleStartTour}
            onSkip={handleSkip}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Step 1: Level Selection ──────────────────────────────────────────────────

function SelectStep({
  lang, preview, selected, isLoading, hovered, setHovered, onSelect,
}: {
  lang: "fr" | "en";
  preview: LevelDef | null;
  selected: TradingLevel | null;
  isLoading: boolean;
  hovered: TradingLevel | null;
  setHovered: (l: TradingLevel | null) => void;
  onSelect: (l: TradingLevel) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -20 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-2xl"
    >
      <div
        className="rounded-2xl border border-white/10 overflow-hidden"
        style={{ background: "hsl(220 50% 5.5%)", boxShadow: "0 25px 60px rgba(0,0,0,0.6)" }}
      >
        {/* Header */}
        <div className="p-8 pb-6 text-center border-b border-white/10 relative">
          <div className="absolute top-4 right-4">
            <LanguageToggle variant="compact" />
          </div>
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/20 mb-4">
            <BookOpen className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-2">
            {lang === "en" ? "Welcome to CaptenTDB!" : "Bienvenue sur CaptenTDB !"}
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            {lang === "en"
              ? "To personalize your experience, tell us your trading level."
              : "Pour personnaliser votre expérience, dites-nous quel est votre niveau en trading."}
            <br />
            <span className="text-sm opacity-70">
              {lang === "en"
                ? "You can change this at any time in your settings."
                : "Vous pourrez le changer à tout moment dans vos paramètres."}
            </span>
          </p>
        </div>

        {/* Level cards */}
        <div className="p-6">
          <div className="grid grid-cols-3 gap-4">
            {LEVELS.map((level) => {
              const Icon = level.icon;
              const isSelected = selected === level.id;
              return (
                <motion.button
                  key={level.id}
                  onHoverStart={() => setHovered(level.id)}
                  onHoverEnd={() => setHovered(null)}
                  onClick={() => !isLoading && onSelect(level.id)}
                  disabled={isLoading}
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.97 }}
                  className={cn(
                    "relative p-5 rounded-xl border-2 text-left transition-all duration-200 group",
                    `bg-gradient-to-br ${level.color}`,
                    isSelected ? "scale-[1.02]" : "",
                    isLoading && !isSelected ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
                    `shadow-lg ${level.glow}`
                  )}
                >
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-3 right-3 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center"
                    >
                      <Check className="w-3.5 h-3.5 text-white" />
                    </motion.div>
                  )}
                  <div className="text-2xl mb-2">{level.emoji}</div>
                  <p className="font-bold text-lg mb-1">{level.label[lang]}</p>
                  <p className="text-xs text-muted-foreground leading-snug">{level.tagline[lang]}</p>
                  <div className="mt-3 flex items-center gap-1 text-xs text-white/50 group-hover:text-white/70 transition-colors">
                    <span>{lang === "en" ? "See details" : "Voir les détails"}</span>
                    <ChevronRight className="w-3 h-3" />
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Detail preview on hover */}
          <AnimatePresence>
            {preview && (
              <motion.div
                key={preview.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className={`mt-4 p-4 rounded-xl bg-gradient-to-br ${preview.color} border`}>
                  <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <preview.icon className="w-4 h-4" />
                    {lang === "en"
                      ? <><span className="text-white">{preview.label.en}</span> level includes:</>
                      : <>Ce que le niveau <span className="text-white">{preview.label.fr}</span> change :</>
                    }
                  </p>
                  <ul className="space-y-1.5">
                    {preview.changes.map((c, i) => (
                      <li key={i} className="text-xs text-white/70 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-white/50 shrink-0" />
                        {c[lang]}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-center text-xs text-muted-foreground mt-5">
            <Briefcase className="w-3 h-3 inline mr-1" />
            {lang === "en"
              ? "Regardless of your level, all features remain accessible."
              : "Peu importe votre niveau, toutes les fonctionnalités restent accessibles."}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Step 2: Welcome for level ────────────────────────────────────────────────

function WelcomeStep({
  level,
  lang,
  onStartTour,
  onSkip,
}: {
  level: LevelDef;
  lang: "fr" | "en";
  onStartTour: () => void;
  onSkip: () => void;
}) {
  const Icon = level.icon;

  const GRADIENT_BG: Record<TradingLevel, string> = {
    beginner: "from-emerald-600 to-teal-700",
    intermediate: "from-primary to-neon-purple",
    expert: "from-neon-purple to-neon-cyan",
  };

  const GLOW: Record<TradingLevel, string> = {
    beginner: "shadow-emerald-500/30",
    intermediate: "shadow-primary/30",
    expert: "shadow-neon-purple/30",
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: -20 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="w-full max-w-md"
    >
      <div
        className={cn("rounded-3xl overflow-hidden shadow-2xl", GLOW[level.id])}
        style={{ background: "hsl(220 50% 5.5%)", border: "1px solid rgba(255,255,255,0.1)" }}
      >
        {/* Animated top banner */}
        <div className={cn("relative p-8 pb-6 text-center bg-gradient-to-br", GRADIENT_BG[level.id])}>
          {/* Animated particles */}
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full bg-white/30"
              initial={{ opacity: 0, y: 0, x: `${20 + i * 15}%` }}
              animate={{ opacity: [0, 1, 0], y: -60, x: `${20 + i * 15 + (i % 2 === 0 ? 5 : -5)}%` }}
              transition={{ duration: 1.5, delay: i * 0.2, repeat: 1 }}
            />
          ))}
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 18, delay: 0.1 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/15 backdrop-blur mb-4 text-4xl shadow-lg"
          >
            {level.emoji}
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-2xl font-bold text-white"
          >
            {level.welcomeTitle[lang]}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-white/80 text-sm mt-2"
          >
            {level.welcomeSubtitle[lang]}
          </motion.p>
        </div>

        {/* Features list */}
        <div className="p-6 space-y-4">
          <div className="space-y-3">
            {level.welcomeFeatures.map((feat, i) => {
              const FeatIcon = feat.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + i * 0.08 }}
                  className="flex items-center gap-3"
                >
                  <div className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border",
                    level.id === "beginner" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : level.id === "intermediate" ? "bg-primary/10 border-primary/20 text-primary"
                    : "bg-neon-purple/10 border-neon-purple/20 text-neon-purple"
                  )}>
                    <FeatIcon className="w-4 h-4" />
                  </div>
                  <p className="text-sm text-gray-300">{feat[lang]}</p>
                </motion.div>
              );
            })}
          </div>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="pt-2 space-y-2"
          >
            {level.hasTour ? (
              <>
                <button
                  onClick={onStartTour}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90 active:scale-98 bg-gradient-to-r",
                    GRADIENT_BG[level.id]
                  )}
                >
                  <Sparkles className="w-4 h-4" />
                  {level.tourLabel[lang]}
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={onSkip}
                  className="w-full py-2.5 rounded-xl text-sm text-gray-400 hover:text-gray-200 border border-white/10 hover:border-white/20 transition-all"
                >
                  {level.skipLabel[lang]}
                </button>
              </>
            ) : (
              <button
                onClick={onSkip}
                className={cn(
                  "w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90 bg-gradient-to-r",
                  GRADIENT_BG[level.id]
                )}
              >
                {level.tourLabel[lang]}
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
