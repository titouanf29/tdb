import { serie, type Bougie } from "../marche";
import type { LeconSerie } from "../types";
import { ClasseSommetsCreux } from "@/components/cours/outils/ClasseSommetsCreux";
import { DecisionsDansLeTemps } from "@/components/cours/outils/DecisionsDansLeTemps";

/** Remplace une bougie par celle que la leçon veut montrer, et raccorde la suivante. */
function poser(b: Bougie[], i: number, [o, h, l, c]: [number, number, number, number]) {
  b[i] = { ...b[i], o, h, l, c };
  const s = b[i + 1];
  if (s) { s.o = c; s.h = Math.max(s.h, s.o, s.c); s.l = Math.min(s.l, s.o, s.c); }
  return b;
}

const hausse = serie([[0, 100], [6, 104, "haut"], [11, 101, "bas"], [18, 106, "haut"], [23, 103, "bas"], [30, 108, "haut"], [35, 105, "bas"], [42, 110, "haut"], [47, 107, "bas"], [52, 111]], { graine: 281 });
const ptsHausse = { h: [[6, 104], [18, 106], [30, 108], [42, 110]], c: [[11, 101], [23, 103], [35, 105], [47, 107]] } as const;
const zigzag: [number, number][] = [[0, 100], [6, 104], [11, 101], [18, 106], [23, 103], [30, 108], [35, 105], [42, 110], [47, 107], [52, 111]];
const baisse = serie([[0, 111], [6, 107, "bas"], [11, 110, "haut"], [18, 105, "bas"], [23, 108, "haut"], [30, 103, "bas"], [35, 106, "haut"], [42, 101, "bas"], [47, 104, "haut"], [52, 100]], { graine: 282 });
const range = serie([[0, 104], [6, 108, "haut"], [12, 100.2, "bas"], [19, 108.1, "haut"], [26, 100, "bas"], [33, 107.9, "haut"], [40, 100.1, "bas"], [47, 108, "haut"], [52, 104]], { graine: 283 });
// La cassure de structure, puis un range : pas forcément une baisse.
const cassure = serie([[0, 99], [4, 100, "bas"], [10, 105, "haut"], [16, 102.5, "bas"], [23, 108, "haut"], [29, 105.5, "bas"], [36, 110, "haut"], [41, 107.5], [44, 106.2], [45, 104.6], [52, 107.2, "haut"], [58, 103.6, "bas"], [64, 107, "haut"], [70, 104.5]], { graine: 284 });
// Le bruit des petites bougies, et les seuls points qui comptent.
const net = serie([[0, 3900], [9, 3962, "haut"], [16, 3925, "bas"], [27, 3998, "haut"], [35, 3958, "bas"], [46, 4040, "haut"], [54, 4000, "bas"], [60, 4030]], { graine: 285, bruit: 0.0022 });
const extremes = (genre: "h" | "l") => net.map((_, i) => i).filter((i) => i > 1 && i < net.length - 2 && [-2, -1, 1, 2].every((d) => (genre === "h" ? net[i + d].h <= net[i].h : net[i + d].l >= net[i].l)));
const petits = [...extremes("h").map((i) => ({ i, prix: net[i].h, type: "point" as const })), ...extremes("l").map((i) => ({ i, prix: net[i].l, type: "point" as const }))];
// L'exercice.
const exo = serie([[0, 101], [3, 100, "bas"], [9, 106, "haut"], [15, 103, "bas"], [22, 110, "haut"], [28, 106.5, "bas"], [35, 113, "haut"], [41, 109, "bas"], [48, 111.5, "haut"], [55, 105, "bas"], [61, 108, "haut"], [64, 106]], { graine: 286 });
// Les décisions autour du dernier creux, sur l'euro-dollar en 4 heures.
const dec = (() => {
  const b = serie([[0, 1.0880], [4, 1.0900, "bas"], [11, 1.0990, "haut"], [17, 1.0940, "bas"], [25, 1.1040, "haut"], [31, 1.0980, "bas"], [39, 1.1070, "haut"], [42, 1.1032], [44, 1.1000], [48, 1.1012], [52, 1.0992], [53, 1.0960], [58, 1.0925], [62, 1.0935]], { graine: 287, bruit: 0.0005 });
  poser(b, 45, [1.0999, 1.1003, 1.0972, 1.0988]);
  poser(b, 53, [1.0992, 1.0995, 1.0955, 1.0960]);
  return b;
})();

