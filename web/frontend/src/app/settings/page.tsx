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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";

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

function ProfileSettings() {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [displayName, setDisplayName] = useState(user?.username || user?.first_name || "");

  const handleSave = async () => {
    setIsSaving(true);
    // TODO: Implement save to backend
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
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
    </div>
  );
}

function TradingSettings() {
  const [tradingStyle, setTradingStyle] = useState("day");
  const [riskLevel, setRiskLevel] = useState("moderate");
  const [defaultLeverage, setDefaultLeverage] = useState("1");

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Parametres de Trading</h2>

      <div>
        <label className="block text-sm font-medium mb-2">Style de trading</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: "scalp", label: "Scalping" },
            { id: "day", label: "Day Trading" },
            { id: "swing", label: "Swing" },
          ].map((style) => (
            <button
              key={style.id}
              onClick={() => setTradingStyle(style.id)}
              className={cn(
                "p-3 rounded-lg text-center transition-all",
                tradingStyle === style.id
                  ? "bg-primary text-white"
                  : "bg-white/5 hover:bg-white/10"
              )}
            >
              {style.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Niveau de risque</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { id: "conservative", label: "Conservateur", emoji: "🐢" },
            { id: "moderate", label: "Modere", emoji: "⚖️" },
            { id: "aggressive", label: "Agressif", emoji: "🔥" },
            { id: "very_aggressive", label: "Tres Agressif", emoji: "⚡" },
          ].map((level) => (
            <button
              key={level.id}
              onClick={() => setRiskLevel(level.id)}
              className={cn(
                "p-3 rounded-lg text-center transition-all",
                riskLevel === level.id
                  ? "bg-primary text-white"
                  : "bg-white/5 hover:bg-white/10"
              )}
            >
              <span className="text-xl mb-1 block">{level.emoji}</span>
              <span className="text-xs">{level.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Levier par defaut</label>
        <select
          value={defaultLeverage}
          onChange={(e) => setDefaultLeverage(e.target.value)}
          className="input w-full"
        >
          <option value="1">1x (pas de levier)</option>
          <option value="2">2x</option>
          <option value="5">5x</option>
          <option value="10">10x</option>
        </select>
      </div>

      <button className="btn-primary flex items-center gap-2">
        <Save className="w-4 h-4" />
        Sauvegarder
      </button>
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
  const [theme, setTheme] = useState("dark");

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Apparence</h2>

      <div>
        <label className="block text-sm font-medium mb-2">Theme</label>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setTheme("dark")}
            className={cn(
              "p-4 rounded-xl border-2 transition-all flex items-center justify-center gap-2",
              theme === "dark"
                ? "border-primary bg-primary/10"
                : "border-white/10 hover:border-white/20"
            )}
          >
            <Moon className="w-5 h-5" />
            Sombre
          </button>
          <button
            onClick={() => setTheme("light")}
            className={cn(
              "p-4 rounded-xl border-2 transition-all flex items-center justify-center gap-2 opacity-50 cursor-not-allowed",
              theme === "light"
                ? "border-primary bg-primary/10"
                : "border-white/10"
            )}
            disabled
          >
            <Sun className="w-5 h-5" />
            Clair (bientot)
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Couleur d'accent</label>
        <div className="flex gap-2">
          {["#6366f1", "#8b5cf6", "#ec4899", "#14b8a6", "#f59e0b"].map((color) => (
            <button
              key={color}
              className="w-10 h-10 rounded-lg border-2 border-white/20 hover:border-white/50 transition-all"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">Bientot disponible</p>
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
