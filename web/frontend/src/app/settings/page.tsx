"use client";

import { Suspense, useCallback, useEffect, useId, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Palette,
  ShieldCheck,
  TrendingUp,
  Save,
  Moon,
  Sun,
  LogOut,
  Loader2,
  GraduationCap,
  Zap,
  BadgeCheck,
  KeyRound,
  Download,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";
import { TradingLevel, setToken, removeToken } from "@/lib/auth";
import {
  useSettings, ACCENT_PRESETS, AccentColor, Currency, Theme, RecapFrequency,
} from "@/lib/SettingsContext";
import { useLanguage, Lang, TranslationKey } from "@/lib/LanguageContext";
import { accountAPI, alertsAPI, PriceAlert } from "@/lib/api";
import { LevelChangeModal } from "@/components/onboarding/LevelChangeModal";
import { TOUR_KEY } from "@/components/OnboardingTour";
import { useAlexStore } from "@/stores/alex-store";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { SettingRow } from "@/components/settings/SettingRow";
import { Toggle } from "@/components/settings/Toggle";
import { OptionCards, OptionCard } from "@/components/settings/OptionCards";
import { SaveState } from "@/components/settings/SaveState";
import { useSaveStatus } from "@/components/settings/useSaveStatus";
import { ChangePasswordModal } from "@/components/settings/ChangePasswordModal";
import { ConfirmDialog } from "@/components/settings/ConfirmDialog";

type TabId = "account" | "trading" | "display" | "alerts" | "security";
const TAB_IDS: TabId[] = ["account", "trading", "display", "alerts", "security"];

// ─────────────────────────────────────────────────────────────────────────────
//  SHELL
// ─────────────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsSkeleton />}>
      <SettingsPageInner />
    </Suspense>
  );
}

function SettingsSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="skeleton h-9 w-52 rounded-lg" />
      <div className="flex flex-col md:flex-row gap-6">
        <div className="md:w-52 flex md:flex-col gap-2">
          {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-10 w-full rounded-lg" />)}
        </div>
        <div className="flex-1 glass-card p-6 space-y-4">
          {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-16 w-full rounded-xl" />)}
        </div>
      </div>
    </div>
  );
}

