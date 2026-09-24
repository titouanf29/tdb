import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono, Sora } from "next/font/google";
import "./globals.css";
import "@/styles/capten.css";
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

// Headings of the rebuilt screens. Space Grotesk stays only until the last
// legacy page is migrated, then it goes.
const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

/**
 * BORD À BORD. `viewport-fit=cover` laisse la page occuper tout l'écran de
 * l'iPhone, y compris sous l'indicateur d'accueil : c'est ce qui permet à la
 * barre de navigation du bas de descendre jusqu'au bord, comme dans une
 * application, au lieu de flotter au-dessus d'une bande vide. En échange,
 * chaque élément collé à un bord doit respecter les marges de sécurité
 * (`env(safe-area-inset-*)`) : la barre du bas, l'en-tête, les marges
 * latérales de la page et les alertes de prix le font.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

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
    // suppressHydrationWarning : le script ci-dessous pose data-theme, style
    // et lang sur <html> AVANT que React n'hydrate, pour éviter un premier
    // rendu sombre chez un utilisateur en thème clair. React voyait donc des
    // attributs qu'il n'avait pas produits et avertissait « Extra attributes
    // from the server » dans la console de chaque page. C'est le remède prévu
    // pour ce motif précis, et il ne porte que sur cet élément.
    <html
      lang="fr"
      suppressHydrationWarning
      className={`dark ${inter.variable} ${sora.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
    >
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
  // Le mode de l'interface reconstruite, posé avant le premier rendu. Sans
  // cela, un utilisateur en sombre reçoit un éclair blanc pleine page à
  // chaque navigation, le temps que React monte.
  var m=localStorage.getItem("tdb_cap_theme")||"light";
  var d=m==="dark"||(m==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.setAttribute("data-cap-theme",d?"dark":"light");
  document.documentElement.style.colorScheme=d?"dark":"light";
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
