import { serie, type Ancre, type Bougie } from "../marche";
import type { LeconSerie } from "../types";
import { AtelierPinBar } from "@/components/cours/outils/AtelierPinBar";
import { GrapheDecision } from "@/components/cours/outils/GrapheDecision";
import { BougieQuiSeForme } from "@/components/cours/outils/BougieQuiSeForme";

/** Fixe exactement quelques bougies : [ouverture, plus haut, plus bas, clôture]. */
function retouche(b: Bougie[], m: Record<number, [number, number, number, number]>): Bougie[] {
  return b.map((x, i) => (m[i] ? { ...x, o: m[i][0], h: m[i][1], l: m[i][2], c: m[i][3] } : x));
}
const s = (a: Ancre[], graine: number) => serie(a, { graine, bruit: 0.0005 });

// Un support à 1,1000, touché deux fois, puis le marteau de la bougie 46.
const marteau = retouche(
  s([[0, 1.1062], [6, 1.103], [12, 1.1, "bas"], [19, 1.1046], [24, 1.1032], [30, 1.1001, "bas"], [36, 1.1044], [41, 1.103], [45, 1.1004], [46, 1.1003], [50, 1.1028], [56, 1.1052], [62, 1.1068]], 321),
  { 45: [1.1014, 1.1016, 1.1001, 1.1002], 46: [1.1, 1.1005, 1.0985, 1.1003], 47: [1.1003, 1.1012, 1.1001, 1.101] },
);
// Une résistance à 1,1100 et l'étoile filante de la bougie 44.
const etoile = retouche(
  s([[0, 1.104], [6, 1.107], [12, 1.11, "haut"], [19, 1.1058], [25, 1.1072], [31, 1.1099, "haut"], [37, 1.1062], [42, 1.108], [43, 1.1094], [44, 1.1096], [48, 1.107], [54, 1.1048], [60, 1.103]], 322),
  { 43: [1.1084, 1.1095, 1.1083, 1.1093], 44: [1.1094, 1.1115, 1.1092, 1.1096], 45: [1.1096, 1.1098, 1.1086, 1.1088] },
);
// Un marteau au milieu d'une baisse, loin de tout niveau.
const nullePart = retouche(
  s([[0, 1.112], [10, 1.109], [16, 1.1098], [26, 1.1056], [30, 1.1046], [31, 1.1048], [36, 1.1026], [44, 1.0994], [50, 1.0978], [58, 1.0956]], 323),
  { 30: [1.1052, 1.1055, 1.1034, 1.105], 31: [1.105, 1.1053, 1.1041, 1.1044] },
);
// Une mèche trop courte, sur le support.
const tropCourte = retouche(
  s([[0, 1.106], [6, 1.1028], [12, 1.1, "bas"], [19, 1.1044], [25, 1.103], [31, 1.1001, "bas"], [37, 1.1042], [42, 1.1026], [45, 1.1008], [46, 1.1006], [50, 1.0988], [56, 1.0966], [62, 1.0958]], 324),
  { 45: [1.1018, 1.102, 1.1006, 1.1008], 46: [1.1008, 1.1012, 1.0996, 1.1006] },
);
// Un marteau sur le retour d'une cassure (leçons 30 et 31).
const surRetour = retouche(
  s([[0, 1.0962], [5, 1.0945, "bas"], [10, 1.1, "haut"], [16, 1.0948, "bas"], [22, 1.0998, "haut"], [28, 1.0946, "bas"], [34, 1.0999, "haut"], [37, 1.0972], [39, 1.0991], [40, 1.1028], [44, 1.1055, "haut"], [49, 1.101], [50, 1.1009], [54, 1.1036], [60, 1.1062], [64, 1.1078]], 325),
  { 49: [1.1018, 1.102, 1.1006, 1.1008], 50: [1.1007, 1.1012, 1.0993, 1.1009], 51: [1.1009, 1.1018, 1.1007, 1.1016] },
);

const support = { prix: 1.1, zone: 0.0006, label: "Support 1,1000", couleur: "var(--cap-up)" };
const resistance = { prix: 1.11, zone: 0.0006, label: "Résistance 1,1100", couleur: "var(--cap-down)" };
const choix = ["Utile : elle compte", "Inutile : elle ne dit rien"];

