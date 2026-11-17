"use client";

import { useEffect, useState } from "react";

/**
 * Trois pièces pour donner du poids à l'accueil, sans toucher aux nuages.
 *
 * Le ciel dit le rêve ; ces pièces disent l'argent. Elles empruntent leurs
 * formes aux documents financiers qu'on a déjà eus en main : le bandeau des
 * cours d'un journal, le bordereau d'un ordre de bourse, les chiffres
 * sourcés d'un rapport. Rien n'y est décoratif : chaque nombre est vrai.
 */

/* ── A. Le bandeau des cours ──────────────────────────────────────────── */

const MARCHES = [
  { s: "^FCHI", nom: "CAC 40", d: 2 },
  { s: "^GSPC", nom: "S&P 500", d: 2 },
  { s: "^STOXX50E", nom: "Euro Stoxx 50", d: 2 },
  { s: "GC=F", nom: "Or", d: 2, unite: " $" },
  { s: "BTC-USD", nom: "Bitcoin", d: 0, unite: " $" },
  { s: "EURUSD=X", nom: "Euro / dollar", d: 4 },
];

type Cours = Record<string, { price: number; change: number }>;

/** À la française, avec un vrai signe moins (−) et non un trait d'union. */
const nombre = (v: number, d: number) => v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }).replace("-", "−");

/** Les vrais cours, sous le ciel : la bande d'un journal financier. */
export function BandeauCours() {
  const [cours, setCours] = useState<Cours | null>(null);
  const [heure, setHeure] = useState("");
  useEffect(() => {
    const lire = () => fetch(`/api/market/prices?symbols=${MARCHES.map((m) => encodeURIComponent(m.s)).join(",")}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.prices) return;
        setCours(d.prices);
        setHeure(new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).replace(":", " h "));
      })
      .catch(() => {});
    lire();
    const t = setInterval(lire, 60_000);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="ser-bandeau" aria-label="Les cours du moment">
      <div className="ser-bandeau-defile">
        {[0, 1].map((tour) => (
          <ul key={tour} className="ser-bandeau-liste" aria-hidden={tour === 1}>
            {MARCHES.map((m) => {
              const c = cours?.[m.s];
              const v = c?.change ?? 0;
              return (
                <li key={m.s}>
                  <span className="ser-nom">{m.nom}</span>
                  <span className="ser-prix">{c ? `${nombre(c.price, m.d)}${m.unite ?? ""}` : "…"}</span>
                  {c && (
                    <span className={`ser-var ${v > 0 ? "is-hausse" : v < 0 ? "is-baisse" : ""}`}>
                      {v > 0 ? "▲" : v < 0 ? "▼" : "■"} {v > 0 ? "+" : ""}{nombre(v, 2)} %
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        ))}
      </div>
      <p className="ser-bandeau-source">{heure ? `Cours réels, ${heure}, différé d'environ une minute.` : "Cours réels, en différé."}</p>
    </section>
  );
}

/* ── B. Le bordereau d'ordre ──────────────────────────────────────────── */

/** La carte du haut de page, présentée comme l'avis d'opéré d'un courtier. */
export function Bordereau() {
  const lignes: [string, string, string?][] = [
    ["Valeur", "TotalEnergies", "FR0000120271"],
    ["Sens", "Achat"],
    ["Quantité", "16 actions"],
    ["Cours d'entrée", "60,00 €"],
    ["Montant", "960,00 €"],
  ];
  return (
    <figure className="ser-bordereau-fig">
      <div className="ser-bordereau">
        <header className="ser-bordereau-tete">
          <span className="ser-bordereau-titre">Ordre de bourse</span>
          <span className="ser-bordereau-num">N° 000 128 · simulation</span>
        </header>
        <dl className="ser-bordereau-lignes">
          {lignes.map(([k, v, note]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}{note && <small>{note}</small>}</dd>
            </div>
          ))}
        </dl>
        <div className="ser-bordereau-plan">
          <div><span>Stop</span><b className="is-baisse">54,00 €</b><small>−10 %</small></div>
          <div><span>Objectif</span><b className="is-hausse">78,00 €</b><small>+30 %</small></div>
        </div>
        <div className="ser-bordereau-total">
          <span>Perte maximale si le stop est touché</span>
          <b>96,00 €</b>
        </div>
        <p className="ser-bordereau-pied">Décidé avant d&apos;entrer. Frais non compris.</p>
        <span className="ser-tampon" aria-hidden>Argent fictif</span>
      </div>
      <figcaption>Un exemple. Dans votre espace, ce sont les vrais cours.</figcaption>
    </figure>
  );
}

/* ── C. Mesuré, pas promis ────────────────────────────────────────────── */

export function MesurePasPromis() {
  return (
    <section className="ser-mesure" aria-labelledby="ser-mesure-titre">
      <div className="ser-mesure-in">
        <h2 id="ser-mesure-titre">Mesuré, pas promis.</h2>
        <p className="ser-mesure-chapeau">
          Le trading fait perdre de l&apos;argent à la plupart de ceux qui s&apos;y lancent. Ici, on commence par le savoir.
        </p>
        <ul className="ser-mesure-liste">
          <li>
            <span className="ser-chiffre">9 sur 10</span>
            <p>particuliers actifs ont perdu de l&apos;argent sur le forex et les CFD entre 2009 et 2012.</p>
            <cite>Autorité des marchés financiers, étude d&apos;octobre 2014</cite>
          </li>
          <li>
            <span className="ser-chiffre">36 sur 40</span>
            <p>actifs où les ventes à découvert de notre moteur ont perdu de l&apos;argent, sur 5 ans. Nimbo ne les propose donc plus.</p>
            <cite>Mesure CaptenTDB, frais inclus, septembre 2026</cite>
          </li>
          <li>
            <span className="ser-chiffre">Chaque</span>
            <p>proposition de Nimbo est suivie jusqu&apos;au stop, à l&apos;objectif ou à l&apos;échéance. Les pertes restent dans le bilan.</p>
            <cite>Le bilan est consultable dans votre espace</cite>
          </li>
        </ul>
      </div>
    </section>
  );
}
