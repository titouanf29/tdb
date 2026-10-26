"use client";

import { useState } from "react";
import { Chiffre, Choix, Curseur, dollars, nb, Pas, Verdict } from "./ElementsMarches";

/**
 * Le calcul de la taille sur l'or : on part de la perte qu'on accepte (1 % du
 * compte), on la divise par ce que perdrait un lot entier jusqu'au stop (la
 * distance du stop × 100 onces), et l'on arrondit vers le bas.
 */

export function TailleOr() {
  const [compte, setCompte] = useState(2000);
  const [risque, setRisque] = useState(1);
  const [stop, setStop] = useState(10);

  const perteMax = (compte * risque) / 100;
  const parLot = stop * 100;
  const brut = perteMax / parLot;
  const taille = Math.floor(brut * 100 + 1e-9) / 100;
  const reel = taille * parLot;
  const marge = (taille * 100 * 4000) / 20;

  return (
    <div>
      <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
        <Pas label="Le compte" valeur={compte} affiche={dollars(compte)}
          onMoins={() => setCompte((c) => Math.max(500, c - 500))} onPlus={() => setCompte((c) => Math.min(20000, c + 500))}
          moinsOff={compte <= 500} plusOff={compte >= 20000} />
        <Choix label="La perte acceptée par trade" valeur={risque} onChange={setRisque} petit
          options={[{ v: 0.5, t: "0,5 %" }, { v: 1, t: "1 %" }, { v: 2, t: "2 %" }]} />
      </div>
      <div className="mt-3">
        <Curseur label="La distance du stop (entrée à 4 000 $)" min={2} max={40} step={1} valeur={stop} onChange={setStop}
          affiche={`${dollars(stop)}, stop à ${nb(4000 - stop)} $`} />
      </div>

      <div className="mt-4 rounded-[12px] px-4 py-3 text-[1.02rem] leading-relaxed" style={{ backgroundColor: "var(--cap-surface-2)", color: "var(--cap-ink)" }}>
        <p><span style={{ color: "var(--cap-ink-3)" }}>1.</span> La perte acceptée : {nb(risque, risque % 1 ? 1 : 0)} % de {dollars(compte)} = <b>{dollars(perteMax, perteMax % 1 ? 2 : 0)}</b></p>
        <p><span style={{ color: "var(--cap-ink-3)" }}>2.</span> Ce que perdrait 1 lot jusqu&apos;au stop : {dollars(stop)} × 100 onces = <b>{dollars(parLot)}</b></p>
        <p><span style={{ color: "var(--cap-ink-3)" }}>3.</span> La taille : {dollars(perteMax, perteMax % 1 ? 2 : 0)} ÷ {dollars(parLot)} = {nb(brut, 4)}, arrondi vers le bas : <b className="cap-chiffre">{taille < 0.01 ? "moins de 0,01\u00a0lot" : `${nb(taille, 2)}\u00a0lot`}</b></p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {taille < 0.01 ? (
          <Chiffre label="Taille" valeur="Aucune" grand couleur="var(--cap-down)" note={"sous 0,01\u00a0lot, la plus petite taille"} />
        ) : (
          <>
            <Chiffre label="Taille" valeur={`${nb(taille, 2)}\u00a0lot`} grand couleur="var(--cap-amber-ink)" note={`${nb(taille * 100, 0)}\u00a0once${taille * 100 > 1 ? "s" : ""}`} />
            <Chiffre label="Perte si le stop est touché" valeur={dollars(reel, reel % 1 ? 2 : 0)} note="sans compter le spread ni le slippage" />
            <Chiffre label="Marge au levier 20" valeur={dollars(marge)} />
          </>
        )}
      </div>

      <Verdict couleur={taille < 0.01 ? "var(--cap-down)" : "var(--cap-up)"}>
        {taille < 0.01
          ? <>La taille calculée est <b>plus petite que 0,01 lot</b>, la plus petite taille possible. Même 0,01 lot ferait perdre {dollars(stop)} au stop, plus que vos {dollars(perteMax, perteMax % 1 ? 2 : 0)}. Ce trade est trop grand pour ce compte : on ne le prend pas, ou l&apos;on attend un stop plus proche et logique.</>
          : <>Avec <b>{nb(taille, 2)} lot</b>, si le stop est touché, vous perdez <b>{dollars(reel, reel % 1 ? 2 : 0)}</b>, soit {nb((reel / compte) * 100, 2)} % du compte. On arrondit toujours <b>vers le bas</b> : un peu moins de risque, jamais plus. Un stop plus loin donne une taille plus petite, pour la même perte.</>}
      </Verdict>
    </div>
  );
}
