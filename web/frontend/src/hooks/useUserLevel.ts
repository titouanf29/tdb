"use client";

import { useMemo } from "react";
import { useAuth } from "@/lib/AuthContext";
import type { TradingLevel } from "@/lib/auth";

export type VocabularyMode = "simple" | "standard" | "technical";

export interface LevelConfig {
  level: TradingLevel | "beginner";
  showTooltips: boolean;
  showCoach: boolean;
  showMissions: boolean;
  maxIndicators: number;
  vocabularyMode: VocabularyMode;
  paperTradingMode: boolean;
  riskWarnings: boolean;
}

const LEVEL_CONFIGS: Record<TradingLevel, LevelConfig> = {
  beginner: {
    level: "beginner",
    showTooltips: true,
    showCoach: true,
    showMissions: true,
    maxIndicators: 3,
    vocabularyMode: "simple",
    paperTradingMode: true,
    riskWarnings: true,
  },
  intermediate: {
    level: "intermediate",
    showTooltips: true,
    showCoach: true,
    showMissions: true,
    maxIndicators: 6,
    vocabularyMode: "standard",
    paperTradingMode: false,
    riskWarnings: true,
  },
  expert: {
    level: "expert",
    showTooltips: false,
    showCoach: false,
    showMissions: false,
    maxIndicators: 20,
    vocabularyMode: "technical",
    paperTradingMode: false,
    riskWarnings: false,
  },
};

export function useUserLevel(): LevelConfig {
  const { user } = useAuth();
  return useMemo(() => {
    const level = user?.trading_level ?? "beginner";
    return LEVEL_CONFIGS[level];
  }, [user?.trading_level]);
}
