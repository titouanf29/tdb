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
        {/* Background effects — GPU-composited layer, no blur filters */}
        <div className="fixed inset-0 -z-10 overflow-hidden" style={{ contain: "strict", willChange: "transform" }}>
          {/* Grid */}
          <div className="absolute inset-0 opacity-[0.025]"
            style={{backgroundImage: "linear-gradient(rgba(99,140,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(99,140,255,0.5) 1px, transparent 1px)", backgroundSize: "64px 64px"}} />
          {/* Two static radial gradients — no blur, no animation, zero GPU cost */}
          <div className="absolute inset-0" style={{
            background: "radial-gradient(ellipse 80% 60% at 20% 10%, rgba(99,140,255,0.12) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 90%, rgba(139,92,246,0.10) 0%, transparent 55%)"
          }} />
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
