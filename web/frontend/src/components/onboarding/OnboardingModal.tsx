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
import { TradingLevel } from "@/lib/auth";
import { useLanguage } from "@/lib/LanguageContext";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { cn } from "@/lib/utils";

type Level = {
  id: TradingLevel;
  icon: React.ElementType;
  label: string;
  tagline: string;
  color: string;
  glow: string;
  changes: string[];
};

export function OnboardingModal({ onClose }: { onClose: () => void }) {
  const { setTradingLevel } = useAuth();
  const { t } = useLanguage();
  const [hovered, setHovered] = useState<TradingLevel | null>(null);
  const [selected, setSelected] = useState<TradingLevel | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const LEVELS: Level[] = [
    {
      id: "beginner",
      icon: GraduationCap,
      label: t("onboarding_beginner"),
      tagline: t("onboarding_beginner_tagline"),
      color: "from-emerald-500/20 to-teal-500/20 border-emerald-500/40",
      glow: "shadow-emerald-500/20",
      changes: [
        t("onboarding_beginner_c1"),
        t("onboarding_beginner_c2"),
        t("onboarding_beginner_c3"),
        t("onboarding_beginner_c4"),
        t("onboarding_beginner_c5"),
      ],
    },
    {
      id: "intermediate",
      icon: TrendingUp,
      label: t("onboarding_intermediate"),
      tagline: t("onboarding_intermediate_tagline"),
      color: "from-blue-500/20 to-indigo-500/20 border-blue-500/40",
      glow: "shadow-blue-500/20",
      changes: [
        t("onboarding_inter_c1"),
        t("onboarding_inter_c2"),
        t("onboarding_inter_c3"),
        t("onboarding_inter_c4"),
        t("onboarding_inter_c5"),
      ],
    },
    {
      id: "expert",
      icon: Zap,
      label: t("onboarding_expert"),
      tagline: t("onboarding_expert_tagline"),
      color: "from-purple-500/20 to-pink-500/20 border-purple-500/40",
      glow: "shadow-purple-500/20",
      changes: [
        t("onboarding_expert_c1"),
        t("onboarding_expert_c2"),
        t("onboarding_expert_c3"),
        t("onboarding_expert_c4"),
        t("onboarding_expert_c5"),
      ],
    },
  ];

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
              <LanguageToggle variant="pill" />
            </div>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/20 mb-4">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">{t("onboarding_title")}</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              {t("onboarding_subtitle")}
              <br />
              <span className="text-sm opacity-70">{t("onboarding_change_hint")}</span>
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
                    <p className="font-bold text-lg mb-1">{level.label}</p>
                    <p className="text-xs text-muted-foreground leading-snug">{level.tagline}</p>
                    <div className="mt-3 flex items-center gap-1 text-xs text-white/50 group-hover:text-white/70 transition-colors">
                      <span>{t("onboarding_see_details")}</span>
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
                      {t("onboarding_changes_prefix")} <span className="text-white">{preview.label}</span> {t("onboarding_changes_suffix")}
                    </p>
                    <ul className="space-y-1.5">
                      {preview.changes.map((c, i) => (
                        <li key={i} className="text-xs text-white/70 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-white/50 shrink-0" />
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <p className="text-center text-xs text-muted-foreground mt-5">
              <Briefcase className="w-3 h-3 inline mr-1" />
              {t("onboarding_all_features")}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
