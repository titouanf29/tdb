"use client";

import { useState } from "react";
import { GraphiqueEcole, type ConfigGraphique } from "../GraphiqueEcole";
import { BoutonTenir, ChoixTenir, LienTenir, ResultatTenir } from "./ElementsTenir";

/**
 * « Quelle figure ? » : un graphique, trois noms possibles. On choisit, puis
 * la correction trace les lignes de la figure sur le graphique et dit
 * pourquoi. Le score à la fin.
 */
export type QuestionFigure = {
  cfg: ConfigGraphique;
  /** Ce que la correction ajoute au graphique : niveaux, traits, marques. */
  correction: Partial<ConfigGraphique>;
  options: string[];
  correct: number;
  explication: string;
};

export function QuelleFigure({ questions }: { questions: QuestionFigure[] }) {
  const [k, setK] = useState(0);
  const [choix, setChoix] = useState<(number | null)[]>(() => questions.map(() => null));
  const fini = k >= questions.length;
  const score = choix.filter((c, i) => c === questions[i].correct).length;

  if (fini) {
    return (
      <div>
        <ResultatTenir>
          <p className="text-[1.6rem] font-medium" style={{ fontFamily: "var(--cap-font-display)", color: "var(--cap-ink)" }}>
            {score} sur {questions.length}
          </p>
          <p className="mt-1">
            {score === questions.length
              ? "Toutes reconnues. Gardez en tête qu'une figure reconnue n'est encore qu'une hypothèse : c'est la cassure qui la confirme."
              : score >= questions.length - 2
                ? "Presque tout. Revoyez celles qui vous ont échappé : regardez d'abord le nombre de sommets (ou de creux), puis leur hauteur."
                : "Ce n'est pas encore automatique, et c'est normal. Reprenez les scènes de la leçon, puis réessayez : l'œil s'entraîne vite."}
          </p>
        </ResultatTenir>
        <div className="mt-3">
          <LienTenir onClick={() => { setChoix(questions.map(() => null)); setK(0); }}>Recommencer</LienTenir>
        </div>
      </div>
    );
  }

  const q = questions[k];
  const c = choix[k];
  const repondu = c != null;
  const juste = c === q.correct;
  const cfg: ConfigGraphique = repondu
    ? { ...q.cfg, ...q.correction, niveaux: [...(q.cfg.niveaux ?? []), ...(q.correction.niveaux ?? [])], traits: [...(q.cfg.traits ?? []), ...(q.correction.traits ?? [])] }
    : q.cfg;

  return (
    <div>
      <p className="mb-2 text-[0.95rem] italic" style={{ fontFamily: "var(--cap-font-display)", color: "var(--cap-amber-ink)" }}>
        Graphique {k + 1} sur {questions.length}
      </p>
      <GraphiqueEcole key={k} {...cfg} sansSurvol ariaLabel={`Graphique ${k + 1} : quelle figure ?`} />
      <div role="group" aria-label="Quelle figure voyez-vous ?" className="mt-3 grid gap-2 sm:grid-cols-3">
        {q.options.map((o, j) => (
          <ChoixTenir key={j} disabled={repondu}
            etat={!repondu ? "neutre" : j === q.correct ? "juste" : j === c ? "faux" : "neutre"}
            onClick={() => setChoix((cs) => cs.map((x, i) => (i === k ? j : x)))}>
            {o}
          </ChoixTenir>
        ))}
      </div>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <ResultatTenir className="min-w-0 flex-1">
          {repondu ? (
            <>
              <b style={{ color: juste ? "var(--cap-up)" : "var(--cap-down)" }}>{juste ? "Juste." : `Non : c'est ${q.options[q.correct].toLowerCase()}.`}</b>{" "}
              <span dangerouslySetInnerHTML={{ __html: q.explication }} />
            </>
          ) : "Regardez le dessin du prix, puis choisissez son nom."}
        </ResultatTenir>
        {repondu && (
          <div className="flex-none">
            <BoutonTenir onClick={() => setK(k + 1)}>{k < questions.length - 1 ? "Graphique suivant" : "Voir mon score"}</BoutonTenir>
          </div>
        )}
      </div>
    </div>
  );
}
