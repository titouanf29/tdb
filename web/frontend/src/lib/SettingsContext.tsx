"use client";

import {
  createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode,
} from "react";
import { settingsAPI, UserSettings } from "./api";
import { useAuth } from "./AuthContext";
import { useLanguage } from "./LanguageContext";

export type Currency = "USD" | "EUR";
export type Theme = "dark" | "light";
export type AccentColor = "blue" | "purple" | "teal" | "orange" | "pink";
// How often the "welcome back" recap may appear
export type RecapFrequency = "off" | "always" | "daily" | "weekly";

export const RECAP_MIN_GAP_MINUTES: Record<Exclude<RecapFrequency, "off">, number> = {
  always: 30, daily: 1440, weekly: 10080,
};

// ── Allowed values — every cached and every remote value is validated against
//    these before it is adopted into state (an out-of-range value would be
//    rejected by the backend's PUT and would break the UI's selection state).
export const CURRENCIES     = ["EUR", "USD"] as const;
export const THEMES         = ["dark", "light"] as const;
export const ACCENT_COLORS  = ["blue", "purple", "teal", "orange", "pink"] as const;
export const RECAP_OPTIONS  = ["off", "always", "daily", "weekly"] as const;
export const TRADING_STYLES = ["scalp", "day", "swing", "long"] as const;
export const RISK_LEVELS    = ["conservative", "moderate", "aggressive", "very_aggressive"] as const;
export const LEVERAGES      = ["1", "2", "5", "10"] as const;

/** Labels are NOT stored here — they are t() keys (`settings_accent_<key>`). */
export const ACCENT_PRESETS: Record<AccentColor, { primary: string; neonBlue: string; ring: string; hex: string }> = {
  blue:   { primary: "230 90% 62%", neonBlue: "230 90% 62%", ring: "230 90% 62%", hex: "#6366f1" },
  purple: { primary: "270 80% 65%", neonBlue: "270 80% 65%", ring: "270 80% 65%", hex: "#a855f7" },
  teal:   { primary: "175 90% 42%", neonBlue: "175 90% 42%", ring: "175 90% 42%", hex: "#14b8a6" },
  orange: { primary: "30 95% 55%",  neonBlue: "30 95% 55%",  ring: "30 95% 55%",  hex: "#f59e0b" },
  pink:   { primary: "330 90% 60%", neonBlue: "330 90% 60%", ring: "330 90% 60%", hex: "#ec4899" },
};

export interface Settings {
  currency: Currency;
  tradingStyle: string;
  riskLevel: string;
  defaultLeverage: string;
  theme: Theme;
  accentColor: AccentColor;
  recapFrequency: RecapFrequency;
  /** Maps to the server column `notifications_enabled`. */
  priceAlertsEnabled: boolean;
}

interface SettingsContextType {
  settings: Settings;
  /** False until the server state is known (or known to be unavailable). */
  isLoaded: boolean;
  /** Optimistic write + server reconcile. Rolls back and REJECTS on failure. */
  saveSettings: (patch: Partial<Settings>) => Promise<void>;
  // Legacy fire-and-forget setters, kept for existing call sites.
  setCurrency: (currency: Currency) => void;
  setTradingStyle: (style: string) => void;
  setRiskLevel: (level: string) => void;
  setDefaultLeverage: (leverage: string) => void;
  setTheme: (theme: Theme) => void;
  setAccentColor: (color: AccentColor) => void;
  setRecapFrequency: (f: RecapFrequency) => void;
  updateSettings: (updates: Partial<Settings>) => void;
}

const defaultSettings: Settings = {
  currency: "EUR",
  tradingStyle: "day",
  riskLevel: "moderate",
  defaultLeverage: "1",
  theme: "dark",
  accentColor: "blue",
  recapFrequency: "always",
  priceAlertsEnabled: true,
};

const SettingsContext = createContext<SettingsContextType | null>(null);

const STORAGE_KEY = "tdb_settings";

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

