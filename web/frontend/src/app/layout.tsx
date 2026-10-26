import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "@/styles/capten.css";
import "flag-icons/css/flag-icons.min.css";
import { AuthProvider } from "@/lib/AuthContext";
import { SettingsProvider } from "@/lib/SettingsContext";
import { PremiumProvider } from "@/lib/PremiumContext";
import { LanguageProvider } from "@/lib/LanguageContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ServiceWorker } from "@/components/app/ServiceWorker";
import { headers } from "next/headers";
import { NonceProvider } from "@/lib/nonce";

/*
 * POLICES HÉBERGÉES DANS LE PROJET, pas téléchargées au build.
 *
 * `next/font/google` va chercher les fichiers chez Google à chaque build.
 * Le jour où Google a répondu autrement que prévu, le déploiement entier a
 * échoué (« Cannot read properties of null (reading '1') » dans le loader)
 * pour une question de typographie. Les fichiers sont donc dans src/fonts :
 * polices variables, sous-ensemble latin (accents français, œ, € compris),
 * reprises telles quelles de Google Fonts (licence SIL Open Font).
 */
const jetbrainsMono = localFont({
  src: "../fonts/JetBrainsMono.woff2",
  variable: "--font-mono",
  display: "swap",
  weight: "400 700",
});

/*
 * LA VOIX DU SITE : CELLE DE LA PRESSE FINANCIÈRE.
 *
 * Fraunces et Plus Jakarta Sans (avant elles Inter, Sora, Space Grotesk)
 * sont les polices qu'on retrouve sur des milliers de sites générés : le site
 * ressemblait à un modèle. Il prend maintenant la typographie des pages
 * saumon et des cotes du journal :
 *
 *   · IBM Plex Serif pour les titres et les grands montants : une serif
 *     robuste, à faible contraste, de la famille des polices de terminal de
 *     marché. Une Didone (Bodoni Moda) l'a précédée un jour : ses déliés
 *     disparaissaient à l'écran, « on ne voit rien ». Plex reste lisible à
 *     toutes les tailles, en clair comme en sombre, et ses chiffres ont tous
 *     la même largeur ;
 *   · Schibsted Grotesk pour le texte et les chiffres : une grotesque
 *     dessinée pour un groupe de presse, avec de vrais chiffres tabulaires,
 *     indispensables à des cours qui s'alignent en colonne et ne « sautent »
 *     pas quand ils changent.
 */
const plexSerif = localFont({
  src: [
    { path: "../fonts/IBMPlexSerif-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/IBMPlexSerif-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../fonts/IBMPlexSerif-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../fonts/IBMPlexSerif-700-normal.woff2", weight: "700", style: "normal" },
    { path: "../fonts/IBMPlexSerif-400-italic.woff2", weight: "400", style: "italic" },
    { path: "../fonts/IBMPlexSerif-500-italic.woff2", weight: "500", style: "italic" },
  ],
  variable: "--font-plex-serif",
  display: "swap",
});

const schibsted = localFont({
  src: [
    { path: "../fonts/SchibstedGrotesk-normal.woff2", style: "normal" },
    { path: "../fonts/SchibstedGrotesk-italic.woff2", style: "italic" },
  ],
  variable: "--font-schibsted",
  display: "swap",
  weight: "400 900",
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
  // La barre du navigateur et celle de l'application installée prennent le
  // bleu nuit du logo.
  themeColor: "#0B1726",
};

const DESCRIPTION =
  "Apprendre le trading sans risquer un euro : analyses expliquées, argent virtuel, et Nimbo qui propose, et dit franchement ce qui arrive en vrai.";

/* L'IDENTITÉ, partout où le site apparaît hors de lui-même : l'onglet (le
 * nouveau symbole sur fond bleu nuit), l'écran d'accueil d'un téléphone, et
 * l'aperçu d'un lien partagé (image 1200 × 630 avec Nimbo). Sans
 * `metadataBase`, les réseaux recevaient une adresse d'image relative qu'ils
 * ne savent pas suivre : le lien partagé arrivait sans image. */
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://captentdb.fr"),
  title: {
    default: "CaptenTDB · apprendre le trading, sans risquer un euro",
    template: "%s · CaptenTDB",
  },
  description: DESCRIPTION,
  applicationName: "CaptenTDB",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: { capable: true, title: "CaptenTDB", statusBarStyle: "default" },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "/",
    siteName: "CaptenTDB",
    title: "CaptenTDB · apprendre le trading, sans risquer un euro",
    description: DESCRIPTION,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "CaptenTDB, avec Nimbo : « Je vous propose de prendre position. »" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "CaptenTDB · apprendre le trading, sans risquer un euro",
    description: DESCRIPTION,
    images: ["/og-image.png"],
  },
};

// Les pages sont rendues à chaque visite : le jeton de la CSP change à chaque fois.
export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
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
      className={`dark ${jetbrainsMono.variable} ${plexSerif.variable} ${schibsted.variable}`}
    >
      <head>
        {/* Applies the cached theme / accent / language BEFORE first paint.
            Without this, a light-theme user gets a full dark first paint on
            every navigation while the settings GET is in flight. */}
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `
(function(){try{
  var s=JSON.parse(localStorage.getItem("tdb_settings")||"{}");
  if(s.theme==="light"||s.theme==="dark")document.documentElement.setAttribute("data-theme",s.theme);
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
       <NonceProvider nonce={nonce}>
        <ServiceWorker />
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
       </NonceProvider>
      </body>
    </html>
  );
}
