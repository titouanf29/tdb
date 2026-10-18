import { serie, type Bougie } from "../marche";
import type { LeconSerie } from "../types";
import { TraceNiveau } from "@/components/cours/outils/TraceNiveau";
import { DecisionsDansLeTemps } from "@/components/cours/outils/DecisionsDansLeTemps";

/** Remplace une bougie par celle que la leçon veut montrer, et raccorde la suivante. */
function poser(b: Bougie[], i: number, [o, h, l, c]: [number, number, number, number]) {
  b[i] = { ...b[i], o, h, l, c };
  const s = b[i + 1];
  if (s) { s.o = c; s.h = Math.max(s.h, s.o, s.c); s.l = Math.min(s.l, s.o, s.c); }
  return b;
}

// Un range sur l'or (prix d'exemple), entre 3 950 $ et 4 050 $.
const range = serie([[0, 4000], [5, 3951, "bas"], [11, 4049, "haut"], [18, 3950, "bas"], [25, 4050, "haut"], [32, 3952, "bas"], [39, 4046, "haut"], [44, 4000]], { graine: 341, bruit: 0.0013 });
const plafond = { prix: 4050, zone: 10, label: "Plafond", couleur: "var(--cap-down)" };
const plancher = { prix: 3950, zone: 10, label: "Plancher", couleur: "var(--cap-up)" };
// Les sorties : une fausse par le bas, puis une vraie par le haut.
const sorties = (() => {
  const b = serie([[0, 4000], [5, 3950, "bas"], [11, 4050, "haut"], [17, 3951, "bas"], [23, 4049, "haut"], [29, 3965], [31, 3972], [37, 4046, "haut"], [42, 4030], [43, 4040], [44, 4074], [47, 4064], [52, 4115], [56, 4130]], { graine: 342, bruit: 0.0012 });
  poser(b, 30, [3963, 3968, 3932, 3958]);
  poser(b, 44, [4041, 4078, 4038, 4074]);
  return b;
})();
// L'exercice de tracé.
const exo = serie([[0, 4010], [6, 4039, "haut"], [12, 3961, "bas"], [19, 4040, "haut"], [26, 3960, "bas"], [33, 4038, "haut"], [40, 3962, "bas"], [46, 4000]], { graine: 343, bruit: 0.0013 });
// Les décisions, sur l'euro-dollar en 4 heures : plancher 1,0950, plafond 1,1050.
const dec = (() => {
  const b = serie([[0, 1.1000], [6, 1.1015], [12, 1.0950, "bas"], [19, 1.1050, "haut"], [27, 1.0951, "bas"], [35, 1.1049, "haut"], [39, 1.1000], [43, 1.0962], [52, 1.1048, "haut"], [56, 1.1005], [60, 1.1036], [68, 1.0960, "bas"], [74, 1.1040], [75, 1.1046], [79, 1.1052, "bas"], [82, 1.1098], [85, 1.1110]], { graine: 344, bruit: 0.0005 });
  poser(b, 44, [1.096, 1.0969, 1.094, 1.0967]);
  poser(b, 61, [1.1036, 1.1068, 1.103, 1.1042]);
  poser(b, 76, [1.1046, 1.1078, 1.1044, 1.1074]);
  return b;
})();
const decor = { niveaux: [{ prix: 1.105, zone: 0.0008, label: "Plafond 1,1050", couleur: "var(--cap-down)" }, { prix: 1.095, zone: 0.0008, label: "Plancher 1,0950", couleur: "var(--cap-up)" }] };

