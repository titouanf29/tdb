import { serie, type Bougie } from "../marche";
import type { LeconSerie } from "../types";
import { DevineFigure } from "@/components/cours/outils/DevineFigure";
import { DecisionsDansLeTemps } from "@/components/cours/outils/DecisionsDansLeTemps";

/** Remplace une bougie par celle que la leçon veut montrer, et raccorde la suivante. */
function poser(b: Bougie[], i: number, [o, h, l, c]: [number, number, number, number]) {
  b[i] = { ...b[i], o, h, l, c };
  const s = b[i + 1];
  if (s) { s.o = c; s.h = Math.max(s.h, s.o, s.c); s.l = Math.min(s.l, s.o, s.c); }
  return b;
}
const HAUT = "var(--cap-down)", BAS = "var(--cap-up)";

// L'ascendant : plafond plat à 4 050 $, creux de plus en plus hauts.
const asc = serie([[0, 3960], [5, 4050, "haut"], [11, 3970, "bas"], [17, 4050, "haut"], [22, 3995, "bas"], [28, 4049, "haut"], [32, 4018, "bas"], [37, 4049, "haut"], [40, 4040], [41, 4072], [46, 4100], [50, 4110]], { graine: 351, bruit: 0.0012 });
// Le descendant : plancher plat à 3 950 $, sommets de plus en plus bas.
const desc = serie([[0, 4040], [5, 3950, "bas"], [11, 4030, "haut"], [17, 3950, "bas"], [22, 4005, "haut"], [28, 3951, "bas"], [32, 3982, "haut"], [37, 3951, "bas"], [40, 3960], [41, 3928], [46, 3900], [50, 3890]], { graine: 352, bruit: 0.0012 });
// Le symétrique : sommets qui baissent, creux qui montent.
const sym = serie([[0, 4000], [4, 4060, "haut"], [10, 3940, "bas"], [16, 4040, "haut"], [22, 3960, "bas"], [28, 4020, "haut"], [34, 3980, "bas"], [36, 3995], [37, 3992], [38, 3968], [42, 3940], [46, 3925]], { graine: 353, bruit: 0.0012 });
// Une sortie tout près de la pointe : sans élan.
const pointe = serie([[0, 4000], [4, 4060, "haut"], [10, 3940, "bas"], [16, 4040, "haut"], [22, 3960, "bas"], [28, 4020, "haut"], [34, 3980, "bas"], [38, 4008, "haut"], [41, 3992], [43, 4012], [45, 4004], [48, 3996], [52, 4006], [56, 3998]], { graine: 354, bruit: 0.0009 });
// L'exercice : trois triangles, avant leur sortie.
const ex1 = serie([[0, 4010], [3, 4080, "haut"], [8, 3920, "bas"], [13, 4055, "haut"], [18, 3945, "bas"], [23, 4030, "haut"], [28, 3970, "bas"], [31, 3995]], { graine: 355, bruit: 0.0012 });
const ex2 = serie([[0, 192], [4, 210, "haut"], [9, 196, "bas"], [14, 210, "haut"], [19, 201, "bas"], [24, 209.9, "haut"], [29, 206, "bas"], [32, 208.5]], { graine: 356, bruit: 0.004 });
const ex3 = serie([[0, 1.1010], [4, 1.0990, "haut"], [9, 1.0900, "bas"], [14, 1.0965, "haut"], [19, 1.0901, "bas"], [24, 1.0940, "haut"], [29, 1.0900, "bas"], [32, 1.0915]], { graine: 357, bruit: 0.0005 });
// Les décisions : un symétrique sur l'euro-dollar en 4 heures.
const dec = (() => {
  const b = serie([[0, 1.1000], [4, 1.1060, "haut"], [10, 1.0940, "bas"], [16, 1.1040, "haut"], [22, 1.0960, "bas"], [28, 1.1020, "haut"], [32, 1.0995], [34, 1.0980, "bas"], [35, 1.0992], [37, 1.0996], [38, 1.0992], [39, 1.097], [43, 1.0940], [47, 1.0925]], { graine: 358, bruit: 0.0004 });
  poser(b, 36, [1.0994, 1.1016, 1.0991, 1.1001]);
  poser(b, 39, [1.0991, 1.0993, 1.0966, 1.097]);
  return b;
})();
const lignesDec = [
  { de: [4, 1.106] as [number, number], a: [43, 1.0995] as [number, number], couleur: HAUT },
  { de: [10, 1.094] as [number, number], a: [43, 1.0995] as [number, number], couleur: BAS },
];

