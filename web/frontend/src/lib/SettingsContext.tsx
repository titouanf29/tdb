"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Currency = "USD" | "EUR";

interface Settings {
  currency: Currency;
  tradingStyle: string;
  riskLevel: string;
  defaultLeverage: string;
}

interface SettingsContextType {
  settings: Settings;
  setCurrency: (currency: Currency) => void;
  setTradingStyle: (style: string) => void;
  setRiskLevel: (level: string) => void;
  setDefaultLeverage: (leverage: string) => void;
  updateSettings: (updates: Partial<Settings>) => void;
}

const defaultSettings: Settings = {
  currency: "EUR",
  tradingStyle: "day",
  riskLevel: "moderate",
  defaultLeverage: "1",
};

const SettingsContext = createContext<SettingsContextType | null>(null);

const STORAGE_KEY = "tdb_settings";

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSettings({ ...defaultSettings, ...parsed });
      } catch {
        // Invalid JSON, use defaults
      }
    }
    setIsLoaded(true);
  }, []);

  // Save settings to localStorage when they change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }
  }, [settings, isLoaded]);

  const setCurrency = (currency: Currency) => {
    setSettings((prev) => ({ ...prev, currency }));
  };

  const setTradingStyle = (tradingStyle: string) => {
    setSettings((prev) => ({ ...prev, tradingStyle }));
  };

  const setRiskLevel = (riskLevel: string) => {
    setSettings((prev) => ({ ...prev, riskLevel }));
  };

  const setDefaultLeverage = (defaultLeverage: string) => {
    setSettings((prev) => ({ ...prev, defaultLeverage }));
  };

  const updateSettings = (updates: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        setCurrency,
        setTradingStyle,
        setRiskLevel,
        setDefaultLeverage,
        updateSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}

// Currency conversion rates (approximate, for display purposes)
const CONVERSION_RATES: Record<string, number> = {
  "USD_EUR": 0.92,
  "EUR_USD": 1.09,
};

export function convertCurrency(amount: number, from: Currency, to: Currency): number {
  if (from === to) return amount;
  const key = `${from}_${to}`;
  const rate = CONVERSION_RATES[key] || 1;
  return amount * rate;
}

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: "$",
  EUR: "€",
};

/**
 * Hook to format currency using user's preferred currency
 */
export function useFormatCurrency() {
  const { settings } = useSettings();

  return (value: number, originalCurrency: Currency = "USD"): string => {
    const converted = convertCurrency(value, originalCurrency, settings.currency);
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: settings.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(converted);
  };
}
