"use client";

import { useState } from "react";
import { Chiffre, Choix, Curseur, dollars, nb, useAnimer, Verdict } from "./ElementsMarches";

/**
 * « 10 $ de mouvement, combien pour moi ? » Un lot d'or, c'est 100 onces :
 * chaque dollar de mouvement vaut 100 $. On choisit le mouvement et la taille,
 * et l'on voit le gain ou la perte, la valeur de la position, la marge à un
 * levier de 20, et ce que ça pèse sur un compte de 2 000 $.
 */

const TAILLES = [
  { lots: 1, nom: "1 lot", onces: 100 },
  { lots: 0.1, nom: "0,10 lot", onces: 10 },
  { lots: 0.01, nom: "0,01 lot", onces: 1 },
];
const PRIX = 4000, COMPTE = 2000;

export function ConvertisseurOr() {
  const animer = useAnimer();
  const [mouvement, setMouvement] = useState(10);
  const [k, setK] = useState(1);
  const t = TAILLES[k];
  const montant = mouvement * t.onces;
  const part = (montant / COMPTE) * 100;
  const valeur = PRIX * t.onces;
  const marge = valeur / 20;

  return (
    <div>
      <Curseur label="Le mouvement de l'once" min={1} max={100} step={1} valeur={mouvement} onChange={setMouvement} affiche={dollars(mouvement)} />
      <ul className="mt-3 space-y-3">
        {TAILLES.map((s, i) => {
          const m = mouvement * s.onces;
          return (
            <li key={s.nom}>
              <button type="button" onClick={() => setK(i)} aria-pressed={i === k}
                className="grid min-h-11 w-full grid-cols-[5.2rem_minmax(0,1fr)_auto] items-center gap-x-3 text-left">
                <span className="text-[0.97rem]" style={{ color: i === k ? "var(--cap-ink)" : "var(--cap-ink-2)", fontWeight: i === k ? 650 : 500 }}>
                  {s.nom}
                  <span className="block text-[0.8rem] font-normal" style={{ color: "var(--cap-ink-3)" }}>{s.onces} once{s.onces > 1 ? "s" : ""}</span>
                </span>
                <span className="relative h-3 overflow-hidden rounded-full" style={{ backgroundColor: "var(--cap-line)" }} aria-hidden>
                  <span className="absolute inset-y-0 left-0 rounded-full" style={{
                    width: `${Math.max(1.5, Math.min(100, (m / 10000) * 100))}%`,
                    backgroundColor: i === k ? "var(--cap-ink)" : "var(--cap-ink-4)",
                    transition: animer ? "width .35s ease" : undefined,
                  }} />
                </span>
                <span className="min-w-[5.5rem] text-right text-[1.05rem] font-semibold tabular-nums" style={{ color: "var(--cap-ink)", fontFamily: "var(--cap-font-display)" }}>{dollars(m)}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-1 text-[0.84rem]" style={{ color: "var(--cap-ink-3)" }}>La barre est pleine à 10 000 $. Touchez une taille pour le détail.</p>

      <div className="mt-4">
        <Choix label="La taille regardée" valeur={k} onChange={setK} petit options={TAILLES.map((s, i) => ({ v: i, t: s.nom }))} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Chiffre label="Valeur de la position" valeur={dollars(valeur)} note={`${t.onces} × 4 000 $`} />
        <Chiffre label="Marge au levier 20" valeur={dollars(marge)} note="5 % de la valeur" />
        <Chiffre label={`Pour ${dollars(mouvement)} de mouvement`} valeur={dollars(montant)} couleur="var(--cap-amber-ink)" />
        <Chiffre label="Sur un compte de 2 000 $" valeur={`${nb(part, part < 10 ? 1 : 0)} %`} couleur={part >= 10 ? "var(--cap-down)" : undefined} />
      </div>
      <Verdict couleur={part >= 10 ? "var(--cap-down)" : "var(--cap-line-strong)"}>
        Avec <b>{t.nom}</b>, chaque dollar de mouvement vaut <b>{dollars(t.onces)}</b>. {mouvement} $ de mouvement, c&apos;est donc <b>{dollars(montant)}</b>, gagnés ou perdus.{" "}
        {part >= 100 ? "Plus que tout le compte de 2 000 $ : il serait vidé, et au-delà." : part >= 10 ? "Plus d'un dixième du compte, sur un seul mouvement : bien trop pour un débutant." : marge >= COMPTE ? "Le mouvement reste petit, mais la marge demandée est déjà celle de tout le compte." : "Une perte que le compte encaisse sans danger."}
      </Verdict>
    </div>
  );
}
