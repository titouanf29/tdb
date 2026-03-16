"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { settingsAPI } from "./api";

export type Currency = "USD" | "EUR";
export type Theme = "dark" | "light";
export type AccentColor = "blue" | "purple" | "teal" | "orange" | "pink";

export const ACCENT_PRESETS: Record<AccentColor, { primary: string; neonBlue: string; ring: string; label: string; hex: string }> = {
  blue:   { primary: "230 90% 62%", neonBlue: "230 90% 62%", ring: "230 90% 62%", label: "Bleu",   hex: "#6366f1" },
  purple: { primary: "270 80% 65%", neonBlue: "270 80% 65%", ring: "270 80% 65%", label: "Violet", hex: "#a855f7" },
  teal:   { primary: "175 90% 42%", neonBlue: "175 90% 42%", ring: "175 90% 42%", label: "Teal",   hex: "#14b8a6" },
  orange: { primary: "30 95% 55%",  neonBlue: "30 95% 55%",  ring: "30 95% 55%",  label: "Orange", hex: "#f59e0b" },
  pink:   { primary: "330 90% 60%", neonBlue: "330 90% 60%", ring: "330 90% 60%", label: "Rose",   hex: "#ec4899" },
};

interface Settings {
  currency: Currency;
  tradingStyle: string;
  riskLevel: string;
  defaultLeverage: string;
  theme: Theme;
  accentColor: AccentColor;
}

interface SettingsContextType {
  settings: Settings;
  setCurrency: (currency: Currency) => void;
  setTradingStyle: (style: string) => void;
  setRiskLevel: (level: string) => void;
  setDefaultLeverage: (leverage: string) => void;
  setTheme: (theme: Theme) => void;
  setAccentColor: (color: AccentColor) => void;
  updateSettings: (updates: Partial<Settings>) => void;
}

const defaultSettings: Settings = {
  currency: "EUR",
  tradingStyle: "day",
  riskLevel: "moderate",
  defaultLeverage: "1",
  theme: "dark",
  accentColor: "blue",
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
          theme: (local.theme as Theme) ?? defaultSettings.theme,
          accentColor: (local.accentColor as AccentColor) ?? defaultSettings.accentColor,
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

  // Apply theme and accent color to DOM
  useEffect(() => {
    if (!isLoaded) return;
    // Theme
    document.documentElement.setAttribute("data-theme", settings.theme);
    // Accent color
    const preset = ACCENT_PRESETS[settings.accentColor];
    if (preset) {
      document.documentElement.style.setProperty("--primary", preset.primary);
      document.documentElement.style.setProperty("--neon-blue", preset.neonBlue);
      document.documentElement.style.setProperty("--ring", preset.ring);
    }
  }, [settings.theme, settings.accentColor, isLoaded]);

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

  const setTheme = (theme: Theme) =>
    setSettings((prev) => ({ ...prev, theme }));

  const setAccentColor = (accentColor: AccentColor) =>
    setSettings((prev) => ({ ...prev, accentColor }));

  const updateSettings = (updates: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
    const patch: Record<string, string> = {};
    if (updates.tradingStyle) patch.trading_style = updates.tradingStyle;
    if (updates.riskLevel) patch.risk_level = updates.riskLevel;
    if (Object.keys(patch).length) syncToBackend(patch);
  };

  return (
    <SettingsContext.Provider
      value={{ settings, setCurrency, setTradingStyle, setRiskLevel, setDefaultLeverage, setTheme, setAccentColor, updateSettings }}
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

/**
 * useFormatPrice — formats a raw market price using the symbol's native currency.
 *
 * Unlike useFormatCurrency (which always assumes the value is in USD by default),
 * this hook detects the correct source currency from the Yahoo Finance symbol
 * (e.g. SU.PA → EUR, AAPL → USD) before applying the user's currency preference.
 *
 * Use this for any market price coming directly from Yahoo Finance / the prices API.
 * Use useFormatCurrency for wallet / P&L values (which are always stored in USD).
 */
export function useFormatPrice() {
  const { settings } = useSettings();
  // Import lazily to avoid circular deps — assetInfo has no React imports
  return (value: number, symbol: string): string => {
    // Determine the native trading currency from the symbol suffix
    const s = symbol.toUpperCase();
    const EUR_SUFFIXES = [
      ".PA", ".DE", ".AS", ".BR", ".LS", ".MI", ".MC",
      ".AT", ".CO", ".ST", ".HE", ".OL", ".WA",
    ];
    const nativeCurrency: Currency = EUR_SUFFIXES.some((sfx) => s.endsWith(sfx))
      ? "EUR"
      : "USD";

    const converted = convertCurrency(value, nativeCurrency, settings.currency);
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: settings.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(converted);
  };
}
