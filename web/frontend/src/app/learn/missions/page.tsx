"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy, Star, Zap, Target, BookOpen, BarChart2,
  ScanLine, Bot, Flame, TrendingUp, CheckCircle2, Lock, ChevronLeft
} from "lucide-react";
import Link from "next/link";
import { missionsAPI, type Mission, type UserProgress } from "@/lib/api";
import { useUserLevel } from "@/hooks/useUserLevel";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  onboarding: <Star className="w-4 h-4" />,
  learn: <BookOpen className="w-4 h-4" />,
  analysis: <BarChart2 className="w-4 h-4" />,
  scanner: <ScanLine className="w-4 h-4" />,
  ai: <Bot className="w-4 h-4" />,
  streak: <Flame className="w-4 h-4" />,
  wallet: <TrendingUp className="w-4 h-4" />,
};

const LEVEL_COLORS: Record<string, string> = {
  beginner: "text-green-400 bg-green-400/10 border-green-400/20",
  intermediate: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  expert: "text-purple-400 bg-purple-400/10 border-purple-400/20",
};

function XPBar({ current, max, level }: { current: number; max: number; level: number }) {
  const pct = Math.min(100, (current / max) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-400">
        <span>Niveau {level}</span>
        <span>{current} / {max} XP</span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full rounded-full bg-gradient-to-r from-[#638CFF] to-[#00D4AA]"
        />
      </div>
    </div>
  );
}

function MissionCard({ mission }: { mission: Mission }) {
  const pct = mission.target > 1 ? Math.min(100, (mission.progress / mission.target) * 100) : 0;
  const isCompleted = mission.status === "completed";
  const isLocked = mission.level === "intermediate" && mission.status === "not_started";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative rounded-2xl border p-4 transition-all",
        isCompleted
          ? "border-[#00D4AA]/30 bg-[#00D4AA]/5"
          : "border-white/10 bg-white/[0.03] hover:border-white/20"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0",
          isCompleted ? "bg-[#00D4AA]/10" : "bg-white/5"
        )}>
          {mission.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-white">{mission.title}</span>
            <span className={cn(
              "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border",
              LEVEL_COLORS[mission.level] ?? "text-gray-400 bg-white/5 border-white/10"
            )}>
              {mission.level}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{mission.description}</p>

          {mission.target > 1 && !isCompleted && (
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Progression</span>
                <span>{mission.progress}/{mission.target}</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="h-full rounded-full bg-[#638CFF]"
                />
              </div>
            </div>
          )}
        </div>

        <div className="text-right shrink-0">
          <div className={cn(
            "inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg",
            isCompleted ? "text-[#00D4AA] bg-[#00D4AA]/10" : "text-[#638CFF] bg-[#638CFF]/10"
          )}>
            <Zap className="w-3 h-3" />
            {mission.xp} XP
          </div>
          {isCompleted && (
            <div className="mt-1 flex items-center gap-1 text-xs text-[#00D4AA] justify-end">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Terminée
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function MissionsPage() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const { showMissions, level } = useUserLevel();
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");

  useEffect(() => {
    Promise.all([missionsAPI.list(), missionsAPI.progress()]).then(([m, p]) => {
      setMissions(m.missions);
      setProgress(p);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = missions.filter((m) => {
    if (filter === "active") return m.status !== "completed";
    if (filter === "completed") return m.status === "completed";
    return true;
  });

  const completedCount = missions.filter((m) => m.status === "completed").length;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/learn" className="text-gray-400 hover:text-white transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="w-6 h-6 text-[#FFD700]" />
            Missions & Progression
          </h1>
          <p className="text-sm text-gray-400">Accomplissez des missions pour gagner de l'XP et débloquer des badges</p>
        </div>
      </div>

      {/* Progress card */}
      {progress && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Votre progression</p>
              <p className="text-2xl font-bold">{progress.xp} XP</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-[#638CFF]">Niv. {progress.level}</div>
              {progress.streak_days > 0 && (
                <div className="flex items-center gap-1 text-orange-400 text-sm justify-end">
                  <Flame className="w-4 h-4" />
                  {progress.streak_days} jours
                </div>
              )}
            </div>
          </div>

          <XPBar
            current={progress.xp_in_current_level}
            max={progress.xp_for_next_level - (progress.level - 1) * 500}
            level={progress.level}
          />

          {/* Badges */}
          {progress.badges_detail.length > 0 && (
            <div className="pt-2 border-t border-white/5">
              <p className="text-xs text-gray-500 mb-2">Badges obtenus</p>
              <div className="flex flex-wrap gap-2">
                {progress.badges_detail.map((badge, i) => badge && (
                  <motion.div
                    key={i}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-sm"
                    style={{ borderColor: `${badge.color}30` }}
                  >
                    <span>{badge.icon}</span>
                    <span className="text-xs text-gray-300">{badge.name}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-1 text-sm text-gray-400">
            <Target className="w-4 h-4" />
            <span>{completedCount}/{missions.length} missions terminées</span>
          </div>
        </motion.div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/5 w-fit">
        {(["all", "active", "completed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm transition-all",
              filter === f ? "bg-white/10 text-white" : "text-gray-400 hover:text-gray-300"
            )}
          >
            {f === "all" ? "Toutes" : f === "active" ? "En cours" : "Terminées"}
          </button>
        ))}
      </div>

      {/* Missions list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 rounded-full border-2 border-transparent border-t-[#638CFF] animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.map((m) => (
              <MissionCard key={m.id} mission={m} />
            ))}
          </AnimatePresence>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              {filter === "completed" ? "Aucune mission terminée pour l'instant" : "Aucune mission disponible"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
