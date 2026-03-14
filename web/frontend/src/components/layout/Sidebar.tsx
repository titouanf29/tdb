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
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-9 h-9">
      <defs>
        <linearGradient id="anchor-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0369a1" />
        </linearGradient>
      </defs>

      {/* Anneau du haut (chapeau) */}
      <circle cx="20" cy="5" r="3.2" stroke="url(#anchor-grad)" strokeWidth="2" fill="none" />

      {/* Tête */}
      <circle cx="20" cy="13" r="6.5" fill="url(#anchor-grad)" />

      {/* Yeux */}
      <circle cx="17.5" cy="12" r="1.4" fill="white" />
      <circle cx="22.5" cy="12" r="1.4" fill="white" />
      <circle cx="17.9" cy="12.4" r="0.7" fill="#0c4a6e" />
      <circle cx="22.9" cy="12.4" r="0.7" fill="#0c4a6e" />

      {/* Sourire */}
      <path d="M17 15.5 Q20 18 23 15.5" stroke="white" strokeWidth="1.3" strokeLinecap="round" fill="none" />

      {/* Tige verticale (corps) */}
      <rect x="18.8" y="19" width="2.4" height="12" rx="1.2" fill="url(#anchor-grad)" />

      {/* Barre horizontale (bras) */}
      <rect x="8" y="21" width="24" height="2.5" rx="1.25" fill="url(#anchor-grad)" />
      {/* Mains */}
      <circle cx="8.5" cy="22.25" r="2.2" fill="url(#anchor-grad)" />
      <circle cx="31.5" cy="22.25" r="2.2" fill="url(#anchor-grad)" />

      {/* Petite roue au centre de la tige */}
      <circle cx="20" cy="28" r="2" stroke="url(#anchor-grad)" strokeWidth="1.8" fill="white" />

      {/* Pattes de l'ancre (pieds) */}
      <path d="M20 31 Q13 33 11 38" stroke="url(#anchor-grad)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M20 31 Q27 33 29 38" stroke="url(#anchor-grad)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
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

export function Sidebar({
  mobileOpen = false,
  onMobileClose,
}: {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}) {
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
      className={`h-screen bg-card/50 backdrop-blur-xl border-r border-white/10 flex flex-col
        fixed lg:relative z-50 lg:z-auto
        ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        transition-transform lg:transition-none duration-300`}
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
