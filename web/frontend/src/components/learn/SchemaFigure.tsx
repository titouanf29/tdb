"use client";

/**
 * Le schéma d'une figure chartiste, annoté, pour le cours.
 *
 * Idéalisé à dessein. Un vrai graphique montre une figure noyée dans le bruit,
 * et c'est justement ce qui rend l'apprentissage difficile : avant de la
 * chercher sur un prix réel, il faut avoir vu sa forme pure une fois, avec
 * chaque partie nommée. Le graphique de l'Analyse fait ensuite le travail
 * inverse — la montrer telle qu'elle est, dans le bruit.
 *
 * Chaque schéma porte les trois repères qui comptent pour quelqu'un qui
 * trade, et que les captures qui circulent omettent presque toujours :
 *   · la ligne dont la cassure CONFIRME la figure (avant, ce n'est qu'un dessin) ;
 *   · l'objectif théorique ;
 *   · l'invalidation — le prix qui dit que la lecture était fausse.
 */

type Pt = [number, number];

interface Schema {
  titre: string;
  sens: "haussier" | "baissier" | "neutre";
  /** Le prix, en coordonnées 0–100 (x) et 0–60 (y, 0 en haut). */
  prix: Pt[];
  /** Les points remarquables de la figure, avec leur nom. */
  reperes: { p: Pt; nom: string; dessous?: boolean }[];
  /** La ligne de confirmation (cou, borne, pause). */
  ligne: [Pt, Pt];
  ligneNom: string;
  /** Côtés du triangle ou du drapeau, en plus de la ligne. */
  cotes?: [Pt, Pt][];
  cassure: Pt;
  objectif: number;   // y
  invalidation: number; // y
}

const SCHEMAS: Record<string, Schema> = {
  double_sommet: {
    titre: "Double sommet", sens: "baissier",
    prix: [[0, 48], [14, 30], [26, 12], [38, 26], [50, 13], [62, 26], [70, 34], [84, 44], [100, 50]],
    reperes: [{ p: [26, 12], nom: "1er sommet" }, { p: [50, 13], nom: "2e sommet" },
              { p: [38, 26], nom: "creux", dessous: true }],
    ligne: [[30, 26], [80, 26]], ligneNom: "ligne de cou",
    cassure: [65, 28], objectif: 40, invalidation: 5,
  },
  double_creux: {
    titre: "Double creux", sens: "haussier",
    prix: [[0, 12], [14, 30], [26, 48], [38, 34], [50, 47], [62, 34], [70, 26], [84, 16], [100, 10]],
    reperes: [{ p: [26, 48], nom: "1er creux", dessous: true }, { p: [50, 47], nom: "2e creux", dessous: true },
              { p: [38, 34], nom: "sommet" }],
    ligne: [[30, 34], [80, 34]], ligneNom: "ligne de cou",
    cassure: [65, 32], objectif: 20, invalidation: 55,
  },
  ete: {
    titre: "Épaule-tête-épaule", sens: "baissier",
    prix: [[0, 46], [12, 24], [22, 34], [36, 8], [50, 35], [62, 24], [72, 36], [84, 46], [100, 52]],
    reperes: [{ p: [12, 24], nom: "épaule" }, { p: [36, 8], nom: "tête" }, { p: [62, 24], nom: "épaule" }],
    ligne: [[16, 33], [86, 37]], ligneNom: "ligne de cou",
    cassure: [74, 37], objectif: 55, invalidation: 2,
  },
  ete_inversee: {
    titre: "Épaule-tête-épaule inversée", sens: "haussier",
    prix: [[0, 14], [12, 36], [22, 26], [36, 52], [50, 25], [62, 36], [72, 24], [84, 14], [100, 8]],
    reperes: [{ p: [12, 36], nom: "épaule", dessous: true }, { p: [36, 52], nom: "tête", dessous: true },
              { p: [62, 36], nom: "épaule", dessous: true }],
    ligne: [[16, 27], [86, 23]], ligneNom: "ligne de cou",
    cassure: [74, 23], objectif: 5, invalidation: 58,
  },
  triangle_ascendant: {
    titre: "Triangle ascendant", sens: "haussier",
    prix: [[0, 50], [12, 18], [24, 42], [38, 18], [50, 34], [62, 18], [72, 27], [80, 18], [90, 8], [100, 4]],
    reperes: [],
    ligne: [[8, 18], [84, 18]], ligneNom: "résistance plate",
    cotes: [[[20, 44], [76, 26]]],
    cassure: [82, 15], objectif: 2, invalidation: 30,
  },
  triangle_descendant: {
    titre: "Triangle descendant", sens: "baissier",
    prix: [[0, 10], [12, 42], [24, 18], [38, 42], [50, 26], [62, 42], [72, 33], [80, 42], [90, 52], [100, 56]],
    reperes: [],
    ligne: [[8, 42], [84, 42]], ligneNom: "support plat",
    cotes: [[[20, 16], [76, 34]]],
    cassure: [82, 45], objectif: 58, invalidation: 30,
  },
  triangle_symetrique: {
    titre: "Triangle symétrique", sens: "neutre",
    prix: [[0, 52], [12, 10], [26, 46], [40, 17], [54, 39], [66, 23], [76, 33], [84, 26], [92, 14], [100, 8]],
    reperes: [],
    ligne: [[10, 10], [86, 27]], ligneNom: "sommets descendants",
    cotes: [[[24, 47], [80, 32]]],
    cassure: [85, 24], objectif: 4, invalidation: 38,
  },
  drapeau_haussier: {
    titre: "Drapeau haussier", sens: "haussier",
    prix: [[0, 52], [10, 50], [30, 16], [38, 20], [46, 16], [54, 22], [62, 19], [70, 24], [80, 10], [100, 2]],
    reperes: [{ p: [18, 36], nom: "mât" }],
    ligne: [[30, 15], [74, 21]], ligneNom: "pause",
    cotes: [[[32, 21], [74, 26]]],
    cassure: [76, 19], objectif: 2, invalidation: 28,
  },
  drapeau_baissier: {
    titre: "Drapeau baissier", sens: "baissier",
    prix: [[0, 8], [10, 10], [30, 44], [38, 40], [46, 44], [54, 38], [62, 41], [70, 36], [80, 50], [100, 58]],
    reperes: [{ p: [18, 24], nom: "mât" }],
    ligne: [[30, 45], [74, 39]], ligneNom: "pause",
    cotes: [[[32, 39], [74, 34]]],
    cassure: [76, 41], objectif: 58, invalidation: 32,
  },
};

