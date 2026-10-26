"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/LanguageContext";
import { usePremium } from "@/lib/PremiumContext";
import { WelcomeDialog, DISMISSED_KEY as WELCOME_DISMISSED_KEY } from "@/components/onboarding/WelcomeDialog";
import { MaintenanceScreen } from "./MaintenanceScreen";
import { useMaintenance } from "@/lib/useMaintenance";
import { AppChrome } from "@/components/app/AppChrome";
import { CoursChrome } from "@/components/cours/CoursChrome";
import { Loader2 } from "lucide-react";

// ── Public pages: no auth logic, no effects ───────────────────────────────────

/**
 * The public landing page. It used to render unconditionally, so during
 * maintenance captentdb.fr still greeted visitors with the full marketing page
 * and a "Create my account — it's free" button. It is the first thing anyone
 * sees, so it is the first thing the lock has to cover.
 */
function LandingShell({ children }: { children: React.ReactNode }) {
  const { lang } = useLanguage();
  const maintenance = useMaintenance();

  // Nothing decisive before the first answer — but no spinner either: the
  // landing page is also what search engines and link previews fetch.
  if (maintenance.checked && maintenance.locked) {
    return (
      <MaintenanceScreen
        message={maintenance.message || (lang === "en"
          ? "The site is temporarily unavailable. Please come back soon."
          : "Le site est temporairement indisponible. Revenez bientôt.")}
        endTime={maintenance.endTime}
        startedAt={maintenance.startedAt}
        lang={lang}
      />
    );
  }
  return <>{children}</>;
}

function LegalShell({ children }: { children: React.ReactNode }) {
  /* Ces pages sont les seules du site à s'afficher hors de la coque
     applicative : sans fond propre, elles héritaient du noir du `body`, et
     les panneaux migrés flottaient sur une page sombre avec un fil d'Ariane
     invisible dessus.
     La classe `cap` fait les deux choses d'un coup : elle peint le cadre,
     comme avant, et elle fait basculer le fond du DOCUMENT au clair par la
     règle `body:has(.cap)`, sans quoi les bandes de sécurité de l'iPhone
     restent noires autour d'une page claire. Le noir du `body` reste en
     place partout ailleurs, pour les écrans non migrés qui sont sombres à
     l'intérieur. */
  return (
    <div className="cap min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        {children}
      </div>
    </div>
  );
}

/** Les leçons de la série : publiques. Avec un compte, dans le cadre de
 *  l'application ; sans compte, dans un cadre léger qui invite à s'inscrire. */
function CoursShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  // PENDANT QUE LA SESSION SE LIT, LA LEÇON S'AFFICHE QUAND MÊME. Un cadre
  // vide ici effaçait la leçon du rendu serveur : Google et les aperçus de
  // liens recevaient une page blanche, alors que tout le texte était prêt.
  if (isLoading) return <LandingShell><CoursChrome>{children}</CoursChrome></LandingShell>;
  return (
    <LandingShell>
      {isAuthenticated ? <AppChrome>{children}</AppChrome> : <CoursChrome>{children}</CoursChrome>}
    </LandingShell>
  );
}

// ── Auth + protected pages: redirect logic lives here, never mounts for legal/landing ──

