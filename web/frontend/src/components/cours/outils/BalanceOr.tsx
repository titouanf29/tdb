"use client";

import { useState } from "react";
import { Choix, Lien, useAnimer, Verdict } from "./ElementsMarches";

/**
 * La balance des trois moteurs de l'or : le dollar, les taux, la peur. Chaque
 * moteur pose son poids sur le plateau « vers la hausse » ou « vers la
 * baisse », et la balance penche. Avec, toujours, la nuance : rien n'est
 * mécanique.
 */

type Etat = -1 | 0 | 1;
type Moteur = "dollar" | "taux" | "peur";

const NOMS: Record<Moteur, string> = { dollar: "Dollar", taux: "Taux", peur: "Peur" };

// L'effet de chaque réglage sur l'or : +1 pousse à la hausse, -1 à la baisse.
const effet = (m: Moteur, e: Etat): Etat => (m === "peur" ? e : ((-e) as Etat));

const POURQUOI: Record<Moteur, Record<string, string>> = {
  dollar: { "1": "Le dollar baisse : il en faut davantage pour la même quantité d'or.", "-1": "Le dollar monte : l'or coûte plus cher pour qui paie dans une autre monnaie, la demande faiblit." },
  taux: { "1": "Les taux baissent : garder de l'or, qui ne rapporte rien, coûte moins cher.", "-1": "Les taux montent : un placement qui rapporte devient plus attirant que l'or." },
  peur: { "1": "La peur monte : on achète la valeur refuge.", "-1": "Le calme revient : moins besoin de refuge, certains vendent leur or." },
};

const PRESETS: { nom: string; v: Record<Moteur, Etat> }[] = [
  { nom: "La Fed baisse ses taux", v: { dollar: -1, taux: -1, peur: 0 } },
  { nom: "Une crise éclate", v: { dollar: 1, taux: 0, peur: 1 } },
  { nom: "Une économie américaine très solide", v: { dollar: 1, taux: 1, peur: -1 } },
];

