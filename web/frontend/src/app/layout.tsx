import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/AuthContext";
import { SettingsProvider } from "@/lib/SettingsContext";
import { PremiumProvider } from "@/lib/PremiumContext";
import { AppLayout } from "@/components/layout/AppLayout";

const inter = Inter({ subsets: ["latin"] });

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
      <body className={`${inter.className} min-h-screen bg-background`}>
        {/* Background effects */}
        <div className="fixed inset-0 -z-10 overflow-hidden">
          {/* Subtle grid */}
          <div className="absolute inset-0 opacity-[0.025]"
            style={{backgroundImage: "linear-gradient(rgba(99,140,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(99,140,255,0.5) 1px, transparent 1px)", backgroundSize: "64px 64px"}} />
          {/* Neon orbs */}
          <div className="absolute top-[-10%] left-[15%] w-[500px] h-[500px] rounded-full blur-3xl" style={{background: "radial-gradient(circle, rgba(99,140,255,0.12) 0%, transparent 70%)"}} />
          <div className="absolute bottom-[-5%] right-[10%] w-[450px] h-[450px] rounded-full blur-3xl" style={{background: "radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)"}} />
          <div className="absolute top-[40%] right-[5%] w-[300px] h-[300px] rounded-full blur-3xl" style={{background: "radial-gradient(circle, rgba(0,210,255,0.07) 0%, transparent 70%)"}} />
          <div className="absolute bottom-[20%] left-[5%] w-[250px] h-[250px] rounded-full blur-3xl" style={{background: "radial-gradient(circle, rgba(99,140,255,0.06) 0%, transparent 70%)"}} />
        </div>

        <AuthProvider>
          <PremiumProvider>
            <SettingsProvider>
              <AppLayout>{children}</AppLayout>
            </SettingsProvider>
          </PremiumProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
