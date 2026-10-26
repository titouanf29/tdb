"use client";

import Link from "next/link";
import { CaptenLogo, Container, Text } from "@/components/design-system";

/**
 * Le pied de page, composé comme la dernière page d'une revue.
 *
 * Les quatre colonnes « logo, produit, ressources, légal » sont le pied de
 * page de tous les modèles de site. Ici : la phrase du site en grand, les
 * liens en une table courte, et un colophon qui dit avec quoi la page est
 * composée et par qui, comme à la fin d'un livre.
 */
const RUBRIQUES = [
  { titre: "Lire", liens: [["#demo", "La démo"], ["/actifs", "Les analyses du jour"], ["/cours", "Les leçons"], ["#fonctionnement", "Le fonctionnement"], ["#faq", "Les questions"]] },
  { titre: "Commencer", liens: [["/register", "Créer un compte"], ["/login", "Se connecter"], ["#paper-trading", "Le portefeuille virtuel"]] },
  { titre: "Les règles", liens: [["/mentions-legales", "Mentions légales"], ["/politique-de-confidentialite", "Confidentialité"], ["/cgu", "Conditions d'utilisation"], ["/cgv", "Conditions de vente"]] },
];

export function LandingFooter() {
  return (
    <footer className="pb-10 pt-16" style={{ backgroundColor: "var(--cap-bg)" }}>
      <Container width="wide">
        <div className="border-t-2 pt-10" style={{ borderColor: "var(--cap-ink)" }}>
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-20">
            <div>
              <CaptenLogo size={24} className="text-[color:var(--cap-ink)]" />
              <p
                className="mt-6 max-w-[30rem] text-[clamp(1.5rem,2.6vw,2.1rem)] leading-[1.2]"
                style={{ fontFamily: "var(--cap-font-display)", color: "var(--cap-ink)", fontWeight: 500 }}
              >
                Comprendre les marchés avant d&apos;y mettre un euro.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-8 sm:grid-cols-3">
              {RUBRIQUES.map((r) => (
                <nav key={r.titre} aria-label={r.titre}>
                  <p className="vitrine-italique text-[1rem]" style={{ color: "var(--cap-amber-ink)" }}>{r.titre}</p>
                  <ul className="mt-3">
                    {r.liens.map(([href, label]) => (
                      <li key={href}>
                        <Link
                          href={href}
                          className="inline-flex min-h-[36px] items-center text-[0.92rem] underline decoration-transparent decoration-2 underline-offset-[5px] transition-colors duration-200 hover:text-[color:var(--cap-ink)] hover:decoration-[color:var(--cap-ambre)]"
                          style={{ color: "var(--cap-ink-2)" }}
                        >
                          {label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              ))}
            </div>
          </div>

          {/* Le colophon. */}
          <div className="mt-14 grid gap-6 border-t pt-7 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-20" style={{ borderColor: "var(--cap-line)" }}>
            <p className="vitrine-italique text-[0.95rem] leading-[1.6]" style={{ color: "var(--cap-ink-2)" }}>
              Composé en Public Sans. Imaginé et construit en France, par CaptenQwark.
              Les cours sont réels, l&apos;argent ne l&apos;est pas.
            </p>
            <div>
              <Text size="caption">
                CaptenTDB n&apos;est pas un prestataire de services d&apos;investissement, ne collecte aucun fonds et ne
                fournit aucun conseil personnalisé. Les performances passées ne préjugent pas des performances futures.
              </Text>
              <Text size="caption" tone="faint" className="mt-3">© {new Date().getFullYear()} CaptenTDB</Text>
            </div>
          </div>
        </div>
      </Container>
    </footer>
  );
}