export const CLES_SCHEMAS = Object.keys(SCHEMAS);

const W = 100, H = 60;

/* Un halo de la couleur du fond sous chaque texte (paint-order) : une
   étiquette qui croise une ligne reste lisible, sans cadre qui alourdirait
   un schéma déjà chargé. */
const HALO = { stroke: "var(--cap-surface-2)", strokeWidth: 1.1, paintOrder: "stroke" as const,
               strokeLinejoin: "round" as const };

export function SchemaFigure({ cle }: { cle: string }) {
  const s = SCHEMAS[cle];
  if (!s) return null;
  const c = s.sens === "haussier" ? "var(--cap-up)" : s.sens === "baissier" ? "var(--cap-down)" : "var(--cap-ocean)";
  const X = (x: number) => 6 + x * 0.78;   // marge à droite pour les étiquettes
  const Y = (y: number) => 4 + y * 0.9;
  const pts = s.prix.map(([x, y]) => `${X(x)},${Y(y)}`).join(" ");

  return (
    <figure
      className="my-2 overflow-hidden rounded-[14px] p-3 sm:p-4"
      style={{ backgroundColor: "var(--cap-surface-2)" }}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img"
           aria-label={`Schéma : ${s.titre}`} style={{ maxHeight: 320 }}>
        {/* Objectif et invalidation : les deux prix qui encadrent la décision. */}
        <line x1={X(0)} x2={X(100)} y1={Y(s.objectif)} y2={Y(s.objectif)}
              stroke={c} strokeWidth="0.35" strokeDasharray="1.4 1" opacity="0.7" />
        <line x1={X(0)} x2={X(100)} y1={Y(s.invalidation)} y2={Y(s.invalidation)}
              stroke="var(--cap-ink-3)" strokeWidth="0.45" />

        {s.cotes?.map(([a, b], i) => (
          <line key={i} x1={X(a[0])} y1={Y(a[1])} x2={X(b[0])} y2={Y(b[1])}
                stroke={c} strokeWidth="0.45" strokeDasharray="1.6 1" opacity="0.8" />
        ))}
        <line x1={X(s.ligne[0][0])} y1={Y(s.ligne[0][1])} x2={X(s.ligne[1][0])} y2={Y(s.ligne[1][1])}
              stroke={c} strokeWidth="0.6" strokeDasharray="2 1.2" />

        <polyline points={pts} fill="none" stroke="var(--cap-ink)" strokeWidth="0.9"
                  strokeLinejoin="round" strokeLinecap="round" />

        {s.reperes.map((r, i) => (
          <g key={i}>
            <circle cx={X(r.p[0])} cy={Y(r.p[1])} r="1.1" fill="var(--cap-surface)" stroke={c} strokeWidth="0.5" />
            <text x={X(r.p[0])} y={Y(r.p[1]) + (r.dessous ? 4.4 : -2.6)} textAnchor="middle"
                  fontSize="3" fill="var(--cap-ink-2)" {...HALO}>{r.nom}</text>
          </g>
        ))}

        {/* La cassure : le seul moment où la figure existe vraiment. */}
        <circle cx={X(s.cassure[0])} cy={Y(s.cassure[1])} r="1.6" fill={c} />
        <text x={X(s.cassure[0]) + 2.2} y={Y(s.cassure[1]) + (s.sens === "baissier" ? 4.2 : -2)}
              fontSize="3" fill={c} fontWeight="600" {...HALO}>cassure</text>

        {/* Au DÉPART de la ligne, et du côté opposé à la sortie : à son
            extrémité il tombait sur l'étiquette « cassure ». */}
        <text x={X(s.ligne[0][0])} y={Y(s.ligne[0][1]) + (s.sens === "haussier" ? 4.2 : -1.8)}
              fontSize="2.8" fill={c} {...HALO}>{s.ligneNom}</text>
        <text x={W - 1} y={Y(s.objectif) - 1} textAnchor="end" fontSize="2.8" fill={c} {...HALO}>objectif</text>
        <text x={W - 1} y={Y(s.invalidation) - 1} textAnchor="end" fontSize="2.8"
              fill="var(--cap-ink-2)" {...HALO}>invalidation</text>
      </svg>
      <figcaption className="mt-2 text-[0.78rem]" style={{ color: "var(--cap-ink-3)" }}>
        {s.titre}, forme idéalisée. Sur un vrai graphique elle est toujours plus bruitée.
      </figcaption>
    </figure>
  );
}
