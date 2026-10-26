import { serie, type Ancre, type Bougie } from "../marche";
import type { LeconSerie } from "../types";
import { GrapheDecision } from "@/components/cours/outils/GrapheDecision";
import { PoserPullback } from "@/components/cours/outils/PoserPullback";

/** Fixe exactement quelques bougies : [ouverture, plus haut, plus bas, clôture]. */
function retouche(b: Bougie[], m: Record<number, [number, number, number, number]>): Bougie[] {
  return b.map((x, i) => (m[i] ? { ...x, o: m[i][0], h: m[i][1], l: m[i][2], c: m[i][3] } : x));
}

// L'euro-dollar sous 1,1000, cassé à la bougie 40 (comme dans la leçon 30).
const RANGE: Ancre[] = [[0, 1.0962], [5, 1.0945, "bas"], [10, 1.1, "haut"], [16, 1.0948, "bas"], [22, 1.0998, "haut"], [28, 1.0946, "bas"], [34, 1.0999, "haut"], [37, 1.0972], [39, 1.0991]];
const s = (graine: number, suite: Ancre[]) => serie([...RANGE, ...suite], { graine, bruit: 0.0005 });

// Le pullback modèle : sommet à 1,1062, retour doux, rebond à la bougie 52 (mèche à 1,0994), puis la hausse.
const modele = retouche(
  s(311, [[40, 1.1028], [42, 1.1046], [45, 1.1062, "haut"], [48, 1.104], [51, 1.1012], [52, 1.101], [56, 1.104], [60, 1.1066], [64, 1.108], [68, 1.1092]]),
  { 51: [1.1022, 1.1025, 1.1004, 1.1006], 52: [1.1005, 1.1012, 1.0994, 1.101], 53: [1.101, 1.1019, 1.1007, 1.1019] },
);
// Les cas de l'exercice.
const casA = retouche(
  s(312, [[40, 1.1026], [43, 1.1044], [46, 1.1056, "haut"], [49, 1.1034], [52, 1.1012], [53, 1.1011], [57, 1.1038], [62, 1.1064], [68, 1.1088]]),
  { 52: [1.1016, 1.1018, 1.1003, 1.1005], 53: [1.1005, 1.1013, 1.0995, 1.1011], 54: [1.1011, 1.1018, 1.1009, 1.1016] },
);
const casB = retouche(
  s(313, [[40, 1.1024], [43, 1.104], [46, 1.1052, "haut"], [50, 1.1012], [52, 1.0985], [55, 1.097], [60, 1.0952], [66, 1.0948]]),
  { 51: [1.1012, 1.1015, 1.1002, 1.1004], 52: [1.1004, 1.1007, 1.098, 1.0985] },
);
const casC = s(314, [[40, 1.1027], [44, 1.1052], [48, 1.1075], [52, 1.1098], [56, 1.1112], [60, 1.1128], [66, 1.1146]]);
const casD = retouche(
  s(315, [[40, 1.1025], [43, 1.1045], [45, 1.1056, "haut"], [48, 1.103], [50, 1.1003], [51, 1.1012], [55, 1.104], [60, 1.1068], [66, 1.1084]]),
  { 49: [1.1036, 1.1038, 1.1016, 1.1018], 50: [1.1018, 1.1019, 1.0999, 1.1003], 51: [1.1003, 1.1014, 1.0994, 1.1012] },
);
// Le même retour dans une tendance : sur la ligne de tendance.
const tendance = serie([[0, 1.09], [8, 1.096], [12, 1.0935, "bas"], [20, 1.1], [25, 1.0975, "bas"], [33, 1.104], [38, 1.1015, "bas"], [46, 1.108], [50, 1.1066], [54, 1.1098]], { graine: 316, bruit: 0.0005 });

const niveau = { prix: 1.1, zone: 0.0006, label: "1,1000 : ancien plafond", couleur: "var(--cap-ink-3)" };
const plancher = { prix: 1.1, zone: 0.0006, label: "1,1000 : le plancher tient", couleur: "var(--cap-up)" };
const choix = ["J'entre", "J'attends un signal", "Je n'entre pas"];