function SettingsPageInner() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawTab = searchParams.get("tab");
  const activeTab: TabId = TAB_IDS.includes(rawTab as TabId) ? (rawTab as TabId) : "account";

  // The ONLY draft state on the page — lifted here so the tab-switch unmount
  // (AnimatePresence mode="wait") can never discard a half-typed name.
  const [displayNameDraft, setDisplayNameDraft] = useState<string | null>(null);

  const tabs: { id: TabId; label: string; icon: typeof User }[] = [
    { id: "account",  label: t("settings_tab_account"),  icon: User },
    { id: "trading",  label: t("settings_tab_trading"),  icon: TrendingUp },
    { id: "display",  label: t("settings_tab_display"),  icon: Palette },
    { id: "alerts",   label: t("settings_tab_alerts"),   icon: Bell },
    { id: "security", label: t("settings_tab_security"), icon: ShieldCheck },
  ];

  const selectTab = (id: TabId) => {
    if (id === activeTab) return;
    // push (not replace) so the browser Back button walks back through tabs
    router.push(`/settings?tab=${id}`, { scroll: false });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-6">
      <header>
        <h1 className="text-xl sm:text-2xl font-bold font-display flex items-center gap-2">
          <SettingsIcon className="w-6 h-6" aria-hidden="true" />
          {t("settings_title")}
        </h1>
        <p className="text-muted-foreground">{t("settings_subtitle")}</p>
        <p className="mt-3 text-xs text-primary/80 bg-primary/5 border border-primary/20 rounded-xl px-3 py-2">
          {t("settings_changes_auto")}
        </p>
      </header>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Tab sidebar */}
        <nav
          aria-label={t("settings_title")}
          className="md:w-52 flex md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0 no-scrollbar"
        >
          {tabs.map((tab, i) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                type="button"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, duration: 0.28 }}
                onClick={() => selectTab(tab.id)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-lg text-left text-sm transition-all whitespace-nowrap relative",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  isActive ? "text-primary font-semibold" : "hover:bg-white/5 text-muted-foreground"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                {tab.label}
                {isActive && (
                  <motion.div layoutId="settings-active" className="absolute inset-0 bg-primary/20 rounded-lg -z-10" />
                )}
              </motion.button>
            );
          })}
        </nav>

        {/* Content */}
        <div className="flex-1 glass-card-hover p-4 sm:p-6 overflow-hidden min-w-0">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === "account" && (
                <AccountTab displayNameDraft={displayNameDraft} setDisplayNameDraft={setDisplayNameDraft} />
              )}
              {activeTab === "trading" && <TradingTab />}
              {activeTab === "display" && <DisplayTab />}
              {activeTab === "alerts" && <AlertsTab />}
              {activeTab === "security" && <SecurityTab />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

/** Renders while the server settings are still in flight — prevents a control
 *  from showing a default the user never chose and then flipping under them. */
function TabLoading() {
  const { t } = useLanguage();
  return (
    <div className="space-y-3" role="status" aria-live="polite">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        {t("settings_loading")}
      </p>
      {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-16 w-full rounded-xl" />)}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  1 · COMPTE
// ─────────────────────────────────────────────────────────────────────────────

/** BCP-47 tags for Intl — locale codes, not user-facing copy. */
const DATE_LOCALES: Record<Lang, string> = { fr: "fr-FR", en: "en-GB" };

const LEVEL_META: { id: TradingLevel; icon: typeof User; label: TranslationKey; desc: TranslationKey }[] = [
  { id: "beginner",     icon: GraduationCap, label: "settings_level_beginner",     desc: "settings_level_beginner_desc" },
  { id: "intermediate", icon: TrendingUp,    label: "settings_level_intermediate", desc: "settings_level_intermediate_desc" },
  { id: "expert",       icon: Zap,           label: "settings_level_expert",       desc: "settings_level_expert_desc" },
];

function AccountTab({
  displayNameDraft, setDisplayNameDraft,
}: {
  displayNameDraft: string | null;
  setDisplayNameDraft: (v: string) => void;
}) {
  const { user, setTradingLevel, refreshUser } = useAuth();
  const { t, lang } = useLanguage();
  const { openPanel } = useAlexStore();
  const uid = useId();

  const nameSave = useSaveStatus();
  const levelSave = useSaveStatus();

  const [levelFrom, setLevelFrom] = useState<TradingLevel | null>(null);
  const [levelTo, setLevelTo] = useState<TradingLevel | null>(null);

  const currentName = user?.first_name ?? "";
  const draft = displayNameDraft ?? currentName;
  const trimmed = draft.trim();
  const nameValid = trimmed.length >= 2 && trimmed.length <= 40 && !/[<>\n\r\t]/.test(trimmed);
  const nameDirty = trimmed !== currentName;

  const saveName = () => {
    if (!nameValid || !nameDirty) return;
    nameSave.run(async () => {
      await accountAPI.updateProfile(trimmed);
      // Re-read /me so the header + dashboard greeting update without a reload.
      await refreshUser();
      setDisplayNameDraft(trimmed);
    });
  };

  const pickLevel = async (id: string) => {
    const level = id as TradingLevel;
    if (user?.trading_level === level) return;
    const from = (user?.trading_level ?? "beginner") as TradingLevel;
    const ok = await levelSave.run(() => setTradingLevel(level));
    // The card selection is driven by user.trading_level, which AuthContext
    // only updates once the PUT succeeded — a failure reverts it for free.
    if (ok) { setLevelFrom(from); setLevelTo(level); }
  };

  const levelOptions: OptionCard[] = LEVEL_META.map((l) => ({
    id: l.id, label: t(l.label), description: t(l.desc), icon: l.icon,
  }));

  const memberSince = useMemo(() => {
    if (!user?.created_at) return null;
    const d = new Date(user.created_at);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString(DATE_LOCALES[lang] ?? "fr-FR", {
      year: "numeric", month: "long", day: "numeric",
    });
  }, [user?.created_at, lang]);

  const initial = (user?.first_name?.[0] ?? user?.username?.[0] ?? "U").toUpperCase();

  return (
    <div className="space-y-8">
      <h2 className="text-lg font-semibold font-display">{t("settings_account_title")}</h2>

      {/* Identity — read-only */}
      <div className="flex items-center gap-4">
        <div
          aria-hidden="true"
          className="w-16 h-16 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0"
        >
          <span className="text-2xl font-bold text-on-color">{initial}</span>
        </div>
        <div className="min-w-0">
          <p className="font-semibold truncate">{user?.first_name || user?.username || t("settings_user_default")}</p>
          <p className="text-sm text-muted-foreground truncate">{user?.email || t("settings_email_undefined")}</p>
        </div>
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-white/5 border border-white/10">
          <dt className="text-xs text-muted-foreground">{t("settings_username_label")}</dt>
          <dd className="text-sm font-medium mt-0.5 truncate">{user?.username || "—"}</dd>
        </div>
        <div className="p-3 rounded-xl bg-white/5 border border-white/10">
          <dt className="text-xs text-muted-foreground">{t("settings_email_label")}</dt>
          <dd className="text-sm font-medium mt-0.5 flex items-center gap-1.5 min-w-0">
            <span className="truncate">{user?.email || "—"}</span>
            {user?.email_verified && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-profit bg-profit/10 border border-profit/20 rounded-full px-1.5 py-0.5 shrink-0">
                <BadgeCheck className="w-3 h-3" aria-hidden="true" />
                {t("settings_email_verified")}
              </span>
            )}
          </dd>
          <p className="text-[11px] text-muted-foreground mt-1.5">{t("settings_email_readonly")}</p>
        </div>
        {memberSince && (
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <dt className="text-xs text-muted-foreground">{t("settings_member_since")}</dt>
            <dd className="text-sm font-medium mt-0.5 tabular-nums">{memberSince}</dd>
          </div>
        )}
      </dl>

      {/* Display name */}
      <SettingsSection
        title={t("settings_display_name")}
        description={t("settings_display_name_desc")}
        status={nameSave.status}
        error={nameSave.error}
        onRetry={saveName}
      >
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            id={`${uid}-name`}
            type="text"
            value={draft}
            maxLength={40}
            aria-label={t("settings_display_name")}
            aria-invalid={draft.length > 0 && !nameValid}
            onChange={(e) => setDisplayNameDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); saveName(); } }}
            className="input flex-1"
          />
          <button
            type="button"
            onClick={saveName}
            disabled={!nameValid || !nameDirty || nameSave.status === "saving"}
            className="btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {nameSave.status === "saving"
              ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              : <Save className="w-4 h-4" aria-hidden="true" />}
            {t("settings_save")}
          </button>
        </div>
        {draft.length > 0 && !nameValid && (
          <p className="text-xs text-loss">{t("settings_display_name_invalid")}</p>
        )}
      </SettingsSection>

      {/* Trading level */}
      <SettingsSection
        title={t("settings_level")}
        description={t("settings_level_desc")}
        status={levelSave.status}
        error={levelSave.error}
      >
        <OptionCards
          label={t("settings_level")}
          options={levelOptions}
          value={user?.trading_level ?? null}
          onSelect={pickLevel}
          columns={1}
          disabled={levelSave.status === "saving"}
        />
      </SettingsSection>

      <AnimatePresence>
        {levelFrom && levelTo && (
          <LevelChangeModal
            fromLevel={levelFrom}
            toLevel={levelTo}
            lang={lang as "fr" | "en"}
            onClose={() => { setLevelFrom(null); setLevelTo(null); }}
            onStartBeginnerAssistant={() => {
              // Opens the Alex panel ONLY — it must not silently re-arm the
              // 9-step tour (that is the sibling button's job).
              openPanel();
              setLevelFrom(null); setLevelTo(null);
            }}
            onStartTour={() => {
              // Re-arm the tour and reload; the single global <OnboardingTour />
              // mounted by AppLayout picks it up on the next paint.
              try { localStorage.removeItem(TOUR_KEY); } catch { /* ignore */ }
              window.location.href = "/dashboard";
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  2 · TRADING
// ─────────────────────────────────────────────────────────────────────────────

const STYLE_META: { id: string; emoji: string; label: TranslationKey; desc: TranslationKey; horizon: TranslationKey }[] = [
  { id: "scalp", emoji: "⚡", label: "settings_style_scalp", desc: "settings_style_scalp_desc", horizon: "settings_horizon_scalp" },
  { id: "day",   emoji: "📈", label: "settings_style_day",   desc: "settings_style_day_desc",   horizon: "settings_horizon_day" },
  { id: "swing", emoji: "🔄", label: "settings_style_swing", desc: "settings_style_swing_desc", horizon: "settings_horizon_swing" },
  { id: "long",  emoji: "🏦", label: "settings_style_long",  desc: "settings_style_long_desc",  horizon: "settings_horizon_long" },
];

const RISK_META: { id: string; emoji: string; label: TranslationKey; desc: TranslationKey }[] = [
  { id: "conservative",    emoji: "🐢",  label: "settings_risk_conservative",    desc: "settings_risk_conservative_desc" },
  { id: "moderate",        emoji: "⚖️", label: "settings_risk_moderate",        desc: "settings_risk_moderate_desc" },
  { id: "aggressive",      emoji: "🔥",  label: "settings_risk_aggressive",      desc: "settings_risk_aggressive_desc" },
  { id: "very_aggressive", emoji: "⚡",  label: "settings_risk_very_aggressive", desc: "settings_risk_very_aggressive_desc" },
];

function TradingTab() {
  const { t } = useLanguage();
  const { settings, isLoaded, saveSettings } = useSettings();

  const style = useSaveStatus();
  const risk = useSaveStatus();
  const leverage = useSaveStatus();

  const pickStyle = useCallback((id: string) => { style.run(() => saveSettings({ tradingStyle: id })); }, [style, saveSettings]);
  const pickRisk = useCallback((id: string) => { risk.run(() => saveSettings({ riskLevel: id })); }, [risk, saveSettings]);
  const pickLeverage = useCallback((id: string) => { leverage.run(() => saveSettings({ defaultLeverage: id })); }, [leverage, saveSettings]);

  if (!isLoaded) return <div className="space-y-6"><h2 className="text-lg font-semibold font-display">{t("settings_trading_title")}</h2><TabLoading /></div>;

  const styleOptions: OptionCard[] = STYLE_META.map((s) => ({
    id: s.id, label: t(s.label), description: t(s.desc), emoji: s.emoji, badge: t(s.horizon),
  }));
  const riskOptions: OptionCard[] = RISK_META.map((r) => ({
    id: r.id, label: t(r.label), description: t(r.desc), emoji: r.emoji,
  }));
  const leverageOptions: OptionCard[] = [
    { id: "1", label: t("settings_leverage_1") },
    { id: "2", label: "2x" },
    { id: "5", label: "5x" },
    { id: "10", label: "10x" },
  ];

  const activeStyle = STYLE_META.find((s) => s.id === settings.tradingStyle);

  return (
    <div className="space-y-8">
      <h2 className="text-lg font-semibold font-display">{t("settings_trading_title")}</h2>

      <SettingsSection
        title={t("settings_trading_style_label")}
        description={t("settings_trading_style_desc")}
        status={style.status}
        error={style.error}
        onRetry={() => pickStyle(settings.tradingStyle)}
      >
        <OptionCards
          label={t("settings_trading_style_label")}
          options={styleOptions}
          value={settings.tradingStyle}
          onSelect={pickStyle}
          columns={2}
          disabled={style.status === "saving"}
        />
        {activeStyle && (
          <div className="mt-1 p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs text-primary/80 space-y-1">
            <p>
              <span className="font-semibold">
                {activeStyle.emoji} {t(activeStyle.label)} {t("settings_style_active_suffix")}
              </span>
              {" — "}
              {t("settings_style_ai_text").replace("{horizon}", t(activeStyle.horizon))}
            </p>
            <p className="text-muted-foreground">{t("settings_style_scope")}</p>
          </div>
        )}
      </SettingsSection>

      <SettingsSection
        title={t("settings_risk_level_label")}
        status={risk.status}
        error={risk.error}
        onRetry={() => pickRisk(settings.riskLevel)}
      >
        <OptionCards
          label={t("settings_risk_level_label")}
          options={riskOptions}
          value={settings.riskLevel}
          onSelect={pickRisk}
          columns={2}
          disabled={risk.status === "saving"}
        />
        <p className="text-xs text-muted-foreground leading-relaxed">{t("settings_risk_disclaimer")}</p>
      </SettingsSection>

      <SettingsSection
        title={t("settings_leverage_label")}
        description={t("settings_leverage_desc")}
        status={leverage.status}
        error={leverage.error}
        onRetry={() => pickLeverage(settings.defaultLeverage)}
      >
        <OptionCards
          label={t("settings_leverage_label")}
          options={leverageOptions}
          value={settings.defaultLeverage}
          onSelect={pickLeverage}
          columns={4}
          size="sm"
          disabled={leverage.status === "saving"}
        />
      </SettingsSection>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  3 · AFFICHAGE
// ─────────────────────────────────────────────────────────────────────────────

const ACCENT_KEYS: Record<AccentColor, TranslationKey> = {
  blue: "settings_accent_blue",
  purple: "settings_accent_purple",
  teal: "settings_accent_teal",
  orange: "settings_accent_orange",
  pink: "settings_accent_pink",
};

function DisplayTab() {
  const { t, lang, setLangAsync } = useLanguage();
  const { settings, isLoaded, saveSettings } = useSettings();

  const language = useSaveStatus();
  const currency = useSaveStatus();
  const theme = useSaveStatus();
  const accent = useSaveStatus();

  const pickLang = useCallback((id: string) => { language.run(() => setLangAsync(id as Lang)); }, [language, setLangAsync]);
  const pickCurrency = useCallback((id: string) => { currency.run(() => saveSettings({ currency: id as Currency })); }, [currency, saveSettings]);
  const pickTheme = useCallback((id: string) => { theme.run(() => saveSettings({ theme: id as Theme })); }, [theme, saveSettings]);
  const pickAccent = useCallback((id: string) => { accent.run(() => saveSettings({ accentColor: id as AccentColor })); }, [accent, saveSettings]);

  if (!isLoaded) return <div className="space-y-6"><h2 className="text-lg font-semibold font-display">{t("settings_display_title")}</h2><TabLoading /></div>;

  const langOptions: OptionCard[] = [
    { id: "fr", label: "Français", emoji: "🇫🇷" },
    { id: "en", label: "English", emoji: "🇬🇧" },
  ];
  const currencyOptions: OptionCard[] = [
    { id: "EUR", label: t("settings_currency_eur"), emoji: "€" },
    { id: "USD", label: t("settings_currency_usd"), emoji: "$" },
  ];
  const themeOptions: OptionCard[] = [
    { id: "dark",  label: t("settings_theme_dark"),  description: t("settings_theme_dark_desc"),  icon: Moon },
    { id: "light", label: t("settings_theme_light"), description: t("settings_theme_light_desc"), icon: Sun },
  ];
  const accentOptions: OptionCard[] = (Object.keys(ACCENT_PRESETS) as AccentColor[]).map((key) => ({
    id: key, label: t(ACCENT_KEYS[key]), swatch: ACCENT_PRESETS[key].hex,
  }));

  return (
    <div className="space-y-8">
      <h2 className="text-lg font-semibold font-display">{t("settings_display_title")}</h2>

      <SettingsSection title={t("settings_language")} status={language.status} error={language.error} onRetry={() => pickLang(lang)}>
        <OptionCards
          label={t("settings_language")}
          options={langOptions}
          value={lang}
          onSelect={pickLang}
          columns={2}
          disabled={language.status === "saving"}
        />
      </SettingsSection>

      <SettingsSection
        title={t("settings_currency")}
        description={t("settings_currency_desc")}
        status={currency.status}
        error={currency.error}
        onRetry={() => pickCurrency(settings.currency)}
      >
        <OptionCards
          label={t("settings_currency")}
          options={currencyOptions}
          value={settings.currency}
          onSelect={pickCurrency}
          columns={2}
          disabled={currency.status === "saving"}
        />
        <p className="text-xs text-muted-foreground leading-relaxed">{t("settings_currency_rate_note")}</p>
      </SettingsSection>

      <SettingsSection title={t("settings_theme")} status={theme.status} error={theme.error} onRetry={() => pickTheme(settings.theme)}>
        <OptionCards
          label={t("settings_theme")}
          options={themeOptions}
          value={settings.theme}
          onSelect={pickTheme}
          columns={2}
          disabled={theme.status === "saving"}
        />
      </SettingsSection>

      <SettingsSection
        title={t("settings_accent")}
        description={t("settings_accent_desc")}
        status={accent.status}
        error={accent.error}
        onRetry={() => pickAccent(settings.accentColor)}
      >
        <OptionCards
          label={t("settings_accent")}
          options={accentOptions}
          value={settings.accentColor}
          onSelect={pickAccent}
          columns={5}
          size="sm"
          disabled={accent.status === "saving"}
        />
      </SettingsSection>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  4 · ALERTES & RÉCAP
// ─────────────────────────────────────────────────────────────────────────────

const RECAP_META: { id: RecapFrequency; label: TranslationKey; desc: TranslationKey }[] = [
  { id: "always", label: "settings_recap_always", desc: "settings_recap_always_desc" },
  { id: "daily",  label: "settings_recap_daily",  desc: "settings_recap_daily_desc" },
  { id: "weekly", label: "settings_recap_weekly", desc: "settings_recap_weekly_desc" },
  { id: "off",    label: "settings_recap_off",    desc: "settings_recap_off_desc" },
];

function AlertsTab() {
  const { t } = useLanguage();
  const { settings, isLoaded, saveSettings } = useSettings();
  const toggleSave = useSaveStatus();
  const recapSave = useSaveStatus();

  const flipToggle = useCallback((v: boolean) => {
    toggleSave.run(() => saveSettings({ priceAlertsEnabled: v }));
  }, [toggleSave, saveSettings]);

  const pickRecap = useCallback((id: string) => {
    recapSave.run(() => saveSettings({ recapFrequency: id as RecapFrequency }));
  }, [recapSave, saveSettings]);

  const recapOptions: OptionCard[] = RECAP_META.map((r) => ({
    id: r.id, label: t(r.label), description: t(r.desc),
  }));

  return (
    <div className="space-y-8">
      <h2 className="text-lg font-semibold font-display">{t("settings_alerts_title")}</h2>

      {!isLoaded ? <TabLoading /> : (
        <>
          <SettingRow
            title={t("settings_alerts_toasts")}
            description={t("settings_alerts_toasts_desc")}
          >
            <SaveState status={toggleSave.status} error={toggleSave.error} onRetry={() => flipToggle(settings.priceAlertsEnabled)} />
            <Toggle
              checked={settings.priceAlertsEnabled}
              onChange={flipToggle}
              disabled={toggleSave.status === "saving"}
              label={t("settings_alerts_toasts")}
            />
          </SettingRow>

          <SettingsSection
            title={t("settings_recap_title")}
            description={t("settings_recap_desc")}
            status={recapSave.status}
            error={recapSave.error}
            onRetry={() => pickRecap(settings.recapFrequency)}
          >
            <OptionCards
              label={t("settings_recap_title")}
              options={recapOptions}
              value={settings.recapFrequency}
              onSelect={pickRecap}
              columns={2}
              disabled={recapSave.status === "saving"}
            />
          </SettingsSection>
        </>
      )}

      <ActiveAlertsList />
    </div>
  );
}

function ActiveAlertsList() {
  const { t } = useLanguage();
  const [alerts, setAlerts] = useState<PriceAlert[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  const load = useCallback(() => {
    setError(null);
    alertsAPI.list()
      .then((res) => setAlerts((res.alerts ?? []).filter((a) => a.status === "active")))
      .catch((e) => { setAlerts([]); setError(e instanceof Error ? e.message : String(e)); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const remove = async (id: number) => {
    const prev = alerts ?? [];
    setDeleting(id);
    setError(null);
    setAlerts(prev.filter((a) => a.id !== id));   // optimistic
    try {
      await alertsAPI.remove(id);
    } catch (e) {
      setAlerts(prev);                            // rollback
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold font-display">{t("settings_my_alerts")}</h3>
        {error && (
          <button
            type="button" onClick={load}
            className="text-xs font-semibold text-loss underline underline-offset-2 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-loss/50 rounded px-1"
          >
            {t("settings_retry")}
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="text-xs text-loss bg-loss/10 border border-loss/20 rounded-lg px-3 py-2">{error}</p>
      )}

      {alerts === null && <div className="skeleton h-14 w-full rounded-xl" />}

      {alerts !== null && alerts.length === 0 && !error && (
        <p className="text-sm text-muted-foreground p-4 rounded-xl bg-white/5 border border-white/10">
          {/* The key is already a full sentence naming the destination — the
              link is the destination itself, not a second mention of it. */}
          <Link href="/analysis" className="text-primary font-medium hover:underline">
            {t("settings_my_alerts_empty")}
          </Link>
        </p>
      )}

      {alerts !== null && alerts.length > 0 && (
        <ul className="space-y-2">
          {alerts.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="min-w-0">
                <p className="text-sm font-semibold font-mono truncate">{a.symbol}</p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {a.direction === "above" ? "≥" : "≤"} {a.target}
                  {a.note && <span className="italic"> — « {a.note} »</span>}
                </p>
              </div>
              <button
                type="button"
                onClick={() => remove(a.id)}
                disabled={deleting === a.id}
                aria-label={`${t("settings_alert_delete")} ${a.symbol}`}
                className="p-2 rounded-lg text-muted-foreground hover:text-loss hover:bg-loss/10 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-loss/50"
              >
                {deleting === a.id
                  ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  : <Trash2 className="w-4 h-4" aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  5 · SÉCURITÉ & DONNÉES
// ─────────────────────────────────────────────────────────────────────────────

function SecurityTab() {
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [passwordDone, setPasswordDone] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const exportSave = useSaveStatus();

  const handleExport = () => exportSave.run(async () => {
    const data = await accountAPI.exportData();
    // Blob download: a bare <a href> cannot carry the Authorization header.
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const a = document.createElement("a");
    a.href = url;
    a.download = `tdb-export-${user?.username ?? "user"}-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    router.push("/login");
  };

  const handleDelete = async ({ password, confirm }: { password: string; confirm: string }) => {
    await accountAPI.deleteAccount(password, confirm);
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("tdb_"))
        .forEach((k) => localStorage.removeItem(k));
    } catch { /* ignore */ }
    removeToken();
    router.replace("/");
  };

  return (
    <div className="space-y-8">
      <h2 className="text-lg font-semibold font-display">{t("settings_security_title")}</h2>

      <div className="p-4 bg-profit/10 border border-profit/20 rounded-xl">
        <p className="text-sm text-profit">{t("settings_security_info")}</p>
      </div>

      {passwordDone && (
        <p role="status" className="text-sm text-profit bg-profit/10 border border-profit/20 rounded-xl px-3 py-2">
          {t("settings_pwd_success")}
        </p>
      )}

      <div className="space-y-3">
        <SettingRow title={t("settings_change_password")} description={t("settings_change_password_desc")}>
          <button
            type="button"
            onClick={() => { setPasswordDone(false); setShowPassword(true); }}
            className="btn-secondary text-sm flex items-center gap-2"
          >
            <KeyRound className="w-4 h-4" aria-hidden="true" />
            {t("settings_change_btn")}
          </button>
        </SettingRow>

        <SettingRow title={t("settings_export_data")} description={t("settings_export_desc2")}>
          <div className="flex flex-col items-end gap-1.5">
            <button
              type="button"
              onClick={handleExport}
              disabled={exportSave.status === "saving"}
              className="btn-secondary text-sm flex items-center gap-2 disabled:opacity-50"
            >
              {exportSave.status === "saving"
                ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                : <Download className="w-4 h-4" aria-hidden="true" />}
              {t("settings_export_btn")}
            </button>
            <SaveState
              status={exportSave.status}
              error={exportSave.error}
              onRetry={handleExport}
              savingLabel={t("settings_export_progress")}
              savedLabel={t("settings_export_done")}
            />
          </div>
        </SettingRow>

        <SettingRow title={t("settings_logout_row")} description={t("settings_logout_desc")}>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="btn-ghost text-loss text-sm flex items-center gap-2 disabled:opacity-50"
          >
            {isLoggingOut
              ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              : <LogOut className="w-4 h-4" aria-hidden="true" />}
            {t("settings_logout_row")}
          </button>
        </SettingRow>
      </div>

      {/* Danger zone */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold font-display text-loss flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" aria-hidden="true" />
          {t("settings_danger_zone")}
        </h3>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-loss/5 border border-loss/25">
          <div className="min-w-0">
            <p className="font-medium text-sm">{t("settings_delete_account")}</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{t("settings_delete_account_desc")}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowDelete(true)}
            className="shrink-0 text-sm font-semibold px-4 py-2 rounded-xl bg-loss/15 text-loss border border-loss/30 hover:bg-loss/25 transition-colors flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-loss/50"
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
            {t("settings_delete_account")}
          </button>
        </div>
      </section>

      <AnimatePresence>
        {showPassword && (
          <ChangePasswordModal
            onClose={() => setShowPassword(false)}
            onSuccess={(token) => {
              setToken(token);          // keep THIS device signed in
              setShowPassword(false);
              setPasswordDone(true);
            }}
          />
        )}
        {showDelete && (
          <ConfirmDialog
            destructive
            title={t("settings_delete_account")}
            body={t("settings_delete_account_desc")}
            confirmWord={t("settings_delete_confirm_word")}
            confirmPrompt={t("settings_delete_confirm_prompt")}
            requirePassword
            passwordPrompt={t("settings_delete_confirm_pwd")}
            submitLabel={t("settings_delete_submit")}
            onConfirm={handleDelete}
            onClose={() => setShowDelete(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
