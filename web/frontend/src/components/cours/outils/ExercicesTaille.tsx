"use client";

import { useState } from "react";
import { fmt } from "@/lib/cours/marche";
import {
  Bouton, BoutonLien, ChampNombre, INSTRUMENTS, Verdict, calculTaille, ecrireStop, lireNombre, lots, pct, usd, type Instrument,
} from "./ElementsRisque";

/**
 * Cinq calculs de taille, l'un après l'autre. L'élève écrit sa réponse, puis
 * lit la correction, étape par étape. Les erreurs courantes (arrondir vers le
 * haut, une virgule mal placée) ont leur propre explication.
 */
type Exo = { inst: Instrument; capital: number; risquePct: number; stop: number };

const EXOS: Exo[] = [
  { inst: "eurusd", capital: 2000, risquePct: 1, stop: 25 },
  { inst: "or", capital: 2000, risquePct: 1, stop: 10 },
  { inst: "eurusd", capital: 2000, risquePct: 1, stop: 16 },
  { inst: "eurusd", capital: 5000, risquePct: 1, stop: 30 },
  { inst: "or", capital: 2000, risquePct: 1, stop: 8 },
];

export function ExercicesTaille() {
  const [k, setK] = useState(0);
  const [txt, setTxt] = useState("");
  const [vu, setVu] = useState(false);
  const [justes, setJustes] = useState<boolean[]>([]);

  const fini = k >= EXOS.length;
  const e = EXOS[Math.min(k, EXOS.length - 1)];
  const r = calculTaille(e.inst, e.capital, e.risquePct, e.stop);
  const rep = lireNombre(txt);
  const juste = rep != null && Math.abs(rep - r.taille) < 0.0005;

  let indice = "";
  if (vu && !juste && rep != null) {
    const haut = Math.ceil(r.brute * 100 - 1e-9) / 100;
    if (Math.abs(rep - haut) < 0.0005 && haut !== r.taille) indice = `Vous avez arrondi vers le haut : ${lots(haut)} risquerait ${usd(haut * r.parLot)}, plus que ${usd(r.risque)}. On arrondit toujours vers le bas.`;
    else if (Math.abs(rep - r.taille * 10) < 0.0005 || Math.abs(rep - r.taille / 10) < 0.00005) indice = "Une virgule s'est déplacée. Refaites la vérification : à votre taille, combien coûterait le stop ?";
    else if (Math.abs(rep - r.brute) < 0.0005) indice = "Le calcul est juste, il manque l'arrondi : une taille s'écrit au centième de lot, arrondie vers le bas.";
    else indice = `À ${lots(rep)}, le stop coûterait ${usd(rep * r.parLot)}, au lieu de ${usd(r.risque)}.`;
  }

  const verifier = () => { setVu(true); setJustes((j) => { const c = j.slice(); c[k] = juste; return c; }); };
  const suivant = () => { setK(k + 1); setTxt(""); setVu(false); };
  const recommencer = () => { setK(0); setTxt(""); setVu(false); setJustes([]); };

  if (fini) {
    const n = justes.filter(Boolean).length;
    return (
      <div>
        <p className="text-[1.6rem] font-semibold" style={{ fontFamily: "var(--cap-font-display)", color: "var(--cap-ink)" }} aria-live="polite">
          {n} sur {EXOS.length}
        </p>
        <p className="mt-1 text-[0.98rem]" style={{ color: "var(--cap-ink-2)" }}>
          {n === EXOS.length ? "Tout juste. Ce calcul vous prendra dix secondes avant chaque trade : c'est la meilleure assurance qui soit." : "Reprenez ceux qui ont coincé : la méthode est toujours la même, risque, stop, valeur par lot."}
        </p>
        <div className="mt-2"><BoutonLien onClick={recommencer}>Recommencer les exercices</BoutonLien></div>
      </div>
    );
  }

  const I = INSTRUMENTS[e.inst];
  return (
    <div>
      <p className="text-[0.9rem] italic" style={{ color: "var(--cap-ink-3)", fontFamily: "var(--cap-font-display)" }}>
        Exercice {k + 1} sur {EXOS.length}
      </p>
      <p className="mt-1 text-[1.05rem] leading-relaxed" style={{ color: "var(--cap-ink)" }}>
        Compte de <b>{usd(e.capital)}</b>, risque de <b>{pct(e.risquePct)}</b>. Vous achetez {e.inst === "eurusd" ? "l'euro-dollar" : "l'or"} avec un stop à <b>{ecrireStop(e.inst, e.stop)}</b> de l'entrée.
        Quelle taille prenez-vous ?
      </p>
      <div className="mt-2 flex flex-wrap items-end gap-x-4 gap-y-2">
        <ChampNombre id={`exo-taille-${k}`} label="Votre taille" valeur={txt} onChange={(s) => { setTxt(s); setVu(false); }} suffixe="lot" />
        {!vu && <Bouton onClick={verifier} disabled={rep == null}>Vérifier</Bouton>}
      </div>

      {vu && (
        <>
          <Verdict ton={juste ? "bien" : "mal"}>
            {juste ? `Juste : ${lots(r.taille)}.` : `Pas tout à fait : la bonne taille est ${lots(r.taille)}. ${indice}`}
          </Verdict>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-[0.97rem] tabular-nums" style={{ color: "var(--cap-ink-2)" }}>
            <li>Le risque : {pct(e.risquePct)} de {usd(e.capital)} = <b style={{ color: "var(--cap-ink)" }}>{usd(r.risque)}</b>.</li>
            <li>Le stop : {ecrireStop(e.inst, e.stop)}. {I.explication} Un lot perdrait {ecrireStop(e.inst, e.stop)} × {usd(I.parLot)} = <b style={{ color: "var(--cap-ink)" }}>{usd(r.parLot)}</b>.</li>
            <li>La taille : {usd(r.risque)} ÷ {usd(r.parLot)} = {r.taille < r.brute - 1e-9 ? `${fmt(r.brute, 4).replace(/0+$/, "")}, arrondi vers le bas : ${lots(r.taille)}` : lots(r.taille)}.</li>
            <li>La vérification : {lots(r.taille)} × {usd(r.parLot)} = {usd(r.reel)}{r.reel < r.risque - 1e-9 ? `, sous ${usd(r.risque)}` : `, soit ${pct(e.risquePct)}`}.</li>
          </ol>
          <div className="mt-3"><Bouton onClick={suivant}>{k < EXOS.length - 1 ? "Exercice suivant" : "Voir mon score"}</Bouton></div>
        </>
      )}
    </div>
  );
}
