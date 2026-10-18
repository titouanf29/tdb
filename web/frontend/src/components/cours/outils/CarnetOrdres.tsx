"use client";

import { useState } from "react";
import { fmt } from "@/lib/cours/marche";
import { Choix, Ligne, Lignes, Verdict, lots, nb, usd, useCalme } from "./ElementsRisque";

/**
 * Les vendeurs en face. Un achat au marché prend d'abord tout ce qui est
 * proposé au meilleur prix, puis au prix suivant, et ainsi de suite. Quand le
 * carnet est mince (une annonce), même un petit ordre monte de plusieurs
 * prix : c'est l'autre source du slippage.
 */
const PRIX = Array.from({ length: 11 }, (_, k) => 1.1 + k / 10000);
const CARNETS = {
  calme: [3, 4, 5, 6, 6, 8, 8, 10, 10, 12, 12],
  annonce: [0.04, 0.03, 0.05, 0.02, 0.06, 0.1, 0.15, 0.2, 0.3, 0.5, 1],
};

export function CarnetOrdres() {
  const calme = useCalme();
  const [marche, setMarche] = useState<"calme" | "annonce">("annonce");
  const [taille, setTaille] = useState(0.1);

  const carnet = CARNETS[marche];
  let reste = taille;
  const pris = carnet.map((q) => { const p = Math.min(q, Math.max(0, reste)); reste = Math.round((reste - p) * 1000) / 1000; return p; });
  const rempli = taille - Math.max(0, reste);
  const moyen = rempli > 0 ? pris.reduce((a, q, k) => a + q * PRIX[k], 0) / rempli : PRIX[0];
  const slip = (moyen - PRIX[0]) * 10000;
  const dernierNiveau = pris.reduce((a, q, k) => (q > 0 ? k : a), 0);
  const maxQ = Math.max(...carnet);
  const echelle = (q: number) => (marche === "calme" ? q / maxQ : Math.min(1, q / 1)) * 100;
  const transition = calme ? undefined : "width .35s ease";

  return (
    <div>
      <div className="grid gap-x-8 sm:grid-cols-2">
        <Choix label="Le carnet" valeur={marche} onChange={setMarche}
          options={[{ v: "calme", texte: "Au calme" }, { v: "annonce", texte: "Pendant une annonce" }]} />
        <Choix label="Votre achat au marché" valeur={taille} onChange={setTaille}
          options={[0.1, 1, 5].map((v) => ({ v, texte: lots(v) }))} />
      </div>

      <div className="mt-4 grid gap-5 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div role="table" aria-label="Les vendeurs, du meilleur prix au plus cher">
          <div role="row" className="grid grid-cols-[4.6rem_minmax(0,1fr)_4.4rem] gap-2 pb-1 text-[0.82rem] italic" style={{ color: "var(--cap-ink-3)", fontFamily: "var(--cap-font-display)" }}>
            <span role="columnheader">Prix</span><span role="columnheader">Lots proposés à la vente</span><span role="columnheader" className="text-right">Pris</span>
          </div>
          {PRIX.map((p, k) => {
            const q = carnet[k];
            const part = q > 0 ? pris[k] / q : 0;
            return (
              <div role="row" key={k} className="grid grid-cols-[4.6rem_minmax(0,1fr)_4.4rem] items-center gap-2 py-[3px] text-[0.88rem] tabular-nums">
                <span role="cell" style={{ color: pris[k] > 0 ? "var(--cap-ink)" : "var(--cap-ink-3)", fontWeight: pris[k] > 0 ? 650 : 400 }}>{fmt(p, 4)}</span>
                <span role="cell" className="relative block h-5">
                  <span className="absolute inset-y-0 left-0 rounded-[3px]" style={{ width: `${echelle(q)}%`, minWidth: 3, backgroundColor: "color-mix(in srgb, var(--cap-ocean) 28%, transparent)" }} />
                  <span className="absolute inset-y-0 left-0 rounded-[3px]" style={{ width: `${echelle(q) * part}%`, backgroundColor: "var(--cap-ink)", transition }} />
                  <span className="absolute top-0 whitespace-nowrap text-[0.78rem] leading-5" style={{ left: `calc(${Math.min(echelle(q), 82)}% + 6px)`, color: "var(--cap-ink-3)" }}>{nb(q, 2)}</span>
                </span>
                <span role="cell" className="text-right" style={{ color: pris[k] > 0 ? "var(--cap-ink)" : "transparent" }}>{pris[k] > 0 ? nb(pris[k], 2) : "0"}</span>
              </div>
            );
          })}
        </div>

        <div>
          <Lignes>
            <Ligne label="Prix affiché (le meilleur vendeur)" valeur="1,1000" />
            <Ligne label="Dernier prix touché" valeur={fmt(PRIX[dernierNiveau], 4)} />
            <Ligne label="Prix moyen obtenu" fort valeur={fmt(moyen, 5)} />
            <Ligne label="Slippage" valeur={`${nb(slip, 1)} pip${slip >= 2 ? "s" : ""}, ${usd(slip * 10 * rempli, 2)}`} couleur={slip > 0.05 ? "var(--cap-down)" : undefined} />
          </Lignes>
          <Verdict ton={slip > 0.05 ? "mal" : "neutre"}>
            {reste > 0
              ? `Il n'y a que ${lots(rempli)} à vendre jusqu'à 1,1010 : le reste de votre ordre irait chercher des vendeurs encore plus haut. Pendant une annonce, le carnet se vide.`
              : slip < 0.05
                ? `Assez de vendeurs à 1,1000 : votre ${lots(taille)} passe entièrement au prix affiché.`
                : `Pas assez de vendeurs à 1,1000 : votre ordre a pris le prix suivant, puis encore le suivant, jusqu'à ${fmt(PRIX[dernierNiveau], 4)}. En moyenne, ${nb(slip, 1)} pip${slip >= 2 ? "s" : ""} de plus que le prix affiché.`}
          </Verdict>
        </div>
      </div>
    </div>
  );
}
