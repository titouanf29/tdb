"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
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

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");

  const tabs = [
    { id: "profile", label: "Profil", icon: User },
    { id: "trading", label: "Trading", icon: Wallet },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "appearance", label: "Apparence", icon: Palette },
    { id: "security", label: "Securite", icon: Shield },
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
          Parametres
        </h1>
        <p className="text-muted-foreground">
          Gerez vos preferences et votre compte
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <div className="md:w-48 flex md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-left transition-all whitespace-nowrap",
                  activeTab === tab.id
                    ? "bg-primary/20 text-primary"
                    : "hover:bg-white/5 text-muted-foreground"
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 glass-card p-6">
          {activeTab === "profile" && <ProfileSettings />}
          {activeTab === "trading" && <TradingSettings />}
          {activeTab === "notifications" && <NotificationSettings />}
          {activeTab === "appearance" && <AppearanceSettings />}
          {activeTab === "security" && <SecuritySettings />}
        </div>
      </div>
    </motion.div>
  );
}

const LEVEL_OPTIONS: {
  id: TradingLevel;
  icon: React.ElementType;
  label: string;
  description: string;
  color: string;
}[] = [
  {
    id: "beginner",
    icon: GraduationCap,
    label: "Débutant",
    description: "Explications détaillées, parcours guidé, glossaire au survol",
    color: "border-emerald-500/50 bg-emerald-500/10 text-emerald-400",
  },
  {
    id: "intermediate",
    icon: TrendingUp,
    label: "Intermédiaire",
    description: "Infobulles concises, accès complet aux ressources pédagogiques",
    color: "border-blue-500/50 bg-blue-500/10 text-blue-400",
  },
  {
    id: "expert",
    icon: Zap,
    label: "Expert",
    description: "Interface épurée, pas d'explications basiques, expérience pro",
    color: "border-purple-500/50 bg-purple-500/10 text-purple-400",
  },
];

