"use client";

import Link from "next/link";
import { CaptenLogo, Container, Text } from "@/components/design-system";

/**
 * Le pied de page : où aller, et ce que le site n'est pas.
 *
 * Trois colonnes de liens comme sur tout site sérieux — le produit, pour
 * apprendre, le légal — et l'avertissement à une taille qu'on lit.
 */
const COLONNES = [
  { titre: "Le produit", liens: [["#demo", "Démo"], ["#fonctionnement", "Fonctionnement"], ["#paper-trading", "Portefeuille virtuel"], ["/register", "Créer un compte"]] },
  { titre: "Apprendre", liens: [["#apprendre", "Le parcours"], ["#faq", "Questions fréquentes"], ["/login", "Se connecter"]] },
  { titre: "Légal", liens: [["/mentions-legales", "Mentions légales"], ["/politique-de-confidentialite", "Confidentialité"], ["/cgu", "CGU"], ["/cgv", "CGV"]] },
];

export function LandingFooter() {
  return (
    <footer className="border-t pb-10 pt-16" style={{ borderColor: "var(--cap-line)", backgroundColor: "var(--cap-bg)" }}>
      <Container width="wide">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,0.6fr))] lg:gap-12">
          <div className="col-span-2 max-w-[26rem] lg:col-span-1">
            <CaptenLogo size={22} className="text-[color:var(--cap-ink)]" />
            <Text size="small" className="mt-4">
              Plateforme éducative de trading en argent virtuel. Analysez de vrais marchés, entraînez-vous sans
              risque, et comprenez chaque décision.
            </Text>
            <p className="vitrine-signature mt-5 flex items-center gap-3" style={{ color: "var(--cap-ink-2)" }}>
              <span>Imaginé et construit en France, par CaptenQwark.</span>
            </p>
          </div>
          {COLONNES.map((c) => (
            <nav key={c.titre} aria-label={c.titre}>
              <p className="text-[0.78rem] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--cap-ink-3)" }}>{c.titre}</p>
              <ul className="mt-4 space-y-1">
                {c.liens.map(([href, label]) => (
                  <li key={href}>
                    <Link href={href}
                      className="inline-flex min-h-[36px] items-center text-[0.92rem] transition-colors duration-200 hover:text-[color:var(--cap-ink)]"
                      style={{ color: "var(--cap-ink-2)" }}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t pt-7 sm:flex-row sm:items-start sm:justify-between" style={{ borderColor: "var(--cap-line)" }}>
          <Text size="caption" className="max-w-[46rem]">
            CaptenTDB n&apos;est pas un prestataire de services d&apos;investissement, ne collecte aucun fonds et ne
            fournit aucun conseil personnalisé. Les performances passées ne préjugent pas des performances futures.
          </Text>
          <Text size="caption" tone="faint" className="shrink-0">© {new Date().getFullYear()} CaptenTDB, par CaptenQwark</Text>
        </div>
      </Container>
    </footer>
  );
}
