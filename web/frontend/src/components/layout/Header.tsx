"use client";

import { useState, useEffect, useRef } from "react";
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
  UserPlus,
  Ticket,
  Check,
  CheckCheck,
  Home,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";
import { usePremium } from "@/lib/PremiumContext";
import { adminAPI, communityAPI, AdminNotification, UserNotification } from "@/lib/api";
import { useLanguage } from "@/lib/LanguageContext";
import { LanguageToggle } from "@/components/ui/LanguageToggle";

const NOTIF_ICONS: Record<string, React.ReactNode> = {
  new_user: <UserPlus className="w-3.5 h-3.5 text-profit" />,
  premium_request: <Crown className="w-3.5 h-3.5 text-yellow-400" />,
  new_ticket: <Ticket className="w-3.5 h-3.5 text-primary" />,
  ticket_reply: <Ticket className="w-3.5 h-3.5 text-primary" />,
};

const NOTIF_COLORS: Record<string, string> = {
  new_user: "bg-profit/10 border-profit/20",
  premium_request: "bg-yellow-500/10 border-yellow-500/20",
  new_ticket: "bg-primary/10 border-primary/20",
  ticket_reply: "bg-primary/10 border-primary/20",
};

export function Header({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const { t, lang } = useLanguage();
  const { user, logout } = useAuth();
  const { isPremium, isAdmin } = usePremium();
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isConnected] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [userNotifications, setUserNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const loadNotifications = async () => {
    if (!isAdmin) return;
    try {
      const data = await adminAPI.getNotifications();
      setNotifications(prev => {
        const same = prev.length === data.notifications.length &&
          prev.every((n, i) => n.id === data.notifications[i]?.id && n.is_read === data.notifications[i]?.is_read);
        return same ? prev : data.notifications;
      });
      setUnreadCount(c => c === data.unread_count ? c : data.unread_count);
    } catch {}
  };

  const loadUserNotifications = async () => {
    if (isAdmin) return;
    try {
      const data = await communityAPI.getNotifications();
      setUserNotifications(prev => {
        const same = prev.length === data.notifications.length &&
          prev.every((n, i) => n.id === data.notifications[i]?.id && n.is_read === data.notifications[i]?.is_read);
        return same ? prev : data.notifications;
      });
      setUnreadCount(c => c === data.unread_count ? c : data.unread_count);
    } catch {}
  };

  useEffect(() => {
    if (!isAdmin) return;
    loadNotifications();
    pollRef.current = setInterval(loadNotifications, 30000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin || !user) return;
    loadUserNotifications();
    pollRef.current = setInterval(loadUserNotifications, 30000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [isAdmin, user]);

  const handleMarkRead = async (id: number) => {
    if (isAdmin) {
      await adminAPI.markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: 1 } : n));
    } else {
      await communityAPI.markNotificationRead(id);
      setUserNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: 1 } : n));
    }
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const handleMarkAllRead = async () => {
    if (isAdmin) {
      await adminAPI.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    } else {
      await communityAPI.markAllNotificationsRead();
      setUserNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    }
    setUnreadCount(0);
  };

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
    <header className="h-16 border-b border-white/10 bg-card/30 backdrop-blur-xl px-4 md:px-6 flex items-center justify-between gap-3 relative z-50">
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
            placeholder={t("header_search_ph")}
            className="w-full input pl-10 py-2 text-sm"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-xs text-muted-foreground bg-secondary rounded">
            Enter
          </kbd>
        </div>
      </form>

      {/* Right side */}
      <div className="flex items-center gap-2 md:gap-4 ml-auto">
        {/* Home / Landing page link */}
        <Link
          href="/"
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          title={t("header_home")}
        >
          <Home className="w-3.5 h-3.5" />
          <span>{t("header_home")}</span>
        </Link>
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
              <span>{t("header_connected")}</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5" />
              <span>{t("header_disconnected")}</span>
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

        {/* Language toggle */}
        <LanguageToggle variant="compact" className="hidden sm:flex" />

        {/* Notifications (admin + regular users with unread) */}
        {(isAdmin || (!isAdmin && (unreadCount > 0 || userNotifications.length > 0))) && (
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                if (!showNotifications) {
                  if (isAdmin) loadNotifications();
                  else loadUserNotifications();
                }
              }}
              className="relative p-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <Bell className="w-5 h-5 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-0.5 bg-loss rounded-full flex items-center justify-center text-[10px] font-bold text-white animate-pulse">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="absolute right-0 top-12 w-[calc(100vw-2rem)] sm:w-96 glass-card p-4 z-[200]"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">{t("header_notif_title")}</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      {t("header_notif_mark_all")}
                    </button>
                  )}
                </div>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {(isAdmin ? notifications : userNotifications).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">{t("header_notif_empty")}</p>
                  ) : (
                    (isAdmin ? notifications : userNotifications).slice(0, 20).map((n) => (
                      <div
                        key={n.id}
                        className={cn(
                          "flex items-start gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer",
                          NOTIF_COLORS[n.type] || "bg-white/5 border-white/10",
                          n.is_read ? "opacity-60" : "opacity-100"
                        )}
                        onClick={() => {
                          if (!n.is_read) handleMarkRead(n.id);
                          if (n.link) router.push(n.link);
                          setShowNotifications(false);
                        }}
                      >
                        <div className="mt-0.5 flex-shrink-0">
                          {NOTIF_ICONS[n.type] || <Bell className="w-3.5 h-3.5 text-muted-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold">{n.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{n.message}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {new Date(n.created_at).toLocaleString(lang === "en" ? "en-US" : "fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        {!n.is_read && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleMarkRead(n.id); }}
                            className="flex-shrink-0 p-1 hover:bg-white/10 rounded"
                          >
                            <Check className="w-3 h-3 text-muted-foreground" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
                <Link
                  href={isAdmin ? "/admin?tab=users" : "/support"}
                  onClick={() => setShowNotifications(false)}
                >
                  <button className="w-full mt-3 text-xs text-primary hover:underline">
                    {isAdmin ? t("header_notif_goto") : "Voir mes tickets"}
                  </button>
                </Link>
              </motion.div>
            )}
          </div>
        )}

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
              className="absolute right-0 top-12 w-48 glass-card p-2 z-[200]"
            >
              <div className="px-3 py-2 border-b border-white/10 mb-2">
                <p className="text-sm font-medium">{user?.username || user?.first_name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <Link href="/settings" onClick={() => setShowProfile(false)}>
                <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 text-sm">
                  <Settings className="w-4 h-4" />
                  {t("header_settings")}
                </button>
              </Link>
              <hr className="my-2 border-white/10" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-loss/10 text-loss text-sm"
              >
                <LogOut className="w-4 h-4" />
                {t("header_logout")}
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </header>
  );
}

