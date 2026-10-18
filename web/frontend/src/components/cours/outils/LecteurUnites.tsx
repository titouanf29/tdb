"use client";

import { useMemo, useState } from "react";
import { fmt, hasard, type Bougie } from "@/lib/cours/marche";
import { GraphiqueEcole } from "../GraphiqueEcole";
import { ChoixLire } from "./ElementsLire";

/**
 * Le même marché, quatre unités de temps.
 *
 * Un seul cours est fabriqué, en bougies de 4 heures, sur quatre ans de jours
 * ouvrés. Les bougies journalières, hebdomadaires et mensuelles sont obtenues
 * en regroupant ces bougies de 4 heures, exactement comme le fait une
 * plateforme : la clôture du dernier mois, de la dernière semaine, du dernier
 * jour et de la dernière bougie de 4 heures est le même prix, au même instant.
 * On bascule aussi entre la ligne et les bougies.
 */

type Unite = "mois" | "semaine" | "jour" | "h4";
const PAR_JOUR = 6;
const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

/** [jours avant la fin, prix]. La fin : la clôture du vendredi 16 octobre 2026. */
const ANCRES: [number, number][] = [
  [1043, 1650], [960, 1890], [930, 1800], [890, 2050], [840, 1830], [745, 2100], [690, 1990], [575, 2450], [525, 2290],
  [405, 2760], [345, 2600], [245, 3350], [195, 3150], [120, 3800], [100, 3690], [58, 4350], [50, 4210], [41, 4290], [32, 4080],
  [26, 4170], [17, 3970], [13, 4040], [8, 3935], [6, 3995], [4.5, 3958], [3, 4018], [1.7, 3976], [0, 4000],
];

export function fabriquer() {
  // Les jours ouvrés, du lundi 17 octobre 2022 au vendredi 16 octobre 2026.
  const jours: Date[] = [];
  for (let d = new Date(Date.UTC(2022, 9, 17)); d <= new Date(Date.UTC(2026, 9, 16)); d = new Date(d.getTime() + 864e5)) {
    const j = d.getUTCDay();
    if (j !== 0 && j !== 6) jours.push(d);
  }
  const N = jours.length * PAR_JOUR;
  const idx = (avant: number) => Math.round(N - 1 - avant * PAR_JOUR);
  const pts = ANCRES.map(([a, p]) => [Math.max(0, idx(a)), p] as [number, number]).sort((a, b) => a[0] - b[0]);
  pts[0][0] = 0;
  const r = hasard(2026);
  const g = () => (r() + r() + r() - 1.5) * 1.15;
  const chemin: number[] = new Array(N);
  // Entre deux ancres : une ligne droite, plus un « pont brownien » (une
  // marche au hasard ramenée à zéro aux deux bouts), pour un cours vivant à
  // toutes les échelles qui passe quand même par les ancres.
  for (let k = 0; k < pts.length - 1; k++) {
    const [i0, p0] = pts[k], [i1, p1] = pts[k + 1];
    const L = i1 - i0;
    const marche = [0];
    for (let i = 1; i <= L; i++) marche.push(marche[i - 1] + g() * 0.0022 * (p0 + ((p1 - p0) * i) / L));
    for (let i = 0; i < L; i++) chemin[i0 + i] = p0 + ((p1 - p0) * i) / L + marche[i] - (marche[L] * i) / L;
  }
  chemin[N - 1] = pts[pts.length - 1][1];
  const h4: (Bougie & { t: number })[] = chemin.map((c, i) => {
    const o = i === 0 ? c : chemin[i - 1];
    const s = 0.0012 * c;
    return { o, c, h: Math.max(o, c) + Math.abs(g()) * s, l: Math.min(o, c) - Math.abs(g()) * s, v: 1000, t: i };
  });
  const date = (i: number) => jours[Math.floor(i / PAR_JOUR)];
  const regrouper = (cle: (d: Date) => string) => {
    const out: { b: Bougie; debut: number; fin: number }[] = [];
    let cour = "";
    for (const b of h4) {
      const k = cle(date(b.t));
      if (k !== cour) { out.push({ b: { o: b.o, h: b.h, l: b.l, c: b.c, v: 0 }, debut: b.t, fin: b.t }); cour = k; }
      else { const a = out[out.length - 1]; a.b.h = Math.max(a.b.h, b.h); a.b.l = Math.min(a.b.l, b.l); a.b.c = b.c; a.fin = b.t; }
    }
    return out;
  };
  const lundi = (d: Date) => new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * 864e5).toISOString().slice(0, 10);
  return {
    date,
    mois: regrouper((d) => `${d.getUTCFullYear()}-${d.getUTCMonth()}`),
    semaine: regrouper(lundi),
    jour: regrouper((d) => d.toISOString().slice(0, 10)),
    h4: h4.map((b) => ({ b: { o: b.o, h: b.h, l: b.l, c: b.c, v: 0 }, debut: b.t, fin: b.t })),
  };
}

