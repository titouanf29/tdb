"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  TrendingUp,
  Wallet,
  Star,
  ScanLine,
  Settings,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Globe,
  Shield,
  Wrench,
  Users,
  Bot,
} from "lucide-react";

function CaptenIcon() {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
      {/* Corps inspiré Twitch : rectangle arrondi avec encoche en bas à droite */}
      <path
        d="M4 4 H36 V28 H24 L20 34 L16 28 H4 Z"
        fill="url(#capten-gradient)"
        rx="4"
      />
      <defs>
        <linearGradient id="capten-gradient" x1="4" y1="4" x2="36" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>
      {/* Chapeau de capitaine */}
      <rect x="11" y="9" width="18" height="3" rx="1.5" fill="white" opacity="0.95" />
      <path d="M15 9 L20 3 L25 9 Z" fill="white" opacity="0.95" />
      {/* Yeux */}
      <rect x="12" y="16" width="5" height="5" rx="1" fill="white" />
      <rect x="23" y="16" width="5" height="5" rx="1" fill="white" />
    </svg>
  );
}
import { cn } from "@/lib/utils";
import { adminAPI } from "@/lib/api";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: Globe, label: "Marchés", href: "/markets" },
  { icon: TrendingUp, label: "Trading", href: "/trading" },
  { icon: Wallet, label: "Wallet", href: "/wallet" },
  { icon: Star, label: "Favoris", href: "/favorites" },
  { icon: ScanLine, label: "Scanner", href: "/scanner" },
  { icon: BarChart3, label: "Analyse", href: "/analysis" },
  { icon: Wrench, label: "Outils", href: "/tools" },
  { icon: Bot, label: "Assistant IA", href: "/assistant" },
  { icon: Users, label: "Communaute", href: "/community" },
  { icon: Settings, label: "Paramètres", href: "/settings" },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const result = await adminAPI.checkAdmin();
        setIsAdmin(result.is_admin);
      } catch {
        setIsAdmin(false);
      }
    };
    checkAdminStatus();
  }, []);

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 80 : 260 }}
      className="h-screen bg-card/50 backdrop-blur-xl border-r border-white/10 flex flex-col"
    >
      {/* Logo */}
      <div className="p-4 flex items-center gap-3 border-b border-white/10">
        <motion.div
          whileHover={{ scale: 1.1 }}
          className="flex items-center justify-center"
        >
          <CaptenIcon />
        </motion.div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
            >
              <h1 className="font-bold text-xl gradient-text">CaptenTDB</h1>
              <p className="text-xs text-muted-foreground">par CaptenQwark</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto no-scrollbar">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                  isActive
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "w-5 h-5 transition-colors",
                    isActive && "text-primary"
                  )}
                />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="font-medium text-sm"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {isActive && !collapsed && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
                  />
                )}
              </motion.div>
            </Link>
          );
        })}

        {/* Admin link - only visible to admins */}
        {isAdmin && (
          <Link href="/admin">
            <motion.div
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group mt-4 border border-yellow-500/30",
                pathname === "/admin"
                  ? "bg-yellow-500/20 text-yellow-500"
                  : "text-yellow-500/70 hover:bg-yellow-500/10 hover:text-yellow-500"
              )}
            >
              <Shield className="w-5 h-5" />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="font-medium text-sm"
                  >
                    Administration
                  </motion.span>
                )}
              </AnimatePresence>
              {pathname === "/admin" && !collapsed && (
                <motion.div
                  layoutId="activeIndicator"
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-yellow-500"
                />
              )}
            </motion.div>
          </Link>
        )}
      </nav>

      {/* Collapse button */}
      <div className="p-3 border-t border-white/10">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm">Réduire</span>
            </>
          )}
        </button>
      </div>
    </motion.aside>
  );
}
