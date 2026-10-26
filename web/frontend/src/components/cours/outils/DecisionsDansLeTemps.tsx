"use client";

import { useEffect, useRef, useState } from "react";
import type { Bougie } from "@/lib/cours/marche";
import { GraphiqueEcole, type ConfigGraphique } from "../GraphiqueEcole";
import { BoutonLire, ChoixLire, FonduLire, RecommencerLire, RetourLire, useAnimLire } from "./ElementsLire";

/**
 * Décider pendant que le temps avance : le graphique s'arrête à un moment
 * précis, on choisit (acheter, vendre, attendre, où placer le stop…), puis
 * la correction se dessine et le temps reprend jusqu'au moment suivant.
 */
export interface EtapeDecision {
  jusqua: number;
  question: string;
  options: { v: string; texte: string }[];
  bonne: string;
  /** La correction (peut contenir <b>). */
  expliquer: string;
  /** Ce qu'on dessine avec la correction, en plus du décor. */
  dessin?: Omit<ConfigGraphique, "bougies">;
}

export function DecisionsDansLeTemps({ bougies, decor, etapes, bilan }: {
  bougies: Bougie[];
  /** Ce qui est dessiné tout le temps (niveaux, lignes). */
  decor?: Omit<ConfigGraphique, "bougies">;
  etapes: EtapeDecision[];
  bilan: string;
}) {
  const [k, setK] = useState(0);
  const [rep, setRep] = useState<(string | null)[]>(() => etapes.map(() => null));
  const anim = useAnimLire();
  const e = etapes[k];
  const r = rep[k];
  const fini = k === etapes.length - 1 && r != null;

  // Le temps qui défile d'un arrêt à l'autre.
  const [jusqua, setJusqua] = useState(e.jusqua);
  const prec = useRef(e.jusqua);
  useEffect(() => {
    const depart = prec.current, cible = e.jusqua;
    prec.current = cible;
    if (!anim || cible <= depart) { setJusqua(cible); return; }
    let raf = 0;
    const t0 = performance.now();
    const duree = Math.min(1400, 45 * (cible - depart));
    const pas = (t: number) => {
      const f = Math.min(1, (t - t0) / duree);
      setJusqua(Math.round(depart + (cible - depart) * f));
      if (f < 1) raf = requestAnimationFrame(pas);
    };
    raf = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(raf);
  }, [e.jusqua, anim]);

  const d = r != null ? e.dessin ?? {} : {};
  const cfg: Omit<ConfigGraphique, "bougies"> = {
    ...decor,
    niveaux: [...(decor?.niveaux ?? []), ...(d.niveaux ?? [])],
    traits: [...(decor?.traits ?? []), ...(d.traits ?? [])],
    marques: [...(decor?.marques ?? []), ...(d.marques ?? [])],
    zones: [...(decor?.zones ?? []), ...(d.zones ?? [])],
    surligne: d.surligne ?? decor?.surligne,
  };
  const score = rep.filter((x, i) => x === etapes[i].bonne).length;

  return (
    <div>
      <p className="mb-1 text-[0.95rem] italic" style={{ color: "var(--cap-ink-3)", fontFamily: "var(--cap-font-display)" }}>
        Moment {k + 1} sur {etapes.length}
      </p>
      <GraphiqueEcole bougies={bougies} {...cfg} jusqua={jusqua} sansSurvol={r == null} apparition={false}
        ariaLabel={`Graphique de décision, moment ${k + 1}`} />
      <FonduLire cle={k} className="mt-3">
        <p className="text-[1rem] font-semibold" style={{ color: "var(--cap-ink)" }}>{e.question}</p>
        <div className="mt-1">
          <ChoixLire label={e.question} valeur={r} desactive={r != null} options={e.options}
            onChange={(v) => setRep((rs) => rs.map((x, i) => (i === k ? v : x)))}
            etat={(v) => (r == null ? null : v === e.bonne ? "juste" : v === r ? "faux" : null)} />
        </div>
      </FonduLire>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <RetourLire ton={r == null ? null : r === e.bonne ? "juste" : "faux"}>
          {r == null ? "Décidez avec ce que vous voyez : la suite du graphique est cachée." : (
            <>
              <b>{r === e.bonne ? "Bonne décision." : `Plutôt : ${e.options.find((o) => o.v === e.bonne)?.texte.toLowerCase()}.`}</b>{" "}
              <span style={{ color: "var(--cap-ink-2)" }} dangerouslySetInnerHTML={{ __html: e.expliquer }} />
              {fini && <span style={{ color: "var(--cap-ink)" }}> {score} sur {etapes.length}. {bilan}</span>}
            </>
          )}
        </RetourLire>
        <div className="flex items-center gap-2">
          {(k > 0 || r != null) && <RecommencerLire onClick={() => { prec.current = etapes[0].jusqua; setRep(etapes.map(() => null)); setK(0); }} />}
          {r != null && k < etapes.length - 1 && <BoutonLire onClick={() => setK(k + 1)}>Laisser le temps avancer</BoutonLire>}
        </div>
      </div>
    </div>
  );
}
