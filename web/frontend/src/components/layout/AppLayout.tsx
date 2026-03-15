"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { BroadcastBanner } from "./BroadcastBanner";
import { Loader2 } from "lucide-react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAuthPage = pathname?.startsWith("/login") || pathname?.startsWith("/register");
  const isLandingPage = pathname === "/";
  const isLegalPage = pathname?.startsWith("/mentions-legales") || pathname?.startsWith("/politique-de-confidentialite") || pathname?.startsWith("/cgu");

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isAuthPage && !isLandingPage && !isLegalPage) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, isAuthPage, isLandingPage, router]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  if (isLoading && !isAuthPage && !isLandingPage && !isLegalPage) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement...</p>
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

  if (isLegalPage) {
    return (
      <div className="min-h-screen">
        <div className="max-w-4xl mx-auto px-4 py-12">
          {children}
        </div>
      </div>
    );
  }

  // Landing page — full screen, no sidebar (auth checked inside page.tsx)
  if (isLandingPage && !isAuthenticated) {
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
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
