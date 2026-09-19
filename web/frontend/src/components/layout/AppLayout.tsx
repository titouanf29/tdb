"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/LanguageContext";
import { usePremium } from "@/lib/PremiumContext";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { BroadcastBanner } from "./BroadcastBanner";
import { ChangelogBanner } from "./ChangelogBanner";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import { OnboardingTour } from "@/components/OnboardingTour";
import { CoachOverlay } from "@/components/CoachAlex";
import { PriceAlertWatcher } from "@/components/PriceAlertWatcher";
import { MaintenanceScreen } from "./MaintenanceScreen";
import { useMaintenance } from "@/lib/useMaintenance";
import { AppChrome } from "@/components/app/AppChrome";
import { isMigrated } from "@/components/app/nav";
import { Loader2 } from "lucide-react";
import type { TradingLevel } from "@/lib/auth";

// ── Public pages: no auth logic, no effects ───────────────────────────────────

/**
 * The public landing page. It used to render unconditionally, so during
 * maintenance captentdb.fr still greeted visitors with the full marketing page
 * and a "Create my account — it's free" button. It is the first thing anyone
 * sees, so it is the first thing the lock has to cover.
 */
function LandingShell({ children }: { children: React.ReactNode }) {
  const { lang } = useLanguage();
  const maintenance = useMaintenance();

  // Nothing decisive before the first answer — but no spinner either: the
  // landing page is also what search engines and link previews fetch.
  if (maintenance.checked && maintenance.locked) {
    return (
      <MaintenanceScreen
        message={maintenance.message || (lang === "en"
          ? "The site is temporarily unavailable. Please come back soon."
          : "Le site est temporairement indisponible. Revenez bientôt.")}
        endTime={maintenance.endTime}
        startedAt={maintenance.startedAt}
        lang={lang}
      />
    );
  }
  return <>{children}</>;
}

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
  const [forceTourLevel, setForceTourLevel] = useState<TradingLevel | null>(null);
  const maintenance = useMaintenance();

  const maintenanceProps = {
    message: maintenance.message || (lang === "en"
      ? "The site is temporarily unavailable. Please come back soon."
      : "Le site est temporairement indisponible. Revenez bientôt."),
    endTime: maintenance.endTime,
    startedAt: maintenance.startedAt,
    lang,
  };

  // Redirect unauthenticated users — only runs on auth/protected pages
  useEffect(() => {
    if (isAuthPage) return;
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, isAuthPage, router]);

  // Show onboarding modal when trading_level not yet set
  useEffect(() => {
    if (isAuthenticated && user && user.trading_level == null) {
      const t = setTimeout(() => setShowOnboarding(true), 800);
      return () => clearTimeout(t);
    }
  }, [isAuthenticated, user]);

  // Record daily login for missions/streak
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const today = new Date().toISOString().split("T")[0];
    const lastKey = "tdb_last_login_date";
    const last = localStorage.getItem(lastKey);
    if (last !== today) {
      localStorage.setItem(lastKey, today);
      import("@/lib/api").then(({ missionsAPI }) => {
        missionsAPI.recordAction("daily_login").catch(() => {});
        missionsAPI.recordAction("login").catch(() => {});
      });
    }
  }, [isAuthenticated, user]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  /** Called when user clicks "Démarrer la visite" in OnboardingModal */
  const handleStartTour = (level: TradingLevel) => {
    setShowOnboarding(false);
    // Small delay to let modal exit animation complete
    setTimeout(() => {
      setForceTourLevel(level);
    }, 350);
  };

  if (isAuthPage) {
    const isLoginPage = !!pathname?.startsWith("/login");
    // Signing up is closed while the site is: letting the form through meant
    // new accounts were still being created behind the maintenance screen.
    // Signing IN stays open — it is the only way an admin gets back in.
    if (maintenance.locked && !isLoginPage) {
      return <MaintenanceScreen {...maintenanceProps} />;
    }
    // No centring wrapper: the auth screens own their layout, which on a wide
    // viewport is a two-column composition rather than a card in the middle.
    // The maintenance notice rides above them as a full-width strip so the
    // lockdown stays visible whatever the page does underneath.
    return (
      <>
        {maintenance.locked && isLoginPage && (
          <div
            className="relative z-50 px-5 py-3 text-center"
            style={{
              backgroundColor: "var(--cap-navy, #0B1726)",
              color: "#E8EDF1",
            }}
          >
            <p className="text-[0.82rem] leading-relaxed">
              <span className="font-semibold">
                {lang === "en" ? "Maintenance. " : "Maintenance. "}
              </span>
              {lang === "en"
                ? "The site is closed to visitors — only team accounts can sign in right now."
                : "Le site est fermé aux visiteurs — seuls les comptes de l'équipe peuvent se connecter."}
            </p>
          </div>
        )}
        {children}
      </>
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

  // Wait for maintenance status before showing anything (prevents flash of app content)
  if (!maintenance.checked) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 rounded-full border-2 border-transparent border-t-primary animate-spin" />
      </div>
    );
  }

  // `isAdmin` comes from the client's own premium context; `maintenance.isAdmin`
  // is the backend's verdict on the token. Either one is enough to pass.
  if (maintenance.on && !isAdmin && !maintenance.isAdmin) {
    return <MaintenanceScreen {...maintenanceProps} />;
  }

  // Rebuilt screens get the new chrome; the rest keep the old rail until they
  // are migrated. Choosing per route is what lets an app this size change
  // shell without a flag day: a light frame around a screen that is still dark
  // inside would look broken, and migrating twenty screens at once would mean
  // shipping none of them.
  if (isMigrated(pathname)) {
    return (
      <>
        <AnimatePresence>
          {showOnboarding && (
            <OnboardingModal
              onClose={() => setShowOnboarding(false)}
              onStartTour={handleStartTour}
            />
          )}
        </AnimatePresence>
        <AppChrome>{children}</AppChrome>
      </>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden overflow-x-hidden">
      {/* Onboarding modal (level selection + welcome step) */}
      <AnimatePresence>
        {showOnboarding && (
          <OnboardingModal
            onClose={() => setShowOnboarding(false)}
            onStartTour={handleStartTour}
          />
        )}
      </AnimatePresence>

      {/* Driver.js tour — force-started after level selection or auto on first login */}
      <OnboardingTour
        forceLevel={forceTourLevel}
        onTourDone={() => setForceTourLevel(null)}
      />

      <CoachOverlay />

      <PriceAlertWatcher />

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <Sidebar mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />

      <div className="flex flex-col flex-1 overflow-hidden">
        <Header onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} />
        <main className="flex-1 overflow-auto overflow-x-hidden p-4 md:p-6">
          <BroadcastBanner />
          <ChangelogBanner />
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
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
          </motion.div>
        </main>
      </div>
    </div>
  );
}

// ── AppLayout: routes to the correct shell, no hooks needed here ──────────────

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isLandingPage = !pathname || pathname === "/";
  // The edge middleware rewrites here; it must render on its own, without the
  // authenticated shell (which would send an anonymous visitor to /login).
  const isMaintenancePage = pathname === "/maintenance";
  const isLegalPage   = pathname?.startsWith("/mentions-legales")
    || pathname?.startsWith("/politique-de-confidentialite")
    || pathname?.startsWith("/cgu");
  const isAuthPage    = pathname?.startsWith("/login")
    || pathname?.startsWith("/register")
    || pathname?.startsWith("/verify-email");

  if (isMaintenancePage) {
    return <>{children}</>;
  }

  if (isLandingPage) {
    return <LandingShell>{children}</LandingShell>;
  }

  if (isLegalPage) {
    return <LegalShell>{children}</LegalShell>;
  }

  // Auth pages and protected pages both go through AuthShell
  return <AuthShell isAuthPage={!!isAuthPage}>{children}</AuthShell>;
}
