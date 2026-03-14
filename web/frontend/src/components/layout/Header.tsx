"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Bell,
  Search,
  User,
  LogOut,
  Settings,
  ChevronDown,
  Wifi,
  WifiOff,
  Crown,
  Sparkles,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";
import { usePremium } from "@/lib/PremiumContext";

export function Header({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const { user, logout } = useAuth();
  const { isPremium, isAdmin } = usePremium();
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isConnected] = useState(true); // WebSocket connection status
  const [searchQuery, setSearchQuery] = useState("");

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/analysis?symbol=${searchQuery.toUpperCase()}`);
      setSearchQuery("");
    }
  };

  return (
    <header className="h-16 border-b border-white/10 bg-card/30 backdrop-blur-xl px-4 md:px-6 flex items-center justify-between gap-3">
      {/* Hamburger mobile */}
      <button
        onClick={onMenuToggle}
        className="lg:hidden p-2 rounded-lg hover:bg-white/5 transition-colors flex-shrink-0"
      >
        <Menu className="w-5 h-5 text-muted-foreground" />
      </button>

      {/* Search */}
      <form onSubmit={handleSearch} className="hidden sm:flex flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un actif... (ex: AAPL, BTC)"
            className="w-full input pl-10 py-2 text-sm"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-xs text-muted-foreground bg-secondary rounded">
            Enter
          </kbd>
        </div>
      </form>

      {/* Right side */}
      <div className="flex items-center gap-2 md:gap-4 ml-auto">
        {/* Connection status - hidden on mobile */}
        <div
          className={cn(
            "hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs",
            isConnected
              ? "bg-profit/10 text-profit"
              : "bg-loss/10 text-loss"
          )}
        >
          {isConnected ? (
            <>
              <Wifi className="w-3.5 h-3.5" />
              <span>Connecté</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5" />
              <span>Déconnecté</span>
            </>
          )}
        </div>

        {/* Status Badge - hidden on mobile */}
        {isAdmin ? (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs bg-gradient-to-r from-purple-600/20 to-pink-600/20 text-purple-400 border border-purple-500/30">
            <Crown className="w-3.5 h-3.5" />
            <span className="font-semibold">Admin</span>
          </div>
        ) : isPremium ? (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs bg-gradient-to-r from-yellow-600/20 to-orange-600/20 text-yellow-400 border border-yellow-500/30">
            <Crown className="w-3.5 h-3.5" />
            <span className="font-semibold">Premium</span>
          </div>
        ) : (
          <Link href="/premium">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs bg-white/5 text-muted-foreground border border-white/10 hover:bg-white/10 hover:border-yellow-500/30 hover:text-yellow-400 transition-all cursor-pointer">
              <User className="w-3.5 h-3.5" />
              <span className="font-semibold">FREE</span>
              <Sparkles className="w-3 h-3 text-yellow-500" />
            </div>
          </Link>
        )}

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <Bell className="w-5 h-5 text-muted-foreground" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
          </button>

          {showNotifications && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="absolute right-0 top-12 w-[calc(100vw-2rem)] sm:w-80 glass-card p-4 z-50"
            >
              <h3 className="font-semibold mb-3">Notifications</h3>
              <div className="space-y-3">
                <NotificationItem
                  title="Alerte BTC"
                  message="BTC a atteint 65,000$"
                  time="Il y a 5m"
                  type="alert"
                />
                <NotificationItem
                  title="Position fermée"
                  message="AAPL +2.5% (+$125)"
                  time="Il y a 15m"
                  type="success"
                />
                <NotificationItem
                  title="Nouveau signal"
                  message="NVDA score 85/100"
                  time="Il y a 1h"
                  type="info"
                />
              </div>
              <button className="w-full mt-3 text-sm text-primary hover:underline">
                Voir toutes les notifications
              </button>
            </motion.div>
          )}
        </div>

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
              <span className="text-white text-sm font-bold">
                {user?.username?.[0]?.toUpperCase() || user?.first_name?.[0]?.toUpperCase() || "U"}
              </span>
            </div>
            <span className="text-sm font-medium hidden sm:block">
              {user?.username || user?.first_name || "Trader"}
            </span>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </button>

          {showProfile && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="absolute right-0 top-12 w-48 glass-card p-2 z-50"
            >
              <div className="px-3 py-2 border-b border-white/10 mb-2">
                <p className="text-sm font-medium">{user?.username || user?.first_name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <Link href="/settings" onClick={() => setShowProfile(false)}>
                <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 text-sm">
                  <Settings className="w-4 h-4" />
                  Parametres
                </button>
              </Link>
              <hr className="my-2 border-white/10" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-loss/10 text-loss text-sm"
              >
                <LogOut className="w-4 h-4" />
                Deconnexion
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </header>
  );
}

function NotificationItem({
  title,
  message,
  time,
  type,
}: {
  title: string;
  message: string;
  time: string;
  type: "alert" | "success" | "info";
}) {
  const colors = {
    alert: "bg-warning/10 border-warning/30",
    success: "bg-profit/10 border-profit/30",
    info: "bg-primary/10 border-primary/30",
  };

  return (
    <div className={cn("p-3 rounded-lg border", colors[type])}>
      <div className="flex justify-between items-start">
        <h4 className="font-medium text-sm">{title}</h4>
        <span className="text-xs text-muted-foreground">{time}</span>
      </div>
      <p className="text-xs text-muted-foreground mt-1">{message}</p>
    </div>
  );
}
