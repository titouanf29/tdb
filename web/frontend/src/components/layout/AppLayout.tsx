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

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isAuthPage) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, isAuthPage, router]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  if (isLoading && !isAuthPage) {
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
          <footer className="mt-8 pt-4 border-t border-white/10 text-center text-xs text-muted-foreground">
            <p>Fait par <span className="text-primary font-semibold">CaptenQwark</span> - CaptenTDB</p>
            <p className="mt-1">Les analyses sont a but educatif uniquement. Ce site ne fournit pas de conseils financiers.</p>
          </footer>
        </main>
      </div>
    </div>
  );
}