const notesHausse = [
  ...ptsHausse.h.slice(1).map(([i, p]) => ({ i, prix: p, texte: "HH", couleur: "var(--cap-up)" })),
  ...ptsHausse.c.slice(1).map(([i, p]) => ({ i, prix: p, texte: "HL", couleur: "var(--cap-up)", dessous: true })),
];

const lecon: LeconSerie = {
  numero: 28,
  accroche: "Ça monte, ou ça descend ? Pour le savoir, regardez les sommets et les creux.",
  promesse: "À la fin de cette leçon, vous saurez lire la structure du marché en un coup d'œil : l'escalier qui monte, celui qui descend, le range, et le moment où la structure casse.",
  parties: [{
    titre: "",
    blocs: [
      { t: "h", texte: "Le prix avance en zigzag" },
      { t: "p", html: "Le prix ne monte jamais en ligne droite, et ne baisse jamais en ligne droite. Il avance <b>en zigzag</b> : il monte un peu, recule, remonte. Ce zigzag laisse deux sortes de points :" },
      {
        t: "liste", items: [
          "un <span class=\"mot\">sommet</span> (<em>swing high</em>) : là où le prix monte, puis redescend ;",
          "un <span class=\"mot\">creux</span> (<em>swing low</em>) : là où le prix descend, puis remonte.",
        ],
      },
      { t: "p", html: "La <span class=\"mot\">structure du marché</span> (<em>market structure</em>), c'est la façon dont ces points s'enchaînent. Il suffit de comparer chaque sommet au sommet d'avant, et chaque creux au creux d'avant." },
      {
        t: "scenes",
        titre: "Du zigzag à l'escalier",
        scenes: [
          { legende: "Un cours qui monte, en zigzag.", cfg: { bougies: hausse } },
          { legende: "Les <b>sommets</b> : là où le prix a fait demi-tour vers le bas.", cfg: { bougies: hausse, marques: ptsHausse.h.map(([i, p]) => ({ i, prix: p, type: "point" as const })) } },
          { legende: "Les <b>creux</b> : là où il a fait demi-tour vers le haut.", cfg: { bougies: hausse, marques: [...ptsHausse.h, ...ptsHausse.c].map(([i, p]) => ({ i, prix: p, type: "point" as const })) } },
          { legende: "Reliés dans l'ordre, ils dessinent un <b>escalier qui monte</b> : chaque marche plus haute que la précédente.", cfg: { bougies: hausse, marques: [...ptsHausse.h, ...ptsHausse.c].map(([i, p]) => ({ i, prix: p, type: "point" as const })), traits: zigzag.slice(1).map((p, k) => ({ de: zigzag[k], a: p, couleur: "var(--cap-ink-3)" }))} },
          { legende: "Chaque sommet plus haut : <b>HH</b> (<em>higher high</em>). Chaque creux plus haut : <b>HL</b> (<em>higher low</em>). C'est la définition d'une tendance haussière.", cfg: { bougies: hausse, marques: [...ptsHausse.h, ...ptsHausse.c].map(([i, p]) => ({ i, prix: p, type: "point" as const })), notes: notesHausse } },
        ],
      },
      { t: "h", texte: "En hausse : sommets et creux plus hauts" },
      { t: "p", html: "En tendance haussière, chaque sommet est plus haut que le précédent : c'est un <span class=\"mot\">sommet plus haut</span> (<em>higher high</em>, HH). Et chaque creux aussi : un <span class=\"mot\">creux plus haut</span> (<em>higher low</em>, HL). Le creux plus haut est le plus parlant : il montre que <b>les acheteurs reviennent plus tôt</b> à chaque recul, sans attendre que le prix redescende aussi bas." },
      { t: "h", texte: "En baisse : sommets et creux plus bas" },
      { t: "p", html: "En tendance baissière, c'est l'inverse : des sommets de plus en plus bas, des <span class=\"mot\">sommets plus bas</span> (<em>lower high</em>, LH), et des creux de plus en plus bas, des <span class=\"mot\">creux plus bas</span> (<em>lower low</em>, LL). Chaque rebond s'arrête plus tôt : les vendeurs n'attendent plus." },
      {
        t: "graphique",
        cfg: { bougies: baisse, marques: [[11, 110], [23, 108], [35, 106], [47, 104], [6, 107], [18, 105], [30, 103], [42, 101]].map(([i, p]) => ({ i, prix: p, type: "point" as const })), notes: [...[[23, 108], [35, 106], [47, 104]].map(([i, p]) => ({ i, prix: p, texte: "LH", couleur: "var(--cap-down)" })), ...[[18, 105], [30, 103], [42, 101]].map(([i, p]) => ({ i, prix: p, texte: "LL", couleur: "var(--cap-down)", dessous: true }))] },
        legende: "Un escalier qui descend : LH, LL, LH, LL… Tant que ça dure, la baisse est en place.",
      },
      { t: "h", texte: "Au même niveau : pas de tendance, un range" },
      { t: "p", html: "Quand les sommets et les creux restent <b>à peu près au même niveau</b>, il n'y a pas de tendance. Le prix tourne en rond entre un plancher et un plafond : c'est un <span class=\"mot\">range</span> (leçon 34). Ni escalier qui monte, ni escalier qui descend : un couloir." },
      {
        t: "graphique",
        cfg: { bougies: range, niveaux: [{ prix: 108, zone: 0.6, label: "Sommets au même niveau", couleur: "var(--cap-ink-2)" }, { prix: 100.1, zone: 0.6, label: "Creux au même niveau", couleur: "var(--cap-ink-2)" }] },
        legende: "Quatre sommets vers 108, quatre creux vers 100 : aucun n'est vraiment plus haut ni plus bas que le précédent.",
      },
      {
        t: "tableau",
        entetes: ["Ce que font les points", "En anglais", "La structure"],
        lignes: [
          ["Sommets plus hauts et creux plus hauts", "HH et HL", "Tendance haussière"],
          ["Sommets plus bas et creux plus bas", "LH et LL", "Tendance baissière"],
          ["Sommets et creux au même niveau", "", "Range"],
          ["Signaux mélangés (un HH puis un LL…)", "", "Transition : prudence"],
        ],
      },
      {
        t: "outil",
        titre: "Classez les points",
        consigne: "Pour chaque point numéroté, dites s'il est plus haut ou plus bas que le point précédent du même genre. Puis voyez la correction sur le graphique.",
        el: <ClasseSommetsCreux bougies={exo}
          points={[
            { i: 3, prix: 100, genre: "creux" }, { i: 9, prix: 106, genre: "sommet" }, { i: 15, prix: 103, genre: "creux" }, { i: 22, prix: 110, genre: "sommet" },
            { i: 28, prix: 106.5, genre: "creux" }, { i: 35, prix: 113, genre: "sommet" }, { i: 41, prix: 109, genre: "creux" }, { i: 48, prix: 111.5, genre: "sommet" },
            { i: 55, prix: 105, genre: "creux" }, { i: 61, prix: 108, genre: "sommet" },
          ]}
          conclusion="Jusqu'au point 5, un escalier qui monte. Le point 6, un sommet plus bas, est un premier avertissement. Le point 7 passe sous le dernier creux (109) : la structure haussière est cassée, et le point 8 confirme que le marché ne monte plus." />,
      },
      { t: "h", texte: "Le moment clé : le dernier creux" },
      { t: "p", html: "En tendance haussière, un point compte plus que tous les autres : <b>le dernier creux</b>. Tant qu'il tient, l'escalier monte. Si une bougie <b>clôture</b> sous ce dernier creux, la structure est cassée : les traders parlent de <span class=\"mot\">cassure de structure</span> (<em>break of structure</em>)." },
      { t: "p", html: "Attention à ce que ça veut dire. Une structure cassée <b>ne veut pas dire que le prix va baisser</b>. Elle veut dire que <b>la hausse n'est plus sûre</b> : l'escalier s'est interrompu. La suite peut être une baisse, un range, ou une reprise. En baisse, c'est le miroir : on surveille le dernier sommet." },
      {
        t: "scenes",
        titre: "La structure qui casse",
        scenes: [
          { legende: "Un escalier qui monte. Le dernier creux est à 105,5 : c'est lui qu'on surveille.", cfg: { bougies: cassure, jusqua: 31, niveaux: [{ prix: 105.5, label: "Dernier creux", couleur: "var(--cap-amber-ink)" }], marques: [{ i: 4, type: "point" }, { i: 16, type: "point" }, { i: 29, type: "point" }] } },
          { legende: "Nouveau sommet à 110. Tant que 105,5 tient, la hausse est intacte.", cfg: { bougies: cassure, jusqua: 38, niveaux: [{ prix: 105.5, label: "Dernier creux", couleur: "var(--cap-amber-ink)" }], marques: [{ i: 4, type: "point" }, { i: 16, type: "point" }, { i: 29, type: "point" }, { i: 36, type: "point", prix: 110 }] } },
          { legende: "Une bougie <b>clôture</b> sous 105,5 : la structure est cassée. La hausse n'est plus sûre.", cfg: { bougies: cassure, jusqua: 45, niveaux: [{ prix: 105.5, label: "Dernier creux cassé", couleur: "var(--cap-down)" }], marques: [{ i: 45, type: "croix", prix: cassure[45].c }] } },
          { legende: "La suite : ni effondrement, ni reprise. Le prix tourne en rond entre 103,5 et 107. Cassée ne veut pas dire baissière : ça veut dire « plus de hausse sûre ».", cfg: { bougies: cassure, niveaux: [{ prix: 105.5, label: "Dernier creux cassé", couleur: "var(--cap-down)" }], marques: [{ i: 45, type: "croix", prix: cassure[45].c }], zones: [{ i0: 47, i1: 70, p0: 103.5, p1: 107.3, couleur: "var(--cap-ink-3)" }] } },
        ],
      },
      {
        t: "outil",
        titre: "Surveillez le dernier creux",
        consigne: "L'euro-dollar en 4 heures. Le temps avance par étapes : à chaque arrêt, décidez avec ce que vous voyez.",
        el: <DecisionsDansLeTemps bougies={dec}
          bilan="Retenez la règle : on surveille le dernier creux, on juge à la clôture, et une structure cassée invite à la prudence, pas à parier sur la baisse."
          etapes={[
            { jusqua: 40, question: "Le prix vient de faire un nouveau sommet, vers 1,1070. Quel niveau surveillez-vous maintenant ?", bonne: "creux",
              options: [{ v: "sommet", texte: "1,1070, le sommet" }, { v: "creux", texte: "1,0980, le dernier creux" }, { v: "premier", texte: "1,0900, le premier creux" }],
              expliquer: "En hausse, c'est <b>le dernier creux</b> qui dit si l'escalier tient. Le premier creux est trop loin : le prix pourrait casser la structure bien avant.",
              dessin: { niveaux: [{ prix: 1.098, label: "Dernier creux 1,0980", couleur: "var(--cap-amber-ink)" }], marques: [{ i: 31, type: "point" }] } },
            { jusqua: 45, question: "Une mèche descend à 1,0972, sous le dernier creux, mais la bougie clôture à 1,0988. La structure est-elle cassée ?", bonne: "non",
              options: [{ v: "oui", texte: "Oui, cassée" }, { v: "non", texte: "Non, pas encore" }],
              expliquer: "La règle se juge <b>à la clôture</b>. Une mèche dessous montre une attaque des vendeurs, repoussée : la bougie a fini au-dessus de 1,0980.",
              dessin: { niveaux: [{ prix: 1.098, label: "Dernier creux 1,0980", couleur: "var(--cap-amber-ink)" }], surligne: [45] } },
            { jusqua: 53, question: "Cette fois, une bougie clôture à 1,0960. Qu'en concluez-vous ?", bonne: "cassee",
              options: [{ v: "cassee", texte: "La structure est cassée" }, { v: "rien", texte: "Rien n'a changé" }, { v: "baisse", texte: "Le prix va forcément baisser" }],
              expliquer: "Une clôture sous le dernier creux casse la structure : 20 pips sous 1,0980. Mais « cassée » ne veut pas dire « baisse garantie » : seulement que la hausse n'est plus sûre.",
              dessin: { niveaux: [{ prix: 1.098, label: "Structure cassée", couleur: "var(--cap-down)" }], marques: [{ i: 53, type: "croix", prix: 1.096 }] } },
            { jusqua: 62, question: "Vous achetiez chaque retour vers un creux. Et maintenant ?", bonne: "attendre",
              options: [{ v: "racheter", texte: "Je rachète, c'est moins cher" }, { v: "attendre", texte: "J'arrête et j'attends une nouvelle structure" }],
              expliquer: "Acheter les creux n'a de sens que dans un escalier qui monte. L'escalier est interrompu : on attend que le marché montre une nouvelle structure, haussière ou baissière.",
              dessin: { niveaux: [{ prix: 1.098, label: "Structure cassée", couleur: "var(--cap-down)" }] } },
          ]} />,
      },
      {
        t: "exemple",
        html: "Sur l'euro-dollar en 4 heures, les creux sont à <b>1,0900</b>, <b>1,0940</b> puis <b>1,0980</b> : chacun plus haut que le précédent, de 40 pips. Les sommets, à 1,0990, 1,1040, puis 1,1070. Le dernier creux, 1,0980, est à <b>90 pips</b> sous le dernier sommet (1,1070 − 1,0980 = 0,0090). Tant que les bougies de 4 heures clôturent au-dessus de 1,0980, la structure est haussière. Une clôture à 1,0960 la casse : c'est <b>20 pips</b> sous le creux. Une mèche à 1,0972 suivie d'une clôture à 1,0988, elle, ne casse rien.",
      },
      { t: "h", texte: "La tracer vous-même, en trois gestes" },
      {
        t: "liste", numerotee: true, items: [
          "<b>Choisissez une unité de temps</b>, par exemple le 4 heures, et tenez-vous-y. Un sommet en 5 minutes n'a rien à voir avec un sommet en journalier.",
          "<b>Marquez seulement les sommets et les creux bien nets</b> : ceux où le prix a fait un vrai demi-tour, visible de loin. Pas chaque petite bougie.",
          "<b>Comparez chaque point au précédent du même genre.</b> Plus haut, ou plus bas ? Vous savez dans quel sens va le marché.",
        ],
      },
      {
        t: "scenes",
        titre: "Les points nets, pas chaque bougie",
        scenes: [
          { legende: "De près, il y a des petits sommets et des petits creux partout. Les marquer tous ne dit rien.", cfg: { bougies: net, marques: petits } },
          { legende: "Gardez seulement les demi-tours nets, visibles de loin : trois sommets, trois creux.", cfg: { bougies: net, marques: [[9, 3962], [27, 3998], [46, 4040]].map(([i, p]) => ({ i, prix: p, type: "point" as const })).concat([[16, 3925], [35, 3958], [54, 4000]].map(([i, p]) => ({ i, prix: p, type: "point" as const }))) } },
          { legende: "Comparez : sommets 3 962, 3 998, 4 040 ; creux 3 925, 3 958, 4 000. Tous plus hauts : la structure est haussière, et le creux à surveiller est 4 000 $.", cfg: { bougies: net, marques: [[9, 3962], [27, 3998], [46, 4040], [16, 3925], [35, 3958], [54, 4000]].map(([i, p]) => ({ i, prix: p, type: "point" as const })), notes: [{ i: 27, prix: 3998, texte: "HH", couleur: "var(--cap-up)" }, { i: 46, prix: 4040, texte: "HH", couleur: "var(--cap-up)" }, { i: 35, prix: 3958, texte: "HL", couleur: "var(--cap-up)", dessous: true }, { i: 54, prix: 4000, texte: "HL", couleur: "var(--cap-up)", dessous: true }], niveaux: [{ prix: 4000, label: "Dernier creux", couleur: "var(--cap-amber-ink)" }] } },
        ],
      },
      { t: "piege", html: "<b>Voir une cassure à chaque mèche.</b> Une mèche qui passe un instant sous le dernier creux, puis une clôture au-dessus, ce n'est pas une cassure : c'est une attaque repoussée. Jugez à la clôture, sur votre unité de temps. Et ne changez pas d'unité de temps en cours de route pour trouver la structure qui vous arrange." },
      {
        t: "qr", items: [
          { q: "Combien de points faut-il pour parler de tendance ?", r: "Au moins deux sommets et deux creux, pour pouvoir comparer. Plus l'escalier a de marches, plus la tendance est installée." },
          { q: "Et si un sommet est plus haut mais le creux suivant plus bas ?", r: "Les signaux se mélangent : c'est souvent une transition, ou le début d'un range. Dans le doute, on ne force pas une lecture ; on attend le point suivant." },
          { q: "La structure suffit-elle pour trader ?", r: "Non. Elle dit dans quel sens chercher. Il faut ensuite un endroit précis pour entrer (un support, une ligne de tendance, leçon 29) et un stop. Et même ainsi, rien n'est garanti." },
        ],
      },
      { t: "nimbo", texte: "Sur la page Analyse, ouvrez le graphique en 4 heures et marquez de tête les trois derniers sommets et creux. Plus haut, plus bas ? En dix secondes, vous connaissez la structure.", humeur: "pointe" },
    ],
  }],
  mots: [
    { terme: "Structure du marché", en: "market structure", def: "La façon dont les sommets et les creux s'enchaînent : elle dit si le prix monte, baisse ou tourne en rond." },
    { terme: "Sommet", en: "swing high", def: "Un point où le prix a monté, puis est redescendu." },
    { terme: "Creux", en: "swing low", def: "Un point où le prix a baissé, puis est remonté." },
    { terme: "Sommet plus haut", en: "higher high (HH)", def: "Un sommet au-dessus du sommet précédent." },
    { terme: "Creux plus haut", en: "higher low (HL)", def: "Un creux au-dessus du creux précédent : les acheteurs reviennent plus tôt." },
    { terme: "Sommet plus bas", en: "lower high (LH)", def: "Un sommet sous le sommet précédent : les rebonds s'essoufflent." },
    { terme: "Creux plus bas", en: "lower low (LL)", def: "Un creux sous le creux précédent." },
    { terme: "Range", en: "range", def: "Des sommets et des creux au même niveau : pas de tendance." },
    { terme: "Cassure de structure", en: "break of structure", def: "Une clôture sous le dernier creux (en hausse) ou au-dessus du dernier sommet (en baisse)." },
  ],
  retenir: [
    "Le prix avance <b>en zigzag</b> : des sommets et des creux.",
    "<b>Sommets et creux plus hauts</b> (HH, HL) : hausse. <b>Plus bas</b> (LH, LL) : baisse. <b>Au même niveau</b> : range.",
    "En hausse, surveillez <b>le dernier creux</b> : tant qu'il tient, l'escalier monte.",
    "Une <b>clôture</b> sous ce creux casse la structure ; une mèche seule ne casse rien.",
    "Structure cassée ne veut pas dire baisse : <b>la hausse n'est simplement plus sûre</b>.",
    "Pour la tracer : <b>une unité de temps</b>, <b>seulement les points nets</b>, et chaque point comparé au précédent.",
  ],
  quiz: [
    { question: "Les creux successifs sont à 100, 103 puis 106. Comment s'appellent les deux derniers ?", options: ["Des lower lows", "Des higher lows", "Des higher highs"], correct: 1, explanation: "Chaque creux est plus haut que le précédent : ce sont des creux plus hauts, des higher lows (HL)." },
    { question: "Sommets à 110, 108, 106 ; creux à 104, 102, 100. Quelle structure ?", options: ["Haussière", "Baissière", "Un range"], correct: 1, explanation: "Des sommets plus bas (LH) et des creux plus bas (LL) : c'est un escalier qui descend, une tendance baissière." },
    { question: "En tendance haussière, quel point surveiller en priorité ?", options: ["Le premier creux de la tendance", "Le dernier sommet", "Le dernier creux"], correct: 2, explanation: "Le dernier creux : tant qu'aucune bougie ne clôture dessous, l'escalier qui monte est intact." },
    { question: "Une mèche passe sous le dernier creux, mais la bougie clôture au-dessus. La structure est-elle cassée ?", options: ["Oui", "Non", "Seulement si le volume est fort"], correct: 1, explanation: "On juge à la clôture. Une mèche dessous est une attaque des vendeurs, repoussée : la structure tient encore." },
    { question: "La structure haussière vient de casser. Qu'est-ce que ça veut dire ?", options: ["Le prix va forcément baisser", "La hausse n'est plus sûre", "Il faut acheter, c'est moins cher"], correct: 1, explanation: "Une cassure de structure interrompt l'escalier. La suite peut être une baisse, un range ou une reprise : on arrête d'acheter les creux et on attend une nouvelle structure." },
  ],
  pratique: [
    { texte: "Ouvrez un actif en 4 heures et marquez les trois derniers sommets et creux : quelle est la structure ?", href: "/analysis", bouton: "Ouvrir l'analyse" },
    { texte: "Notez dans votre journal la structure de l'actif que vous suivez, et revenez la comparer dans une semaine.", href: "/journal", bouton: "Ouvrir le journal" },
  ],
};

export default lecon;
