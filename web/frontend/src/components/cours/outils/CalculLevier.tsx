"use client";

import { useRef, useState } from "react";
import { Choix, Chiffre, Curseur, Lien, Verdict, dollars, euros, nb } from "./ElementsOrdres";

/**
 * Leçon 18. Le capital, le levier (plafonné à 30 pour un particulier en
 * Europe sur les grandes paires), la taille : ce que la plateforme bloque
 * (la marge), ce que coûte 1 % contre vous, et la valeur du pip, qui ne bouge
 * pas quand on change le levier.
 */

const LEVIERS = [1, 5, 10, 20, 30, 100];

export function CalculLevier() {
  const [capital, setCapital] = useState(1000);
  const [levier, setLevier] = useState(30);
  const [lots, setLots] = useState(0.1);
  const [refus, setRefus] = useState(false);
  const avant = useRef<{ levier: number; marge: number } | null>(null);

  const max = Math.floor((capital * levier) / 100000 / 0.01 + 1e-9) * 0.01;
  const taille = Math.min(lots, max);
  const position = taille * 100000; // en euros
  const marge = position / levier;
  const pip = taille * 10; // en dollars
  const unPourcent = position * 0.01;
  const stop20 = pip * 20;

  const choisirLevier = (v: number) => {
    if (v > 30) { setRefus(true); return; }
    setRefus(false);
    avant.current = { levier, marge };
    setLevier(v);
  };
  const changeLevier = avant.current && avant.current.levier !== levier ? avant.current : null;

  return (
    <div>
      <div className="grid gap-x-8 sm:grid-cols-2">
        <Curseur label="Votre capital" min={1000} max={10000} step={500} valeur={capital} onChange={(v) => { avant.current = null; setCapital(v); }} affiche={euros(capital)} />
        <Curseur label="Votre taille sur l'euro-dollar" min={0.01} max={Math.max(0.01, max)} step={0.01} valeur={taille} onChange={(v) => { avant.current = null; setLots(v); }}
          affiche={`${nb(taille, 2)} lot (${euros(position)})`} />
      </div>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-x-6">
        <Choix label="Le levier" valeur={levier} onChange={choisirLevier}
          options={LEVIERS.map((v) => ({ v, t: v > 30 ? "100 ?" : `${v}` }))} />
        <Lien onClick={() => { avant.current = null; setLots(max); }}>Prendre tout le levier ({nb(max, 2)} lot)</Lien>
      </div>
      {refus && (
        <p className="mt-2 border-l-[3px] pl-3 text-[0.95rem]" role="alert" style={{ color: "var(--cap-ink)", borderColor: "var(--cap-ambre)" }}>
          Pas pour un particulier en Europe : le levier est plafonné à <b>30</b> sur les grandes paires du forex (20 sur l'or). Certains sites étrangers proposent 100 ou 500 : c'est justement ce que la règle veut éviter.
        </p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3" aria-live="polite">
        <Chiffre label="Position ouverte" valeur={euros(position)} note={`${nb(position / capital, Number.isInteger(Math.round(position / capital * 10) / 10) ? 0 : 1)} fois votre capital`} />
        <Chiffre label="Marge bloquée" valeur={euros(marge, marge < 100 ? 2 : 0)} note={`${nb((marge / capital) * 100)} % du capital`} />
        <Chiffre label="Valeur d'un pip" valeur={dollars(pip, pip < 1 ? 2 : 0)} couleur="var(--cap-amber-ink)" note="Elle ne dépend que de la taille." />
        <Chiffre label="1 % contre vous" valeur={`−${euros(unPourcent)}`} couleur="var(--cap-down)" note={`${nb((unPourcent / capital) * 100, unPourcent / capital < 0.1 ? 1 : 0)} % du capital`} />
        <Chiffre label="Un stop de 20 pips" valeur={`−${dollars(stop20)}`} couleur="var(--cap-down)" note="20 pips × la valeur du pip" />
      </div>

      <Verdict couleur={unPourcent / capital >= 0.1 ? "var(--cap-down)" : undefined}>
        {changeLevier
          ? <>Vous êtes passé d'un levier de {changeLevier.levier} à {levier}. La marge bloquée passe de {euros(changeLevier.marge, changeLevier.marge < 100 ? 2 : 0)} à <b>{euros(marge, marge < 100 ? 2 : 0)}</b>. Mais la valeur du pip, elle, reste <b>{dollars(pip, pip < 1 ? 2 : 0)}</b> : pour la même taille, le même mouvement vous coûte exactement pareil.</>
          : unPourcent / capital >= 0.1
            ? <>Avec cette taille, un mouvement de seulement 1 % contre vous emporte <b>{nb((unPourcent / capital) * 100)} % de votre compte</b>. Le levier vous a permis d'ouvrir gros : c'est la taille qui fait le risque.</>
            : <>Changez le levier sans toucher à la taille : regardez ce qui bouge (la marge) et ce qui ne bouge pas (la valeur du pip). Puis prenez tout le levier.</>}
      </Verdict>
    </div>
  );
}
