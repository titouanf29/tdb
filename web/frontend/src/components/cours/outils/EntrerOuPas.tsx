"use client";

import { useState } from "react";
import { BoutonInd, ChoixInd, LectureInd, RecommencerInd, transitionInd, useCalmeInd } from "./ElementsIndicateurs";

/**
 * « J'entre ou pas ? » Le plan d'exemple de la leçon, et cinq situations. On
 * décide, puis la checklist se remplit : trois voyants, une case vide suffit
 * à rester dehors.
 */
type Cases = [boolean, boolean, boolean];
const NOMS = ["Le marché, l'heure", "Le setup", "Le stop, la taille"];

const SITUATIONS: { texte: string; cases: Cases; jamais?: string; pourquoi: string }[] = [
  { texte: "Mardi, 15 h 10. L'euro-dollar revient sur son support à 1,0950. Une bougie le rejette, avec une longue mèche basse. Entrée à 1,0950, stop à 1,0930 (20 pips), 0,10 lot : 20 $ de risque sur 2 000 $.",
    cases: [true, true, true], pourquoi: "Trois oui, aucune règle « jamais » en jeu : vous pouvez entrer. Ce qui ne garantit pas le gain : le plan dit quand entrer, pas comment ça finira." },
  { texte: "Mercredi, 11 h 30. Même support, même bougie de rejet, même stop. Le setup est parfait.",
    cases: [false, true, true], pourquoi: "Votre plan dit de 14 h à 17 h. Un beau setup en dehors de vos heures reste en dehors de votre plan." },
  { texte: "Jeudi, 15 h 45. Le prix traverse le support sans s'arrêter. « Il va forcément rebondir », vous dites-vous.",
    cases: [true, false, true], pourquoi: "Pas de bougie qui rejette le support : ce n'est pas votre setup. « Forcément » n'existe pas en trading." },
  { texte: "Vendredi, 14 h 20. Support touché, bougie de rejet, stop et taille prêts. À 14 h 30 tombe le chiffre de l'emploi américain.",
    cases: [true, true, true], jamais: "Entrer juste avant une annonce forte", pourquoi: "Les trois cases sont cochées, mais votre règle 6 l'interdit : à 14 h 30, le prix peut sauter votre stop (leçon 22)." },
  { texte: "Lundi, 16 h. Setup présent, bonne heure. Vous avez perdu hier : vous prenez 0,30 lot « pour vous refaire ». 60 $ de risque.",
    cases: [true, true, false], pourquoi: "60 $, c'est 3 % de 2 000 $. Votre plan dit 1 % au plus : 20 $, donc 0,10 lot avec ce stop." },
];

export function EntrerOuPas() {
  const [k, setK] = useState(0);
  const [rep, setRep] = useState<"oui" | "non" | null>(null);
  const [score, setScore] = useState(0);
  const calme = useCalmeInd();
  const s = SITUATIONS[k];
  const entrer = s.cases.every(Boolean) && !s.jamais;
  const juste = rep != null && (rep === "oui") === entrer;
  const fin = k === SITUATIONS.length - 1 && rep != null;

  const repondre = (v: "oui" | "non") => {
    if (rep != null) return;
    setRep(v);
    if ((v === "oui") === entrer) setScore((x) => x + 1);
  };

  return (
    <div>
      <div className="mb-3 rounded-[12px] px-4 py-3 text-[0.92rem]" style={{ backgroundColor: "var(--cap-surface-2)", color: "var(--cap-ink-2)" }}>
        <b style={{ color: "var(--cap-ink)" }}>Le plan :</b> euro-dollar, de 14 h à 17 h (heure de Paris) ; setup : retour sur un support et bougie qui le rejette ;
        stop juste sous le support ; 1 % au plus (20 $ sur 2 000 $) ; sortie au dernier sommet ; jamais avant une annonce forte, jamais de stop reculé.
      </div>
      <p className="text-[0.88rem] italic" style={{ color: "var(--cap-amber-ink)", fontFamily: "var(--cap-font-display)" }}>Situation {k + 1} sur {SITUATIONS.length}</p>
      <p className="mt-1 text-[1.02rem] leading-relaxed" style={{ color: "var(--cap-ink)" }}>{s.texte}</p>
      <div className="mt-3">
        <ChoixInd label="Votre décision" valeur={rep} onChange={repondre} desactive={rep != null}
          options={[{ v: "oui" as const, texte: "J'entre" }, { v: "non" as const, texte: "Je n'entre pas" }]}
          etat={(v) => (rep == null ? null : (v === "oui") === entrer ? "juste" : v === rep ? "faux" : null)} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2" aria-hidden={rep == null}>
        {NOMS.map((nom, j) => {
          const allume = rep != null;
          const ok = s.cases[j];
          return (
            <span key={nom} className="inline-flex items-center gap-2 text-[0.93rem]" style={{ color: "var(--cap-ink-2)" }}>
              <span className="h-3.5 w-3.5 rounded-full" style={{
                backgroundColor: !allume ? "var(--cap-line-strong)" : ok ? "var(--cap-up)" : "var(--cap-down)",
                transition: transitionInd(calme, "background-color", 250), transitionDelay: calme ? undefined : `${j * 180}ms`,
              }} />
              {nom}{allume ? (ok ? " : oui" : " : non") : ""}
            </span>
          );
        })}
        {rep != null && s.jamais && (
          <span className="inline-flex items-center gap-2 text-[0.93rem] font-semibold" style={{ color: "var(--cap-down)" }}>
            <span aria-hidden className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[0.7rem]" style={{ boxShadow: "inset 0 0 0 2px var(--cap-down)" }}>/</span>
            Jamais : {s.jamais.toLowerCase()}
          </span>
        )}
      </div>

      {rep != null && (
        <div className="mt-3">
          <LectureInd ton={juste ? "juste" : "faux"}>
            <p><b style={{ color: juste ? "var(--cap-up)" : "var(--cap-down)" }}>{entrer ? "Vous pouvez entrer." : "Vous n'entrez pas."}</b> {s.pourquoi}</p>
            {fin && <p className="mt-1.5">Bilan : {score} bonne{score > 1 ? "s" : ""} décision{score > 1 ? "s" : ""} sur {SITUATIONS.length}. Une seule de ces cinq situations permettait d'entrer : la plupart du temps, le plan dit d'attendre.</p>}
          </LectureInd>
        </div>
      )}
      <div className="mt-3 flex justify-end gap-2">
        {fin
          ? <RecommencerInd onClick={() => { setK(0); setRep(null); setScore(0); }} />
          : rep != null && <BoutonInd onClick={() => { setK(k + 1); setRep(null); }}>Situation suivante</BoutonInd>}
      </div>
    </div>
  );
}
