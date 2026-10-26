"use client";

import { useState } from "react";
import { fmt } from "@/lib/cours/marche";
import {
  ChampNombre, Choix, Curseur, Etiquette, INSTRUMENTS, Verdict, calculTaille, ecrireStop, lireNombre, lots, pct, usd, type Instrument,
} from "./ElementsRisque";

/**
 * Le calculateur de taille, en trois étapes écrites en clair : le risque en
 * argent, la distance du stop, la valeur par lot. Puis la division, l'arrondi
 * vers le bas, et la vérification.
 */
export function CalculTaille() {
  const [inst, setInst] = useState<Instrument>("eurusd");
  const [capitalTxt, setCapitalTxt] = useState("2000");
  const [risquePct, setRisquePct] = useState(1);
  const [stops, setStops] = useState<Record<Instrument, number>>({ eurusd: 20, or: 10 });

  const stop = stops[inst];
  const capitalLu = lireNombre(capitalTxt);
  const capital = capitalLu != null && capitalLu > 0 ? capitalLu : 0;
  const I = INSTRUMENTS[inst];
  const r = calculTaille(inst, capital, risquePct, stop);
  const arrondi = r.taille < r.brute - 1e-9;
  const tropPetit = capital > 0 && r.taille < 0.01;
  const minRisque = 0.01 * r.parLot;

  return (
    <div>
      <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
        <Choix label="Ce que vous tradez" valeur={inst} onChange={setInst}
          options={[{ v: "eurusd", texte: "Euro-dollar" }, { v: "or", texte: "Or" }]} />
        <Choix label="Part du compte risquée" valeur={risquePct} onChange={setRisquePct}
          options={[0.5, 1, 2].map((v) => ({ v, texte: pct(v, v === 0.5 ? 1 : 0) }))} />
      </div>

      <ol className="mt-4 space-y-4">
        <li className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-2">
          <span className="text-[1.3rem] italic leading-none" style={{ color: "var(--cap-amber-ink)", fontFamily: "var(--cap-font-display)" }}>1</span>
          <div>
            <Etiquette>Votre risque en argent</Etiquette>
            <div className="flex flex-wrap items-baseline gap-x-4">
              <ChampNombre id="ct-capital" label="Compte" valeur={capitalTxt} onChange={setCapitalTxt} suffixe="$" />
              <p className="text-[0.98rem]" style={{ color: "var(--cap-ink-2)" }}>
                {pct(risquePct, risquePct === 0.5 ? 1 : 0)} de {usd(capital)} = <b style={{ color: "var(--cap-ink)" }}>{usd(r.risque)}</b>
              </p>
            </div>
          </div>
        </li>
        <li className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-2">
          <span className="text-[1.3rem] italic leading-none" style={{ color: "var(--cap-amber-ink)", fontFamily: "var(--cap-font-display)" }}>2</span>
          <div>
            <Etiquette>La distance de votre stop, posé d'abord sur le graphique</Etiquette>
            <Curseur label={inst === "eurusd" ? "Stop, en pips" : "Stop, en dollars de prix"} valeur={stop} texte={ecrireStop(inst, stop)}
              min={inst === "eurusd" ? 5 : 2} max={inst === "eurusd" ? 80 : 40} pas={inst === "eurusd" ? 1 : 0.5}
              onChange={(v) => setStops((s) => ({ ...s, [inst]: v }))} />
          </div>
        </li>
        <li className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-2">
          <span className="text-[1.3rem] italic leading-none" style={{ color: "var(--cap-amber-ink)", fontFamily: "var(--cap-font-display)" }}>3</span>
          <div>
            <Etiquette>Ce que vaut ce mouvement, pour un lot</Etiquette>
            <p className="text-[0.98rem]" style={{ color: "var(--cap-ink-2)" }}>{I.explication}</p>
          </div>
        </li>
      </ol>

      <div className="mt-5 rounded-[12px] px-4 py-3" style={{ backgroundColor: "var(--cap-surface-2)" }}>
        <p className="text-[1rem] leading-[1.9] tabular-nums" style={{ color: "var(--cap-ink-2)" }}>
          Un lot perdrait : {ecrireStop(inst, stop)} × {usd(I.parLot)} = <b style={{ color: "var(--cap-ink)" }}>{usd(r.parLot)} par lot</b>
          <br />Votre taille : {usd(r.risque)} ÷ {usd(r.parLot)} = <b style={{ color: "var(--cap-ink)" }}>{fmt(r.brute, 3)} lot</b>
          {arrondi && !tropPetit && <><br />Arrondi vers le bas, au centième : <b style={{ color: "var(--cap-ink)" }}>{lots(r.taille)}</b></>}
        </p>
        <p className="mt-1 text-[2rem] font-semibold leading-tight" style={{ fontFamily: "var(--cap-font-display)", color: "var(--cap-ink)" }} aria-live="polite">
          {tropPetit ? "Trop petit" : lots(r.taille)}
        </p>
      </div>

      {capital <= 0 ? (
        <Verdict ton="mal">Écrivez le montant de votre compte, en dollars.</Verdict>
      ) : tropPetit ? (
        <Verdict ton="mal">
          Le calcul donne {fmt(r.brute, 3)} lot, sous la plus petite taille possible, 0,01 lot. Même 0,01 lot risquerait {usd(minRisque)}, plus que vos {usd(r.risque)}.
          Ce trade est trop gros pour ce compte avec ce stop : passez votre tour. Ne rapprochez pas le stop juste pour faire entrer la taille.
        </Verdict>
      ) : (
        <Verdict ton="bien">
          Vérification : à {lots(r.taille)}, {inst === "eurusd" ? "un pip vaut" : "1 $ de mouvement vaut"} {usd(r.taille * I.parLot)}.
          {" "}{ecrireStop(inst, stop)} de stop font {usd(r.reel)}, soit {pct(r.reelPct, Math.abs(r.reelPct - Math.round(r.reelPct)) < 0.001 ? 0 : 2)} du compte{arrondi ? ` : un peu moins que ${usd(r.risque)}, parce qu'on a arrondi vers le bas.` : ", pile."}
        </Verdict>
      )}
    </div>
  );
}