export function BalanceOr() {
  const animer = useAnimer();
  const [v, setV] = useState<Record<Moteur, Etat>>({ dollar: -1, taux: 0, peur: 0 });
  const moteurs: Moteur[] = ["dollar", "taux", "peur"];
  const hausse = moteurs.filter((m) => effet(m, v[m]) === 1);
  const baisse = moteurs.filter((m) => effet(m, v[m]) === -1);
  const angle = (baisse.length - hausse.length) * 7; // positif : le côté droit (baisse) descend

  const W = 340, C = 170, L = 120, Y = 66;
  const rad = (angle * Math.PI) / 180;
  const gx = C - L * Math.cos(rad), gy = Y - L * Math.sin(rad);
  const dx = C + L * Math.cos(rad), dy = Y + L * Math.sin(rad);

  const plateau = (x: number, y: number, poids: Moteur[], titre: string, couleur: string) => (
    <g key={titre} style={{ transform: `translate(${x}px, ${y}px)`, transition: animer ? "transform .6s cubic-bezier(.3,.7,.3,1)" : undefined }}>
      <line x1={-34} y1={34} x2={0} y2={0} stroke="var(--cap-ink-3)" strokeWidth="1" />
      <line x1={34} y1={34} x2={0} y2={0} stroke="var(--cap-ink-3)" strokeWidth="1" />
      <path d="M-42,34 L42,34 L34,42 L-34,42 Z" fill="var(--cap-ink-2)" />
      {poids.map((m, k) => (
        <g key={m} transform={`translate(0, ${24 - k * 21})`}>
          <rect x={-30} y={-9} width={60} height={19} rx={4} fill={couleur} opacity="0.9" />
          <text x={0} y={5} textAnchor="middle" fontSize="11.5" fontWeight="700" fill="var(--cap-surface)">{NOMS[m]}</text>
        </g>
      ))}
      <text x={0} y={60} textAnchor="middle" fontSize="12" fontWeight="600" fill={couleur}>{titre}</text>
    </g>
  );

  let message: string;
  if (!hausse.length && !baisse.length) message = "Aucun moteur ne pousse : l'or n'a pas de raison particulière de bouger. Il tourne alors souvent autour de ses niveaux.";
  else if (hausse.length > baisse.length) message = `${hausse.length === 3 ? "Les trois moteurs poussent" : hausse.length === 2 ? "Deux moteurs poussent" : "Un moteur pousse"} vers la hausse${baisse.length ? `, ${baisse.length === 1 ? "un" : "deux"} vers la baisse` : ""} : la balance penche vers la hausse.`;
  else if (baisse.length > hausse.length) message = `${baisse.length === 3 ? "Les trois moteurs poussent" : baisse.length === 2 ? "Deux moteurs poussent" : "Un moteur pousse"} vers la baisse${hausse.length ? `, ${hausse.length === 1 ? "un" : "deux"} vers la hausse` : ""} : la balance penche vers la baisse.`;
  else message = "Les moteurs se contredisent : la balance reste au milieu. C'est alors celui que le marché juge le plus important ce jour-là qui l'emporte.";

  return (
    <div>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <Choix label="Le dollar" valeur={v.dollar} onChange={(e) => setV({ ...v, dollar: e })} petit options={[{ v: -1, t: "Baisse" }, { v: 0, t: "Stable" }, { v: 1, t: "Monte" }]} />
        <Choix label="Les taux" valeur={v.taux} onChange={(e) => setV({ ...v, taux: e })} petit options={[{ v: -1, t: "Baissent" }, { v: 0, t: "Stables" }, { v: 1, t: "Montent" }]} />
        <Choix label="La peur" valeur={v.peur} onChange={(e) => setV({ ...v, peur: e })} petit options={[{ v: -1, t: "Calme" }, { v: 0, t: "Normale" }, { v: 1, t: "Crise" }]} />
      </div>

      <svg viewBox={`0 0 ${W} 180`} className="mx-auto mt-3 block w-full max-w-[420px]" role="img"
        aria-label={`Balance : ${hausse.length} moteur(s) vers la hausse, ${baisse.length} vers la baisse`}>
        <path d={`M${C - 26},176 L${C + 26},176 L${C + 6},${Y + 6} L${C - 6},${Y + 6} Z`} fill="var(--cap-line-strong)" />
        <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: `${C}px ${Y}px`, transition: animer ? "transform .6s cubic-bezier(.3,.7,.3,1)" : undefined }}>
          <line x1={C - L} y1={Y} x2={C + L} y2={Y} stroke="var(--cap-ink)" strokeWidth="4" strokeLinecap="round" />
        </g>
        <circle cx={C} cy={Y} r="6" fill="var(--cap-ambre)" stroke="var(--cap-surface)" strokeWidth="2" />
        {plateau(gx, gy, hausse, "Vers la hausse", "var(--cap-up)")}
        {plateau(dx, dy, baisse, "Vers la baisse", "var(--cap-down)")}
      </svg>

      <Verdict couleur={hausse.length > baisse.length ? "var(--cap-up)" : baisse.length > hausse.length ? "var(--cap-down)" : "var(--cap-line-strong)"}>
        <p><b>{message}</b></p>
        {moteurs.filter((m) => v[m] !== 0).length > 0 && (
          <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-[0.95rem]" style={{ color: "var(--cap-ink-2)" }}>
            {moteurs.filter((m) => v[m] !== 0).map((m) => <li key={m}>{POURQUOI[m][String(effet(m, v[m]))]}</li>)}
          </ul>
        )}
        <p className="mt-2 text-[0.93rem]" style={{ color: "var(--cap-ink-3)" }}>Rien n&apos;est mécanique : les moteurs se mélangent, le marché anticipe ce qu&apos;il attend, et parfois l&apos;or et le dollar montent ensemble, en pleine crise par exemple. La balance dit vers où ça pousse, pas ce que fera le prix.</p>
      </Verdict>
      <div className="mt-2 flex flex-wrap gap-x-4">
        {PRESETS.map((p) => <Lien key={p.nom} onClick={() => setV(p.v)}>{p.nom}</Lien>)}
      </div>
    </div>
  );
}