const VUES: Record<Unite, { nb: number; titre: string; duree: string; histoire: string }> = {
  mois: { nb: 48, titre: "Mensuel", duree: "4 ans, une bougie par mois",
    histoire: "La vue d'ensemble : une hausse nette, d'environ 1 700 $ à 4 000 $. Les sommets et les creux sont de plus en plus hauts. C'est le décor dans lequel tout le reste se joue." },
  semaine: { nb: 52, titre: "Hebdo", duree: "1 an, une bougie par semaine",
    histoire: "La hausse continue jusqu'au sommet, vers 4 350 $. Depuis quelques semaines, le prix recule. Dans une grande hausse, un recul est normal : rien n'est cassé pour l'instant." },
  jour: { nb: 60, titre: "Journalier", duree: "3 mois, une bougie par jour",
    histoire: "Le recul en détail : des sommets plus bas, des creux plus bas. Vu d'ici, c'est une tendance baissière. Elle existe, mais elle est petite face à la hausse des années passées." },
  h4: { nb: 60, titre: "4 heures", duree: "10 jours, une bougie toutes les 4 heures",
    histoire: "Depuis le creux vers 3 930 $, le prix remonte, en creux plus hauts. Vu d'ici, on croirait à une hausse. C'est un rebond, dans un recul, dans une grande hausse. D'où la règle : commencez par la plus grande unité de temps." },
};
const SUIVANTE: Record<Unite, Unite | null> = { mois: "semaine", semaine: "jour", jour: "h4", h4: null };

export function LecteurUnites() {
  const d = useMemo(fabriquer, []);
  const [u, setU] = useState<Unite>("mois");
  const [type, setType] = useState<"bougies" | "ligne">("bougies");
  const vue = VUES[u];
  const toutes = d[u];
  const fen = toutes.slice(-vue.nb);
  const bougies = fen.map((x) => x.b);
  const dernier = bougies[bougies.length - 1].c;
  const suiv = SUIVANTE[u];
  // La période que couvre le graphique de l'unité suivante, en clair.
  const zone = useMemo(() => {
    if (!suiv) return undefined;
    const debutSuiv = d[suiv].slice(-VUES[suiv].nb)[0].debut;
    const i0 = fen.findIndex((x) => x.fin >= debutSuiv);
    if (i0 < 0) return undefined;
    let lo = Infinity, hi = -Infinity;
    for (const b of bougies) { lo = Math.min(lo, b.l); hi = Math.max(hi, b.h); }
    return [{ i0, i1: fen.length - 1, p0: lo, p1: hi, couleur: "var(--cap-ocean)" }];
  }, [d, suiv, fen, bougies]);
  const ecrireDate = (i: number, heure: boolean) => {
    const dt = d.date(i);
    const base = `${dt.getUTCDate()} ${MOIS[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`;
    return heure ? `${base}, ${(i % PAR_JOUR) * 4} h` : base;
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <ChoixLire label="Unité de temps" valeur={u} onChange={setU}
          options={(["mois", "semaine", "jour", "h4"] as Unite[]).map((v) => ({ v, texte: VUES[v].titre }))} />
        <ChoixLire label="Type de graphique" valeur={type} onChange={setType}
          options={[{ v: "bougies", texte: "Bougies" }, { v: "ligne", texte: "Ligne" }]} />
      </div>
      <p className="mt-2 text-[0.92rem]" style={{ color: "var(--cap-ink-3)" }}>
        Prix d'exemple de l'once d'or. {vue.duree}. Dernier prix : <b style={{ color: "var(--cap-ink)" }}>{fmt(dernier, 0)} $</b>, à la clôture du vendredi 16 octobre 2026.
      </p>
      <div className="mt-2">
        <GraphiqueEcole bougies={bougies} type={type} zones={zone} apparition={false} sansSurvol={type === "ligne"}
          ariaLabel={`Cours de l'or en ${vue.titre.toLowerCase()}, ${vue.duree}`} />
        <div className="flex justify-between pr-[66px] pl-[6px] text-[0.8rem] tabular-nums" style={{ color: "var(--cap-ink-3)" }}>
          <span>{ecrireDate(fen[0].debut, u === "h4")}</span>
          <span>{ecrireDate(fen[fen.length - 1].fin, u === "h4")}</span>
        </div>
      </div>
      <p aria-live="polite" className="mt-3 text-[1rem] leading-relaxed" style={{ color: "var(--cap-ink)" }}>
        <b>{vue.titre}.</b> {vue.histoire}
        {suiv && <span style={{ color: "var(--cap-ink-3)" }}> La bande colorée : la période que montre le graphique {VUES[suiv].titre === "4 heures" ? "en 4 heures" : VUES[suiv].titre.toLowerCase()}.</span>}
      </p>
    </div>
  );
}