const lecon: LeconSerie = {
  numero: 31,
  accroche: "Le prix a cassé le plafond, et vous avez raté l'entrée ? Souvent, il revient.",
  promesse: "À la fin de cette leçon, vous saurez reconnaître un bon pullback, y entrer avec un stop et un objectif, et savoir quand ne pas entrer.",
  parties: [{
    titre: "",
    blocs: [
      { t: "h", texte: "Le pullback : le prix revient sur ses pas" },
      { t: "p", html: "Le <span class=\"mot\">pullback</span>, c'est <b>le retour du prix sur le niveau qu'il vient de casser</b>. On l'appelle aussi le <span class=\"mot\">retest</span> : le prix « reteste » le niveau. Dans la leçon 30, vous avez vu que l'ancien plafond devient souvent un plancher. Le pullback, c'est le moment où le prix vient le vérifier." },
      {
        t: "scenes",
        titre: "La cassure, puis le retour",
        scenes: [
          { legende: "L'euro-dollar casse le plafond de 1,1000, avec une clôture nette.", cfg: { bougies: modele, unite: "heure", jusqua: 40, niveaux: [{ ...niveau, label: "Résistance 1,1000", couleur: "var(--cap-down)" }], surligne: [40] } },
          { legende: "Il monte jusqu'à <b>1,1062</b>. Vous n'étiez pas devant l'écran : l'entrée est ratée.", cfg: { bougies: modele, unite: "heure", jusqua: 45, niveaux: [niveau], marques: [{ i: 45, type: "point", prix: 1.1062 }] } },
          { legende: "Puis il redescend, doucement, en petites bougies, vers 1,1000.", cfg: { bougies: modele, unite: "heure", jusqua: 51, niveaux: [niveau], marques: [{ i: 45, type: "point", prix: 1.1062 }] } },
          { legende: "Il touche le niveau et rebondit : la mèche descend à 1,0994, mais la bougie clôture à <b>1,1010</b>, au-dessus. Le plancher tient.", cfg: { bougies: modele, unite: "heure", jusqua: 52, niveaux: [plancher], marques: [{ i: 45, type: "point", prix: 1.1062 }], surligne: [52] } },
          { legende: "Et la hausse repart. Une deuxième chance d'entrer, souvent meilleure que la première.", cfg: { bougies: modele, unite: "heure", niveaux: [plancher], marques: [{ i: 52, type: "achat", label: "Pullback" }] } },
        ],
      },

      { t: "h", texte: "Pourquoi le prix revient" },
      { t: "p", html: "Parce que <b>beaucoup d'acheteurs ont raté la cassure</b>. Ils ne veulent pas acheter tout en haut : ils attendent un meilleur prix, et leurs ordres d'achat attendent sur le niveau. Ajoutez ceux qui ont vendu sous le plafond et veulent racheter à leur prix. Quand le prix revient, il trouve ces ordres, et il rebondit." },
      {
        t: "qr",
        items: [
          { q: "Le prix revient-il à chaque fois ?", r: "Non. Souvent, pas toujours. Parfois il file sans jamais revenir. Le pullback est une occasion, pas un rendez-vous." },
          { q: "Jusqu'où revient-il ?", r: "Sur le niveau, à quelques pips près : une mèche peut passer un peu dessous. Ce qui compte, c'est la clôture." },
        ],
      },

      { t: "h", texte: "Un bon pullback" },
      { t: "p", html: "Tous les retours ne se valent pas. Un bon pullback a deux traits :" },
      {
        t: "liste",
        items: [
          "<b>Il revient doucement</b>, avec de petites bougies : les vendeurs ne sont pas pressés, ce sont surtout des acheteurs qui prennent leurs gains.",
          "<b>Il touche le niveau, et le niveau tient</b> : aucune clôture en dessous. Une mèche qui passe un peu dessous est permise ; une clôture, non.",
        ],
      },

      { t: "h", texte: "Entrer : le signal, le stop, l'objectif" },
      {
        t: "liste",
        numerotee: true,
        items: [
          "<b>Le signal</b> : une bougie qui rebondit sur le niveau, avec une mèche en bas. Le prix est allé chercher sous le niveau, et les acheteurs l'ont ramené (c'est souvent une pin bar, leçon 32).",
          "<b>Le stop</b> : sous le niveau, sous la mèche du rebond. Si le prix passe dessous, le plancher a cédé.",
          "<b>L'objectif</b> : au moins <b>deux fois le risque</b>. Par exemple le dernier sommet, là où le prix avait calé avant de revenir.",
        ],
      },
      {
        t: "exemple",
        titre: "Le trade du pullback",
        html: "La bougie du rebond clôture à <b>1,1010</b> ; sa mèche est descendue à 1,0994.<br />Vous achetez à <b>1,1010</b>. Le stop va sous la mèche, à <b>1,0990</b> : 20 pips. Avec <b>0,10 lot</b> (1 $ par pip), vous risquez <b>20 $</b>, 1 % d'un compte de 2 000 $.<br />L'objectif : le dernier sommet, à 1,1062 ; vous visez un peu avant, <b>1,1060</b>, soit 50 pips, <b>2,5 fois</b> le risque. Si l'objectif est atteint : +50 $. Si le stop est touché : −20 $.",
      },
      {
        t: "outil",
        titre: "Posez votre trade",
        consigne: "Choisissez ce que vous placez, puis cliquez à la bonne hauteur : l'entrée, le stop, l'objectif. Vérifiez, et regardez la suite.",
        el: <PoserPullback bougies={modele} jusqua={52} niveau={1.1} sommet={1.1062} />,
      },

      { t: "h", texte: "Quand ne pas entrer" },
      { t: "p", html: "<b>Une clôture sous le niveau pendant le retour</b> : le plancher n'a pas tenu, la cassure était fausse (leçon 30). Vous n'entrez pas, même si le prix remonte un peu ensuite." },
      {
        t: "graphique",
        cfg: { bougies: casB, unite: "heure", niveaux: [{ ...niveau, label: "1,1000 : le plancher cède", couleur: "var(--cap-down)" }], surligne: [52], marques: [{ i: 52, type: "croix", prix: 1.0985 }] },
        legende: "Pendant le retour, cette bougie clôture à 1,0985, sous le niveau. Le plancher a cédé : on n'achète pas. La baisse qui suit le confirme.",
      },
      { t: "p", html: "<b>Pas de retour du tout</b> : le prix file sans vous. <b>Ne courez pas après.</b> Acheter 100 pips au-dessus du niveau, c'est un stop très loin, ou un stop au milieu de nulle part. Une autre occasion viendra : il y a toujours un autre graphique, une autre cassure." },
      { t: "piege", html: "<b>Courir après le prix.</b> Le prix a cassé, il monte sans vous, et l'envie d'entrer « avant qu'il soit trop tard » devient forte (c'est le FOMO, leçon 11). Si vous achetez à 1,1100 avec un stop sous 1,1000, vous risquez plus de 100 pips : pour rester à 20 $, il faudrait moins de 0,02 lot. Le pullback raté n'est pas une perte : c'est un trade que vous n'avez pas pris." },
      {
        t: "outil",
        titre: "J'entre ou pas ?",
        consigne: "Quatre situations après une cassure de 1,1000. À chaque fois, décidez, puis regardez la suite.",
        el: <GrapheDecision question="Que faites-vous à la fin de cette bougie ?" cas={[
          {
            titre: "Le retour en petites bougies", cfg: { bougies: casA, niveaux: [niveau], jusqua: 53, surligne: [53] }, choix, bon: 0,
            explication: "Retour doux, contact avec le niveau, mèche basse et clôture au-dessus, à 1,1011 : c'est le signal. On entre, stop sous la mèche (1,0995), vers 1,0990.",
          },
          {
            titre: "La clôture dessous", cfg: { bougies: casB, niveaux: [niveau], jusqua: 52, surligne: [52] }, choix, bon: 2,
            explication: "Clôture à 1,0985, sous le niveau : le plancher a cédé, la cassure était fausse. On n'entre pas.",
          },
          {
            titre: "Le prix qui file", cfg: { bougies: casC, niveaux: [niveau], jusqua: 52, surligne: [52] }, choix, bon: 2,
            explication: "Le prix est à 1,1098, presque 100 pips au-dessus du niveau, sans jamais revenir. Entrer ici, c'est courir après. Il a continué, oui : mais vous ne pouviez pas le savoir, et votre stop aurait été très loin. On laisse passer.",
          },
          {
            titre: "La chute sur le niveau", cfg: { bougies: casD, niveaux: [niveau], jusqua: 50, surligne: [50] }, choix, bon: 1,
            explication: "Le prix vient de tomber sur le niveau avec deux grandes bougies rouges, sans rebond. Pas encore de signal : on attend. La bougie suivante a rebondi avec une mèche basse : c'était elle, le signal.",
          },
        ]} />,
      },

      { t: "h", texte: "Le même retour, dans une tendance" },
      { t: "p", html: "Le pullback n'existe pas qu'après une cassure. Dans une tendance haussière (leçon 28), le prix revient régulièrement sur <b>sa ligne de tendance</b> (leçon 29), ou sur <b>l'ancien sommet</b> qu'il vient de dépasser, avant de repartir. Même idée, mêmes règles : un retour calme, un rebond, le stop dessous." },
      {
        t: "scenes",
        titre: "Les retours sur la ligne de tendance",
        scenes: [
          { legende: "Une tendance haussière : des creux de plus en plus hauts, à 1,0935 puis 1,0975.", cfg: { bougies: tendance, unite: "heure", jusqua: 30, marques: [{ i: 12, type: "point" }, { i: 25, type: "point" }] } },
          { legende: "On relie ces creux : c'est la ligne de tendance.", cfg: { bougies: tendance, unite: "heure", jusqua: 30, marques: [{ i: 12, type: "point" }, { i: 25, type: "point" }], traits: [{ de: [12, 1.0935], a: [25, 1.0975], prolonger: true, couleur: "var(--cap-up)", label: "Ligne de tendance" }] } },
          { legende: "Le prix revient sur la ligne vers 1,1015, rebondit, et repart : le même pullback, sur une ligne au lieu d'un niveau.", cfg: { bougies: tendance, unite: "heure", marques: [{ i: 12, type: "point" }, { i: 25, type: "point" }, { i: 38, type: "achat", label: "Retour" }], traits: [{ de: [12, 1.0935], a: [25, 1.0975], prolonger: true, couleur: "var(--cap-up)", label: "Ligne de tendance" }] } },
        ],
      },
      { t: "nimbo", texte: "Sur la page Trading, chaque position fictive se prend avec un stop de protection et un objectif de gain. Entraînez-vous à les placer comme ici : le stop sous la mèche, l'objectif à au moins deux fois le risque.", humeur: "pointe" },
    ],
  }],
  mots: [
    { terme: "Pullback", en: "pullback", def: "Le retour du prix sur le niveau qu'il vient de casser, ou sur sa ligne de tendance, avant de repartir." },
    { terme: "Retest", en: "retest", def: "Un autre nom du pullback : le prix revient « tester » le niveau cassé." },
    { terme: "Changement de rôle", en: "role reversal", def: "L'ancien plafond qui devient un plancher après la cassure, ou l'inverse." },
    { terme: "Rebond", en: "bounce", def: "Le demi-tour du prix sur le niveau, souvent avec une mèche basse : le signal d'entrée." },
    { terme: "Rapport risque / objectif", en: "risk/reward", def: "Ce que vous visez comparé à ce que vous risquez ; au moins deux fois sur un pullback." },
  ],
  retenir: [
    "Le <b>pullback</b> (retest), c'est le retour du prix sur le niveau qu'il vient de casser.",
    "Il revient parce que <b>les acheteurs qui ont raté la cassure</b> attendent sur le niveau.",
    "Un bon pullback revient <b>doucement</b>, touche le niveau, et <b>le niveau tient</b> : aucune clôture dessous.",
    "On entre sur <b>un rebond avec mèche basse</b>, stop sous le niveau et sous la mèche, objectif à <b>au moins deux fois le risque</b>.",
    "<b>Une clôture sous le niveau</b> pendant le retour : on n'entre pas. <b>Pas de retour</b> : on ne court pas après.",
    "Le même retour existe dans une tendance, sur la <b>ligne de tendance</b> ou l'ancien sommet.",
  ],
  quiz: [
    { question: "Qu'est-ce qu'un pullback ?", options: ["Une nouvelle cassure", "Le retour du prix sur le niveau qu'il vient de casser", "Un ordre annulé"], correct: 1, explanation: "Après la cassure, le prix revient souvent tester le niveau : c'est le pullback, ou retest. L'ancien plafond sert alors de plancher." },
    { question: "Pourquoi le prix revient-il souvent sur le niveau cassé ?", options: ["Parce que des acheteurs qui ont raté la cassure y attendent avec leurs ordres", "Parce que la plateforme l'y oblige", "Parce qu'il revient toujours à son prix d'ouverture"], correct: 0, explanation: "Ceux qui ont raté la cassure veulent un meilleur prix : leurs ordres d'achat attendent sur le niveau." },
    { question: "Pendant le retour, une bougie clôture sous le niveau. Que faites-vous ?", options: ["J'achète, c'est moins cher", "Je n'entre pas : le plancher a cédé, la cassure était fausse", "Je double ma position"], correct: 1, explanation: "Un bon pullback tient le niveau : aucune clôture dessous. Une clôture dessous dit que la cassure était fausse." },
    { question: "Où placer le stop sur un pullback ?", options: ["Au-dessus du dernier sommet", "Sous le niveau, sous la mèche de la bougie du rebond", "À un pip de l'entrée"], correct: 1, explanation: "Sous la mèche du rebond, donc sous le niveau : si le prix y passe, le plancher a cédé et votre idée était fausse." },
    { question: "Le prix a cassé et file sans revenir. Que faire ?", options: ["Courir après, avant qu'il soit trop tard", "Ne pas courir après : une autre occasion viendra", "Vendre pour se venger"], correct: 1, explanation: "Acheter loin du niveau, c'est un stop très loin ou mal placé. Le trade raté n'est pas une perte : il y aura d'autres pullbacks." },
  ],
  pratique: [
    { texte: "Placez un achat fictif sur le retour d'un niveau cassé, avec son stop sous la mèche et un objectif à deux fois le risque.", href: "/trading", bouton: "Prendre position" },
    { texte: "Écrivez vos règles du pullback dans votre stratégie : le signal, le stop, l'objectif, et quand ne pas entrer.", href: "/strategie", bouton: "Ma stratégie" },
  ],
};

export default lecon;
