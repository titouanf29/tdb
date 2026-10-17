"use client";

import { Container } from "@/components/design-system";
import { Reveal } from "./effets";

/**
 * Les chiffres qui rassurent, juste sous le haut de page.
 *
 * Que des faits vérifiables sur le produit lui-même — pas d'utilisateurs
 * inventés ni de témoignages : le nombre d'actifs que le scanner passe en
 * revue, les marchés couverts, ce que l'on reçoit, ce que ça coûte.
 */
const CHIFFRES = [
  { v: "800+", l: "actifs analysés", d: "actions, indices, crypto, devises, matières premières" },
  { v: "10 000 €", l: "virtuels au départ", d: "pour s'entraîner sur de vrais cours" },
  { v: "Fed · BCE", l: "dates officielles", d: "et leur effet passé sur vos actifs" },
  { v: "0 €", l: "pour commencer", d: "sans carte bancaire, sans engagement" },
];

export function ChiffresCles() {
  return (
    <section aria-label="CaptenTDB en chiffres" className="relative z-10 -mt-6 pb-6 sm:-mt-10">
      <Container width="wide">
        <Reveal>
          <dl className="grid grid-cols-2 overflow-hidden lg:grid-cols-4"
            style={{
              borderRadius: "var(--cap-r-xl)",
              backgroundColor: "color-mix(in srgb, var(--cap-surface) 88%, transparent)",
              boxShadow: "inset 0 0 0 1px var(--cap-line), 0 18px 40px -24px rgba(11,23,38,0.28)",
              backdropFilter: "blur(10px)",
            }}>
            {CHIFFRES.map((c, i) => (
              <div key={c.l} className="px-5 py-6 sm:px-7 sm:py-7"
                style={{
                  borderLeft: i % 2 === 1 || i === 2 ? "1px solid var(--cap-line)" : undefined,
                  borderTop: i >= 2 ? "1px solid var(--cap-line)" : undefined,
                }}>
                <dt className="sr-only">{c.l}</dt>
                <dd>
                  <span className="block text-[clamp(1.5rem,2.6vw,2.15rem)] font-semibold tracking-[-0.03em]"
                    style={{ fontFamily: "var(--cap-font-display)", color: "var(--cap-ink)" }}>{c.v}</span>
                  <span className="mt-1 block text-[0.92rem] font-medium" style={{ color: "var(--cap-ink)" }}>{c.l}</span>
                  <span className="mt-0.5 block text-[0.8rem] leading-snug" style={{ color: "var(--cap-ink-3)" }}>{c.d}</span>
                </dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </Container>
      <style dangerouslySetInnerHTML={{ __html: `@media (min-width:1024px){[aria-label="CaptenTDB en chiffres"] dl>div{border-top:none!important;border-left:1px solid var(--cap-line)}[aria-label="CaptenTDB en chiffres"] dl>div:first-child{border-left:none}}` }} />
    </section>
  );
}
