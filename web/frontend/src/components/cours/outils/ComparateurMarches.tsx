"use client";

import { useState } from "react";
import { Choix, Recommencer, useAnimer } from "./ElementsMarches";

/**
 * Le comparateur : trois questions (quand vous êtes libre, combien de temps,
 * votre rapport au risque), et les cinq marchés classés, chacun avec ses
 * raisons. Une aide pour réfléchir, pas un conseil.
 */

type Libre = "matin" | "journee" | "soir" | "weekend";
type Temps = "court" | "moyen" | "long";
type Risque = "prudent" | "modere" | "fort";
type Cle = "fx" | "or" | "crypto" | "eu" | "us";

const NOMS: Record<Cle, string> = {
  fx: "Le forex (euro-dollar)",
  or: "L'or (XAUUSD)",
  crypto: "La crypto (Bitcoin)",
  eu: "Les indices et actions européens (CAC 40, DAX)",
  us: "Les indices et actions américains (S&P 500, Nasdaq)",
};

// 0 : fermé, 1 : ouvert mais calme, 2 : ouvert et actif.
const DISPO: Record<Libre, Record<Cle, number>> = {
  matin: { fx: 1, or: 1, crypto: 1, eu: 0, us: 0 },
  journee: { fx: 2, or: 2, crypto: 1, eu: 2, us: 1 },
  soir: { fx: 1, or: 1, crypto: 1, eu: 0, us: 2 },
  weekend: { fx: 0, or: 0, crypto: 2, eu: 0, us: 0 },
};
const DISPO_TXT: Record<Libre, Record<Cle, string>> = {
  matin: { fx: "Ouvert tôt le matin, mais calme (la session asiatique).", or: "Ouvert, souvent calme avant l'Europe.", crypto: "Ouverte, comme toujours.", eu: "Fermé avant 9 h.", us: "Fermé le matin (ouvre à 15 h 30, heure de Paris)." },
  journee: { fx: "En pleine activité : Londres, puis le chevauchement avec New York.", or: "Actif l'après-midi, quand Londres et New York sont ouverts.", crypto: "Ouverte, assez active.", eu: "Ouvert de 9 h à 17 h 30 : vos heures.", us: "Seulement à partir de 15 h 30." },
  soir: { fx: "Ouvert, mais plus calme après 18 h.", or: "Ouvert, plus calme le soir.", crypto: "Ouverte, comme toujours.", eu: "Fermé après 17 h 30.", us: "Ouvert jusqu'à 22 h : la séance américaine tombe sur votre soirée." },
  weekend: { fx: "Fermé le week-end.", or: "Fermé le week-end.", crypto: "La seule ouverte le week-end.", eu: "Fermé le week-end.", us: "Fermé le week-end." },
};
// Le style que permet votre temps : court → swing, moyen → day trading, long → day trading ou scalping.
const TEMPS: Record<Temps, Record<Cle, number>> = {
  court: { fx: 1, or: 0, crypto: 2, eu: 2, us: 2 },
  moyen: { fx: 2, or: 2, crypto: 1, eu: 2, us: 2 },
  long: { fx: 2, or: 2, crypto: 1, eu: 1, us: 1 },
};
const TEMPS_TXT: Record<Temps, Record<Cle, string>> = {
  court: { fx: "En swing, possible, mais les mouvements sont petits sur plusieurs jours.", or: "Garder de l'or plusieurs jours sans le surveiller : les annonces peuvent le secouer fort.", crypto: "Se prête bien au swing : on vérifie une fois par jour.", eu: "Le swing sur indices et actions : un coup d'œil par jour suffit.", us: "Le swing sur indices et actions : un coup d'œil par jour suffit." },
  moyen: { fx: "Une session de day trading, le matin de Londres ou l'après-midi.", or: "Le day trading sur l'or, l'après-midi, est très courant.", crypto: "Possible, mais elle bouge aussi quand vous n'êtes pas là.", eu: "Le day trading pendant la séance, très courant.", us: "Le day trading à l'ouverture de 15 h 30, très courant." },
  long: { fx: "Assez de temps pour le day trading, voire le scalping : le spread serré s'y prête.", or: "Assez de temps pour suivre l'or de près.", crypto: "Le temps ne manque pas, mais les écarts restent grands.", eu: "La séance ne dure que 8 h 30.", us: "La séance ne dure que 6 h 30." },
};
const RISQUE: Record<Risque, Record<Cle, number>> = {
  prudent: { fx: 2, or: 0, crypto: -1, eu: 1, us: 1 },
  modere: { fx: 2, or: 1, crypto: 0, eu: 2, us: 2 },
  fort: { fx: 1, or: 2, crypto: 2, eu: 1, us: 1 },
};
const RISQUE_TXT: Record<Cle, string> = {
  fx: "Le plus calme des cinq, avec le spread le plus serré.",
  or: "Bouge fort : souvent plus de 1 % par jour, et brutal aux annonces.",
  crypto: "Le plus nerveux : des écarts de plusieurs pour cent en une journée.",
  eu: "Une nervosité moyenne, plus forte à l'ouverture.",
  us: "Une nervosité moyenne, plus forte à 15 h 30 et aux annonces.",
};

