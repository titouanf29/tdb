"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { premiumAPI, PremiumStatus, PremiumLimits } from "./api";
import { useAuth } from "./AuthContext";

interface PremiumContextType {
  isPremium: boolean;
  isAdmin: boolean;
  limits: PremiumLimits | null;
  premiumInfo: { since: string | null; expires: string | null } | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  checkFeature: (feature: keyof PremiumLimits) => boolean;
}

const defaultLimits: PremiumLimits = {
  max_positions: 5,
  max_favorites: 10,
  ai_messages_per_day: 10,
  backtest_enabled: false,
  geopolitical_enabled: false,
  advanced_pivots: false,
  per_rankings_limit: 10,
  economic_calendar_days: 7,
  alerts_enabled: false,
  priority_support: false,
};

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

export function PremiumProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [limits, setLimits] = useState<PremiumLimits | null>(null);
  const [premiumInfo, setPremiumInfo] = useState<{ since: string | null; expires: string | null } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setIsPremium(false);
      setIsAdmin(false);
      setLimits(defaultLimits);
      setPremiumInfo(null);
      setIsLoading(false);
      return;
    }
    try {
      const status = await premiumAPI.getStatus();
      setIsPremium(status.is_premium);
      setIsAdmin(status.is_admin);
      setLimits(status.limits);
      setPremiumInfo(status.premium_info);
    } catch (error) {
      console.error("Error fetching premium status:", error);
      setLimits(defaultLimits);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const checkFeature = useCallback((feature: keyof PremiumLimits): boolean => {
    if (!limits) return false;
    const value = limits[feature];
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value > 0 || value === -1;
    return false;
  }, [limits]);

  const contextValue = useMemo(() => ({
    isPremium, isAdmin, limits, premiumInfo, isLoading, refresh, checkFeature,
  }), [isPremium, isAdmin, limits, premiumInfo, isLoading, refresh, checkFeature]);

  return (
    <PremiumContext.Provider value={contextValue}>
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium() {
  const context = useContext(PremiumContext);
  if (context === undefined) {
    throw new Error("usePremium must be used within a PremiumProvider");
  }
  return context;
}
