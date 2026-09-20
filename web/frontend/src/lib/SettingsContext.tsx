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
/*
 * Terminal-theme accents. The stored KEYS are unchanged (the backend enum and
 * every existing row depend on them) but the colours and their labels are
 * re-tuned for the carbon/gold terminal: "blue" is the default and is the
 * logo's gold. These values are written inline on <html> at runtime, so they
 * MUST stay in sync with the pre-paint map in app/layout.tsx.
 */
export const ACCENT_PRESETS: Record<AccentColor, { primary: string; neonBlue: string; ring: string; hex: string }> = {
  blue:   { primary: "41 82% 52%",  neonBlue: "41 82% 52%",  ring: "41 82% 52%",  hex: "#E8A820" }, // Or (défaut)
  purple: { primary: "25 85% 55%",  neonBlue: "25 85% 55%",  ring: "25 85% 55%",  hex: "#F0821E" }, // Ambre
  teal:   { primary: "170 60% 45%", neonBlue: "170 60% 45%", ring: "170 60% 45%", hex: "#2EB89B" }, // Jade
  orange: { primary: "187 62% 58%", neonBlue: "187 62% 58%", ring: "187 62% 58%", hex: "#5FC9DC" }, // Cyan
  pink:   { primary: "340 65% 60%", neonBlue: "340 65% 60%", ring: "340 65% 60%", hex: "#DB5A85" }, // Magenta
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
  /** Live EUR/USD used to display USD-quoted assets in euros. */
  eurUsd: number;
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
const FX_KEY = "tdb_eurusd";

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

  // FX for display. Seeded from the last known rate so the first paint is not
  // off by several percent, then refreshed from the server.
  const [eurUsd, setEurUsd] = useState<number>(() => {
    if (typeof window === "undefined") return EUR_USD_FALLBACK;
    const v = Number(localStorage.getItem(FX_KEY));
    return v > 0.7 && v < 1.7 ? v : EUR_USD_FALLBACK;
  });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        // Carry the token: during maintenance every non-admin call is 503, and
        // an unauthenticated fetch here left even admins on the seeded rate —
        // reintroducing the very price gap the live rate exists to close.
        const { getToken } = await import("@/lib/auth");
        const token = getToken();
        const r = await fetch("/api/market/fx", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          signal: AbortSignal.timeout(8000),
        });
        if (!r.ok) return;
        const d = await r.json();
        const rate = Number(d?.EURUSD);
        if (!cancelled && rate > 0.7 && rate < 1.7) {
          setEurUsd(rate);
          try { localStorage.setItem(FX_KEY, String(rate)); } catch { /* private mode */ }
        }
      } catch { /* keep the seeded rate */ }
    };
    load();
    const iv = setInterval(load, 30 * 60 * 1000);
    return () => { cancelled = true; clearInterval(iv); };
  }, []);
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
    settings, isLoaded, saveSettings, eurUsd,
    setCurrency, setTradingStyle, setRiskLevel,
    setDefaultLeverage, setTheme, setAccentColor, setRecapFrequency, updateSettings,
  }), [settings, isLoaded, saveSettings, eurUsd, setCurrency, setTradingStyle, setRiskLevel,
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
// The rate used to be this constant alone. Prices in USD — crypto, US stocks,
// indices — were therefore converted with a figure that drifts further from
// the market every month, and the whole error lands on the displayed price:
// at 1.09 against a real 1.154, Bitcoin showed ~5.9% above its true euro
// value while the dollar price coming from the API was perfectly correct.
// The live rate now comes from GET /api/market/fx; this constant is only the
// seed used before the first response arrives.
export const EUR_USD_FALLBACK = 1.09;

export function convertCurrency(
  amount: number,
  from: Currency,
  to: Currency,
  eurUsd: number = EUR_USD_FALLBACK,
): number {
  if (from === to) return amount;
  if (from === "EUR" && to === "USD") return amount * eurUsd;
  if (from === "USD" && to === "EUR") return amount / eurUsd;
  return amount;
}

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: "$",
  EUR: "€",
};

