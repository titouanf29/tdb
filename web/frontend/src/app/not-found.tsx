"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Home, TrendingUp, BarChart3, ArrowLeft } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

export default function NotFound() {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="space-y-6 max-w-md"
      >
        {/* Glowing 404 */}
        <div className="relative">
          <p className="text-[120px] font-black leading-none gradient-text select-none">
            404
          </p>
          <div
            className="absolute inset-0 -z-10 blur-3xl opacity-30"
            style={{ background: "radial-gradient(circle, rgba(99,140,255,0.6) 0%, transparent 70%)" }}
          />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">{t("notfound_title")}</h1>
          <p className="text-muted-foreground text-sm">{t("notfound_desc")}</p>
        </div>

        {/* Quick links */}
        <div className="flex flex-wrap gap-3 justify-center pt-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/15 text-primary hover:bg-primary/25 transition-colors text-sm font-medium border border-primary/20"
          >
            <Home className="w-4 h-4" />
            Dashboard
          </Link>
          <Link
            href="/markets"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-sm font-medium border border-white/10"
          >
            <BarChart3 className="w-4 h-4" />
            {t("nav_markets")}
          </Link>
          <Link
            href="/wallet"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-sm font-medium border border-white/10"
          >
            <TrendingUp className="w-4 h-4" />
            Wallet
          </Link>
        </div>

        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {t("notfound_back")}
        </button>
      </motion.div>
    </div>
  );
}