const lecon: LeconSerie = {
  numero: 35,
  accroche: "Le range se resserre : les sommets baissent, ou les creux montent… Le prix se prépare à sortir.",
  promesse: "À la fin de cette leçon, vous saurez reconnaître les trois triangles, savoir lequel penche d'un côté (sans certitude), et entrer proprement : sur une clôture dehors, avec un stop dans le triangle.",
  parties: [{
    titre: "",
    blocs: [
      { t: "h", texte: "Un range qui se resserre" },
      { t: "p", html: "Un <span class=\"mot\">triangle</span>, c'est un range (leçon 34) qui se resserre : <b>deux lignes qui se rapprochent</b>, et le prix coincé entre les deux. À chaque aller-retour, l'espace se réduit. Les sommets baissent, ou les creux montent, ou les deux. Le prix ne peut pas rester coincé indéfiniment : il se prépare à sortir." },
      {
        t: "scenes",
        titre: "Le prix coincé entre deux lignes",
        scenes: [
          { legende: "Le prix va et vient, comme dans un range…", cfg: { bougies: sym, jusqua: 35 } },
          { legende: "… mais chaque sommet est plus bas que le précédent : 4 060 $, 4 040 $, 4 020 $.", cfg: { bougies: sym, jusqua: 35, traits: [{ de: [4, 4060], a: [28, 4020], couleur: HAUT }] } },
          { legende: "Et chaque creux plus haut : 3 940 $, 3 960 $, 3 980 $. Deux lignes qui se rapprochent : un triangle.", cfg: { bougies: sym, jusqua: 35, traits: [{ de: [4, 4060], a: [43, 3995], couleur: HAUT }, { de: [10, 3940], a: [43, 3995], couleur: BAS }] } },
          { legende: "Le prix finit par sortir, ici par le bas, sur une clôture nette sous la ligne.", cfg: { bougies: sym, traits: [{ de: [4, 4060], a: [43, 3995], couleur: HAUT }, { de: [10, 3940], a: [43, 3995], couleur: BAS }], marques: [{ i: 38, type: "vente", label: "Sortie" }] } },
        ],
      },
      { t: "h", texte: "Le triangle ascendant" },
      { t: "p", html: "Le <span class=\"mot\">triangle ascendant</span> (<em>ascending triangle</em>) a <b>un plafond plat</b> et <b>des creux de plus en plus hauts</b>. Les vendeurs défendent toujours le même prix, mais les acheteurs reviennent <b>de plus en plus tôt</b> : ils n'attendent plus que le prix redescende aussi bas. La pression monte sous le plafond." },
      {
        t: "scenes",
        titre: "L'ascendant, élément par élément",
        scenes: [
          { legende: "Trois fois, le prix bute vers 4 050 $.", cfg: { bougies: asc, jusqua: 38, niveaux: [{ prix: 4050, label: "Plafond plat", couleur: HAUT }] } },
          { legende: "Mais les creux montent : 3 970 $, 3 995 $, 4 018 $. Les acheteurs reviennent plus tôt.", cfg: { bougies: asc, jusqua: 38, niveaux: [{ prix: 4050, label: "Plafond plat", couleur: HAUT }], traits: [{ de: [11, 3970], a: [32, 4018], couleur: BAS, prolonger: true }], marques: [{ i: 11, type: "point" }, { i: 22, type: "point" }, { i: 32, type: "point" }] } },
          { legende: "Une bougie clôture nettement au-dessus du plafond : sortie par le haut, le cas le plus fréquent pour un ascendant. Le plus fréquent, pas le seul.", cfg: { bougies: asc, niveaux: [{ prix: 4050, label: "Plafond plat", couleur: HAUT }], traits: [{ de: [11, 3970], a: [32, 4018], couleur: BAS, prolonger: true }], marques: [{ i: 41, type: "achat", label: "Clôture dehors" }] } },
        ],
      },
      { t: "p", html: "Il <b>casse plus souvent par le haut</b> : les acheteurs, de plus en plus pressés, finissent souvent par épuiser les vendeurs du plafond. Mais plus souvent ne veut pas dire toujours. Un ascendant peut casser par le bas ; c'est pour ça qu'on attend la sortie au lieu de la deviner." },
      { t: "h", texte: "Le triangle descendant" },
      { t: "p", html: "Le <span class=\"mot\">triangle descendant</span> (<em>descending triangle</em>) est l'inverse : <b>un plancher plat</b> et <b>des sommets de plus en plus bas</b>. Les acheteurs défendent toujours le même prix, mais les vendeurs reviennent de plus en plus tôt. Il <b>casse plus souvent par le bas</b>." },
      {
        t: "graphique",
        cfg: { bougies: desc, niveaux: [{ prix: 3950, label: "Plancher plat", couleur: BAS }], traits: [{ de: [11, 4030], a: [32, 3982], couleur: HAUT, prolonger: true }], marques: [{ i: 41, type: "vente", label: "Clôture dehors" }] },
        legende: "Un plancher à 3 950 $ touché quatre fois, des sommets à 4 030 $, 4 005 $, 3 982 $ : les vendeurs pressent, et le plancher finit par céder.",
      },
      { t: "h", texte: "Le triangle symétrique" },
      { t: "p", html: "Le <span class=\"mot\">triangle symétrique</span> (<em>symmetrical triangle</em>) : <b>les sommets baissent et les creux montent</b>. Les deux camps cèdent du terrain à la même vitesse. Là, <b>aucun sens n'est favori</b> : on attend la sortie, sans parier." },
      {
        t: "tableau",
        entetes: ["Triangle", "La ligne du haut", "La ligne du bas", "Sort plus souvent"],
        lignes: [
          ["Ascendant", "Plate (un plafond)", "Monte (creux plus hauts)", "Par le haut"],
          ["Descendant", "Descend (sommets plus bas)", "Plate (un plancher)", "Par le bas"],
          ["Symétrique", "Descend", "Monte", "Aucun sens favori"],
        ],
        legende: "« Plus souvent » n'est jamais « toujours » : dans les trois cas, on attend la clôture dehors.",
      },
      {
        t: "outil",
        titre: "Quel triangle ?",
        consigne: "Trois graphiques, trois marchés. Regardez la forme des sommets et des creux, et nommez le triangle.",
        el: <DevineFigure question="Quel triangle voyez-vous ?"
          options={[{ v: "asc", texte: "Ascendant" }, { v: "desc", texte: "Descendant" }, { v: "sym", texte: "Symétrique" }]}
          cas={[
            { bougies: ex1, bonne: "sym", expliquer: "Les sommets baissent (4 080, 4 055, 4 030 $) et les creux montent (3 920, 3 945, 3 970 $) : symétrique. Aucun sens favori, on attend.",
              correction: { traits: [{ de: [3, 4080], a: [23, 4030], couleur: HAUT, prolonger: true }, { de: [8, 3920], a: [28, 3970], couleur: BAS, prolonger: true }] } },
            { bougies: ex2, bonne: "asc", expliquer: "Un plafond plat vers 210 et des creux qui montent (196, 201, 206) : ascendant. Il sort plus souvent par le haut.",
              correction: { niveaux: [{ prix: 210, label: "Plafond plat", couleur: HAUT }], traits: [{ de: [9, 196], a: [29, 206], couleur: BAS, prolonger: true }] } },
            { bougies: ex3, bonne: "desc", expliquer: "Un plancher plat à 1,0900 et des sommets qui baissent (1,0990, 1,0965, 1,0940) : descendant. Il sort plus souvent par le bas.",
              correction: { niveaux: [{ prix: 1.09, label: "Plancher plat", couleur: BAS }], traits: [{ de: [4, 1.099], a: [24, 1.094], couleur: HAUT, prolonger: true }] } },
          ]} />,
      },
      { t: "h", texte: "Entrer : une clôture nette dehors" },
      { t: "p", html: "La règle d'entrée est la même pour les trois : <b>une clôture nette en dehors du triangle</b>. Pas avant. Pas sur une mèche : une mèche dehors, suivie d'une clôture dedans, est souvent un piège, une <span class=\"mot\">fausse cassure</span> (<em>fakeout</em>, leçon 30). Pas en anticipant : deviner le sens, c'est parier." },
      { t: "p", html: "Le <b>stop se place de l'autre côté de la ligne cassée, dans le triangle</b>. L'idée est simple : si le prix retourne dans le triangle, la cassure était fausse, et il n'y a plus de raison d'être en position." },
      {
        t: "exemple",
        html: "Un triangle ascendant sur l'euro-dollar : plafond à <b>1,1000</b>, creux à 1,0920, 1,0945 puis 1,0970. Une bougie de 4 heures clôture à <b>1,1012</b>, nettement au-dessus : vous achetez. Le stop va dans le triangle, sous le plafond, à <b>1,0992</b> : <b>20 pips</b>. Avec <b>0,10 lot</b> (1 $ par pip), le risque est de <b>20 $</b>, soit 1 % d'un compte de 2 000 $. Pour l'objectif, beaucoup de traders reportent la hauteur du triangle à sa base : 1,1000 − 1,0920 = 80 pips, d'où un objectif vers 1,1080, soit environ <b>70 pips</b> au-dessus de l'entrée (70 $). C'est une habitude courante, pas une promesse.",
      },
      {
        t: "outil",
        titre: "Entrez sur la sortie du triangle",
        consigne: "Un triangle symétrique sur l'euro-dollar en 4 heures. Le temps avance et s'arrête : décidez avec ce que vous voyez.",
        el: <DecisionsDansLeTemps bougies={dec} decor={{ traits: lignesDec }}
          bilan="La méthode tient en trois mots : attendre la clôture, entrer, stop dans le triangle."
          etapes={[
            { jusqua: 31, question: "Le triangle est symétrique. Par où va-t-il sortir ?", bonne: "attendre",
              options: [{ v: "haut", texte: "Par le haut" }, { v: "bas", texte: "Par le bas" }, { v: "attendre", texte: "On ne sait pas : on attend" }],
              expliquer: "Dans un symétrique, aucun sens n'est favori. Parier sur une sortie, c'est jouer à pile ou face. On attend qu'elle se produise." },
            { jusqua: 36, question: "Une bougie monte à 1,1016, au-dessus de la ligne du haut, puis clôture à 1,1001, dans le triangle. Vous achetez ?", bonne: "non",
              options: [{ v: "oui", texte: "Oui, ça casse par le haut" }, { v: "non", texte: "Non, j'attends une clôture dehors" }],
              expliquer: "La ligne du haut passe vers 1,1007 : la clôture est restée dedans. Une mèche dehors n'est pas une sortie, et ici c'était un piège.",
              dessin: { surligne: [36] } },
            { jusqua: 39, question: "Une bougie clôture à 1,0970, nettement sous la ligne du bas (vers 1,0988). Que faites-vous ?", bonne: "vendre",
              options: [{ v: "acheter", texte: "Acheter le rebond" }, { v: "vendre", texte: "Vendre" }, { v: "attendre", texte: "Attendre encore" }],
              expliquer: "Une clôture nette dehors : c'est le signal d'entrée. Ici, une vente, puisque le triangle sort par le bas.",
              dessin: { marques: [{ i: 39, type: "vente", label: "Vente" }] } },
            { jusqua: 39, question: "Où placez-vous le stop de cette vente ?", bonne: "dedans",
              options: [{ v: "colle", texte: "1,0975, juste au-dessus de l'entrée" }, { v: "dedans", texte: "1,0990, dans le triangle, au-dessus de la ligne cassée" }, { v: "aucun", texte: "Aucun" }],
              expliquer: "De l'autre côté de la ligne cassée, dans le triangle : 1,0990, soit 20 pips. Avec 0,10 lot, 20 $ de risque. Si le prix y retourne, la cassure était fausse.",
              dessin: { marques: [{ i: 39, type: "vente", label: "Vente" }], niveaux: [{ prix: 1.099, label: "Stop 1,0990", couleur: HAUT, pointille: false }] } },
            { jusqua: 47, question: "Le prix est descendu vers 1,0925. Et s'il était remonté clôturer dans le triangle, au-dessus de 1,0990 ?", bonne: "stop",
              options: [{ v: "stop", texte: "Le stop m'aurait sorti : perte limitée à 20 $" }, { v: "retirer", texte: "J'aurais dû retirer le stop" }],
              expliquer: "Rien n'était garanti. Le stop dans le triangle est justement là pour ça : une fausse cassure coûte 20 $, pas le compte.",
              dessin: { marques: [{ i: 39, type: "vente", label: "Vente" }], niveaux: [{ prix: 1.099, label: "Stop 1,0990", couleur: HAUT, pointille: false }] } },
          ]} />,
      },
      { t: "h", texte: "Vers la pointe" },
      { t: "p", html: "Plus le prix avance vers la <span class=\"mot\">pointe</span> (<em>apex</em>), là où les deux lignes se croisent, plus la sortie approche : il n'y a bientôt plus de place. Mais <b>tout près de la pointe, le triangle perd souvent sa force</b>. Le prix sort sans élan, hésite, revient, et la « cassure » ne mène nulle part. Les sorties les plus nettes arrivent souvent entre la moitié et les trois quarts du triangle." },
      {
        t: "scenes",
        titre: "Une sortie trop tard",
        scenes: [
          { legende: "Le même genre de triangle symétrique. Le prix approche de la pointe sans être sorti.", cfg: { bougies: pointe, jusqua: 40, traits: [{ de: [4, 4060], a: [43, 3995], couleur: HAUT }, { de: [10, 3940], a: [43, 3995], couleur: BAS }] } },
          { legende: "Au-delà de la pointe, les lignes ne veulent plus rien dire : le prix tourne en rond autour de 4 000 $, sans direction. Le triangle s'est éteint.", cfg: { bougies: pointe, traits: [{ de: [4, 4060], a: [43, 3995], couleur: HAUT }, { de: [10, 3940], a: [43, 3995], couleur: BAS }], zones: [{ i0: 41, i1: 56, p0: 3988, p1: 4016, couleur: "var(--cap-ink-3)", label: "Sans élan" }] } },
        ],
      },
      { t: "piege", html: "<b>Entrer avant la sortie.</b> Le triangle est ascendant, il « doit » casser par le haut : vous achetez au milieu. Si le prix casse par le bas, vous êtes du mauvais côté, sans repère pour le stop. L'ascendant sort plus souvent par le haut, pas toujours. <b>La clôture dehors d'abord, l'entrée ensuite.</b>" },
      {
        t: "qr", items: [
          { q: "Faut-il que les lignes touchent exactement les sommets et les creux ?", r: "Non, ce sont des zones, comme les supports (leçon 33). Il faut au moins deux contacts sur chaque ligne, sans couper les bougies, comme pour une ligne de tendance (leçon 29)." },
          { q: "Que faire si la cassure est fausse ?", r: "Le stop dans le triangle vous sort avec une perte limitée. Certains traders reprennent alors une position dans l'autre sens, sur la sortie opposée ; c'est une décision à part, avec son propre stop." },
          { q: "Les triangles marchent-ils sur toutes les unités de temps ?", r: "Ils apparaissent partout, mais ceux du journalier ou du 4 heures sont plus fiables que ceux de 5 minutes, où le bruit dessine des triangles à tout moment." },
        ],
      },
      { t: "nimbo", texte: "Sur la page Analyse, cherchez un actif dont les sommets et les creux se rapprochent. Tracez les deux lignes, notez le type de triangle, et revenez voir par où il est sorti.", humeur: "pointe" },
    ],
  }],
  mots: [
    { terme: "Triangle", en: "triangle", def: "Un range qui se resserre : deux lignes qui se rapprochent, le prix coincé entre elles." },
    { terme: "Triangle ascendant", en: "ascending triangle", def: "Un plafond plat et des creux de plus en plus hauts ; sort plus souvent par le haut." },
    { terme: "Triangle descendant", en: "descending triangle", def: "Un plancher plat et des sommets de plus en plus bas ; sort plus souvent par le bas." },
    { terme: "Triangle symétrique", en: "symmetrical triangle", def: "Des sommets qui baissent et des creux qui montent ; aucun sens favori." },
    { terme: "Cassure", en: "breakout", def: "Une clôture nette en dehors du triangle : le signal d'entrée." },
    { terme: "Fausse cassure", en: "fakeout", def: "Une sortie qui échoue : mèche dehors, ou retour rapide dans le triangle." },
    { terme: "Pointe", en: "apex", def: "Le point où les deux lignes se croisent. Tout près, le triangle perd souvent sa force." },
  ],
  retenir: [
    "Un triangle est <b>un range qui se resserre</b> : deux lignes qui se rapprochent.",
    "<b>Ascendant</b> (plafond plat, creux qui montent) : plus souvent par le haut, pas toujours.",
    "<b>Descendant</b> (plancher plat, sommets qui baissent) : plus souvent par le bas.",
    "<b>Symétrique</b> : aucun sens favori, on attend la sortie.",
    "Entrer sur <b>une clôture nette dehors</b> ; le stop <b>dans le triangle</b>, de l'autre côté de la ligne cassée.",
    "Vers la pointe, la sortie approche ; <b>tout près de la pointe</b>, le triangle perd souvent sa force.",
  ],
  quiz: [
    { question: "Un plafond plat et des creux de plus en plus hauts. Quel triangle ?", options: ["Ascendant", "Descendant", "Symétrique"], correct: 0, explanation: "Plafond plat et creux qui montent : les acheteurs reviennent de plus en plus tôt. C'est un triangle ascendant." },
    { question: "Par où un triangle symétrique sort-il le plus souvent ?", options: ["Par le haut", "Par le bas", "Aucun sens n'est favori"], correct: 2, explanation: "Dans un symétrique, les deux camps cèdent du terrain à la même vitesse : on attend la sortie, sans parier." },
    { question: "Une mèche dépasse le plafond d'un ascendant, mais la bougie clôture dedans. Que faire ?", options: ["Acheter tout de suite", "Attendre une clôture dehors", "Vendre"], correct: 1, explanation: "Une mèche dehors n'est pas une sortie. On attend une clôture nette en dehors du triangle." },
    { question: "Vous achetez la sortie d'un ascendant (plafond 1,1000, entrée 1,1012). Où mettre le stop ?", options: ["À 1,1008, collé à l'entrée", "À 1,0992, dans le triangle sous le plafond", "Pas de stop, la cassure est confirmée"], correct: 1, explanation: "Dans le triangle, de l'autre côté de la ligne cassée : si le prix y retourne, la cassure était fausse. Ici, 20 pips de risque." },
    { question: "Le prix sort d'un triangle tout près de sa pointe. Qu'en penser ?", options: ["C'est la sortie la plus fiable", "La sortie manque souvent de force", "La pointe n'a aucune importance"], correct: 1, explanation: "Tout près de la pointe, le triangle perd souvent sa force : la sortie peut manquer d'élan et ne mener nulle part." },
  ],
  pratique: [
    { texte: "Cherchez un triangle sur le 4 heures d'un actif, tracez ses deux lignes et notez son type.", href: "/analysis", bouton: "Ouvrir l'analyse" },
    { texte: "Préparez un ordre fictif pour la sortie, avec le stop dans le triangle.", href: "/trading", bouton: "Prendre position" },
  ],
};

export default lecon;