/** Validated snake_case → camelCase. Unknown / out-of-range values fall back. */
function fromApi(remote: Partial<UserSettings> | undefined | null): Partial<Settings> {
  if (!remote) return {};
  const out: Partial<Settings> = {};
  if (remote.currency !== undefined)        out.currency        = pick(remote.currency, CURRENCIES, defaultSettings.currency);
  if (remote.trading_style !== undefined)   out.tradingStyle    = pick(remote.trading_style, TRADING_STYLES, defaultSettings.tradingStyle as typeof TRADING_STYLES[number]);
  if (remote.risk_level !== undefined)      out.riskLevel       = pick(remote.risk_level, RISK_LEVELS, defaultSettings.riskLevel as typeof RISK_LEVELS[number]);
  if (remote.default_leverage !== undefined) out.defaultLeverage = pick(remote.default_leverage, LEVERAGES, defaultSettings.defaultLeverage as typeof LEVERAGES[number]);
  if (remote.theme !== undefined)           out.theme           = pick(remote.theme, THEMES, defaultSettings.theme);
  if (remote.accent_color !== undefined)    out.accentColor     = pick(remote.accent_color, ACCENT_COLORS, defaultSettings.accentColor);
  if (remote.recap_frequency !== undefined) out.recapFrequency  = pick(remote.recap_frequency, RECAP_OPTIONS, defaultSettings.recapFrequency);
  if (remote.notifications_enabled !== undefined) out.priceAlertsEnabled = !!remote.notifications_enabled;
  return out;
}

/** camelCase → the snake_case body the PUT expects. */
function toApi(patch: Partial<Settings>): Partial<UserSettings> {
  const out: Partial<UserSettings> = {};
  if (patch.currency !== undefined)           out.currency = patch.currency;
  if (patch.tradingStyle !== undefined)       out.trading_style = patch.tradingStyle;
  if (patch.riskLevel !== undefined)          out.risk_level = patch.riskLevel;
  if (patch.defaultLeverage !== undefined)    out.default_leverage = patch.defaultLeverage;
  if (patch.theme !== undefined)              out.theme = patch.theme;
  if (patch.accentColor !== undefined)        out.accent_color = patch.accentColor;
  if (patch.recapFrequency !== undefined)     out.recap_frequency = patch.recapFrequency;
  if (patch.priceAlertsEnabled !== undefined) out.notifications_enabled = patch.priceAlertsEnabled;
  return out;
}

/**
 * First-paint cache read — synchronous so theme/accent/currency never flash.
 * A corrupted key is REPAIRED (removed) rather than allowed to throw: an
 * uncaught parse error here escapes to the root ErrorBoundary and bricks the
 * whole app with no code path that ever repairs it.
 */
