"use client";

import Link from "next/link";
import { CaptenLogo, Container, Text } from "@/components/design-system";

/**
 * The footer, and the legal statement that has to be here.
 *
 * The disclaimer is not fine print at 10px: an educational product about money
 * should say plainly what it is not, at a size people can read.
 */
export function LandingFooter() {
  return (
    <footer
      className="border-t py-14"
      style={{ borderColor: "var(--cap-line)", backgroundColor: "var(--cap-bg)" }}
    >
      <Container width="wide">
        <div className="flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-[26rem]">
            <CaptenLogo size={21} className="text-[color:var(--cap-ink)]" />
            <Text size="small" className="mt-3">
              Plateforme éducative de paper trading. CaptenTDB n'est pas un
              prestataire de services d'investissement, ne collecte aucun fonds
              et ne fournit aucun conseil personnalisé. Les performances passées
              ne préjugent pas des performances futures.
            </Text>
          </div>

          <nav className="flex flex-col gap-2.5" aria-label="Liens légaux">
            {[
              { href: "/mentions-legales", label: "Mentions légales" },
              { href: "/politique-de-confidentialite", label: "Confidentialité" },
              { href: "/cgu", label: "CGU" },
              { href: "/cgv", label: "CGV" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="inline-flex min-h-[32px] items-center text-[0.875rem] transition-colors duration-200 hover:text-[color:var(--cap-ink)]"
                style={{ color: "var(--cap-ink-2)" }}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <div
          className="mt-10 border-t pt-6"
          style={{ borderColor: "var(--cap-line)" }}
        >
          <Text size="caption" tone="faint">
            © {new Date().getFullYear()} CaptenTDB — par CaptenQwark
          </Text>
        </div>
      </Container>
    </footer>
  );
}