const lecon: LeconSerie = {
  numero: 32,
  accroche: "Une seule bougie, une très longue mèche : le marché vient de dire non.",
  promesse: "À la fin de cette leçon, vous saurez reconnaître une pin bar, comprendre ce qu'elle raconte, savoir quand elle compte, et comment vous en servir pour entrer.",
  parties: [{
    titre: "",
    blocs: [
      { t: "h", texte: "Une bougie avec une très longue mèche" },
      { t: "p", html: "La <span class=\"mot\">pin bar</span> (de l'anglais <em>pin</em>, l'aiguille) est une bougie avec <b>un petit corps</b> et <b>une très longue mèche d'un seul côté</b>. La règle habituelle : la mèche fait <b>au moins les deux tiers</b> de la bougie entière, du plus haut au plus bas. Le corps et l'autre mèche se partagent le tiers restant." },
      {
        t: "outil",
        titre: "L'atelier de la pin bar",
        consigne: "Réglez les mèches et le corps, ou partez d'un modèle. La bougie est découpée en trois tiers : une pin bar a sa mèche sur deux d'entre eux.",
        el: <AtelierPinBar />,
      },

      { t: "h", texte: "Ce qu'elle raconte : un refus" },
      { t: "p", html: "Prenez un marteau : la longue mèche est en bas. Pendant la bougie, <b>les vendeurs ont poussé le prix très bas</b>. Puis <b>les acheteurs l'ont ramené en haut</b>, avant la clôture. Le prix est allé voir plus bas, et il n'y est pas resté : <b>le bas a été refusé</b>. La mèche est la trace de ce refus." },
      {
        t: "scenes",
        titre: "La vie d'un marteau, sur un support",
        scenes: [
          { legende: "L'euro-dollar revient sur son support de 1,1000, déjà touché deux fois.", cfg: { bougies: marteau, unite: "heure", jusqua: 45, niveaux: [support], marques: [{ i: 12, type: "point" }, { i: 30, type: "point" }] } },
          { legende: "Une bougie s'ouvre à 1,1000, plonge jusqu'à <b>1,0985</b>, sous le support… puis remonte et clôture à <b>1,1003</b>. Mèche du bas : 15 pips sur 20, les trois quarts de la bougie.", cfg: { bougies: marteau, unite: "heure", jusqua: 46, niveaux: [support], surligne: [46] } },
          { legende: "Les vendeurs n'ont pas réussi à tenir sous 1,1000. La hausse repart.", cfg: { bougies: marteau, unite: "heure", niveaux: [support], surligne: [46] } },
        ],
      },

      { t: "h", texte: "Le marteau et l'étoile filante" },
      {
        t: "tableau",
        entetes: ["", "Le marteau", "L'étoile filante"],
        lignes: [
          ["La longue mèche", "En bas", "En haut"],
          ["Ce qui a été refusé", "Le bas : les acheteurs ont repris la main", "Le haut : les vendeurs ont repris la main"],
          ["Le sens", "Pin bar <b>haussière</b>", "Pin bar <b>baissière</b>"],
          ["Où elle compte", "Sur un support", "Sur une résistance"],
          ["En anglais", "hammer", "shooting star"],
        ],
      },
      {
        t: "graphique",
        cfg: { bougies: etoile, unite: "heure", niveaux: [resistance], surligne: [44], marques: [{ i: 12, type: "point", prix: 1.11 }, { i: 31, type: "point", prix: 1.1099 }] },
        legende: "L'étoile filante : sur la résistance de 1,1100, le prix monte jusqu'à 1,1115, puis il est ramené à 1,1096. Le haut a été refusé, et la baisse suit.",
      },
      { t: "p", html: "<b>La couleur du corps compte peu.</b> Un marteau rouge reste un marteau : ce qui compte, c'est la mèche, parce qu'elle montre <b>où le prix a été refusé</b>. Un corps de la couleur du sens (vert pour un marteau) est un petit plus, rien de plus." },

      { t: "h", texte: "Elle ne compte que sur un niveau" },
      { t: "p", html: "Une pin bar <b>au milieu de nulle part ne veut rien dire</b>. Des longues mèches, il y en a partout : le prix s'agite. Elle prend son sens quand elle se forme <b>sur un niveau</b> que d'autres traders surveillent : un support, une résistance (leçon 33), le retour d'une cassure (leçon 31), une zone de Fibonacci (leçon 25). Là, le refus a une raison." },
      {
        t: "graphique",
        cfg: { bougies: nullePart, unite: "heure", surligne: [30] },
        legende: "Un beau marteau, en pleine baisse, sur aucun niveau. Le prix a continué de baisser comme si de rien n'était.",
      },
      {
        t: "graphique",
        cfg: { bougies: surRetour, unite: "heure", niveaux: [{ prix: 1.1, zone: 0.0006, label: "Ancien plafond, nouveau plancher", couleur: "var(--cap-up)" }], surligne: [50] },
        legende: "Un marteau sur le retour d'une cassure : le plafond cassé de 1,1000 sert de plancher, et la pin bar le confirme. C'est le signal du pullback (leçon 31).",
      },
      {
        t: "outil",
        titre: "Utile ou inutile ?",
        consigne: "Quatre bougies encadrées. Celle-ci compte-t-elle ? Décidez, puis regardez la suite.",
        el: <GrapheDecision question="Cette bougie, à cet endroit, est-elle un signal utile ?" cas={[
          {
            titre: "Un marteau sur le support", cfg: { bougies: marteau, niveaux: [support], jusqua: 46, surligne: [46] }, choix, bon: 0,
            explication: "Une vraie pin bar (mèche de 75 %), sur un support touché deux fois : le bas a été refusé là où les acheteurs attendaient. Elle compte.",
          },
          {
            titre: "Un marteau en pleine baisse", cfg: { bougies: nullePart, jusqua: 30, surligne: [30] }, choix, bon: 1,
            explication: "La forme est belle, mais il n'y a aucun niveau ici : au milieu de nulle part, une longue mèche ne dit rien. La baisse a continué.",
          },
          {
            titre: "Une étoile filante sur la résistance", cfg: { bougies: etoile, niveaux: [resistance], jusqua: 44, surligne: [44] }, choix, bon: 0,
            explication: "Mèche du haut de 19 pips sur 23, sur une résistance déjà touchée deux fois : le haut a été refusé. Elle compte.",
          },
          {
            titre: "Sur le support, mais…", cfg: { bougies: tropCourte, niveaux: [support], jusqua: 46, surligne: [46] }, choix, bon: 1,
            explication: "Le bon endroit, mais pas la bonne bougie : la mèche du bas fait 10 pips sur 16, à peine 63 %, et la mèche du haut n'est pas petite. Ce n'est pas une pin bar. Le support a cédé ensuite.",
          },
        ]} />,
      },

      { t: "h", texte: "Attendre sa clôture" },
      { t: "p", html: "Une pin bar n'existe <b>qu'une fois la bougie fermée</b>. Pendant qu'elle se forme, la longue mèche peut disparaître : le prix remonte, vous voyez un marteau… et dans les dernières minutes, il replonge et clôture tout en bas. Il ne reste alors qu'une grande bougie rouge, le contraire d'un refus." },
      {
        t: "outil",
        titre: "La mèche qui disparaît",
        consigne: "Deux bougies d'une heure sur le support de 1,1000. Elles commencent pareil. Achetez quand vous croyez voir un marteau, ou attendez la clôture.",
        el: <BougieQuiSeForme avant={marteau.slice(34, 46)} niveau={{ prix: 1.1, label: "Support 1,1000", couleur: "var(--cap-up)" }} decimales={4}
          scenarios={[
            {
              nom: "Première bougie",
              chemin: [1.1, 1.0997, 1.0993, 1.0989, 1.0986, 1.0985, 1.0988, 1.0992, 1.0995, 1.0998, 1.1001, 1.1, 1.1003, 1.1002, 1.1005, 1.1002, 1.1004, 1.1003],
              siAction: "Vous avez acheté avant la clôture, et cette fois la bougie a bien fini en marteau. Mais vous ne pouviez pas le savoir : regardez la deuxième.",
              sansAction: "La bougie a fermé en <b>marteau</b> : mèche de 15 pips sur 20. Le bas a été refusé, sur le support. Maintenant seulement, c'est une pin bar.",
            },
            {
              nom: "Deuxième bougie",
              chemin: [1.1, 1.0997, 1.0993, 1.0989, 1.0986, 1.0985, 1.0988, 1.0992, 1.0995, 1.0998, 1.1001, 1.1, 1.1003, 1.0998, 1.0992, 1.0988, 1.0984, 1.0982],
              siAction: "Vous avez acheté un « marteau » qui n'existait pas encore. Dans les dernières minutes, le prix a replongé : clôture à 1,0982, <b>sous le support</b>. La mèche a disparu, il reste une grande bougie rouge.",
              sansAction: "Bien fait d'attendre : la bougie a fini à 1,0982, tout en bas, <b>sous le support</b>. Plus de mèche, plus de pin bar : un support qui cède.",
            },
          ]} />,
      },

      { t: "h", texte: "Entrer, et placer le stop" },
      { t: "p", html: "Beaucoup de traders attendent que le prix <b>dépasse le haut de la pin bar</b> pour acheter : la bougie suivante confirme que les acheteurs continuent. Le stop se place <b>sous la pointe de la mèche</b> : si le prix y retourne, le refus n'a pas tenu." },
      {
        t: "scenes",
        titre: "Du marteau à l'achat",
        scenes: [
          { legende: "Le marteau est fermé : plus haut à <b>1,1005</b>, pointe de la mèche à <b>1,0985</b>.", cfg: { bougies: marteau, unite: "heure", jusqua: 46, niveaux: [support], surligne: [46] } },
          { legende: "La bougie suivante dépasse 1,1005 : l'achat se déclenche à <b>1,1006</b>, un pip au-dessus du haut.", cfg: { bougies: marteau, unite: "heure", jusqua: 47, niveaux: [support, { prix: 1.1006, label: "Achat 1,1006", couleur: "var(--cap-ink)", pointille: false }], surligne: [46], marques: [{ i: 47, type: "achat", label: "Achat" }] } },
          { legende: "Le stop, un pip sous la pointe de la mèche : <b>1,0984</b>. Le trade est posé.", cfg: { bougies: marteau, unite: "heure", jusqua: 47, niveaux: [{ prix: 1.1006, label: "Achat 1,1006", couleur: "var(--cap-ink)", pointille: false }, { prix: 1.0984, label: "Stop 1,0984", couleur: "var(--cap-down)", pointille: false }], surligne: [46], marques: [{ i: 47, type: "achat", label: "Achat" }] } },
          { legende: "La hausse suit. Elle aurait pu ne pas suivre : le stop était là pour ça.", cfg: { bougies: marteau, unite: "heure", niveaux: [{ prix: 1.1006, label: "Achat 1,1006", couleur: "var(--cap-ink)", pointille: false }, { prix: 1.0984, label: "Stop 1,0984", couleur: "var(--cap-down)", pointille: false }], surligne: [46], marques: [{ i: 47, type: "achat", label: "Achat" }] } },
        ],
      },
      {
        t: "exemple",
        titre: "La taille du trade",
        html: "Achat à <b>1,1006</b>, stop à <b>1,0984</b> : <b>22 pips</b> de risque. Pour risquer au plus 20 $ (1 % d'un compte de 2 000 $) : 20 ÷ 22 = 0,91 $ par pip, soit <b>0,09 lot</b> (0,90 $ par pip). Si le stop est touché, vous perdez 22 × 0,90 = <b>19,80 $</b>. Un objectif à deux fois le risque serait à 44 pips, vers <b>1,1050</b>.",
      },

      { t: "h", texte: "Les deux pièges" },
      { t: "piege", html: "<b>Une mèche trop courte n'est pas une pin bar.</b> Une mèche de la moitié de la bougie, avec un gros corps, n'a pas grand-chose à dire. Restez strict : au moins les deux tiers. Et <b>sur une unité de temps d'une minute, il y en a partout</b> : chaque petite secousse dessine une longue mèche. Elles comptent peu. Une pin bar en journalier ou en 4 heures, sur un niveau visible, en dit beaucoup plus." },
      {
        t: "qr",
        items: [
          { q: "Une pin bar suffit-elle pour entrer ?", r: "C'est un signal, pas une garantie. Elle est bien plus solide sur un niveau, dans le sens de la tendance, et avec un stop sous la pointe de la mèche. Rien n'est garanti : certaines échouent." },
          { q: "Et si la mèche est énorme, le stop est loin ?", r: "Oui : une mèche de 60 pips donne un stop à 60 pips. La taille de position baisse d'autant (leçon 19). Si même 0,01 lot risque trop, on passe son tour." },
          { q: "Faut-il attendre que le prix dépasse le haut ?", r: "C'est la façon la plus prudente : la bougie suivante confirme. Certains achètent à la clôture de la pin bar, avec un meilleur prix et moins de confirmation. Choisissez une règle, et gardez-la." },
        ],
      },
      { t: "nimbo", texte: "Dans votre journal, notez sur quel niveau se trouvait chaque pin bar que vous avez tradée. Vous verrez vite lesquelles valent la peine.", humeur: "pointe" },
    ],
  }],
  mots: [
    { terme: "Pin bar", en: "pin bar", def: "Une bougie à petit corps et à très longue mèche d'un seul côté, au moins les deux tiers de la bougie : un refus." },
    { terme: "Marteau", en: "hammer", def: "La pin bar haussière : la longue mèche est en bas, le bas a été refusé." },
    { terme: "Étoile filante", en: "shooting star", def: "La pin bar baissière : la longue mèche est en haut, le haut a été refusé." },
    { terme: "Mèche", en: "wick, shadow", def: "Le trait fin d'une bougie, au-dessus ou en dessous du corps : les prix atteints mais pas gardés." },
    { terme: "Rejet", en: "rejection", def: "Le prix qui va chercher un niveau et en est repoussé avant la clôture." },
  ],
  retenir: [
    "La <b>pin bar</b> : un petit corps et une très longue mèche d'un seul côté, <b>au moins les deux tiers</b> de la bougie.",
    "Elle raconte un <b>refus</b> : le prix est allé loin, et il a été ramené avant la clôture.",
    "Mèche en bas : <b>le marteau</b>, haussier. Mèche en haut : <b>l'étoile filante</b>, baissière. La couleur compte peu.",
    "Elle ne compte que <b>sur un niveau</b> ; au milieu de nulle part, elle ne dit rien.",
    "<b>Attendez sa clôture</b> : avant, la mèche peut disparaître.",
    "Entrée quand le prix <b>dépasse son haut</b>, stop <b>sous la pointe de la mèche</b> ; méfiez-vous des mèches courtes et de l'unité d'une minute.",
  ],
  quiz: [
    { question: "Qu'est-ce qui fait une pin bar ?", options: ["Un grand corps sans mèche", "Un petit corps et une mèche d'au moins les deux tiers de la bougie, d'un seul côté", "Deux bougies de la même couleur"], correct: 1, explanation: "La pin bar a une très longue mèche d'un seul côté, au moins les deux tiers de la bougie, et un petit corps." },
    { question: "Une pin bar avec une longue mèche en bas s'appelle…", options: ["Une étoile filante", "Un marteau", "Un doji"], correct: 1, explanation: "Mèche en bas : le marteau, haussier, le bas a été refusé. Mèche en haut : l'étoile filante, baissière." },
    { question: "Un marteau rouge est-il encore un marteau ?", options: ["Oui : c'est la mèche qui compte, pas la couleur", "Non, il doit être vert", "Seulement le vendredi"], correct: 0, explanation: "La mèche montre où le prix a été refusé. La couleur du corps est un détail." },
    { question: "Un beau marteau apparaît en pleine baisse, sur aucun niveau. Que vaut-il ?", options: ["C'est un signal d'achat fort", "Pas grand-chose : au milieu de nulle part, une pin bar ne dit rien", "Il annonce un krach"], correct: 1, explanation: "La pin bar compte sur un niveau : support, résistance, retour de cassure. Ailleurs, les longues mèches sont partout." },
    { question: "Où placer le stop après un achat sur un marteau ?", options: ["Au-dessus du haut de la bougie", "Sous la pointe de la mèche", "Au milieu du corps"], correct: 1, explanation: "Sous la pointe de la mèche : si le prix y retourne, le refus n'a pas tenu, et votre idée était fausse." },
  ],
  pratique: [
    { texte: "Cherchez une pin bar sur un niveau, en 4 heures ou en journalier, et posez un achat fictif au-dessus de son haut.", href: "/trading", bouton: "Prendre position" },
    { texte: "Notez dans le journal le niveau de chaque pin bar que vous tradez.", href: "/journal", bouton: "Ouvrir le journal" },
  ],
};

export default lecon;
