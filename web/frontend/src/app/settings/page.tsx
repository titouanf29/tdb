"use client";

import { useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");

  const tabs = [
    { id: "profile", label: "Profil", icon: User },
    { id: "trading", label: "Trading", icon: Wallet },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "appearance", label: "Apparence", icon: Palette },
    { id: "security", label: "Sécurité", icon: Shield },
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
          Paramètres
        </h1>
        <p className="text-muted-foreground">
          Gérez vos préférences et votre compte
        </p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-48 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-4 py-2 rounded-lg text-left transition-all",
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
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Profil</h2>

      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
          <User className="w-10 h-10 text-white" />
        </div>
        <div>
          <p className="font-semibold">Connecté via Telegram</p>
          <p className="text-sm text-muted-foreground">@username</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Nom d'affichage</label>
          <input type="text" defaultValue="Trader" className="input w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Email (optionnel)</label>
          <input type="email" placeholder="email@example.com" className="input w-full" />
        </div>
      </div>

      <button className="btn-primary flex items-center gap-2">
        <Save className="w-4 h-4" />
        Sauvegarder
      </button>
    </div>
  );
}

function TradingSettings() {
  const [tradingStyle, setTradingStyle] = useState("day");
  const [riskLevel, setRiskLevel] = useState("moderate");

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Paramètres de Trading</h2>

      <div>
        <label className="block text-sm font-medium mb-2">Style de trading</label>
        <div className="grid grid-cols-3 gap-2">
          {["scalp", "day", "swing"].map((style) => (
            <button
              key={style}
              onClick={() => setTradingStyle(style)}
              className={cn(
                "p-3 rounded-lg text-center capitalize transition-all",
                tradingStyle === style
                  ? "bg-primary text-white"
                  : "bg-white/5 hover:bg-white/10"
              )}
            >
              {style}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Niveau de risque</label>
        <div className="grid grid-cols-4 gap-2">
          {[
            { id: "conservative", label: "Conservateur", emoji: "🐢" },
            { id: "moderate", label: "Modéré", emoji: "⚖️" },
            { id: "aggressive", label: "Agressif", emoji: "🔥" },
            { id: "very_aggressive", label: "Très Agressif", emoji: "⚡" },
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
        <label className="block text-sm font-medium mb-2">Levier par défaut</label>
        <select className="input w-full">
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
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Notifications</h2>

      <div className="space-y-4">
        {[
          { label: "Alertes de prix", description: "Quand un actif atteint votre prix cible" },
          { label: "Opportunités", description: "Nouvelles opportunités détectées par le scanner" },
          { label: "Positions", description: "Mise à jour de vos positions ouvertes" },
          { label: "Résumé quotidien", description: "Rapport quotidien de votre portfolio" },
        ].map((item) => (
          <div key={item.label} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
            <div>
              <p className="font-medium">{item.label}</p>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
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
        <label className="block text-sm font-medium mb-2">Thème</label>
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
              "p-4 rounded-xl border-2 transition-all flex items-center justify-center gap-2",
              theme === "light"
                ? "border-primary bg-primary/10"
                : "border-white/10 hover:border-white/20"
            )}
          >
            <Sun className="w-5 h-5" />
            Clair
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
      </div>
    </div>
  );
}

function SecuritySettings() {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Sécurité</h2>

      <div className="p-4 bg-profit/10 border border-profit/20 rounded-lg">
        <p className="text-sm text-profit">
          Votre compte est sécurisé via l'authentification Telegram
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
          <div>
            <p className="font-medium">Sessions actives</p>
            <p className="text-sm text-muted-foreground">Gérez vos connexions</p>
          </div>
          <button className="btn-ghost">Voir</button>
        </div>

        <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
          <div>
            <p className="font-medium">Exporter mes données</p>
            <p className="text-sm text-muted-foreground">Téléchargez vos données</p>
          </div>
          <button className="btn-ghost">Exporter</button>
        </div>

        <div className="flex items-center justify-between p-4 bg-loss/10 border border-loss/20 rounded-lg">
          <div>
            <p className="font-medium text-loss">Supprimer mon compte</p>
            <p className="text-sm text-muted-foreground">Action irréversible</p>
          </div>
          <button className="btn-ghost text-loss">Supprimer</button>
        </div>
      </div>
    </div>
  );
}
