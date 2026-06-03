"use client";

import type { TradingLevel } from "@/lib/auth";
import { useUserLevel } from "@/hooks/useUserLevel";

interface LevelGateProps {
  /** Minimum level required to see children */
  minLevel?: TradingLevel;
  /** Exact level required (if set, minLevel is ignored) */
  exactLevel?: TradingLevel;
  /** What to render if level requirement is not met */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

const LEVEL_ORDER: Record<TradingLevel, number> = {
  beginner: 0,
  intermediate: 1,
  expert: 2,
};

export function LevelGate({ minLevel, exactLevel, fallback = null, children }: LevelGateProps) {
  const { level } = useUserLevel();

  if (exactLevel) {
    if (level !== exactLevel) return <>{fallback}</>;
    return <>{children}</>;
  }

  if (minLevel) {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[minLevel]) return <>{fallback}</>;
  }

  return <>{children}</>;
}
