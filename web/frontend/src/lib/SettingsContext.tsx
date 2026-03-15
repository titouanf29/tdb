"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { settingsAPI } from "./api";

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

  // On mount: load from backend first, fallback to localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const local: Partial<Settings> = stored ? JSON.parse(stored) : {};

    settingsAPI.get()
      .then((remote) => {
        // Merge: backend wins for trading_style / risk_level, local wins for currency/leverage
        setSettings({
          currency: local.currency ?? defaultSettings.currency,
          tradingStyle: remote.trading_style ?? local.tradingStyle ?? defaultSettings.tradingStyle,
          riskLevel: remote.risk_level ?? local.riskLevel ?? defaultSettings.riskLevel,
          defaultLeverage: local.defaultLeverage ?? defaultSettings.defaultLeverage,
        });
      })
      .catch(() => {
        // Not authenticated or backend unreachable — use localStorage
        setSettings({ ...defaultSettings, ...local });
      })
      .finally(() => setIsLoaded(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist to localStorage on every change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }
  }, [settings, isLoaded]);

  // Sync trading_style + risk_level to backend (debounced via direct call)
  const syncToBackend = (patch: { trading_style?: string; risk_level?: string }) => {
    settingsAPI.update(patch).catch(() => {/* silent */});
  };

  const setCurrency = (currency: Currency) =>
    setSettings((prev) => ({ ...prev, currency }));

  const setTradingStyle = (tradingStyle: string) => {
    setSettings((prev) => ({ ...prev, tradingStyle }));
    syncToBackend({ trading_style: tradingStyle });
  };

  const setRiskLevel = (riskLevel: string) => {
    setSettings((prev) => ({ ...prev, riskLevel }));
    syncToBackend({ risk_level: riskLevel });
  };

  const setDefaultLeverage = (defaultLeverage: string) =>
    setSettings((prev) => ({ ...prev, defaultLeverage }));

  const updateSettings = (updates: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
    const patch: Record<string, string> = {};
    if (updates.tradingStyle) patch.trading_style = updates.tradingStyle;
    if (updates.riskLevel) patch.risk_level = updates.riskLevel;
    if (Object.keys(patch).length) syncToBackend(patch);
  };

  return (
    <SettingsContext.Provider
      value={{ settings, setCurrency, setTradingStyle, setRiskLevel, setDefaultLeverage, updateSettings }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("useSettings must be used within a SettingsProvider");
  return context;
}

// Currency conversion rates (approximate, for display purposes)
const CONVERSION_RATES: Record<string, number> = {
  "USD_EUR": 0.92,
  "EUR_USD": 1.09,
};

export function convertCurrency(amount: number, from: Currency, to: Currency): number {
  if (from === to) return amount;
  const rate = CONVERSION_RATES[`${from}_${to}`] || 1;
  return amount * rate;
}

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: "$",
  EUR: "€",
};

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