function readCache(): Settings {
  if (typeof window === "undefined") return defaultSettings;
  let raw: string | null = null;
  try { raw = localStorage.getItem(STORAGE_KEY); } catch { return defaultSettings; }
  if (!raw) return defaultSettings;
  try {
    const c = JSON.parse(raw) as Record<string, unknown>;
    if (!c || typeof c !== "object") throw new Error("not an object");
    return {
      currency:        pick(c.currency, CURRENCIES, defaultSettings.currency),
      tradingStyle:    pick(c.tradingStyle, TRADING_STYLES, "day"),
      riskLevel:       pick(c.riskLevel, RISK_LEVELS, "moderate"),
      defaultLeverage: pick(c.defaultLeverage, LEVERAGES, "1"),
      theme:           pick(c.theme, THEMES, defaultSettings.theme),
      accentColor:     pick(c.accentColor, ACCENT_COLORS, defaultSettings.accentColor),
      recapFrequency:  pick(c.recapFrequency, RECAP_OPTIONS, defaultSettings.recapFrequency),
      priceAlertsEnabled: typeof c.priceAlertsEnabled === "boolean" ? c.priceAlertsEnabled : true,
    };
  } catch {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    return defaultSettings;
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const { hydrateLang } = useLanguage();

  const [settings, setSettings] = useState<Settings>(readCache);
  const [isLoaded, setIsLoaded] = useState(false);

  // Ref mirror so saveSettings can roll back without depending on state.
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Keys the user touched since the last successful reconcile — server
  // hydration must never clobber an edit that is still in flight.
  const dirtyRef = useRef(new Set<keyof Settings>());

  // ── Persist the first-paint cache (never authoritative) ──────────────────
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); }
    catch { /* Safari private mode / quota */ }
  }, [settings]);

  // ── Apply theme + accent to the DOM. NOT gated on isLoaded: the cache read
  //    is synchronous and app/layout.tsx runs the same logic before paint. ──
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", settings.theme);
    const preset = ACCENT_PRESETS[settings.accentColor];
    if (preset) {
      const s = document.documentElement.style;
      s.setProperty("--primary", preset.primary);
      s.setProperty("--neon-blue", preset.neonBlue);
      s.setProperty("--ring", preset.ring);
    }
  }, [settings.theme, settings.accentColor]);

  // ── Hydrate from the server, re-running whenever the identity changes ────
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      // Signed out (or never signed in): no account settings to speak of.
      dirtyRef.current.clear();
      setSettings(defaultSettings);
      setIsLoaded(true);
      return;
    }

    let cancelled = false;
    setIsLoaded(false);
    settingsAPI.get()
      .then((remote) => {
        if (cancelled) return;
        const mapped = fromApi(remote);
        setSettings((prev) => {
          const next = { ...prev, ...mapped };
          // Remote wins for every key the user has NOT touched.
          dirtyRef.current.forEach((k) => { (next as Record<string, unknown>)[k] = prev[k]; });
          return next;
        });
        hydrateLang(remote.language);
      })
      .catch(() => { /* offline / 401 — keep the validated local cache */ })
      .finally(() => { if (!cancelled) setIsLoaded(true); });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id]);

  const saveSettings = useCallback(async (patch: Partial<Settings>) => {
    const prev = settingsRef.current;
    const keys = Object.keys(patch) as (keyof Settings)[];
    if (!keys.length) return;

    setSettings((s) => ({ ...s, ...patch }));
    keys.forEach((k) => dirtyRef.current.add(k));

    try {
      const res = await settingsAPI.update(toApi(patch));
      const reconciled = fromApi(res?.settings);
      if (Object.keys(reconciled).length) {
        setSettings((s) => ({ ...s, ...reconciled }));
      }
      dirtyRef.current.clear();
    } catch (e) {
      const rollback: Partial<Settings> = {};
      keys.forEach((k) => { (rollback as Record<string, unknown>)[k] = prev[k]; });
      setSettings((s) => ({ ...s, ...rollback }));
      keys.forEach((k) => dirtyRef.current.delete(k));
      throw e; // the caller renders the error — never swallow it
    }
  }, []);

  // Legacy fire-and-forget setters — same write path, errors surfaced only in
  // the console. New code should call saveSettings and render a SaveState.
  const fireAndForget = useCallback((patch: Partial<Settings>) => {
    saveSettings(patch).catch(() => { /* handled by the caller's own UI */ });
  }, [saveSettings]);

  const setCurrency        = useCallback((currency: Currency) => fireAndForget({ currency }), [fireAndForget]);
  const setTradingStyle    = useCallback((tradingStyle: string) => fireAndForget({ tradingStyle }), [fireAndForget]);
  const setRiskLevel       = useCallback((riskLevel: string) => fireAndForget({ riskLevel }), [fireAndForget]);
  const setDefaultLeverage = useCallback((defaultLeverage: string) => fireAndForget({ defaultLeverage }), [fireAndForget]);
  const setTheme           = useCallback((theme: Theme) => fireAndForget({ theme }), [fireAndForget]);
  const setAccentColor     = useCallback((accentColor: AccentColor) => fireAndForget({ accentColor }), [fireAndForget]);
  const setRecapFrequency  = useCallback((recapFrequency: RecapFrequency) => fireAndForget({ recapFrequency }), [fireAndForget]);

  const updateSettings = useCallback((updates: Partial<Settings>) => {
    const patch: Partial<Settings> = {};
    (Object.keys(updates) as (keyof Settings)[]).forEach((k) => {
      if (updates[k] !== undefined) (patch as Record<string, unknown>)[k] = updates[k];
    });
    fireAndForget(patch);
  }, [fireAndForget]);

  const contextValue = useMemo(() => ({
    settings, isLoaded, saveSettings,
    setCurrency, setTradingStyle, setRiskLevel,
    setDefaultLeverage, setTheme, setAccentColor, setRecapFrequency, updateSettings,
  }), [settings, isLoaded, saveSettings, setCurrency, setTradingStyle, setRiskLevel,
      setDefaultLeverage, setTheme, setAccentColor, setRecapFrequency, updateSettings]);

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("useSettings must be used within a SettingsProvider");
  return context;
}

// ── Currency conversion ──────────────────────────────────────────────────────
// A single fixed, indicative rate — derived so the pair is always reciprocal.
// There is no live FX feed; `settings_currency_rate_note` says so in the UI.
const EUR_USD = 1.09;
const CONVERSION_RATES: Record<string, number> = {
  EUR_USD,
  USD_EUR: 1 / EUR_USD,
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
  return useCallback((value: number, originalCurrency: Currency = "USD"): string => {
    const converted = convertCurrency(value, originalCurrency, settings.currency);
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: settings.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(converted);
  }, [settings.currency]);
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
const EUR_SUFFIXES = [".PA", ".DE", ".AS", ".BR", ".LS", ".MI", ".MC", ".AT", ".CO", ".ST", ".HE", ".OL", ".WA"];

export function useFormatPrice() {
  const { settings } = useSettings();
  return useCallback((value: number, symbol: string): string => {
    const nativeCurrency: Currency = EUR_SUFFIXES.some((sfx) => symbol.toUpperCase().endsWith(sfx)) ? "EUR" : "USD";
    const converted = convertCurrency(value, nativeCurrency, settings.currency);
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: settings.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(converted);
  }, [settings.currency]);
}
