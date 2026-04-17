import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/AuthContext";
import { SettingsProvider } from "@/lib/SettingsContext";
import { PremiumProvider } from "@/lib/PremiumContext";
import { LanguageProvider } from "@/lib/LanguageContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "CaptenTDB - Trading Education Platform",
  description: "Plateforme educative de trading par CaptenQwark - Analyses, formations et communaute",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`dark ${inter.variable}`}>
      <body className="min-h-screen bg-background font-sans">
        {/* Background effects */}
        <div className="fixed inset-0 -z-10 overflow-hidden">
          {/* Subtle grid */}
          <div className="absolute inset-0 opacity-[0.025]"
            style={{backgroundImage: "linear-gradient(rgba(99,140,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(99,140,255,0.5) 1px, transparent 1px)", backgroundSize: "64px 64px"}} />
          {/* Neon orbs */}
          <div className="absolute top-[-10%] left-[15%] w-[700px] h-[700px] rounded-full blur-3xl animate-float"
            style={{background: "radial-gradient(circle, rgba(99,140,255,0.18) 0%, transparent 65%)", animationDuration: "12s"}} />
          <div className="absolute bottom-[-5%] right-[10%] w-[600px] h-[600px] rounded-full blur-3xl animate-float"
            style={{background: "radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 65%)", animationDuration: "16s", animationDelay: "-5s"}} />
          <div className="absolute top-[40%] right-[5%] w-[400px] h-[400px] rounded-full blur-3xl animate-float"
            style={{background: "radial-gradient(circle, rgba(0,210,255,0.11) 0%, transparent 65%)", animationDuration: "9s", animationDelay: "-3s"}} />
          <div className="absolute bottom-[20%] left-[5%] w-[350px] h-[350px] rounded-full blur-3xl animate-float"
            style={{background: "radial-gradient(circle, rgba(99,140,255,0.10) 0%, transparent 65%)", animationDuration: "14s", animationDelay: "-8s"}} />
          <div className="absolute top-[15%] right-[30%] w-[250px] h-[250px] rounded-full blur-3xl animate-float"
            style={{background: "radial-gradient(circle, rgba(0,255,157,0.07) 0%, transparent 65%)", animationDuration: "11s", animationDelay: "-2s"}} />
          {/* Subtle grain texture for depth */}
          <div className="absolute inset-0 opacity-[0.018] pointer-events-none"
            style={{backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")", backgroundRepeat: "repeat", backgroundSize: "200px 200px"}} />
        </div>

        <ErrorBoundary>
          <LanguageProvider>
            <AuthProvider>
              <PremiumProvider>
                <SettingsProvider>
                  <AppLayout>
                    <ErrorBoundary>{children}</ErrorBoundary>
                  </AppLayout>
                </SettingsProvider>
              </PremiumProvider>
            </AuthProvider>
          </LanguageProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
