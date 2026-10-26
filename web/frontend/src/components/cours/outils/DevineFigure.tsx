"use client";

import { useState } from "react";
import type { Bougie } from "@/lib/cours/marche";
import { GraphiqueEcole, type ConfigGraphique } from "../GraphiqueEcole";
import { BoutonLire, ChoixLire, RecommencerLire, RetourLire } from "./ElementsLire";

/**
 * Deviner, puis voir la correction dessinée : plusieurs graphiques, une
 * question (« hausse, baisse ou range ? », « quel triangle ? »), et après la
 * réponse, le dessin qui la justifie (points, lignes, niveaux) avec une phrase.
 */
export interface CasFigure {
  bougies: Bougie[];
  bonne: string;
  /** Ce qu'on dessine à la correction. */
  correction: Omit<ConfigGraphique, "bougies">;
  expliquer: string;
}

export function DevineFigure({ cas, options, question }: {
  cas: CasFigure[];
  options: { v: string; texte: string }[];
  question: string;
}) {
  const [k, setK] = useState(0);
  const [reponses, setReponses] = useState<(string | null)[]>(() => cas.map(() => null));
  const c = cas[k];
  const rep = reponses[k];
  const repondu = rep != null;
  const juste = rep === c.bonne;
  const score = reponses.filter((r, i) => r === cas[i].bonne).length;
  const fini = reponses.every((r) => r != null);
  const nomBonne = options.find((o) => o.v === c.bonne)?.texte ?? c.bonne;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[0.95rem] italic" style={{ color: "var(--cap-ink-3)", fontFamily: "var(--cap-font-display)" }}>
          Graphique {k + 1} sur {cas.length}
        </p>
        <div className="flex gap-1" aria-hidden>
          {cas.map((_, i) => (
            <span key={i} className="h-2 w-6 rounded-full" style={{
              backgroundColor: reponses[i] == null ? "var(--cap-line-strong)" : reponses[i] === cas[i].bonne ? "var(--cap-up)" : "var(--cap-down)",
              outline: i === k ? "2px solid var(--cap-ambre)" : undefined, outlineOffset: 2,
            }} />
          ))}
        </div>
      </div>
      <GraphiqueEcole bougies={c.bougies} sansSurvol apparition={false} {...(repondu ? c.correction : {})}
        ariaLabel={`${question} Graphique ${k + 1}`} />
      <p className="mt-3 text-[1rem] font-semibold" style={{ color: "var(--cap-ink)" }}>{question}</p>
      <div className="mt-1">
        <ChoixLire label={question} valeur={rep} desactive={repondu} options={options}
          onChange={(v) => setReponses((rs) => rs.map((r, i) => (i === k ? v : r)))}
          etat={(v) => (!repondu ? null : v === c.bonne ? "juste" : v === rep ? "faux" : null)} />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <RetourLire ton={repondu ? (juste ? "juste" : "faux") : null}>
          {!repondu ? "Choisissez une réponse : la correction se dessine sur le graphique." : (
            <>
              <b>{juste ? "Juste." : `Non : ${nomBonne.toLowerCase()}.`}</b>{" "}
              <span style={{ color: "var(--cap-ink-2)" }}>{c.expliquer}</span>
              {fini && <span style={{ color: "var(--cap-ink)" }}> Score : {score} sur {cas.length}.</span>}
            </>
          )}
        </RetourLire>
        <div className="flex items-center gap-2">
          {fini && <RecommencerLire onClick={() => { setReponses(cas.map(() => null)); setK(0); }} />}
          {repondu && k < cas.length - 1 && <BoutonLire onClick={() => setK(k + 1)}>Graphique suivant</BoutonLire>}
          {repondu && k === cas.length - 1 && !fini && (
            <BoutonLire onClick={() => setK(reponses.findIndex((r) => r == null))}>Graphique restant</BoutonLire>
          )}
        </div>
      </div>
    </div>
  );
}
