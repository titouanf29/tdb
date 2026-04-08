"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { TDBLogo } from "@/components/ui/TDBLogo";
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
  GraduationCap,
  Briefcase,
  Scale,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { adminAPI } from "@/lib/api";

const menuGroups = [
  {
    label: "Trading",
    items: [
      { icon: LayoutDashboard, label: "Dashboard",  href: "/dashboard" },
      { icon: Globe,           label: "Marchés",    href: "/markets" },
      { icon: BarChart3,       label: "Analyse",    href: "/analysis" },
      { icon: ScanLine,        label: "Scanner",    href: "/scanner" },
    ],
  },
  {
    label: "Mon espace",
    items: [
      { icon: Briefcase,  label: "Portefeuille", href: "/portfolio" },
      { icon: TrendingUp, label: "Positions",    href: "/trading" },
      { icon: Wallet,     label: "Wallet",       href: "/wallet" },
      { icon: Star,       label: "Favoris",      href: "/favorites" },
    ],
  },
  {
    label: "IA & Outils",
    items: [
      { icon: Bot,    label: "Assistant IA", href: "/assistant" },
      { icon: Wrench, label: "Outils",       href: "/tools" },
    ],
  },
  {
    label: "Apprendre",
    items: [
      { icon: GraduationCap, label: "Formation", href: "/learn" },
    ],
  },
  {
    label: "Communauté",
    items: [
      { icon: Users, label: "Communauté", href: "/community" },
    ],
  },
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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, width: collapsed ? 80 : 260 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={`h-screen flex flex-col
        fixed lg:relative z-50 lg:z-auto
        ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        transition-transform lg:transition-none duration-300`}
      style={{
        background: "linear-gradient(180deg, hsl(220 50% 5.5%) 0%, hsl(220 45% 4.5%) 100%)",
        borderRight: "1px solid rgba(99,140,255,0.12)",
        boxShadow: "4px 0 24px rgba(0,0,0,0.4), inset -1px 0 0 rgba(99,140,255,0.06)"
      }}
    >
      {/* Logo */}
      <div className="p-4 flex items-center gap-3" style={{borderBottom: "1px solid rgba(99,140,255,0.1)"}}>
        <motion.div
          whileHover={{ scale: 1.08 }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
          className="flex items-center justify-center"
        >
          <TDBLogo size={36} />
        </motion.div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex-1 min-w-0"
            >
              <h1 className="font-bold text-xl gradient-text">CaptenTDB</h1>
              <p className="text-xs text-muted-foreground">par CaptenQwark</p>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Close button — mobile only */}
        {mobileOpen && onMobileClose && (
          <button
            onClick={onMobileClose}
            className="ml-auto lg:hidden p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-4 overflow-y-auto no-scrollbar">
        {menuGroups.map((group) => (
          <div key={group.label}>
            {/* Group label */}
            <AnimatePresence>
              {!collapsed && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50"
                >
                  {group.label}
                </motion.p>
              )}
            </AnimatePresence>
            {/* Group items */}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href}>
                    <motion.div
                      whileHover={{ x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative",
                        isActive
                          ? "text-white"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      style={isActive ? {
                        background: "linear-gradient(135deg, rgba(99,140,255,0.18) 0%, rgba(139,92,246,0.10) 100%)",
                        border: "1px solid rgba(99,140,255,0.30)",
                        boxShadow: "0 0 16px rgba(99,140,255,0.12), inset 0 1px 0 rgba(255,255,255,0.05)"
                      } : undefined}
                    >
                      <Icon
                        className={cn("w-5 h-5 transition-colors flex-shrink-0", isActive && "text-primary")}
                        style={isActive ? {filter: "drop-shadow(0 0 6px rgba(99,140,255,0.7))"} : undefined}
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
                          className="ml-auto w-1.5 h-1.5 rounded-full"
                          style={{background: "hsl(var(--neon-cyan))", boxShadow: "0 0 6px hsl(var(--neon-cyan))"}}
                        />
                      )}
                    </motion.div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {/* Admin link - only visible to admins */}
        {isAdmin && (
          <div>
            <AnimatePresence>
              {!collapsed && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-yellow-500/40"
                >
                  Admin
                </motion.p>
              )}
            </AnimatePresence>
            <Link href="/admin">
              <motion.div
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 border border-yellow-500/30",
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
              </motion.div>
            </Link>
          </div>
        )}
      </nav>

      {/* Bottom: Mentions légales + Settings + Collapse */}
      <div className="p-3 space-y-1" style={{borderTop: "1px solid rgba(99,140,255,0.1)"}}>
        <Link href="/mentions-legales">
          <motion.div
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-muted-foreground/50 hover:text-muted-foreground"
          >
            <Scale className="w-4 h-4 flex-shrink-0" />
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="text-xs"
                >
                  Mentions légales
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>
        </Link>
        <Link href="/settings">
          <motion.div
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
              pathname === "/settings"
                ? "text-white"
                : "text-muted-foreground hover:text-foreground"
            )}
            style={pathname === "/settings" ? {
              background: "linear-gradient(135deg, rgba(99,140,255,0.18) 0%, rgba(139,92,246,0.10) 100%)",
              border: "1px solid rgba(99,140,255,0.30)",
            } : undefined}
          >
            <Settings
              className={cn("w-5 h-5 flex-shrink-0", pathname === "/settings" && "text-primary")}
              style={pathname === "/settings" ? {filter: "drop-shadow(0 0 6px rgba(99,140,255,0.7))"} : undefined}
            />
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="font-medium text-sm"
                >
                  Paramètres
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>
        </Link>
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
