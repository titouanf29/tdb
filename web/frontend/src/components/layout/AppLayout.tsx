"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { BroadcastBanner } from "./BroadcastBanner";
import { ChangelogBanner } from "./ChangelogBanner";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import { Loader2 } from "lucide-react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Use window.location as fallback when usePathname() returns null during hydration
  const currentPath = pathname ?? (typeof window !== "undefined" ? window.location.pathname : null);

  const isAuthPage    = !!(currentPath?.startsWith("/login") || currentPath?.startsWith("/register"));
  const isLandingPage = !currentPath || currentPath === "/";
  const isLegalPage   = !!(currentPath?.startsWith("/mentions-legales")
    || currentPath?.startsWith("/politique-de-confidentialite")
    || currentPath?.startsWith("/cgu"));

  // ── All hooks must be declared before any early return ────────────────────

  // Redirect unauthenticated users — never fires for public pages
  useEffect(() => {
    if (isLandingPage || isLegalPage || isAuthPage) return;
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, isLandingPage, isLegalPage, isAuthPage, router]);

  // Onboarding modal for users without a trading level
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

  // ── Public pages: render immediately, no auth logic ───────────────────────

  if (isLandingPage) {
    return <>{children}</>;
  }

  if (isLegalPage) {
    return (
      <div className="min-h-screen">
        <div className="max-w-4xl mx-auto px-4 py-12">
          {children}
        </div>
      </div>
    );
  }

  if (isAuthPage) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        {children}
      </div>
    );
  }

  // ── Auth-required pages ───────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
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
            <p>Fait par <span className="text-primary font-semibold">CaptenQwark</span> - CaptenTDB</p>
            <p>Les analyses sont à but éducatif uniquement. Ce site ne fournit pas de conseils financiers. Paper trading uniquement.</p>
            <div className="flex flex-wrap gap-3 justify-center">
              <a href="/mentions-legales" className="hover:text-primary hover:underline">Mentions légales</a>
              <span>·</span>
              <a href="/politique-de-confidentialite" className="hover:text-primary hover:underline">Politique de confidentialité</a>
              <span>·</span>
              <a href="/cgu" className="hover:text-primary hover:underline">CGU</a>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
