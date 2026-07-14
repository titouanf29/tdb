"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Flame, Trophy, ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { missionsAPI, Mission, UserProgress } from "@/lib/api";
import { useLanguage } from "@/lib/LanguageContext";

// Route each mission action to the page where the user can actually do it
const ACTION_ROUTES: Record<string, string> = {
  login: "/dashboard",
  daily_login: "/dashboard",
  lesson_complete: "/learn",
  quiz_pass: "/learn",
  analysis_open: "/analysis",
  scanner_run: "/scanner",
  ai_chat: "/assistant",
  position_open: "/trading",
};

export function ProgressWidget() {
  const { lang } = useLanguage();
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      missionsAPI.progress().then(setProgress).catch(() => {}),
      missionsAPI.list().then((d) => setMissions(d.missions || [])).catch(() => {}),
    ]).finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="glass-card p-5">
        <div className="h-4 w-40 bg-white/10 rounded animate-pulse mb-4" />
        <div className="h-16 rounded-xl bg-white/5 animate-pulse" />
      </div>
    );
  }
  if (!progress) return null;

  const pending = missions.filter((m) => m.status !== "completed");
  // Daily missions first (today's loop), then active, then beginner before intermediate
  const nextMissions = [...pending]
    .sort((a, b) => {
      if (!!a.daily !== !!b.daily) return a.daily ? -1 : 1;
      if (a.status === "active" && b.status !== "active") return -1;
      if (b.status === "active" && a.status !== "active") return 1;
      if (a.level !== b.level) return a.level === "beginner" ? -1 : 1;
      return 0;
    })
    .slice(0, 3);

  const xpPct = Math.min(100, Math.round((progress.xp_in_current_level / 500) * 100));
  const allDone = pending.length === 0;

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <h2 className="font-semibold text-sm">
            {lang === "fr" ? "Ma progression" : "My progress"}
          </h2>
        </div>
        <Link
          href="/learn/missions"
          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
        >
          {lang === "fr" ? "Toutes les missions" : "All missions"}
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Level + XP bar */}
        <div className="p-3.5 rounded-xl bg-white/4 border border-white/8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">
              {lang === "fr" ? "Niveau" : "Level"} {progress.level}
            </span>
            <span className="text-[11px] font-medium text-primary">
              {progress.xp_in_current_level} / 500 XP
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/8 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-400 transition-all duration-700"
              style={{ width: `${xpPct}%` }}
            />
          </div>
          <div className="flex items-center gap-3 mt-3">
            <div className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium",
              progress.streak_days > 0
                ? "bg-orange-500/15 text-orange-400 border border-orange-500/20"
                : "bg-white/5 text-muted-foreground border border-white/8"
            )}>
              <Flame className="w-3.5 h-3.5" />
              {progress.streak_days} {lang === "fr" ? "j de suite" : "day streak"}
            </div>
            {progress.badges_detail.length > 0 && (
              <div className="flex items-center gap-1 text-sm" title={progress.badges_detail.map((b) => b.name).join(" · ")}>
                {progress.badges_detail.slice(0, 4).map((b, i) => (
                  <span key={i}>{b.icon}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Next missions */}
        <div className="md:col-span-2">
          {allDone ? (
            <div className="h-full flex items-center gap-3 p-3.5 rounded-xl bg-emerald-500/8 border border-emerald-500/20">
              <Sparkles className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <p className="text-sm text-emerald-300">
                {lang === "fr"
                  ? "Toutes les missions accomplies. Continuez votre série quotidienne pour gagner de l'XP !"
                  : "All missions completed. Keep your daily streak going to earn XP!"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 h-full">
              {nextMissions.map((m) => (
                <Link key={m.id} href={ACTION_ROUTES[m.action] || "/learn/missions"} className="group">
                  <div className="h-full p-3 rounded-xl bg-white/4 hover:bg-white/8 border border-white/8 hover:border-primary/30 transition-all flex flex-col">
                    <div className="flex items-start justify-between mb-1.5">
                      <span className="text-xl leading-none">{m.icon}</span>
                      <div className="flex items-center gap-1">
                        {m.daily && (
                          <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 rounded-full">
                            {lang === "fr" ? "Quotidien" : "Daily"}
                          </span>
                        )}
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full">
                          +{m.xp} XP
                        </span>
                      </div>
                    </div>
                    <p className="text-xs font-medium leading-snug group-hover:text-primary transition-colors">
                      {m.title}
                    </p>
                    {m.target > 1 && (
                      <div className="mt-auto pt-2">
                        <div className="h-1 rounded-full bg-white/8 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary/70"
                            style={{ width: `${Math.min(100, (m.progress / m.target) * 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-1 block">
                          {m.progress} / {m.target}
                        </span>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