const lecon: LeconSerie = {
  numero: 34,
  accroche: "Le prix monte, redescend, remonte… et ne va nulle part. C'est un range.",
  promesse: "À la fin de cette leçon, vous saurez reconnaître un range, y acheter et y vendre aux bons endroits avec un stop bien placé, éviter le milieu, et savoir quand le range est fini.",
  parties: [{
    titre: "",
    blocs: [
      { t: "h", texte: "Le prix tourne en rond" },
      { t: "p", html: "Un <span class=\"mot\">range</span>, c'est quand le prix <b>va et vient entre un plancher et un plafond</b>. Il n'y a pas de tendance : les sommets restent au même niveau, les creux aussi (leçon 28). Les acheteurs défendent le bas, les vendeurs défendent le haut, et aucun camp ne l'emporte. Les traders disent aussi que le marché est « en consolidation »." },
      {
        t: "graphique",
        cfg: { bougies: range, niveaux: [plafond, plancher], vivant: true },
        legende: "L'or entre 3 950 $ et 4 050 $ (prix d'exemple) : trois fois en bas, trois fois en haut. Le prix travaille, mais ne va nulle part.",
      },
      { t: "h", texte: "Le reconnaître : deux contacts en bas, deux en haut" },
      { t: "p", html: "Un rebond ne fait pas un range. Il faut <b>au moins deux contacts en bas, et deux en haut</b>. Avant, ce n'est qu'une idée : le prix peut très bien continuer sa route." },
      {
        t: "scenes",
        titre: "Du premier rebond au range",
        scenes: [
          { legende: "Un premier creux vers 3 950 $. Ce n'est qu'un creux.", cfg: { bougies: range, jusqua: 7, marques: [{ i: 5, type: "point" }] } },
          { legende: "Un premier sommet vers 4 050 $. On a un haut et un bas, pas encore un range.", cfg: { bougies: range, jusqua: 13, marques: [{ i: 5, type: "point" }, { i: 11, type: "point", prix: 4049 }] } },
          { legende: "Le prix revient sur 3 950 $ et rebondit : <b>deuxième contact en bas</b>. Le plancher se dessine.", cfg: { bougies: range, jusqua: 20, marques: [{ i: 5, type: "point" }, { i: 11, type: "point", prix: 4049 }, { i: 18, type: "point" }], niveaux: [plancher] } },
          { legende: "Puis il bute à nouveau sur 4 050 $ : <b>deuxième contact en haut</b>. Deux et deux : c'est un range.", cfg: { bougies: range, jusqua: 27, marques: [{ i: 5, type: "point" }, { i: 11, type: "point", prix: 4049 }, { i: 18, type: "point" }, { i: 25, type: "point", prix: 4050 }], niveaux: [plancher, plafond] } },
        ],
      },
      {
        t: "outil",
        titre: "Tracez le plancher et le plafond",
        consigne: "Touchez le graphique deux fois : une fois à la hauteur du plancher, une fois à celle du plafond. Puis comparez avec la correction.",
        el: <TraceNiveau bougies={exo} max={2} solutions={[{ prix: 4039, tolerance: 8, label: "Le plafond" }, { prix: 3961, tolerance: 8, label: "Le plancher" }]}
          expliquer="Trois contacts vers 3 960 $, trois vers 4 040 $ : un range de 80 $." />,
      },
      { t: "h", texte: "Le plan : acheter en bas, vendre en haut" },
      { t: "p", html: "Dans un range, le plan est simple : <b>acheter près du plancher</b>, <b>vendre près du plafond</b>. Le prix rebondit d'un bord à l'autre ; on joue ces rebonds. L'objectif d'un achat est le bord d'en face, un peu avant lui : le prix n'atteint pas toujours le plafond exact." },
      { t: "p", html: "Et le <b>stop se place de l'autre côté de la zone</b> : sous le plancher si vous achetez, au-dessus du plafond si vous vendez. Si le prix y passe, ce n'est pas une mèche de plus : <b>le range est peut-être fini</b>, et votre raison d'acheter a disparu." },
      {
        t: "scenes",
        titre: "Les deux trades du range",
        scenes: [
          { legende: "Le prix revient sur le plancher, pour la troisième fois.", cfg: { bougies: range, jusqua: 32, niveaux: [plafond, plancher] } },
          { legende: "<b>Achat</b> près de 3 960 $. Stop sous la zone, à 3 935 $. Objectif juste sous le plafond, vers 4 040 $.", cfg: { bougies: range, jusqua: 33, niveaux: [plafond, plancher, { prix: 3935, label: "Stop 3 935", couleur: "var(--cap-down)", pointille: false }, { prix: 4040, label: "Objectif 4 040", couleur: "var(--cap-up)", pointille: false }], marques: [{ i: 33, type: "achat", label: "Achat" }] } },
          { legende: "Le prix traverse le range jusqu'à l'objectif. Puis, au plafond, le trade inverse : <b>vente</b> vers 4 040 $, stop au-dessus de la zone, à 4 065 $.", cfg: { bougies: range, niveaux: [plafond, plancher, { prix: 4065, label: "Stop 4 065", couleur: "var(--cap-down)", pointille: false }], marques: [{ i: 33, type: "achat", label: "Achat" }, { i: 39, type: "vente", label: "Vente" }] } },
        ],
      },
      {
        t: "exemple",
        html: "L'euro-dollar oscille entre <b>1,0950</b> et <b>1,1050</b> : 100 pips de range. Compte de <b>2 000 $</b>, risque de <b>1 %</b>, soit 20 $. Vous achetez à <b>1,0960</b>, près du plancher, avec un stop à <b>1,0940</b>, sous la zone : <b>20 pips</b>. Avec <b>0,10 lot</b>, un pip vaut 1 $ : le risque est bien de 20 × 1 = <b>20 $</b>. L'objectif, juste sous le plafond, est <b>1,1040</b> : 80 pips, soit <b>80 $</b>. Le gain visé vaut <b>quatre fois</b> le risque. Rien n'est garanti : si le stop est touché, vous perdez 20 $, et le range est peut-être fini.",
      },
      { t: "h", texte: "Le piège : entrer au milieu" },
      { t: "p", html: "Au milieu du range, vous n'avez <b>ni bon prix, ni bon endroit pour le stop</b>. Le stop logique reste sous le plancher, donc loin ; et l'objectif, le plafond, est proche. Vous risquez beaucoup pour gagner peu." },
      {
        t: "piege",
        html: "<b>Acheter au milieu, à 1,1000.</b> Le stop logique est toujours sous le plancher, à 1,0940 : <b>60 pips</b>. L'objectif, 1,1040, n'est qu'à <b>40 pips</b>. Pour garder 20 $ de risque, il faudrait réduire la position à environ 0,03 lot, et le gain visé tomberait vers 13 $ : vous risquez 20 $ pour en gagner 13. Et si vous gardez 0,10 lot, vous risquez 60 $, soit 3 % du compte. Dans les deux cas, c'est un mauvais trade. <b>Attendez que le prix vienne au bord.</b>",
      },
      { t: "h", texte: "Un range finit toujours par casser" },
      { t: "p", html: "Aucun range ne dure pour toujours. Un jour, les acheteurs ou les vendeurs l'emportent : le prix <b>sort</b>, par le haut ou par le bas, et une tendance peut commencer. Mais attention aux <span class=\"mot\">fausses cassures</span> (<em>fakeouts</em>) : <b>une mèche dehors n'est pas une sortie</b>. Comme on l'a vu avec les ruptures de structure (leçon 28), on attend <b>la clôture</b> dehors." },
      {
        t: "scenes",
        titre: "Une fausse sortie, puis une vraie",
        scenes: [
          { legende: "Un range bien installé entre 3 950 $ et 4 050 $.", cfg: { bougies: sorties, jusqua: 28, niveaux: [plafond, plancher] } },
          { legende: "Une bougie plonge jusqu'à 3 932 $, sous le plancher… mais <b>clôture à 3 958 $</b>, dans le range. Ce n'est qu'une mèche : une fausse sortie. Ceux qui ont vendu la « cassure » sont piégés.", cfg: { bougies: sorties, jusqua: 31, niveaux: [plafond, plancher], surligne: [30] } },
          { legende: "Le prix remonte jusqu'au plafond : le range était toujours là.", cfg: { bougies: sorties, jusqua: 40, niveaux: [plafond, plancher], surligne: [30] } },
          { legende: "Cette fois, une bougie <b>clôture à 4 074 $</b>, nettement au-dessus du plafond : le range est cassé.", cfg: { bougies: sorties, jusqua: 44, niveaux: [plafond, plancher], marques: [{ i: 44, type: "achat", label: "Clôture dehors" }] } },
          { legende: "Une tendance haussière commence. L'ancien plafond peut servir de plancher lors d'un retour (leçon 31, le pullback).", cfg: { bougies: sorties, niveaux: [{ ...plafond, label: "Ancien plafond", couleur: "var(--cap-up)" }, plancher], marques: [{ i: 44, type: "achat", label: "Clôture dehors" }] } },
        ],
      },
      { t: "h", texte: "Ne pas forcer" },
      { t: "p", html: "Le plus dur, dans un range, c'est d'en sortir soi-même. Après avoir gagné trois fois en vendant au plafond, on a envie de recommencer. Mais <b>quand le prix clôture dehors et qu'une tendance revient, arrêtez de jouer les rebonds</b> : le range est fini. Vendre « au plafond » d'un range qui n'existe plus, c'est vendre en pleine hausse." },
      {
        t: "outil",
        titre: "Décidez, moment par moment",
        consigne: "L'euro-dollar en 4 heures, dans un range entre 1,0950 et 1,1050. Le temps avance et s'arrête : à chaque fois, décidez.",
        el: <DecisionsDansLeTemps bougies={dec} decor={decor}
          bilan="Au bord, on agit, avec un stop de l'autre côté ; au milieu, on attend ; une mèche dehors ne change rien ; une clôture dehors met fin au range."
          etapes={[
            { jusqua: 39, question: "Le prix est vers 1,1000, au milieu du range. Que faites-vous ?", bonne: "attendre",
              options: [{ v: "acheter", texte: "Acheter" }, { v: "vendre", texte: "Vendre" }, { v: "attendre", texte: "Attendre" }],
              expliquer: "Au milieu, ni bon prix ni bon stop : 50 pips jusqu'à chaque bord. On attend que le prix vienne à un bord." },
            { jusqua: 44, question: "Le prix touche le plancher. La bougie descend à 1,0940 puis clôture à 1,0967 : un rejet. Que faites-vous ?", bonne: "acheter",
              options: [{ v: "acheter", texte: "Acheter" }, { v: "vendre", texte: "Vendre" }, { v: "attendre", texte: "Attendre" }],
              expliquer: "Le prix est au bord, et les acheteurs viennent de repousser la baisse. C'est l'endroit du plan : acheter près du plancher.",
              dessin: { marques: [{ i: 44, type: "achat", label: "Achat" }] } },
            { jusqua: 44, question: "Où placez-vous le stop de cet achat ?", bonne: "sous",
              options: [{ v: "pres", texte: "1,0960, juste sous l'entrée" }, { v: "sous", texte: "1,0930, sous le plancher" }, { v: "aucun", texte: "Aucun, le range tient" }],
              expliquer: "Sous la zone, et sous la mèche du rejet : à 1,0930. Si le prix passe là, le range est peut-être fini. Collé à l'entrée, la moindre oscillation vous sortirait ; sans stop, une vraie cassure pourrait coûter très cher.",
              dessin: { marques: [{ i: 44, type: "achat", label: "Achat" }], niveaux: [{ prix: 1.093, label: "Stop 1,0930", couleur: "var(--cap-down)", pointille: false }] } },
            { jusqua: 61, question: "Une bougie monte à 1,1068, au-dessus du plafond, puis clôture à 1,1042, dans le range. Le range est-il fini ?", bonne: "non",
              options: [{ v: "oui", texte: "Oui, il est cassé" }, { v: "non", texte: "Non, c'est une mèche" }],
              expliquer: "Une mèche dehors n'est pas une sortie : la clôture est revenue dans le range. Celui qui a acheté la « cassure » à 1,1060 est déjà en perte.",
              dessin: { surligne: [61] } },
            { jusqua: 76, question: "Cette fois, une bougie clôture à 1,1074, au-dessus du plafond. Vous vendez au plafond, comme d'habitude ?", bonne: "non",
              options: [{ v: "oui", texte: "Oui, je vends" }, { v: "non", texte: "Non, j'arrête de jouer les rebonds" }],
              expliquer: "Une clôture nette dehors : le range est probablement fini. Vendre maintenant, ce serait vendre contre une hausse qui commence.",
              dessin: { marques: [{ i: 76, type: "point", prix: 1.1074 }] } },
            { jusqua: 85, question: "Le prix revient vers 1,1050, l'ancien plafond, et repart. Que représente maintenant ce niveau ?", bonne: "support",
              options: [{ v: "support", texte: "Un support possible" }, { v: "plafond", texte: "Toujours un plafond" }],
              expliquer: "Un plafond cassé devient souvent un plancher (leçon 33) : ceux qui ont raté la sortie achètent le retour. C'est le pullback de la leçon 31.",
              dessin: { marques: [{ i: 79, type: "achat", label: "Retour" }] } },
          ]} />,
      },
      {
        t: "qr", items: [
          { q: "Combien de temps dure un range ?", r: "De quelques heures à plusieurs mois, selon l'unité de temps. Plus il dure, plus ses bords sont regardés, et plus la sortie, quand elle vient, attire du monde." },
          { q: "Par où va-t-il sortir ?", r: "Personne ne le sait à l'avance. La tendance d'avant le range donne un indice (un range dans une grande hausse sort plus souvent par le haut), mais ce n'est qu'un indice. On attend la clôture dehors." },
          { q: "Faut-il jouer les deux sens ?", r: "Vous pouvez, si le range est large. S'il est étroit, l'écart entre achat et objectif devient trop petit face au spread et au stop : mieux vaut attendre la sortie." },
        ],
      },
      { t: "nimbo", texte: "Dans Ma stratégie, vous pouvez écrire votre règle de range : deux contacts de chaque côté, entrée près d'un bord, stop de l'autre côté de la zone, et jamais au milieu. Une règle écrite se tient mieux.", humeur: "pointe" },
    ],
  }],
  mots: [
    { terme: "Range", en: "range", def: "Un prix qui va et vient entre un plancher et un plafond, sans tendance." },
    { terme: "Plancher", en: "range low, floor", def: "Le bas du range, où les acheteurs reviennent." },
    { terme: "Plafond", en: "range high, ceiling", def: "Le haut du range, où les vendeurs reviennent." },
    { terme: "Consolidation", en: "consolidation", def: "Une pause du marché, souvent sous forme de range, avant de repartir." },
    { terme: "Sortie de range", en: "breakout", def: "Une clôture nettement au-dessus du plafond ou sous le plancher." },
    { terme: "Fausse cassure", en: "fakeout", def: "Une mèche dehors, mais une clôture revenue dans le range." },
  ],
  retenir: [
    "Un range : le prix va et vient entre <b>un plancher et un plafond</b>, sans tendance.",
    "Pour le reconnaître : <b>au moins deux contacts en bas, et deux en haut</b>.",
    "Le plan : <b>acheter près du plancher, vendre près du plafond</b>.",
    "Le stop <b>de l'autre côté de la zone</b> ; jamais d'entrée <b>au milieu</b>.",
    "Une <b>clôture dehors</b> met fin au range ; une mèche dehors, non.",
    "Quand la tendance revient, <b>arrêtez de jouer les rebonds</b>.",
  ],
  quiz: [
    { question: "Combien de contacts faut-il, au minimum, pour parler de range ?", options: ["Un en bas et un en haut", "Deux en bas et deux en haut", "Cinq de chaque côté"], correct: 1, explanation: "Deux contacts en bas et deux en haut : avant, ce n'est qu'une idée. Le prix peut très bien continuer sa route après un seul rebond." },
    { question: "Vous achetez près du plancher d'un range. Où placer le stop ?", options: ["Sous le plancher, de l'autre côté de la zone", "Au milieu du range", "Au-dessus du plafond"], correct: 0, explanation: "Sous la zone du plancher : si le prix y passe, le range est peut-être fini et votre raison d'acheter a disparu." },
    { question: "Range entre 1,0950 et 1,1050. Achat à 1,0960, stop 1,0940, 0,10 lot. Combien risquez-vous ?", options: ["10 $", "20 $", "200 $"], correct: 1, explanation: "Le stop est à 20 pips. Avec 0,10 lot sur l'euro-dollar, un pip vaut 1 $ : 20 × 1 = 20 $, soit 1 % d'un compte de 2 000 $." },
    { question: "Pourquoi éviter d'acheter au milieu du range ?", options: ["Parce que c'est interdit", "Parce que le stop est loin et l'objectif proche", "Parce que le spread y est plus cher"], correct: 1, explanation: "Au milieu, le stop logique reste sous le plancher (loin) et l'objectif, le plafond, est proche : on risque beaucoup pour gagner peu." },
    { question: "Une bougie dépasse le plafond avec une mèche, puis clôture dans le range. Que conclure ?", options: ["Le range est fini, j'achète", "Rien : une mèche dehors n'est pas une sortie", "Il faut vendre tout de suite"], correct: 1, explanation: "On juge à la clôture. Une mèche dehors suivie d'une clôture dedans est souvent une fausse cassure : le range tient." },
  ],
  pratique: [
    { texte: "Écrivez votre règle de range : contacts, entrée au bord, stop de l'autre côté, jamais au milieu.", href: "/strategie", bouton: "Ma stratégie" },
    { texte: "Repérez un actif en range et placez un achat fictif près du plancher, avec un stop sous la zone.", href: "/trading", bouton: "Prendre position" },
  ],
};

export default lecon;