export function ComparateurMarches() {
  const animer = useAnimer();
  const [libre, setLibre] = useState<Libre | null>(null);
  const [temps, setTemps] = useState<Temps | null>(null);
  const [risque, setRisque] = useState<Risque | null>(null);
  const complet = libre && temps && risque;

  const classement = complet ? (Object.keys(NOMS) as Cle[]).map((c) => {
    const d = DISPO[libre][c];
    const score = d === 0 ? -10 + TEMPS[temps][c] : d * 2 + TEMPS[temps][c] + RISQUE[risque][c];
    return { c, score, ferme: d === 0 };
  }).sort((a, b) => b.score - a.score) : [];
  const max = Math.max(1, ...classement.map((x) => x.score));

  return (
    <div>
      <div className="space-y-3">
        <Choix label="1. Quand êtes-vous libre ?" valeur={libre} onChange={setLibre} petit
          options={[{ v: "matin", t: "Tôt le matin" }, { v: "journee", t: "En journée" }, { v: "soir", t: "Le soir" }, { v: "weekend", t: "Le week-end" }]} />
        <Choix label="2. Combien de temps par jour ?" valeur={temps} onChange={setTemps} petit
          options={[{ v: "court", t: "Un coup d'œil" }, { v: "moyen", t: "Une à deux heures" }, { v: "long", t: "Plusieurs heures" }]} />
        <Choix label="3. Votre rapport au risque ?" valeur={risque} onChange={setRisque} petit
          options={[{ v: "prudent", t: "Prudent" }, { v: "modere", t: "Modéré" }, { v: "fort", t: "J'accepte de gros écarts" }]} />
      </div>

      <div aria-live="polite">
        {!complet ? (
          <p className="mt-4 text-[0.97rem]" style={{ color: "var(--cap-ink-3)" }}>Répondez aux trois questions : le classement apparaît ici.</p>
        ) : (
          <>
            <ol className="mt-5 space-y-4">
              {classement.map((x, rang) => (
                <li key={x.c} className="grid grid-cols-[1.6rem_minmax(0,1fr)] gap-x-2">
                  <span className="text-[1.15rem] italic leading-tight" style={{ color: rang === 0 ? "var(--cap-amber-ink)" : "var(--cap-ink-3)", fontFamily: "var(--cap-font-display)" }}>{rang + 1}.</span>
                  <div className="min-w-0">
                    <p className="text-[1rem] font-semibold leading-snug" style={{ color: x.ferme ? "var(--cap-ink-3)" : "var(--cap-ink)" }}>{NOMS[x.c]}</p>
                    <div className="mt-1.5 h-[5px] overflow-hidden rounded-full" style={{ backgroundColor: "var(--cap-line)" }} aria-hidden>
                      <div className="h-full rounded-full" style={{
                        width: `${x.ferme ? 3 : Math.max(6, (x.score / max) * 100)}%`,
                        backgroundColor: rang === 0 ? "var(--cap-ambre)" : "var(--cap-ink-3)",
                        transition: animer ? "width .5s cubic-bezier(.3,.7,.3,1)" : undefined,
                      }} />
                    </div>
                    <ul className="mt-1.5 space-y-0.5 text-[0.92rem] leading-snug" style={{ color: "var(--cap-ink-2)" }}>
                      <li>{DISPO_TXT[libre][x.c]}</li>
                      {!x.ferme && <li>{TEMPS_TXT[temps][x.c]}</li>}
                      {!x.ferme && <li>{RISQUE_TXT[x.c]}</li>}
                    </ul>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-4 border-l-[3px] pl-4 text-[0.95rem] leading-relaxed" style={{ borderColor: "var(--cap-line-strong)", color: "var(--cap-ink-2)" }}>
              Une aide pour réfléchir, pas un conseil. Quel que soit le marché, commencez en démo, avec une petite taille, et souvenez-vous qu&apos;aucun ne garantit de gain.
            </p>
            <div className="mt-2"><Recommencer onClick={() => { setLibre(null); setTemps(null); setRisque(null); }} label="Recommencer" /></div>
          </>
        )}
      </div>
    </div>
  );
}
