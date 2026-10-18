"use client";

import { useState } from "react";
import { ChoixInd, CurseurInd, LectureInd, nf, transitionInd, useCalmeInd } from "./ElementsIndicateurs";

/**
 * Le premier réglage d'un compte démo : la somme de départ. On applique la
 * même règle (1 % de risque, un stop de 20 pips sur l'euro-dollar) et on voit
 * la taille que l'on prend l'habitude de saisir… puis ce que cette même
 * taille coûterait sur le vrai compte.
 */
const PIP_PAR_LOT = 10; // euro-dollar : 1 pip vaut 10 $ pour 1 lot
const STOP = 20;

export function CapitalDemo() {
  const [demo, setDemo] = useState(100000);
  const [reel, setReel] = useState(2000);
  const calme = useCalmeInd();

  const risqueDemo = demo * 0.01;
  const taille = risqueDemo / (STOP * PIP_PAR_LOT);
  const perteReel = taille * STOP * PIP_PAR_LOT;
  const partReel = (perteReel / reel) * 100;
  const bonneTaille = (reel * 0.01) / (STOP * PIP_PAR_LOT);
  const ecrireLots = (l: number) => (Number.isInteger(l) ? nf(l) : nf(l, Math.abs(l * 100 - Math.round(l * 100)) < 1e-9 ? 2 : 3));
  const largeur = Math.min(100, partReel);
  const aligne = Math.abs(demo - reel) < 1;

  return (
    <div>
      <p className="mb-1 text-[0.95rem]" style={{ color: "var(--cap-ink-2)" }}>Le capital fictif du compte démo :</p>
      <ChoixInd label="Capital fictif du compte démo" valeur={demo} onChange={setDemo}
        options={[{ v: 100000, texte: "100 000 $" }, { v: 10000, texte: "10 000 $" }, { v: reel, texte: `${nf(reel)} $ (ce que je déposerais)` }]} />
      <div className="mt-3">
        <CurseurInd id="depot-reel" label="Ce que vous déposeriez vraiment" valeur={reel} min={500} max={10000} pas={500}
          onChange={(v) => { if (aligne) setDemo(v); setReel(v); }} ecrire={(v) => `${nf(v)} $`} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[12px] px-4 py-3" style={{ backgroundColor: "var(--cap-surface-2)" }}>
          <p className="text-[0.88rem] italic" style={{ color: "var(--cap-ink-3)", fontFamily: "var(--cap-font-display)" }}>En démo, avec {nf(demo)} $</p>
          <p className="mt-1 text-[0.98rem] tabular-nums" style={{ color: "var(--cap-ink-2)" }}>
            1 % = {nf(risqueDemo)} $. Stop de 20 pips à 10 $ par lot : taille = {nf(risqueDemo)} ÷ (20 × 10) =
          </p>
          <p className="mt-1 text-[1.5rem] font-semibold tabular-nums" style={{ color: "var(--cap-ink)", fontFamily: "var(--cap-font-display)" }}>{ecrireLots(taille)} lot{taille >= 2 ? "s" : ""}</p>
          <p className="text-[0.9rem]" style={{ color: "var(--cap-ink-3)" }}>C'est le chiffre que vos doigts apprennent à taper.</p>
        </div>
        <div className="rounded-[12px] px-4 py-3" style={{ backgroundColor: "var(--cap-surface-2)" }}>
          <p className="text-[0.88rem] italic" style={{ color: "var(--cap-ink-3)", fontFamily: "var(--cap-font-display)" }}>Le même ordre, en réel, sur {nf(reel)} $</p>
          <p className="mt-1 text-[0.98rem] tabular-nums" style={{ color: "var(--cap-ink-2)" }}>
            Si le stop est touché : {ecrireLots(taille)} × 20 × 10 = {nf(perteReel)} $, soit
          </p>
          <p className="mt-1 text-[1.5rem] font-semibold tabular-nums" style={{ color: partReel > 1.0001 ? "var(--cap-down)" : "var(--cap-ink)", fontFamily: "var(--cap-font-display)" }}>
            {nf(partReel, partReel < 10 ? 1 : 0)} % du compte
          </p>
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: "var(--cap-line)" }} aria-hidden>
            <div className="h-full rounded-full" style={{ width: `${Math.max(1.5, largeur)}%`, backgroundColor: partReel > 1.0001 ? "var(--cap-down)" : "var(--cap-ink-2)", transition: transitionInd(calme, "width", 400) }} />
          </div>
        </div>
      </div>
      <div className="mt-3">
        <LectureInd ton={partReel > 1.0001 ? "faux" : "juste"}>
          {partReel > 1.0001
            ? <p>Avec {nf(demo)} $ fictifs, vous prenez l'habitude de {ecrireLots(taille)} lot{taille >= 2 ? "s" : ""}. Sur votre vrai compte, cette taille risque <b style={{ color: "var(--cap-ink)" }}>{nf(partReel, partReel < 10 ? 1 : 0)} %</b> à chaque position{partReel >= 100 ? " : un seul stop vide le compte" : ""}. La bonne taille pour {nf(reel)} $ est <b style={{ color: "var(--cap-ink)" }}>{ecrireLots(bonneTaille)} lot</b>.</p>
            : <p>Le compte démo a la taille de votre vrai dépôt : la taille que vous apprenez (<b style={{ color: "var(--cap-ink)" }}>{ecrireLots(taille)} lot</b>), les gains et les pertes que vous voyez sont ceux que vous auriez en réel. C'est le bon réglage.</p>}
        </LectureInd>
      </div>
    </div>
  );
}
