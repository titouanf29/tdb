import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "flag-icons/css/flag-icons.min.css";
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

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["400", "500", "600", "700"],
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
    <html lang="fr" className={`dark ${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}>
      <head>
        {/* Applies the cached theme / accent / language BEFORE first paint.
            Without this, a light-theme user gets a full dark first paint on
            every navigation while the settings GET is in flight. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(){try{
  var s=JSON.parse(localStorage.getItem("tdb_settings")||"{}");
  var A={blue:"41 82% 52%",purple:"25 85% 55%",teal:"170 60% 45%",orange:"187 62% 58%",pink:"340 65% 60%"};
  if(s.theme==="light"||s.theme==="dark")document.documentElement.setAttribute("data-theme",s.theme);
  var c=A[s.accentColor];if(c){var e=document.documentElement.style;
    e.setProperty("--primary",c);e.setProperty("--ring",c);e.setProperty("--neon-blue",c);}
  var l=localStorage.getItem("tdb_lang");if(l==="fr"||l==="en")document.documentElement.lang=l;
}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen bg-background font-sans">
        {/* Background effects — GPU-composited layer, no blur filters */}
        <div className="fixed inset-0 -z-10 overflow-hidden" style={{ contain: "strict", willChange: "transform" }}>
          {/* Grid */}
          <div className="absolute inset-0 opacity-[0.035]"
            style={{backgroundImage: "linear-gradient(rgba(232,168,32,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(232,168,32,0.35) 1px, transparent 1px)", backgroundSize: "48px 48px"}} />
          {/* Three static radial gradients — no blur, no animation, zero GPU cost */}
          <div className="absolute inset-0" style={{
            background: "radial-gradient(ellipse 70% 50% at 50% -5%, rgba(232,168,32,0.06) 0%, transparent 60%)"
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
