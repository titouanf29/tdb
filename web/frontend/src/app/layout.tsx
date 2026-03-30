import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/AuthContext";
import { SettingsProvider } from "@/lib/SettingsContext";
import { PremiumProvider } from "@/lib/PremiumContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export const metadata: Metadata = {
  title: "CaptenTDB - Trading Education Platform",
  description: "Plateforme educative de trading par CaptenQwark - Analyses, formations et communaute",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="dark">
      <body className="min-h-screen bg-background">
        {/* Background effects */}
        <div className="fixed inset-0 -z-10 overflow-hidden">
          {/* Subtle grid */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{backgroundImage: "linear-gradient(rgba(99,140,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(99,140,255,0.6) 1px, transparent 1px)", backgroundSize: "64px 64px"}} />
          {/* Neon orbs — animées avec float */}
          <div className="absolute top-[-10%] left-[15%] w-[600px] h-[600px] rounded-full blur-3xl animate-float"
            style={{background: "radial-gradient(circle, rgba(99,140,255,0.14) 0%, transparent 70%)", animationDuration: "12s"}} />
          <div className="absolute bottom-[-5%] right-[10%] w-[500px] h-[500px] rounded-full blur-3xl animate-float"
            style={{background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)", animationDuration: "16s", animationDelay: "-5s"}} />
          <div className="absolute top-[40%] right-[5%] w-[350px] h-[350px] rounded-full blur-3xl animate-float"
            style={{background: "radial-gradient(circle, rgba(0,210,255,0.09) 0%, transparent 70%)", animationDuration: "9s", animationDelay: "-3s"}} />
          <div className="absolute bottom-[20%] left-[5%] w-[300px] h-[300px] rounded-full blur-3xl animate-float"
            style={{background: "radial-gradient(circle, rgba(99,140,255,0.08) 0%, transparent 70%)", animationDuration: "14s", animationDelay: "-8s"}} />
          <div className="absolute top-[15%] right-[30%] w-[200px] h-[200px] rounded-full blur-3xl animate-float"
            style={{background: "radial-gradient(circle, rgba(0,255,157,0.05) 0%, transparent 70%)", animationDuration: "11s", animationDelay: "-2s"}} />
        </div>

        <ErrorBoundary>
          <AuthProvider>
            <PremiumProvider>
              <SettingsProvider>
                <AppLayout>
                  <ErrorBoundary>{children}</ErrorBoundary>
                </AppLayout>
              </SettingsProvider>
            </PremiumProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
