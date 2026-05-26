"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap,
  TrendingUp,
  Zap,
  ChevronRight,
  BookOpen,
  BarChart2,
  Briefcase,
  Check,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/LanguageContext";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { TradingLevel } from "@/lib/auth";
import { cn } from "@/lib/utils";

type LevelDef = {
  id: TradingLevel;
  icon: React.ElementType;
  label: { fr: string; en: string };
  tagline: { fr: string; en: string };
  color: string;
  glow: string;
  changes: { fr: string; en: string }[];
};

const LEVELS: LevelDef[] = [
  {
    id: "beginner",
    icon: GraduationCap,
    label: { fr: "Débutant", en: "Beginner" },
    tagline: { fr: "Je débute dans le trading", en: "I'm new to trading" },
    color: "from-emerald-500/20 to-teal-500/20 border-emerald-500/40",
    glow: "shadow-emerald-500/20",
    changes: [
      { fr: "Explications détaillées sur chaque actif", en: "Detailed explanations for each asset" },
      { fr: "Glossaire intégré au survol des termes", en: "Built-in glossary on term hover" },
      { fr: "Accès prioritaire à la section Apprendre", en: "Priority access to the Learn section" },
      { fr: "Parcours d'apprentissage guidé pas à pas", en: "Step-by-step guided learning path" },
      { fr: "Quiz et exercices pour progresser", en: "Quizzes and exercises to improve" },
    ],
  },
  {
    id: "intermediate",
    icon: TrendingUp,
    label: { fr: "Intermédiaire", en: "Intermediate" },
    tagline: { fr: "Je connais les bases", en: "I know the basics" },
    color: "from-blue-500/20 to-indigo-500/20 border-blue-500/40",
    glow: "shadow-blue-500/20",
    changes: [
      { fr: "Infobulles concises sur les termes avancés", en: "Concise tooltips on advanced terms" },
      { fr: "Accès à toutes les ressources pédagogiques", en: "Access to all educational resources" },
      { fr: "Analyse technique avec explications", en: "Technical analysis with explanations" },
      { fr: "Exercices de niveau intermédiaire", en: "Intermediate-level exercises" },
      { fr: "Dashboard complet avec métriques clés", en: "Full dashboard with key metrics" },
    ],
  },
  {
    id: "expert",
    icon: Zap,
    label: { fr: "Expert", en: "Expert" },
    tagline: { fr: "Je maîtrise le trading", en: "I master trading" },
    color: "from-purple-500/20 to-pink-500/20 border-purple-500/40",
    glow: "shadow-purple-500/20",
    changes: [
      { fr: "Interface épurée sans explications basiques", en: "Clean interface without basic explanations" },
      { fr: "Accès direct aux outils avancés", en: "Direct access to advanced tools" },
      { fr: "Données brutes et analyses complètes", en: "Raw data and complete analyses" },
      { fr: "Pas de tutoriels intrusifs", en: "No intrusive tutorials" },
      { fr: "Expérience professionnelle complète", en: "Full professional experience" },
    ],
  },
];

export function OnboardingModal({ onClose }: { onClose: () => void }) {
  const { setTradingLevel } = useAuth();
  const { lang } = useLanguage();
  const [hovered, setHovered] = useState<TradingLevel | null>(null);
  const [selected, setSelected] = useState<TradingLevel | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSelect = async (level: TradingLevel) => {
    setSelected(level);
    setIsLoading(true);
    try {
      await setTradingLevel(level);
      await new Promise((r) => setTimeout(r, 600));
      onClose();
    } catch {
      setIsLoading(false);
      setSelected(null);
    }
  };

  const preview = hovered ? LEVELS.find((l) => l.id === hovered) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
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
                const isHovered = hovered === level.id;
                return (
                  <motion.button
                    key={level.id}
                    onHoverStart={() => setHovered(level.id)}
                    onHoverEnd={() => setHovered(null)}
                    onClick={() => !isLoading && handleSelect(level.id)}
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
                    <Icon className="w-8 h-8 mb-3 text-white/80" />
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
                        ? <>What the <span className="text-white">{preview.label.en}</span> level changes:</>
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
    </div>
  );
}