function ProfileSettings() {
  const { user, setTradingLevel } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [levelSaving, setLevelSaving] = useState(false);
  const [levelSaved, setLevelSaved] = useState(false);
  const [displayName, setDisplayName] = useState(user?.username || user?.first_name || "");

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  const handleLevelChange = async (level: TradingLevel) => {
    if (user?.trading_level === level) return;
    setLevelSaving(true);
    try {
      await setTradingLevel(level);
      setLevelSaved(true);
      setTimeout(() => setLevelSaved(false), 2000);
    } finally {
      setLevelSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Profil</h2>

      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
          <span className="text-3xl font-bold text-white">
            {user?.username?.[0]?.toUpperCase() || user?.first_name?.[0]?.toUpperCase() || "U"}
          </span>
        </div>
        <div>
          <p className="font-semibold">{user?.username || user?.first_name || "Utilisateur"}</p>
          <p className="text-sm text-muted-foreground">{user?.email || "Email non defini"}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Nom d'affichage</label>
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
        Sauvegarder
      </button>

      {/* Trading level */}
      <div className="pt-4 border-t border-white/10">
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-medium">Niveau de trading</label>
          <div className="flex items-center gap-2">
            {levelSaving && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
            {levelSaved && <span className="text-xs text-emerald-400 flex items-center gap-1"><Check className="w-3 h-3" /> Sauvegardé</span>}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Adapte l'interface et les explications à votre niveau.
        </p>
        <div className="space-y-2">
          {LEVEL_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isActive = user?.trading_level === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => handleLevelChange(opt.id)}
                disabled={levelSaving}
                className={cn(
                  "w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-3",
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
    </div>
  );
}

const TRADING_STYLES = [
  {
    id: "scalp",
    label: "Scalping",
    emoji: "⚡",
    horizon: "1 – 30 min",
    description: "Trades ultra-rapides sur micro-niveaux. L'IA se concentre sur le momentum court terme, les zones de liquidité et des stops très serrés (×0.4 ATR). R/R cible 1:1 – 1:1.5.",
  },
  {
    id: "day",
    label: "Day Trading",
    emoji: "📈",
    horizon: "Quelques heures",
    description: "Ouverture et clôture dans la même journée. Focus sur le range journalier, le VWAP et les niveaux pivot. Stops à 1×ATR. R/R cible 1:1.5 – 1:2.",
  },
  {
    id: "swing",
    label: "Swing Trading",
    emoji: "🔄",
    horizon: "2 – 10 jours",
    description: "Capture des tendances sur plusieurs jours. L'IA analyse les 4h/daily, les retracements Fibonacci et les pullbacks sur EMA. Stops à 1.5×ATR. R/R cible 1:2 – 1:3.",
  },
  {
    id: "long",
    label: "Long Terme",
    emoji: "🏦",
    horizon: "Semaines – mois",
    description: "Investissement fondamental. L'IA priorise les bilans, la croissance des revenus, le secteur et la macro. Les fondamentaux priment sur le technique. R/R cible 1:3 – 1:5+.",
  },
];

const RISK_LEVELS = [
  { id: "conservative", label: "Conservateur", emoji: "🐢", tip: "2-3% du portfolio max par position, actifs stables" },
  { id: "moderate",     label: "Modéré",       emoji: "⚖️", tip: "5% du portfolio par position, mix équilibré" },
  { id: "aggressive",   label: "Agressif",     emoji: "🔥", tip: "7-8% du portfolio, actifs plus volatils acceptés" },
  { id: "very_aggressive", label: "Très Agressif", emoji: "⚡", tip: "10%+ du portfolio, levier et haute volatilité" },
];

function TradingSettings() {
  const { settings, setCurrency, setTradingStyle, setRiskLevel, setDefaultLeverage } = useSettings();
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

  const activeStyle = TRADING_STYLES.find((s) => s.id === settings.tradingStyle);

  return (
    <div className="space-y-8">
      <h2 className="text-lg font-semibold">Paramètres de Trading</h2>

      {/* Currency */}
      <div>
        <label className="block text-sm font-medium mb-3">Devise d'affichage</label>
        <div className="grid grid-cols-2 gap-2">
          {[{ id: "EUR", label: "Euro", symbol: "€" }, { id: "USD", label: "Dollar US", symbol: "$" }].map((c) => (
            <button key={c.id} onClick={() => setCurrency(c.id as Currency)}
              className={cn("p-4 rounded-xl text-center transition-all flex items-center justify-center gap-3 border",
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
          <label className="text-sm font-medium">Style de trading</label>
          {saved === "style" && <span className="text-xs text-profit font-medium">✓ Sauvegardé</span>}
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Ce réglage adapte toutes les analyses IA à votre horizon et votre méthode — stops, R/R, indicateurs et langage changent selon votre style.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {TRADING_STYLES.map((style) => (
            <button key={style.id} onClick={() => handleStyle(style.id)}
              className={cn(
                "p-4 rounded-xl text-left transition-all border",
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
            <span className="font-semibold">{activeStyle.emoji} {activeStyle.label} activé</span>
            {" — "}Les analyses IA utilisent maintenant ce profil (horizon {activeStyle.horizon}, stops et R/R adaptés).
          </div>
        )}
      </div>

      {/* Risk Level */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium">Niveau de risque</label>
          {saved === "risk" && <span className="text-xs text-profit font-medium">✓ Sauvegardé</span>}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {RISK_LEVELS.map((level) => (
            <button key={level.id} onClick={() => handleRisk(level.id)}
              className={cn(
                "p-3 rounded-xl text-center transition-all border group relative",
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
        <label className="block text-sm font-medium mb-2">Levier par défaut</label>
        <select value={settings.defaultLeverage} onChange={(e) => setDefaultLeverage(e.target.value)} className="input w-full">
          <option value="1">1x (sans levier)</option>
          <option value="2">2x</option>
          <option value="5">5x</option>
          <option value="10">10x</option>
        </select>
      </div>
    </div>
  );
}

function NotificationSettings() {
  const [notifications, setNotifications] = useState({
    priceAlerts: true,
    opportunities: true,
    positions: true,
    dailySummary: false,
  });

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Notifications</h2>

      <div className="space-y-4">
        {[
          { key: "priceAlerts", label: "Alertes de prix", description: "Quand un actif atteint votre prix cible" },
          { key: "opportunities", label: "Opportunites", description: "Nouvelles opportunites detectees par le scanner" },
          { key: "positions", label: "Positions", description: "Mise a jour de vos positions ouvertes" },
          { key: "dailySummary", label: "Resume quotidien", description: "Rapport quotidien de votre portfolio" },
        ].map((item) => (
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

  return (
    <div className="space-y-8">
      <h2 className="text-lg font-semibold">Apparence</h2>

      {/* Theme */}
      <div>
        <label className="block text-sm font-medium mb-3">Thème de l'interface</label>
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
              <p className="font-medium">Sombre</p>
              <p className="text-xs text-muted-foreground">Mode nuit, idéal pour le trading</p>
            </div>
            {settings.theme === "dark" && (
              <span className="text-xs text-primary font-medium">✓ Actif</span>
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
              <p className="font-medium">Clair</p>
              <p className="text-xs text-muted-foreground">Mode jour, interface lumineuse</p>
            </div>
            {settings.theme === "light" && (
              <span className="text-xs text-primary font-medium">✓ Actif</span>
            )}
          </button>
        </div>
      </div>

      {/* Accent Color */}
      <div>
        <label className="block text-sm font-medium mb-3">Couleur d'accent</label>
        <p className="text-xs text-muted-foreground mb-4">
          Personnalise les boutons, bordures actives et éléments interactifs.
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
        Les changements s'appliquent immédiatement et sont sauvegardés automatiquement.
      </div>
    </div>
  );
}

function SecuritySettings() {
  const { logout } = useAuth();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    router.push("/login");
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Securite</h2>

      <div className="p-4 bg-profit/10 border border-profit/20 rounded-lg">
        <p className="text-sm text-profit">
          Votre compte est securise avec authentification email/mot de passe
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
          <div>
            <p className="font-medium">Changer le mot de passe</p>
            <p className="text-sm text-muted-foreground">Mettez a jour votre mot de passe</p>
          </div>
          <button className="btn-ghost">Modifier</button>
        </div>

        <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
          <div>
            <p className="font-medium">Exporter mes donnees</p>
            <p className="text-sm text-muted-foreground">Telechargez vos donnees de trading</p>
          </div>
          <button className="btn-ghost">Exporter</button>
        </div>

        <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
          <div>
            <p className="font-medium">Deconnexion</p>
            <p className="text-sm text-muted-foreground">Se deconnecter de ce compte</p>
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
            Deconnexion
          </button>
        </div>
      </div>
    </div>
  );
}
