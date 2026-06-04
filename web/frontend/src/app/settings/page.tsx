"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings,
  User,
  Bell,
  Palette,
  Shield,
  Wallet,
  Save,
  Moon,
  Sun,
  LogOut,
  Loader2,
  GraduationCap,
  TrendingUp,
  Zap,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";
import { TradingLevel } from "@/lib/auth";
import { useSettings, Currency, ACCENT_PRESETS, AccentColor } from "@/lib/SettingsContext";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { useLanguage } from "@/lib/LanguageContext";
import { LevelChangeModal } from "@/components/onboarding/LevelChangeModal";
import { OnboardingTour, TOUR_KEY } from "@/components/OnboardingTour";
import { useAlexStore } from "@/stores/alex-store";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const { t, lang } = useLanguage();

  const tabs = [
    { id: "profile",       label: t("settings_tab_profile"),  icon: User },
    { id: "trading",       label: t("settings_tab_trading"),  icon: Wallet },
    { id: "notifications", label: t("settings_tab_notif"),    icon: Bell },
    { id: "appearance",    label: t("settings_tab_appear"),   icon: Palette },
    { id: "security",      label: t("settings_tab_security"), icon: Shield },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="w-6 h-6" />
          {t("settings_title")}
        </h1>
        <p className="text-muted-foreground">
          {t("settings_subtitle")}
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <div className="md:w-48 flex md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0">
          {tabs.map((tab, i) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06, duration: 0.3 }}
                whileHover={{ x: 2 }}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-left transition-all whitespace-nowrap relative",
                  isActive
                    ? "bg-primary/20 text-primary"
                    : "hover:bg-white/5 text-muted-foreground"
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {isActive && (
                  <motion.div
                    layoutId="settings-active"
                    className="absolute inset-0 bg-primary/20 rounded-lg -z-10"
                  />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Content — animated on tab switch */}
        <div className="flex-1 glass-card-hover p-6 overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === "profile" && <ProfileSettings />}
              {activeTab === "trading" && <TradingSettings />}
              {activeTab === "notifications" && <NotificationSettings />}
              {activeTab === "appearance" && <AppearanceSettings />}
              {activeTab === "security" && <SecuritySettings />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

function getLevelOptions(lang: string): {
  id: TradingLevel;
  icon: React.ElementType;
  label: string;
  description: string;
  color: string;
}[] {
  return [
    {
      id: "beginner",
      icon: GraduationCap,
      label: lang === "en" ? "Beginner" : "Débutant",
      description: lang === "en"
        ? "Detailed explanations, guided path, glossary on hover"
        : "Explications détaillées, parcours guidé, glossaire au survol",
      color: "border-emerald-500/50 bg-emerald-500/10 text-emerald-400",
    },
    {
      id: "intermediate",
      icon: TrendingUp,
      label: lang === "en" ? "Intermediate" : "Intermédiaire",
      description: lang === "en"
        ? "Concise tooltips, full access to educational resources"
        : "Infobulles concises, accès complet aux ressources pédagogiques",
      color: "border-blue-500/50 bg-blue-500/10 text-blue-400",
    },
    {
      id: "expert",
      icon: Zap,
      label: lang === "en" ? "Expert" : "Expert",
      description: lang === "en"
        ? "Clean interface, no basic explanations, professional experience"
        : "Interface épurée, pas d'explications basiques, expérience pro",
      color: "border-purple-500/50 bg-purple-500/10 text-purple-400",
    },
  ];
}

function ProfileSettings() {
  const { user, setTradingLevel } = useAuth();
  const { t, lang } = useLanguage();
  const [isSaving, setIsSaving] = useState(false);
  const [levelSaving, setLevelSaving] = useState(false);
  const [levelSaved, setLevelSaved] = useState(false);
  const [displayName, setDisplayName] = useState(user?.username || user?.first_name || "");
  const [levelChangeFrom, setLevelChangeFrom] = useState<TradingLevel | null>(null);
  const [levelChangeTo, setLevelChangeTo] = useState<TradingLevel | null>(null);
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [forceTourLevel, setForceTourLevel] = useState<TradingLevel | null>(null);
  const { openPanel } = useAlexStore();

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  const handleLevelChange = async (level: TradingLevel) => {
    if (user?.trading_level === level) return;
    const from = (user?.trading_level ?? "beginner") as TradingLevel;
    setLevelSaving(true);
    try {
      await setTradingLevel(level);
      setLevelChangeFrom(from);
      setLevelChangeTo(level);
      setLevelSaved(true);
      setTimeout(() => setLevelSaved(false), 2000);
      setShowLevelModal(true);
    } finally {
      setLevelSaving(false);
    }
  };

  const levelOptions = getLevelOptions(lang);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">{t("settings_profile_title")}</h2>

      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
          <span className="text-3xl font-bold text-white">
            {user?.username?.[0]?.toUpperCase() || user?.first_name?.[0]?.toUpperCase() || "U"}
          </span>
        </div>
        <div>
          <p className="font-semibold">{user?.username || user?.first_name || t("settings_user_default")}</p>
          <p className="text-sm text-muted-foreground">{user?.email || t("settings_email_undefined")}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">{t("settings_display_name")}</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="input w-full"
          />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={isSaving}
        className="btn-primary flex items-center gap-2 disabled:opacity-50"
      >
        {isSaving ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Save className="w-4 h-4" />
        )}
        {t("settings_save")}
      </button>

      {/* Trading level */}
      <div className="pt-4 border-t border-white/10">
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-medium">{t("settings_level")}</label>
          <div className="flex items-center gap-2">
            {levelSaving && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
            {levelSaved && <span className="text-xs text-emerald-400 flex items-center gap-1"><Check className="w-3 h-3" /> {t("settings_saved")}</span>}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          {t("settings_level_desc")}
        </p>
        <div className="space-y-2">
          {levelOptions.map((opt) => {
            const Icon = opt.icon;
            const isActive = user?.trading_level === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => handleLevelChange(opt.id)}
                disabled={levelSaving}
                className={cn(
                  "w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-3 hover-lift",
                  isActive ? opt.color : "border-white/10 bg-white/5 hover:bg-white/10"
                )}
              >
                <Icon className={cn("w-5 h-5 shrink-0", isActive ? "" : "text-muted-foreground")} />
                <div className="flex-1">
                  <p className="font-medium text-sm">{opt.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                </div>
                {isActive && <Check className="w-4 h-4 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Level change modal */}
      <AnimatePresence>
        {showLevelModal && levelChangeFrom && levelChangeTo && (
          <LevelChangeModal
            fromLevel={levelChangeFrom}
            toLevel={levelChangeTo}
            lang={lang as "fr" | "en"}
            onClose={() => setShowLevelModal(false)}
            onStartBeginnerAssistant={() => {
              localStorage.removeItem(TOUR_KEY);
              openPanel();
              setShowLevelModal(false);
            }}
            onStartTour={(level) => {
              setForceTourLevel(level);
              setShowLevelModal(false);
            }}
          />
        )}
      </AnimatePresence>
      <OnboardingTour
        forceLevel={forceTourLevel}
        onTourDone={() => setForceTourLevel(null)}
      />
    </div>
  );
}

function getTradingStyles(lang: string) {
  return [
    {
      id: "scalp",
      label: "Scalping",
      emoji: "⚡",
      horizon: lang === "en" ? "1 – 30 min" : "1 – 30 min",
      description: lang === "en"
        ? "Ultra-fast trades on micro levels. AI focuses on short-term momentum, liquidity zones and very tight stops (×0.4 ATR). Target R/R 1:1 – 1:1.5."
        : "Trades ultra-rapides sur micro-niveaux. L'IA se concentre sur le momentum court terme, les zones de liquidité et des stops très serrés (×0.4 ATR). R/R cible 1:1 – 1:1.5.",
    },
    {
      id: "day",
      label: "Day Trading",
      emoji: "📈",
      horizon: lang === "en" ? "A few hours" : "Quelques heures",
      description: lang === "en"
        ? "Open and close within the same day. Focus on daily range, VWAP and pivot levels. Stops at 1×ATR. Target R/R 1:1.5 – 1:2."
        : "Ouverture et clôture dans la même journée. Focus sur le range journalier, le VWAP et les niveaux pivot. Stops à 1×ATR. R/R cible 1:1.5 – 1:2.",
    },
    {
      id: "swing",
      label: "Swing Trading",
      emoji: "🔄",
      horizon: lang === "en" ? "2 – 10 days" : "2 – 10 jours",
      description: lang === "en"
        ? "Capturing trends over several days. AI analyses 4h/daily charts, Fibonacci retracements and EMA pullbacks. Stops at 1.5×ATR. Target R/R 1:2 – 1:3."
        : "Capture des tendances sur plusieurs jours. L'IA analyse les 4h/daily, les retracements Fibonacci et les pullbacks sur EMA. Stops à 1.5×ATR. R/R cible 1:2 – 1:3.",
    },
    {
      id: "long",
      label: lang === "en" ? "Long Term" : "Long Terme",
      emoji: "🏦",
      horizon: lang === "en" ? "Weeks – months" : "Semaines – mois",
      description: lang === "en"
        ? "Fundamental investing. AI prioritizes balance sheets, revenue growth, sector and macro. Fundamentals take precedence over technicals. Target R/R 1:3 – 1:5+."
        : "Investissement fondamental. L'IA priorise les bilans, la croissance des revenus, le secteur et la macro. Les fondamentaux priment sur le technique. R/R cible 1:3 – 1:5+.",
    },
  ];
}

function getRiskLevels(lang: string) {
  return [
    { id: "conservative", label: lang === "en" ? "Conservative" : "Conservateur", emoji: "🐢", tip: lang === "en" ? "Max 2-3% of portfolio per position, stable assets" : "2-3% du portfolio max par position, actifs stables" },
    { id: "moderate",     label: lang === "en" ? "Moderate" : "Modéré",           emoji: "⚖️", tip: lang === "en" ? "5% of portfolio per position, balanced mix" : "5% du portfolio par position, mix équilibré" },
    { id: "aggressive",   label: lang === "en" ? "Aggressive" : "Agressif",       emoji: "🔥", tip: lang === "en" ? "7-8% of portfolio, more volatile assets accepted" : "7-8% du portfolio, actifs plus volatils acceptés" },
    { id: "very_aggressive", label: lang === "en" ? "Very Aggressive" : "Très Agressif", emoji: "⚡", tip: lang === "en" ? "10%+ of portfolio, leverage and high volatility" : "10%+ du portfolio, levier et haute volatilité" },
  ];
}

function TradingSettings() {
  const { settings, setCurrency, setTradingStyle, setRiskLevel, setDefaultLeverage } = useSettings();
  const { t, lang } = useLanguage();
  const [saved, setSaved] = useState<string | null>(null);

  const handleStyle = (id: string) => {
    setTradingStyle(id);
    setSaved("style");
    setTimeout(() => setSaved(null), 1800);
  };
  const handleRisk = (id: string) => {
    setRiskLevel(id);
    setSaved("risk");
    setTimeout(() => setSaved(null), 1800);
  };

  const tradingStyles = getTradingStyles(lang);
  const riskLevels = getRiskLevels(lang);
  const activeStyle = tradingStyles.find((s) => s.id === settings.tradingStyle);

  return (
    <div className="space-y-8">
      <h2 className="text-lg font-semibold">{t("settings_trading_title")}</h2>

      {/* Currency */}
      <div>
        <label className="block text-sm font-medium mb-3">{t("settings_currency")}</label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: "EUR", label: lang === "en" ? "Euro" : "Euro", symbol: "€" },
            { id: "USD", label: lang === "en" ? "US Dollar" : "Dollar US", symbol: "$" },
          ].map((c) => (
            <button key={c.id} onClick={() => setCurrency(c.id as Currency)}
              className={cn("p-4 rounded-xl text-center transition-all flex items-center justify-center gap-3 border hover-lift",
                settings.currency === c.id ? "bg-primary text-white border-primary" : "bg-white/5 hover:bg-white/10 border-white/10"
              )}>
              <span className="text-2xl font-bold">{c.symbol}</span>
              <span className="font-medium">{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Trading Style */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium">{t("settings_trading_style_label")}</label>
          {saved === "style" && <span className="text-xs text-profit font-medium">✓ {t("settings_saved")}</span>}
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          {t("settings_trading_style_desc")}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {tradingStyles.map((style) => (
            <button key={style.id} onClick={() => handleStyle(style.id)}
              className={cn(
                "p-4 rounded-xl text-left transition-all border hover-lift",
                settings.tradingStyle === style.id
                  ? "bg-primary/15 border-primary"
                  : "bg-white/5 hover:bg-white/10 border-white/10"
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{style.emoji}</span>
                <span className="font-semibold">{style.label}</span>
                <span className="ml-auto text-[10px] text-muted-foreground bg-white/10 px-2 py-0.5 rounded-full">{style.horizon}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{style.description}</p>
            </button>
          ))}
        </div>

        {/* Active style preview */}
        {activeStyle && (
          <div className="mt-3 p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs text-primary/80">
            <span className="font-semibold">{activeStyle.emoji} {activeStyle.label} {t("settings_style_active_suffix")}</span>
            {lang === "en"
              ? <> — AI analyses now use this profile (horizon {activeStyle.horizon}, stops and R/R adapted).</>
              : <> — Les analyses IA utilisent maintenant ce profil (horizon {activeStyle.horizon}, stops et R/R adaptés).</>
            }
          </div>
        )}
      </div>

      {/* Risk Level */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium">{t("settings_risk_level_label")}</label>
          {saved === "risk" && <span className="text-xs text-profit font-medium">✓ {t("settings_saved")}</span>}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {riskLevels.map((level) => (
            <button key={level.id} onClick={() => handleRisk(level.id)}
              className={cn(
                "p-3 rounded-xl text-center transition-all border group relative hover-lift",
                settings.riskLevel === level.id
                  ? "bg-primary/15 border-primary"
                  : "bg-white/5 hover:bg-white/10 border-white/10"
              )}
            >
              <span className="text-xl mb-1 block">{level.emoji}</span>
              <span className="text-xs font-medium block">{level.label}</span>
              <span className="text-[10px] text-muted-foreground mt-1 block leading-tight">{level.tip}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Default Leverage */}
      <div>
        <label className="block text-sm font-medium mb-2">{t("settings_leverage_label")}</label>
        <select value={settings.defaultLeverage} onChange={(e) => setDefaultLeverage(e.target.value)} className="input w-full">
          <option value="1">{lang === "en" ? "1x (no leverage)" : "1x (sans levier)"}</option>
          <option value="2">2x</option>
          <option value="5">5x</option>
          <option value="10">10x</option>
        </select>
      </div>
    </div>
  );
}

function NotificationSettings() {
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState({
    priceAlerts: true,
    opportunities: true,
    positions: true,
    dailySummary: false,
  });

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const notifItems = [
    { key: "priceAlerts",   label: t("settings_notif_price_alerts"),    description: t("settings_notif_price_alerts_desc") },
    { key: "opportunities", label: t("settings_notif_opportunities"),   description: t("settings_notif_opportunities_desc") },
    { key: "positions",     label: t("settings_notif_positions"),       description: t("settings_notif_positions_desc") },
    { key: "dailySummary",  label: t("settings_notif_daily"),           description: t("settings_notif_daily_desc") },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">{t("settings_notif_title")}</h2>

      <div className="space-y-4">
        {notifItems.map((item) => (
          <div key={item.key} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
            <div>
              <p className="font-medium">{item.label}</p>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notifications[item.key as keyof typeof notifications]}
                onChange={() => toggleNotification(item.key as keyof typeof notifications)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}

function AppearanceSettings() {
  const { settings, setTheme, setAccentColor } = useSettings();
  const { t, lang } = useLanguage();

  return (
    <div className="space-y-8">
      <h2 className="text-lg font-semibold">{t("settings_tab_appear")}</h2>

      {/* Theme */}
      <div>
        <label className="block text-sm font-medium mb-3">{t("settings_theme")}</label>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setTheme("dark")}
            className={cn(
              "p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-3",
              settings.theme === "dark"
                ? "border-primary bg-primary/10"
                : "border-white/10 hover:border-white/20 bg-white/5"
            )}
          >
            <div className="w-full h-16 rounded-lg bg-gray-900 border border-white/10 flex items-center justify-center">
              <Moon className="w-6 h-6 text-white/70" />
            </div>
            <div className="text-center">
              <p className="font-medium">{t("settings_theme_dark")}</p>
              <p className="text-xs text-muted-foreground">{t("settings_theme_dark_desc")}</p>
            </div>
            {settings.theme === "dark" && (
              <span className="text-xs text-primary font-medium">✓ {t("settings_active")}</span>
            )}
          </button>

          <button
            onClick={() => setTheme("light")}
            className={cn(
              "p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-3",
              settings.theme === "light"
                ? "border-primary bg-primary/10"
                : "border-white/10 hover:border-white/20 bg-white/5"
            )}
          >
            <div className="w-full h-16 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
              <Sun className="w-6 h-6 text-gray-600" />
            </div>
            <div className="text-center">
              <p className="font-medium">{t("settings_theme_light")}</p>
              <p className="text-xs text-muted-foreground">{t("settings_theme_light_desc")}</p>
            </div>
            {settings.theme === "light" && (
              <span className="text-xs text-primary font-medium">✓ {t("settings_active")}</span>
            )}
          </button>
        </div>
      </div>

      {/* Language */}
      <div>
        <label className="block text-sm font-medium mb-3">{t("settings_language")}</label>
        <LanguageToggle variant="pill" />
      </div>

      {/* Accent Color */}
      <div>
        <label className="block text-sm font-medium mb-3">{t("settings_accent")}</label>
        <p className="text-xs text-muted-foreground mb-4">
          {t("settings_accent_desc")}
        </p>
        <div className="grid grid-cols-5 gap-3">
          {(Object.entries(ACCENT_PRESETS) as [AccentColor, typeof ACCENT_PRESETS[AccentColor]][]).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => setAccentColor(key)}
              className={cn(
                "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all",
                settings.accentColor === key
                  ? "border-current scale-105 shadow-lg"
                  : "border-white/10 hover:border-white/30"
              )}
              style={{ borderColor: settings.accentColor === key ? preset.hex : undefined }}
            >
              <div
                className="w-8 h-8 rounded-full shadow-md"
                style={{ backgroundColor: preset.hex, boxShadow: `0 0 12px ${preset.hex}60` }}
              />
              <span className="text-xs font-medium">{preset.label}</span>
              {settings.accentColor === key && (
                <span className="text-[10px] font-bold" style={{ color: preset.hex }}>✓</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-primary/80">
        {t("settings_changes_auto")}
      </div>
    </div>
  );
}

function SecuritySettings() {
  const { logout } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    router.push("/login");
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">{t("settings_security_title")}</h2>

      <div className="p-4 bg-profit/10 border border-profit/20 rounded-lg">
        <p className="text-sm text-profit">
          {t("settings_security_info")}
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
          <div>
            <p className="font-medium">{t("settings_change_password")}</p>
            <p className="text-sm text-muted-foreground">{t("settings_change_password_desc")}</p>
          </div>
          <button className="btn-ghost">{t("settings_change_btn")}</button>
        </div>

        <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
          <div>
            <p className="font-medium">{t("settings_export_data")}</p>
            <p className="text-sm text-muted-foreground">{t("settings_export_data_desc")}</p>
          </div>
          <button className="btn-ghost">{t("settings_export_btn")}</button>
        </div>

        <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
          <div>
            <p className="font-medium">{t("settings_logout_row")}</p>
            <p className="text-sm text-muted-foreground">{t("settings_logout_desc")}</p>
          </div>
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="btn-ghost text-loss flex items-center gap-2"
          >
            {isLoggingOut ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LogOut className="w-4 h-4" />
            )}
            {t("settings_logout_row")}
          </button>
        </div>
      </div>
    </div>
  );
}
