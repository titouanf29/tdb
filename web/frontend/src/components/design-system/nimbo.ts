/**
 * Nimbo, le petit nuage de CaptenTDB — le dessin.
 *
 * Une fonction pure qui rend le SVG en texte : le composant React <Nimbo>
 * l'emploie, et le rideau de chargement aussi, qui vit hors de React. Un
 * seul dessin, donc un seul Nimbo partout.
 *
 * Il vit dans le ciel du site et suit sa météo : blanc et léger quand tout
 * va bien, un peu gris avec une goutte quand il faut être prudent. Le point
 * ambre au-dessus de lui est le cap du logo, son étoile guide.
 *
 * Les couleurs sont des jetons (--n-*, dans capten.css), les mouvements des
 * classes CSS (.n-*) : ils suivent le mode sombre, le réglage « couper les
 * animations » et le mouvement réduit sans rien demander au composant.
 */

export type NimboHumeur =
  | "content" | "salue" | "pointe" | "cap" | "reflechit"
  | "fete" | "surpris" | "prudent" | "triste" | "dort";

type Yeux = "ouverts" | "rieurs" | "cote" | "haut" | "ronds" | "soucieux" | "tristes" | "fermes";
type Bouche = "sourire" | "grand" | "o" | "plat" | "moue" | "triste" | "petit";
type Bras = "repos" | "salue" | "pointe" | "leve" | "menton" | "hauts";

const HUMEURS: Record<NimboHumeur, {
  nom: string; yeux: Yeux; bouche: Bouche; bras: Bras;
  etoile?: "orbite" | "haute"; gris?: boolean; extra?: "etincelles" | "goutte" | "pluie" | "zz"; classe?: string;
}> = {
  content:   { nom: "content", yeux: "ouverts", bouche: "sourire", bras: "repos" },
  salue:     { nom: "qui salue", yeux: "rieurs", bouche: "grand", bras: "salue" },
  pointe:    { nom: "qui montre", yeux: "cote", bouche: "sourire", bras: "pointe" },
  cap:       { nom: "qui montre le cap", yeux: "haut", bouche: "o", bras: "leve", etoile: "haute" },
  reflechit: { nom: "qui réfléchit", yeux: "haut", bouche: "plat", bras: "menton", etoile: "orbite" },
  fete:      { nom: "qui fête", yeux: "rieurs", bouche: "grand", bras: "hauts", extra: "etincelles", classe: "n-fete" },
  surpris:   { nom: "surpris", yeux: "ronds", bouche: "o", bras: "hauts", classe: "n-surpris" },
  prudent:   { nom: "prudent", yeux: "soucieux", bouche: "moue", bras: "repos", gris: true, extra: "goutte" },
  triste:    { nom: "déçu", yeux: "tristes", bouche: "triste", bras: "repos", gris: true, extra: "pluie" },
  dort:      { nom: "qui dort", yeux: "fermes", bouche: "petit", bras: "repos", extra: "zz", classe: "n-dort" },
};

// La silhouette : les bosses d'un cumulus et sa base, dans un carré de 200.
const LOBES: [number, number, number][] = [[62, 118, 30], [96, 94, 40], [134, 104, 32], [158, 124, 20], [42, 130, 18]];
const BASE = [102, 134, 68, 20] as const;
const silhouette = (attrs: string) =>
  `<g ${attrs}><ellipse cx="${BASE[0]}" cy="${BASE[1]}" rx="${BASE[2]}" ry="${BASE[3]}"/>` +
  LOBES.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join("") + "</g>";

let compteur = 0;

