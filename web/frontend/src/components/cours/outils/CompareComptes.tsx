"use client";

import { useState } from "react";
import { Curseur, Ligne, Lignes, Verdict, nb, usd } from "./ElementsRisque";

/**
 * Deux comptes, deux façons de faire payer : un spread plus large sans
 * commission, ou un spread serré plus une commission. Lequel coûte le moins
 * dépend des chiffres : on les compare sur un mois de trades à 0,10 lot.
 */
export function CompareComptes() {
  const [spreadStd, setSpreadStd] = useState(1.2);
  const [trades, setTrades] = useState(20);
  const taille = 0.1;
  const spreadSerre = 0.3, commission = 7;

  const parTradeStd = spreadStd * 10 * taille;
  const parTradeCom = spreadSerre * 10 * taille + commission * taille;
  const moisStd = parTradeStd * trades, moisCom = parTradeCom * trades;
  const ecart = Math.abs(moisStd - moisCom);
  const equivalent = spreadSerre + commission / 10; // la commission convertie en pips

  return (
    <div>
      <div className="grid gap-x-8 sm:grid-cols-2">
        <Curseur label="Spread du compte standard" valeur={spreadStd} texte={`${nb(spreadStd, 1)} pip`} min={0.5} max={2} pas={0.1}
          onChange={(v) => setSpreadStd(Math.round(v * 10) / 10)} aide="Sans commission." />
        <Curseur label="Trades par mois, à 0,10 lot" valeur={trades} texte={`${trades}`} min={1} max={60} pas={1} onChange={setTrades} />
      </div>
      <div className="mt-2 grid gap-x-8 sm:grid-cols-2">
        <div>
          <p className="text-[0.92rem] italic" style={{ color: "var(--cap-ink-3)", fontFamily: "var(--cap-font-display)" }}>Compte standard</p>
          <Lignes>
            <Ligne label={`Spread ${nb(spreadStd, 1)} pip`} valeur={usd(parTradeStd, 2)} />
            <Ligne label="Par mois" fort valeur={usd(moisStd, 2)} />
          </Lignes>
        </div>
        <div>
          <p className="text-[0.92rem] italic" style={{ color: "var(--cap-ink-3)", fontFamily: "var(--cap-font-display)" }}>Compte à commission</p>
          <Lignes>
            <Ligne label={`Spread 0,3 pip + 7 $ par lot`} valeur={usd(parTradeCom, 2)} />
            <Ligne label="Par mois" fort valeur={usd(moisCom, 2)} />
          </Lignes>
        </div>
      </div>
      <Verdict>
        {ecart < 0.005
          ? `Égalité : avec ${nb(spreadStd, 1)} pip de spread, les deux comptes coûtent pareil.`
          : `Le compte ${moisStd < moisCom ? "standard" : "à commission"} coûte ${usd(ecart, 2)} de moins par mois.`}
        {" "}Pour comparer, convertissez la commission en pips : 7 $ par lot, c'est 0,7 pip. Le compte à commission revient donc à {nb(equivalent, 1)} pip par trade ;
        il gagne dès que le spread standard dépasse {nb(equivalent, 1)} pip.
      </Verdict>
    </div>
  );
}
