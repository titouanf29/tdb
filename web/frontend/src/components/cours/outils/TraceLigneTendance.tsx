"use client";

import { useState } from "react";
import { fmt, type Bougie } from "@/lib/cours/marche";
import { GraphiqueEcole, type Marque, type Trait } from "../GraphiqueEcole";
import { BoutonLire, ChoixLire, LienLire, RecommencerLire, RetourLire } from "./ElementsLire";

/**
 * Tracer une ligne de tendance soi-même. On touche deux creux (ou deux
 * sommets en baisse) : la ligne s'accroche au plus bas tout proche (la mèche,
 * ou le corps si l'on a choisi les corps), se prolonge vers la droite, et
 * l'outil dit si elle tient debout (le deuxième creux plus haut, aucune bougie
 * coupée). Ensuite on fait avancer le temps : le troisième contact, puis la
 * cassure.
 */
export function TraceLigneTendance({ bougies, fin, sens = "hausse", reference, suite }: {
  bougies: Bougie[];
  /** La dernière bougie visible pendant le tracé. */
  fin: number;
  sens?: "hausse" | "baisse";
  /** Les deux bougies de la ligne la plus nette (par les mèches). */
  reference: [number, number];
  /** Les étapes quand le temps avance. */
  suite: { jusqua: number; legende: string; marques?: Marque[] }[];
}) {
  const [mode, setMode] = useState<"meches" | "corps">("meches");
  const [pts, setPts] = useState<number[]>([]);
  const [etape, setEtape] = useState(-1);
  const [voirRef, setVoirRef] = useState(false);
  const hausse = sens === "hausse";
  const point = (b: Bougie) => (hausse ? (mode === "meches" ? b.l : Math.min(b.o, b.c)) : (mode === "meches" ? b.h : Math.max(b.o, b.c)));
  const pointMeche = (b: Bougie) => (hausse ? b.l : b.h);

  const accrocher = (i: number) => {
    const c = Math.max(0, Math.min(fin, i));
    let best = c;
    for (let j = Math.max(0, c - 2); j <= Math.min(fin, c + 2); j++) {
      if (hausse ? point(bougies[j]) < point(bougies[best]) : point(bougies[j]) > point(bougies[best])) best = j;
    }
    return best;
  };
  const toucher = (i: number) => {
    if (etape >= 0) return;
    const j = accrocher(i);
    setVoirRef(false);
    setPts((p) => (p.length >= 2 ? [j] : p.includes(j) ? p : [...p, j]));
  };

  let lo = Infinity, hi = -Infinity;
  for (const b of bougies) { lo = Math.min(lo, b.l); hi = Math.max(hi, b.h); }
  const tol = (hi - lo) * 0.012;

  const [a, b] = [...pts].sort((x, y) => x - y);
  const deux = pts.length === 2;
  let verdict: { ok: boolean; texte: string } | null = null;
  let traitUtil: Trait | null = null;
  if (deux) {
    const pa = point(bougies[a]), pb = point(bougies[b]);
    traitUtil = { de: [a, pa], a: [b, pb], prolonger: true, couleur: "var(--cap-ink)" };
    const pente = (pb - pa) / (b - a);
    const coupe = [];
    for (let j = a + 1; j <= fin; j++) {
      // Les bougies voisines d'un point d'appui le touchent presque toujours : on ne les compte pas.
      if (Math.abs(j - b) <= 1 || j - a <= 1) continue;
      const v = pa + pente * (j - a);
      const q = point(bougies[j]);
      if (hausse ? q < v - tol : q > v + tol) coupe.push(j);
    }
    if (hausse && pb <= pa) verdict = { ok: false, texte: `Le deuxième creux (${fmt(pb)}) n'est pas plus haut que le premier (${fmt(pa)}) : une ligne de tendance haussière monte. Choisissez deux creux, le deuxième plus haut.` };
    else if (!hausse && pb >= pa) verdict = { ok: false, texte: `Le deuxième sommet n'est pas plus bas que le premier : une ligne de tendance baissière descend.` };
    else if (coupe.length) verdict = { ok: false, texte: `Votre ligne coupe ${coupe.length} bougie${coupe.length > 1 ? "s" : ""} : le prix est passé ${hausse ? "dessous" : "dessus"}. Une ligne de tendance passe ${hausse ? "sous" : "au-dessus de"} toutes les bougies, sans les couper. Essayez d'autres ${hausse ? "creux" : "sommets"}.` };
    else {
      const memeRef = Math.abs(a - reference[0]) <= 1 && Math.abs(b - reference[1]) <= 1;
      verdict = { ok: true, texte: memeRef
        ? `Bonne ligne : deux ${hausse ? "creux nets, le deuxième plus haut" : "sommets nets, le deuxième plus bas"}, et aucune bougie coupée. Elle est prolongée vers la droite : c'est là qu'elle va servir.`
        : `Votre ligne tient debout, mais elle ne s'appuie pas sur les deux ${hausse ? "creux" : "sommets"} les plus nets. La ligne de référence est en vert : comparez.` };
    }
  }
  const pRef0 = pointMeche(bougies[reference[0]]), pRef1 = pointMeche(bougies[reference[1]]);
  const traitRef: Trait = { de: [reference[0], pRef0], a: [reference[1], pRef1], prolonger: true, couleur: "var(--cap-up)", pointille: true, label: deux && verdict?.ok && Math.abs(a - reference[0]) <= 1 && Math.abs(b - reference[1]) <= 1 ? undefined : "Référence" };
  const commeRef = deux && Math.abs(a - reference[0]) <= 1 && Math.abs(b - reference[1]) <= 1;
  // La référence se montre sur demande, ou quand la ligne tracée en diffère.
  const montrerRef = voirRef || (Boolean(verdict?.ok) && !commeRef);
  const traits: Trait[] = [...(traitUtil ? [traitUtil] : []), ...(montrerRef ? [traitRef] : [])];
  const marques: Marque[] = [
    ...pts.map((i) => ({ i, prix: point(bougies[i]), type: "point" as const })),
    ...(etape >= 0 ? suite.slice(0, etape + 1).flatMap((s) => s.marques ?? []) : []),
  ];
  const jusqua = etape >= 0 ? suite[etape].jusqua : fin;

  const recommencer = () => { setPts([]); setEtape(-1); setVoirRef(false); };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-2 text-[0.92rem]" style={{ color: "var(--cap-ink-2)" }}>
        <span>Accrocher la ligne aux</span>
        <ChoixLire label="Accrocher aux mèches ou aux corps" valeur={mode} desactive={etape >= 0}
          onChange={(v) => { setMode(v); setPts([]); }}
          options={[{ v: "meches", texte: "mèches" }, { v: "corps", texte: "corps" }]} />
      </div>
      <GraphiqueEcole bougies={bougies} jusqua={jusqua} sansSurvol apparition={false} traits={traits} marques={marques}
        onClic={etape >= 0 ? undefined : (_, i) => toucher(i)}
        ariaLabel={`Graphique d'exercice : touchez deux ${hausse ? "creux" : "sommets"} pour tracer la ligne`} />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <RetourLire ton={etape >= 0 ? null : verdict ? (verdict.ok ? "juste" : "faux") : null}>
          {etape >= 0 ? <span style={{ color: "var(--cap-ink)" }} dangerouslySetInnerHTML={{ __html: suite[etape].legende }} />
            : pts.length === 0 ? `Touchez un premier ${hausse ? "creux" : "sommet"} : la ligne s'accroche ${hausse ? "au plus bas" : "au plus haut"} tout proche.`
            : pts.length === 1 ? `Premier point posé à ${fmt(point(bougies[pts[0]]))}. Touchez un deuxième ${hausse ? "creux" : "sommet"}, plus à droite ou plus à gauche.`
            : verdict!.texte}
        </RetourLire>
        <div className="flex flex-wrap items-center gap-2">
          {(pts.length > 0 || etape >= 0) && <RecommencerLire onClick={recommencer} />}
          {etape < 0 && !montrerRef && <LienLire onClick={() => setVoirRef(true)}>Voir la ligne de référence</LienLire>}
          {etape < 0 && deux && verdict?.ok && <BoutonLire onClick={() => setEtape(0)}>Faire avancer le temps</BoutonLire>}
          {etape >= 0 && etape < suite.length - 1 && <BoutonLire onClick={() => setEtape(etape + 1)}>Avancer encore</BoutonLire>}
        </div>
      </div>
    </div>
  );
}