export function nimboSvg(humeur: NimboHumeur, taille = 120, options: {
  /** Version simplifiée (icône dans un bouton). */
  mini?: boolean;
  /** Identifiant unique des dégradés ; tiré d'un compteur s'il manque. */
  id?: string;
  /** Texte pour les lecteurs d'écran ; vide = décoratif. */
  label?: string;
  className?: string;
} = {}): string {
  const h = HUMEURS[humeur] ?? HUMEURS.content;
  const id = (options.id ?? `nimbo${compteur++}`).replace(/[^a-zA-Z0-9_-]/g, "");
  const petit = !!options.mini || taille < 32;
  // En petit, le cadre se resserre sur le nuage : dans le carré de 200, il
  // n'occupait qu'une partie de la surface et disparaissait à 16 px.
  const serre = !!options.mini || taille <= 56;
  const vb = serre ? "20 22 166 142" : "0 0 200 200";
  const hauteur = serre ? Math.round((taille * 142) / 166) : taille;
  const haut = h.gris ? "var(--n-gris-haut)" : "var(--n-haut)";
  const milieu = h.gris ? "var(--n-gris-haut)" : "var(--n-milieu)";
  const bas = h.gris ? "var(--n-gris-bas)" : "var(--n-bas)";
  const reflet = (x: number, y: number, r = 2) => (petit ? "" : `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff"/>`);
  const oeil = "var(--n-oeil)";

  const Y: Record<Yeux, string> = {
    ouverts: `<g class="n-yeux"><ellipse cx="82" cy="110" rx="6" ry="8" fill="${oeil}"/><ellipse cx="118" cy="110" rx="6" ry="8" fill="${oeil}"/>${reflet(84, 107)}${reflet(120, 107)}</g>`,
    rieurs: `<path d="M75 111q7-8 14 0M111 111q7-8 14 0" fill="none" stroke="${oeil}" stroke-width="4" stroke-linecap="round"/>`,
    cote: `<g class="n-yeux"><ellipse cx="85" cy="110" rx="6" ry="8" fill="${oeil}"/><ellipse cx="121" cy="110" rx="6" ry="8" fill="${oeil}"/>${reflet(88, 107)}${reflet(124, 107)}</g>`,
    haut: `<g class="n-yeux"><ellipse cx="83" cy="106" rx="6" ry="8" fill="${oeil}"/><ellipse cx="119" cy="106" rx="6" ry="8" fill="${oeil}"/>${reflet(85, 102)}${reflet(121, 102)}</g>`,
    ronds: `<circle cx="82" cy="109" r="8" fill="${oeil}"/><circle cx="118" cy="109" r="8" fill="${oeil}"/>${reflet(85, 106, 2.5)}${reflet(121, 106, 2.5)}`,
    soucieux: `<g class="n-yeux"><ellipse cx="82" cy="112" rx="5.5" ry="7" fill="${oeil}"/><ellipse cx="118" cy="112" rx="5.5" ry="7" fill="${oeil}"/></g><path d="M73 104l14-6M127 104l-14-6" stroke="${oeil}" stroke-width="3.5" stroke-linecap="round"/>`,
    tristes: `<path d="M75 110q7 6 14 0M111 110q7 6 14 0" fill="none" stroke="${oeil}" stroke-width="4" stroke-linecap="round"/><path d="M74 100l12-4M126 100l-12-4" stroke="${oeil}" stroke-width="3" stroke-linecap="round"/>`,
    fermes: `<path d="M75 112q7 5 14 0M111 112q7 5 14 0" fill="none" stroke="${oeil}" stroke-width="4" stroke-linecap="round"/>`,
  };
  const B: Record<Bouche, string> = {
    sourire: `<path d="M91 124q9 8 18 0" fill="none" stroke="${oeil}" stroke-width="3.5" stroke-linecap="round"/>`,
    grand: `<path d="M89 122q11 16 22 0z" fill="${oeil}"/><path d="M94 129q6 4 12 0" fill="none" stroke="var(--n-joue)" stroke-width="3" stroke-linecap="round"/>`,
    o: `<ellipse cx="100" cy="126" rx="5" ry="6" fill="${oeil}"/>`,
    plat: `<path d="M93 126h13" stroke="${oeil}" stroke-width="3.5" stroke-linecap="round"/>`,
    moue: `<path d="M92 128q8-6 16 0" fill="none" stroke="${oeil}" stroke-width="3.5" stroke-linecap="round"/>`,
    triste: `<path d="M91 130q9-8 18 0" fill="none" stroke="${oeil}" stroke-width="3.5" stroke-linecap="round"/>`,
    petit: `<path d="M96 126q4 3 8 0" fill="none" stroke="${oeil}" stroke-width="3" stroke-linecap="round"/>`,
  };
  const main = (x: number, y: number, r = 11) =>
    `<circle cx="${x}" cy="${y}" r="${r + 2.5}" fill="var(--n-contour)"/><circle cx="${x}" cy="${y}" r="${r}" fill="url(#${id}g)"/>`;
  const BR: Record<Bras, string> = {
    repos: main(34, 140, 10) + main(168, 140, 10),
    salue: main(34, 140, 10) + `<g class="n-bras-salue">${main(172, 104, 11)}</g>`,
    pointe: main(34, 140, 10) + `<g class="n-bras-pointe">${main(180, 118, 11)}<path d="M194 118h10" stroke="var(--n-contour)" stroke-width="3" stroke-linecap="round"/></g>`,
    leve: main(34, 140, 10) + main(150, 58, 11),
    menton: main(34, 140, 10) + main(118, 142, 9),
    hauts: main(34, 86, 11) + main(166, 86, 11),
  };
  const etoile =
    h.etoile === "orbite" ? `<g class="n-orbite"><circle cx="100" cy="32" r="8" fill="var(--cap-amber, #E5A83A)"/></g>`
    : h.etoile === "haute" ? `<g class="n-etoile"><circle cx="150" cy="36" r="10" fill="var(--cap-amber, #E5A83A)"/><circle cx="150" cy="36" r="17" fill="none" stroke="var(--cap-amber, #E5A83A)" stroke-width="2" opacity=".35"/></g>`
    : h.gris ? ""
    : `<g class="n-etoile"><circle cx="100" cy="34" r="7" fill="var(--cap-amber, #E5A83A)"/></g>`;
  const eti = (d: string, fill: string, cls = "") => `<path class="n-eti ${cls}" d="${d}" fill="${fill}"/>`;
  const EX = {
    etincelles:
      eti("M30 50l3 8 8 3-8 3-3 8-3-8-8-3 8-3z", "var(--cap-amber, #E5A83A)") +
      eti("M170 40l2 6 6 2-6 2-2 6-2-6-6-2 6-2z", "var(--cap-amber, #E5A83A)", "n-eti2") +
      eti("M182 150l2 5 5 2-5 2-2 5-2-5-5-2 5-2z", "var(--cap-ocean, #155E75)", "n-eti3"),
    goutte: `<path class="n-goutte" d="M150 150q5 8 0 12q-5-4 0-12z" fill="var(--n-goutte)"/>`,
    pluie: [[78, 158, 0], [118, 160, 0.6], [98, 162, 1.2]]
      .map(([x, y, d]) => `<path class="n-goutte" style="animation-delay:${d}s" d="M${x} ${y}q4 7 0 10q-4-3 0-10z" fill="var(--n-goutte)"/>`).join(""),
    zz: `<text class="n-z" x="150" y="72" font-family="var(--cap-font-display, sans-serif)" font-size="18" font-weight="600" fill="var(--cap-ink-3, #66788C)">z</text><text class="n-z n-z2" x="160" y="58" font-family="var(--cap-font-display, sans-serif)" font-size="13" font-weight="600" fill="var(--cap-ink-3, #66788C)">z</text>`,
  };
  const label = options.label === undefined ? `Nimbo, ${h.nom}` : options.label;
  const a11y = label ? `role="img" aria-label="${label.replace(/"/g, "&quot;")}"` : `aria-hidden="true"`;

  return `<svg class="nimbo ${h.classe ?? ""} ${options.className ?? ""}" viewBox="${vb}" width="${taille}" height="${hauteur}" ${a11y} focusable="false">` +
    `<defs><linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${haut}"/><stop offset=".55" stop-color="${milieu}"/><stop offset="1" stop-color="${bas}"/></linearGradient>` +
    `<radialGradient id="${id}l" cx=".35" cy=".25" r=".6"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>` +
    `<clipPath id="${id}c">${silhouette("")}</clipPath></defs>` +
    (petit ? "" : `<ellipse cx="100" cy="176" rx="54" ry="7" fill="var(--cap-ink, #0B1726)" opacity=".08"/>`) +
    `<g class="n-corps">${etoile}<g class="n-souffle">` +
    (petit ? "" : silhouette(`fill="var(--n-contour)" stroke="var(--n-contour)" stroke-width="6"`)) +
    silhouette(`fill="url(#${id}g)"`) +
    (petit ? "" : `<g clip-path="url(#${id}c)"><ellipse cx="80" cy="74" rx="60" ry="34" fill="url(#${id}l)"/></g>`) +
    Y[h.yeux] + B[h.bouche] +
    (petit ? "" : `<ellipse cx="68" cy="124" rx="7.5" ry="5" fill="var(--n-joue)" opacity=".75"/><ellipse cx="132" cy="124" rx="7.5" ry="5" fill="var(--n-joue)" opacity=".75"/>`) +
    `</g>${petit ? "" : BR[h.bras]}${h.extra ? EX[h.extra] : ""}</g></svg>`;
}
