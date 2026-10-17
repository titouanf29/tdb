"use client";

import { Container } from "@/components/design-system";
import { Reveal } from "./effets";
import { Compteur } from "./animationsPlus";

/**
 * Les chiffres qui rassurent, juste sous le haut de page.
 *
 * Que des faits vérifiables sur le produit lui-même, pas d'utilisateurs
 * inventés ni de témoignages. Ils ne sont plus rangés dans quatre cases
 * « chiffre en gros, légende en petit » : c'est le bandeau que posent tous les
 * modèles de site. Ils sont écrits, comme une phrase de chapeau dans un
 * magazine, et les nombres portent la serif.
 */
export function ChiffresCles() {
  const n = (v: string) => (
    <span className="cap-chiffre"><Compteur valeur={v} /></span>
  );
  return (
    <section aria-label="CaptenTDB en chiffres" className="relative z-10 pb-4 pt-2">
      <Container width="wide">
        <Reveal>
          <p
            className="max-w-[62rem] border-t pt-8 text-[clamp(1.2rem,2.1vw,1.6rem)] leading-[1.55]"
            style={{ borderColor: "var(--cap-line-strong)", color: "var(--cap-ink-2)", fontFamily: "var(--cap-font-display)" }}
          >
            Le simulateur passe en revue {n("800")} actions, indices, cryptos, devises et matières
            premières. Vous démarrez avec {n("10 000 €")} virtuels, sur les vrais cours. Les dates de
            la Fed et de la BCE viennent de leurs sites officiels. Et il vous coûte {n("0 €")}, sans
            carte bancaire.
          </p>
        </Reveal>
      </Container>
    </section>
  );
}
