"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/LanguageContext";
import { usePremium } from "@/lib/PremiumContext";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { BroadcastBanner } from "./BroadcastBanner";
import { ChangelogBanner } from "./ChangelogBanner";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import { Loader2, Wrench } from "lucide-react";

// ── Public pages: no auth logic, no effects ───────────────────────────────────

function LegalShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {children}
      </div>
    </div>
  );
}

// ── Auth + protected pages: redirect logic lives here, never mounts for legal/landing ──

function AuthShell({
  children,
  isAuthPage,
}: {
  children: React.ReactNode;
  isAuthPage: boolean;
}) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { t, lang } = useLanguage();
  const { isAdmin } = usePremium();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [maintenance, setMaintenance] = useState<{ on: boolean; message: string }>({ on: false, message: "" });

  useEffect(() => {
    const check = async () => {
      try {
        const r = await fetch("/api/status");
        if (r.ok) {
          const d = await r.json();
          setMaintenance({ on: !!d.maintenance, message: d.message || "" });
        }
      } catch {}
    };
    check();
    const iv = setInterval(check, 30000);
    return () => clearInterval(iv);
  }, []);

  // Redirect unauthenticated users — only runs on auth/protected pages
  useEffect(() => {
    if (isAuthPage) return;
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, isAuthPage, router]);

  // Onboarding modal
  useEffect(() => {
    if (isAuthenticated && user && user.trading_level == null) {
      const t = setTimeout(() => setShowOnboarding(true), 800);
      return () => clearTimeout(t);
    }
  }, [isAuthenticated, user]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  if (isAuthPage) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        {children}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="text-center space-y-4"
        >
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
            <div className="absolute inset-2 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-primary animate-spin" style={{ animationDuration: "1.5s" }} />
            </div>
          </div>
          <div>
            <p className="text-foreground font-medium">{t("loading")}</p>
            <p className="text-muted-foreground text-sm mt-1">{lang === "fr" ? "Récupération de vos données" : "Fetching your data"}</p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (maintenance.on && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="text-center space-y-6 max-w-md"
        >
          <div className="w-20 h-20 mx-auto rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
            <Wrench className="w-10 h-10 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold mb-2">
              {lang === "en" ? "Maintenance" : "Maintenance"}
            </h1>
            <p className="text-muted-foreground">
              {maintenance.message || (lang === "en"
                ? "The site is under maintenance. Please come back soon."
                : "Le site est en cours de maintenance. Revenez bientôt.")}
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            <p>CaptenTDB</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {showOnboarding && (
        <OnboardingModal onClose={() => setShowOnboarding(false)} />
      )}

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <Sidebar mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />

      <div className="flex flex-col flex-1 overflow-hidden">
        <Header onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <BroadcastBanner />
          <ChangelogBanner />
          {children}
          <footer className="mt-8 pt-4 border-t border-white/10 text-center text-xs text-muted-foreground space-y-2">
            <p>{lang === "fr" ? "Fait par" : "Made by"} <span className="text-primary font-semibold">CaptenQwark</span> - CaptenTDB</p>
            <p>{lang === "fr" ? "Les analyses sont à but éducatif uniquement. Ce site ne fournit pas de conseils financiers. Paper trading uniquement." : "Analyses are for educational purposes only. This site does not provide financial advice. Paper trading only."}</p>
            <div className="flex flex-wrap gap-3 justify-center">
              <a href="/mentions-legales" className="hover:text-primary hover:underline">{lang === "fr" ? "Mentions légales" : "Legal notice"}</a>
              <span>·</span>
              <a href="/politique-de-confidentialite" className="hover:text-primary hover:underline">{lang === "fr" ? "Politique de confidentialité" : "Privacy policy"}</a>
              <span>·</span>
              <a href="/cgu" className="hover:text-primary hover:underline">{lang === "fr" ? "CGU" : "ToS"}</a>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}

// ── AppLayout: routes to the correct shell, no hooks needed here ──────────────

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isLandingPage = !pathname || pathname === "/";
  const isLegalPage   = pathname?.startsWith("/mentions-legales")
    || pathname?.startsWith("/politique-de-confidentialite")
    || pathname?.startsWith("/cgu");
  const isAuthPage    = pathname?.startsWith("/login")
    || pathname?.startsWith("/register")
    || pathname?.startsWith("/verify-email");

  if (isLandingPage) {
    return <>{children}</>;
  }

  if (isLegalPage) {
    return <LegalShell>{children}</LegalShell>;
  }

  // Auth pages and protected pages both go through AuthShell
  return <AuthShell isAuthPage={!!isAuthPage}>{children}</AuthShell>;
}