export function useFormatCurrency() {
  const { settings, eurUsd } = useSettings();
  return useCallback((value: number, originalCurrency: Currency = "USD"): string => {
    const converted = convertCurrency(value, originalCurrency, settings.currency, eurUsd);
    const d = priceDecimals(converted);
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: settings.currency,
      minimumFractionDigits: d,
      maximumFractionDigits: d,
    }).format(converted);
  }, [settings.currency, eurUsd]);
}

/**
 * Un prix, converti et formaté — la version sans symbole d'actif.
 *
 * Les écrans reconstruits manipulent des valeurs déjà exprimées en euros par
 * le moteur ; ils n'ont donc pas besoin de deviner la devise d'origine, mais
 * ils ont besoin de la même précision adaptative.
 */
export function useFormatAssetPrice() {
  const { settings, eurUsd } = useSettings();
  return useCallback((value: number): string => {
    const converted = convertCurrency(value, "EUR", settings.currency, eurUsd);
    const d = priceDecimals(converted);
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: settings.currency,
      minimumFractionDigits: d,
      maximumFractionDigits: d,
    }).format(converted);
  }, [settings.currency, eurUsd]);
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

/**
 * Le nombre de décimales d'un PRIX, selon son ordre de grandeur.
 *
 * Deux décimales conviennent à une action à 336 €. Elles sont ruineuses pour
 * un actif à 0,34 € : sur TRX, une position affichait « entrée 0,34 € » et
 * « cours actuel 0,34 € » à côté d'un résultat de −0,88 €. Le calcul était
 * juste — l'entrée valait 0,34260 et le cours 0,34250, soit −0,029 % que le
 * levier ×10 transformait en −0,29 %. C'est l'affichage qui mentait, en
 * arrondissant deux nombres différents au même.
 *
 * Un écran qui montre deux fois le même prix à côté d'une perte se lit comme
 * un bug, et c'est bien un bug : il cache la seule chose qu'il devait
 * montrer.
 *
 * À NE PAS UTILISER POUR UNE SOMME D'ARGENT. Un solde, un montant engagé ou
 * un résultat s'écrivent toujours au centime : « 299,1245 € » de valeur de
 * position n'a pas de sens, alors que « 0,342500 € » de cours en a un.
 */
export function priceDecimals(value: number): number {
  const v = Math.abs(value);
  if (!Number.isFinite(v) || v === 0) return 2;
  if (v >= 100) return 2;
  if (v >= 1) return 3;
  if (v >= 0.01) return 5;
  if (v >= 0.0001) return 6;
  return 8;
}

export function useFormatPrice() {
  const { settings, eurUsd } = useSettings();
  return useCallback((value: number, symbol: string): string => {
    const nativeCurrency: Currency = EUR_SUFFIXES.some((sfx) => symbol.toUpperCase().endsWith(sfx)) ? "EUR" : "USD";
    const converted = convertCurrency(value, nativeCurrency, settings.currency, eurUsd);
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: settings.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(converted);
  }, [settings.currency, eurUsd]);
}

/**
 * Un nombre à la française, avec une virgule décimale.
 *
 * toFixed rend toujours un point : « 1.7 », « 62.3 % », « 1 : 1.7 ». Dans une
 * interface française c'est une faute, et elle revient sans arrêt — quatre
 * fois repérée et corrigée à la main sur des écrans différents, pendant que
 * 145 autres appels continuaient de l'écrire ailleurs. Corriger les lignes
 * visibles une par une ne règle rien ; il faut un formateur qu'on attrape
 * plus facilement que toFixed.
 *
 * `decimals` fixe le nombre de décimales, exactement comme toFixed :
 * fr(1.6666, 1) -> « 1,7 ».  fr(1000.5, 2) -> « 1 000,50 ».
 */
export function fr(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return "—";
  return value.toLocaleString("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Le même, avec le signe pour les variations : « +1,7 », « −0,3 ». */
export function frSigned(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return "—";
  return `${value >= 0 ? "+" : ""}${fr(value, decimals)}`;
}