function AuthShell({
  children,
  isAuthPage,
}: {
  children: React.ReactNode;
  isAuthPage: boolean;
}) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { t, lang } = useLanguage();
  const { isAdmin } = usePremium();
  const router = useRouter();
  const pathname = usePathname();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const maintenance = useMaintenance();

  const maintenanceProps = {
    message: maintenance.message || (lang === "en"
      ? "The site is temporarily unavailable. Please come back soon."
      : "Le site est temporairement indisponible. Revenez bientôt."),
    endTime: maintenance.endTime,
    startedAt: maintenance.startedAt,
    lang,
  };

  // Redirect unauthenticated users — only runs on auth/protected pages
  useEffect(() => {
    if (isAuthPage) return;
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, isAuthPage, router]);

  // Show onboarding modal when trading_level not yet set — unless the user
  // has already waved it away once. Sans niveau le site se comporte comme
  // pour un débutant, ce qui est le réglage le plus explicatif ; reposer la
  // question à chaque chargement transformerait une invitation en harcèlement.
  useEffect(() => {
    if (!isAuthenticated || !user || user.trading_level != null) return;
    let dismissed = false;
    try { dismissed = localStorage.getItem(WELCOME_DISMISSED_KEY) === "1"; } catch { /* ignore */ }
    if (dismissed) return;
    const t = setTimeout(() => setShowOnboarding(true), 800);
    return () => clearTimeout(t);
  }, [isAuthenticated, user]);

  // La visite du jour (missions, série) est signalée par AppChrome, qui
  // couvre aussi les leçons ouvertes directement.

  if (isAuthPage) {
    // La connexion ET la récupération du mot de passe restent ouvertes : un
    // administrateur qui a oublié le sien pendant une maintenance doit
    // pouvoir rentrer.
    const isLoginPage = !!(pathname?.startsWith("/login")
      || pathname?.startsWith("/forgot-password")
      || pathname?.startsWith("/reset-password"));
    // Signing up is closed while the site is: letting the form through meant
    // new accounts were still being created behind the maintenance screen.
    // Signing IN stays open — it is the only way an admin gets back in.
    if (maintenance.locked && !isLoginPage) {
      return <MaintenanceScreen {...maintenanceProps} />;
    }
    // No centring wrapper: the auth screens own their layout, which on a wide
    // viewport is a two-column composition rather than a card in the middle.
    // The maintenance notice rides above them as a full-width strip so the
    // lockdown stays visible whatever the page does underneath.
    return (
      <>
        {maintenance.locked && isLoginPage && (
          <div
            className="relative z-50 px-5 py-3 text-center"
            style={{
              backgroundColor: "var(--cap-navy, #0B1726)",
              color: "#E8EDF1",
            }}
          >
            <p className="text-[0.82rem] leading-relaxed">
              <span className="font-semibold">
                {lang === "en" ? "Maintenance. " : "Maintenance. "}
              </span>
              {lang === "en"
                ? "The site is closed to visitors, only team accounts can sign in right now."
                : "Le site est fermé aux visiteurs, seuls les comptes de l'équipe peuvent se connecter."}
            </p>
          </div>
        )}
        {children}
      </>
    );
  }

  if (isLoading) {
    return (
      <div className="cap flex min-h-screen items-center justify-center" style={{ backgroundColor: "var(--cap-bg)" }}>
        <Loader2 aria-label={t("loading")} className="h-6 w-6 animate-spin" style={{ color: "var(--cap-ink-3)" }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Wait for maintenance status before showing anything (prevents flash of app content)
  if (!maintenance.checked) {
    return (
      <div className="cap flex min-h-screen items-center justify-center" style={{ backgroundColor: "var(--cap-bg)" }}>
        <Loader2 aria-hidden className="h-6 w-6 animate-spin" style={{ color: "var(--cap-ink-3)" }} />
      </div>
    );
  }

  // `isAdmin` comes from the client's own premium context; `maintenance.isAdmin`
  // is the backend's verdict on the token. Either one is enough to pass.
  if (maintenance.on && !isAdmin && !maintenance.isAdmin) {
    return <MaintenanceScreen {...maintenanceProps} />;
  }

  // Tous les écrans ont la nouvelle interface : l'ancien cadre sombre
  // (barre latérale, en-tête, bandeaux) n'apparaissait plus que sur une
  // adresse inconnue. Il a été retiré, avec ce qui ne servait qu'à lui.
  return (
    // Dans le cadre, pour hériter des polices et des classes du site.
    <AppChrome>
      <WelcomeDialog open={showOnboarding} onClose={() => setShowOnboarding(false)} />
      {children}
    </AppChrome>
  );
}

// ── AppLayout: routes to the correct shell, no hooks needed here ──────────────

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isLandingPage = !pathname || pathname === "/";
  // The edge middleware rewrites here; it must render on its own, without the
  // authenticated shell (which would send an anonymous visitor to /login).
  const isMaintenancePage = pathname === "/maintenance";
  // /cgv MANQUAIT, et ce n'était pas un oubli sans conséquence : la page
  // tombait dans AuthShell, donc un visiteur non connecté était redirigé vers
  // /login. Des conditions de vente doivent être consultables AVANT de créer
  // un compte — c'est même à peu près leur seule raison d'exister.
  const isLegalPage   = pathname?.startsWith("/mentions-legales")
    || pathname?.startsWith("/politique-de-confidentialite")
    || pathname?.startsWith("/cgu")
    || pathname?.startsWith("/cgv");
  const isAuthPage    = pathname?.startsWith("/login")
    || pathname?.startsWith("/register")
    || pathname?.startsWith("/verify-email")
    || pathname?.startsWith("/forgot-password")
    || pathname?.startsWith("/reset-password");

  if (isMaintenancePage) {
    return <>{children}</>;
  }

  if (isLandingPage) {
    return <LandingShell>{children}</LandingShell>;
  }

  if (isLegalPage) {
    return <LegalShell>{children}</LegalShell>;
  }

  if (pathname?.startsWith("/lecon/") || pathname === "/cours") {
    return <CoursShell>{children}</CoursShell>;
  }

  // Auth pages and protected pages both go through AuthShell
  return <AuthShell isAuthPage={!!isAuthPage}>{children}</AuthShell>;
}
