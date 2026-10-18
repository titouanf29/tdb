import { serie, type Bougie } from "../marche";
import type { LeconSerie } from "../types";
import { SuiteFibonacci } from "@/components/cours/outils/SuiteFibonacci";
import { TraceFibonacci } from "@/components/cours/outils/TraceFibonacci";
import { ExtensionsFibonacci } from "@/components/cours/outils/ExtensionsFibonacci";

/** Fixe exactement quelques bougies : [ouverture, plus haut, plus bas, clôture]. */
function retouche(b: Bougie[], m: Record<number, [number, number, number, number]>): Bougie[] {
  return b.map((x, i) => (m[i] ? { ...x, o: m[i][0], h: m[i][1], l: m[i][2], c: m[i][3] } : x));
}

// L'euro-dollar monte de 200 pips (1,1000 à 1,1200), puis revient de 38,2 %.
const retour382 = serie([[0, 1.1012], [4, 1.1, "bas"], [24, 1.12, "haut"], [32, 1.1124, "bas"], [40, 1.1178], [46, 1.1226]], { graine: 252, bruit: 0.0006 });
// Le même départ, mais le prix traverse tous les niveaux.
const traverse = serie([[0, 1.1012], [4, 1.1, "bas"], [24, 1.12, "haut"], [31, 1.1118], [34, 1.1096], [38, 1.1074], [46, 1.1004]], { graine: 253, bruit: 0.0006 });
// Un marché qui tourne en rond : pas de mouvement clair à mesurer.
const enRond = serie([[0, 1.105], [6, 1.11], [12, 1.1042], [18, 1.1096], [24, 1.1046], [30, 1.1102], [36, 1.1048], [42, 1.1092]], { graine: 254, bruit: 0.0006 });
// Le mouvement de la partie 2 et de la partie 3 : creux à 1,1000 (bougie 10),
// un ancien sommet à 1,1092 (bougie 22), un creux intermédiaire à 1,1058
// (bougie 27), le sommet à 1,1200 (bougie 40), le retour dans la zone et une
// bougie à longue mèche basse (bougie 53), puis la hausse.
const fibo = retouche(
  serie([[0, 1.104], [5, 1.1022], [10, 1.1, "bas"], [16, 1.106], [22, 1.1092, "haut"], [27, 1.1058, "bas"], [32, 1.111], [37, 1.117], [40, 1.12, "haut"], [44, 1.116], [48, 1.1118], [52, 1.1095], [53, 1.108], [56, 1.111], [62, 1.1165], [68, 1.1215], [73, 1.125], [76, 1.1255, "haut"], [80, 1.1225], [86, 1.1262]], { graine: 251, bruit: 0.0007 }),
  { 52: [1.1095, 1.1097, 1.1074, 1.1077], 53: [1.1077, 1.1084, 1.1066, 1.108], 54: [1.108, 1.1095, 1.1076, 1.1091] },
);
const H = 1.12, L = 1.1, M = H - L;
const niv = (r: number) => H - r * M;
const zone = { i0: 40, i1: 86, p0: niv(0.5), p1: niv(0.618), couleur: "var(--cap-amber-ink)" };
const fibNiveaux = [
  { prix: niv(0.382), label: "38,2 % : 1,1124", couleur: "var(--cap-ink-2)", epaisseur: 1.2 },
  { prix: niv(0.5), label: "50 % : 1,1100", couleur: "var(--cap-amber-ink)", epaisseur: 1.4 },
  { prix: niv(0.618), label: "61,8 % : 1,1076", couleur: "var(--cap-amber-ink)", epaisseur: 1.4 },
];
const T1 = L + 1.272 * M, T2 = L + 1.618 * M;

const lecon: LeconSerie = {
  numero: 25,
  accroche: "38,2 %, 61,8 % : beaucoup de traders tracent ces lignes. D'où viennent ces chiffres, et à quoi servent-ils ?",
  promesse: "À la fin de cette leçon en trois parties, vous saurez d'où viennent les niveaux de Fibonacci, comment tracer un retracement pour trouver une zone d'entrée, et comment utiliser les extensions pour placer vos objectifs.",
  parties: [
    {
      titre: "D'où viennent les chiffres",
      blocs: [
        { t: "h", texte: "Une suite de nombres vieille de huit siècles" },
        { t: "p", html: "Tout part d'une suite de nombres que Léonard de Pise, dit <span class=\"mot\">Fibonacci</span>, a fait connaître en Europe en <b>1202</b>, dans son livre de calcul (le <em>Liber abaci</em>). Elle commence ainsi : <b>0, 1, 1, 2, 3, 5, 8, 13</b>. La règle est simple : <b>chaque nombre est la somme des deux d'avant</b>. Un plus un, deux. Un plus deux, trois. Deux plus trois, cinq. Trois plus cinq, huit." },
        {
          t: "outil",
          titre: "Construisez la suite",
          consigne: "Ajoutez des nombres un par un. Touchez-en un pour voir ce que donnent les divisions.",
          el: <SuiteFibonacci />,
        },

        { t: "h", texte: "Le nombre d'or : 1,618" },
        { t: "p", html: "Prenez un nombre de la suite et divisez-le par celui juste avant. Au début, ça saute : 2 ÷ 1 = 2 ; 3 ÷ 2 = 1,5 ; 5 ÷ 3 = 1,667 ; 8 ÷ 5 = 1,6. Puis ça se stabilise : 89 ÷ 55 = <b>1,618</b>. Plus on avance dans la suite, plus on tombe près de ce nombre : c'est le <span class=\"mot\">nombre d'or</span> (golden ratio), environ 1,618." },

        { t: "h", texte: "Les pourcentages : 61,8 %, 38,2 %, 23,6 %" },
        { t: "p", html: "Faites maintenant l'inverse : divisez un nombre par ceux qui le <b>suivent</b>. On retrouve les pourcentages que les traders tracent." },
        {
          t: "tableau",
          entetes: ["Le calcul", "Le résultat", "Le niveau"],
          lignes: [
            ["21 ÷ 34 (le suivant)", "0,618", "<b>61,8 %</b>"],
            ["21 ÷ 55 (deux cases plus loin)", "0,382", "<b>38,2 %</b>"],
            ["21 ÷ 89 (trois cases plus loin)", "0,236", "<b>23,6 %</b>"],
            ["La moitié du mouvement", "0,5", "<b>50 %</b> (pas un nombre de Fibonacci)"],
          ],
          legende: "Le 50 % ne vient pas de la suite. On l'ajoute parce que beaucoup de traders surveillent la moitié d'un mouvement.",
        },

        { t: "h", texte: "À quoi ça sert : le retracement" },
        { t: "p", html: "Un prix ne monte jamais en ligne droite. Il monte, puis il revient un peu en arrière, puis il repart. Ce retour en arrière, c'est un <span class=\"mot\">retracement</span> (retracement). La question que se posent les traders : <b>de combien va-t-il revenir ?</b> Les pourcentages de Fibonacci donnent des réponses possibles, mesurées sur la hauteur du mouvement." },
        {
          t: "scenes",
          titre: "Une montée de 200 pips, et un retour",
          scenes: [
            { legende: "L'euro-dollar monte de <b>1,1000 à 1,1200</b> : 200 pips.", cfg: { bougies: retour382, unite: "heure", jusqua: 24, marques: [{ i: 4, type: "point", prix: 1.1 }, { i: 24, type: "point", prix: 1.12 }] } },
            { legende: "On trace les niveaux sur cette montée : 38,2 %, 50 % et 61,8 % du chemin, en partant du haut.", cfg: { bougies: retour382, unite: "heure", jusqua: 24, marques: [{ i: 4, type: "point", prix: 1.1 }, { i: 24, type: "point", prix: 1.12 }], niveaux: fibNiveaux } },
            { legende: "Le prix redescend jusqu'à <b>1,1124</b>, puis repart. Il est revenu de 76 pips sur 200 : <b>38,2 %</b> de sa montée.", cfg: { bougies: retour382, unite: "heure", marques: [{ i: 4, type: "point", prix: 1.1 }, { i: 24, type: "point", prix: 1.12 }, { i: 32, type: "achat", label: "38,2 %" }], niveaux: fibNiveaux } },
          ],
        },
        {
          t: "exemple",
          titre: "Les niveaux d'une montée de 200 pips",
          html: "La montée va de 1,1000 à 1,1200 : <b>200 pips</b>. Chaque niveau se calcule depuis le sommet, en redescendant :<br />23,6 % de 200 = 47 pips : 1,1200 − 0,0047 = <b>1,1153</b><br />38,2 % de 200 = 76 pips : <b>1,1124</b><br />50 % de 200 = 100 pips : <b>1,1100</b><br />61,8 % de 200 = 124 pips : <b>1,1076</b><br />La plateforme fait ce calcul pour vous. Mais le faire une fois montre que ces niveaux ne sont que des <b>fractions du mouvement</b>.",
        },

        { t: "h", texte: "Pourquoi le prix réagirait sur ces niveaux" },
        { t: "p", html: "Pas par magie. La nature n'a rien à voir avec l'euro-dollar. Le prix réagit parfois sur ces niveaux parce que <b>beaucoup de traders les surveillent</b> et y placent leurs ordres d'achat : des ordres au même endroit, c'est une raison pour que le prix s'y arrête. Mais si les vendeurs sont plus forts, le prix traverse tout. <b>Rien n'est garanti.</b>" },
        {
          t: "graphique",
          cfg: { bougies: traverse, unite: "heure", niveaux: fibNiveaux, marques: [{ i: 4, type: "point", prix: 1.1 }, { i: 24, type: "point", prix: 1.12 }] },
          legende: "Même montée, même niveaux : cette fois, le prix les traverse tous et revient au point de départ. Des zones à surveiller, pas des murs.",
        },
        {
          t: "qr",
          items: [
            { q: "Les niveaux de Fibonacci marchent-ils vraiment ?", r: "Ils marchent comme marche un rendez-vous : quand beaucoup de gens viennent au même endroit, il s'y passe quelque chose. Mais aucune étude ne montre qu'ils prédisent le prix. Servez-vous-en pour repérer des zones, jamais comme d'une certitude." },
            { q: "Faut-il tracer tous les niveaux ?", r: "Non. Les plus surveillés sont 38,2 %, 50 % et 61,8 %. Le 23,6 % est un retour très faible, souvent dépassé." },
            { q: "Pourquoi parle-t-on aussi de coquillages et de tournesols ?", r: "Parce que le nombre d'or apparaît dans certaines formes de la nature. C'est joli, mais cela ne dit rien du marché. Ce qui compte en trading, c'est que beaucoup de gens regardent ces niveaux." },
          ],
        },
      ],
    },
    {
      titre: "Tracer un retracement",
      blocs: [
        { t: "h", texte: "D'abord, un mouvement clair" },
        { t: "p", html: "Le prix vient de monter fort et vous voulez acheter. Tout en haut, c'est risqué : vous achetez au prix le plus cher, et le stop est loin. Le retracement vous aide à trouver un meilleur endroit. Mais il lui faut <b>un mouvement clair</b> : une tendance, avec un <span class=\"mot\">creux</span> (swing low, le point le plus bas d'où part la montée) et un <span class=\"mot\">sommet</span> (swing high, le point le plus haut qu'elle atteint)." },
        {
          t: "graphique",
          cfg: { bougies: enRond, unite: "heure" },
          legende: "Ici, pas de mouvement clair : le prix tourne en rond (un range, leçon 34). Quel creux, quel sommet ? Il n'y a rien à mesurer. Fibonacci ne sert pas dans ce cas.",
        },
        { t: "h", texte: "L'outil, du creux au sommet" },
        { t: "p", html: "Sur votre plateforme, prenez l'outil Fibonacci. Cliquez sur le creux, et tirez jusqu'au sommet. Accrochez-le aux <b>mèches</b> : le plus bas de la bougie du creux, le plus haut de la bougie du sommet. Les niveaux apparaissent." },
        {
          t: "scenes",
          titre: "Tracer, geste par geste",
          scenes: [
            { legende: "Une hausse nette de l'euro-dollar. Où est le mouvement ?", cfg: { bougies: fibo, unite: "heure", jusqua: 50 } },
            { legende: "Le <b>creux</b> : le plus bas d'où part la montée, la mèche à <b>1,1000</b>.", cfg: { bougies: fibo, unite: "heure", jusqua: 50, marques: [{ i: 10, type: "point", prix: 1.1 }] } },
            { legende: "Le <b>sommet</b> : le plus haut de la montée, la mèche à <b>1,1200</b>. Le mouvement fait 200 pips.", cfg: { bougies: fibo, unite: "heure", jusqua: 50, marques: [{ i: 10, type: "point", prix: 1.1 }, { i: 40, type: "point", prix: 1.12 }] } },
            { legende: "Les niveaux apparaissent : 38,2 %, 50 % et 61,8 % du mouvement, mesurés depuis le sommet.", cfg: { bougies: fibo, unite: "heure", jusqua: 50, marques: [{ i: 10, type: "point", prix: 1.1 }, { i: 40, type: "point", prix: 1.12 }], niveaux: fibNiveaux } },
            { legende: "La zone la plus surveillée : entre <b>50 et 61,8 %</b>, de 1,1076 à 1,1100. Le prix est en train d'y descendre.", cfg: { bougies: fibo, unite: "heure", jusqua: 51, marques: [{ i: 10, type: "point", prix: 1.1 }, { i: 40, type: "point", prix: 1.12 }], niveaux: fibNiveaux, zones: [{ ...zone, label: "50 à 61,8 %" }] } },
          ],
        },
        {
          t: "outil",
          titre: "Tracez le retracement",
          consigne: "Cliquez sur le creux, puis sur le sommet de la montée. L'outil s'accroche aux mèches. Puis vérifiez, et regardez la suite.",
          el: <TraceFibonacci bougies={fibo} jusqua={50} creux={10} sommet={40} ancien={{ prix: 1.1092, label: "Ancien sommet à 1,1092" }} />,
        },

        { t: "h", texte: "Dans la zone, attendre un signal" },
        { t: "p", html: "Quand le prix arrive dans la zone, <b>n'achetez pas tout de suite</b>. Il peut continuer à baisser et traverser tous les niveaux. Attendez qu'il montre qu'il est repoussé : par exemple, <b>une bougie avec une longue mèche en bas</b>. Le prix est descendu, et les acheteurs l'ont ramené vers le haut avant la clôture (c'est la pin bar, leçon 32)." },
        {
          t: "scenes",
          titre: "Le signal dans la zone",
          scenes: [
            { legende: "Le prix entre dans la zone. Rien ne dit encore qu'il va s'arrêter.", cfg: { bougies: fibo, unite: "heure", jusqua: 52, niveaux: fibNiveaux, zones: [zone] } },
            { legende: "Cette bougie descend à 1,1066, sous la zone, puis remonte et clôture à <b>1,1080</b> : une longue mèche basse. La zone a été rejetée.", cfg: { bougies: fibo, unite: "heure", jusqua: 53, niveaux: fibNiveaux, zones: [zone], surligne: [53] } },
            { legende: "Vous entrez à la clôture, à <b>1,1080</b>. Le stop va sous la zone et sous la mèche, à <b>1,1040</b>.", cfg: { bougies: fibo, unite: "heure", jusqua: 53, niveaux: [...fibNiveaux, { prix: 1.104, label: "Stop 1,1040", couleur: "var(--cap-down)", pointille: false }], zones: [zone], surligne: [53], marques: [{ i: 53, type: "achat", prix: 1.1066, label: "Achat" }] } },
          ],
        },
        {
          t: "exemple",
          titre: "Le stop et la taille",
          html: "Entrée à <b>1,1080</b>, stop à <b>1,1040</b> : <b>40 pips</b> de risque. Si le prix casse la zone et touche le stop, votre idée était fausse : vous sortez, avec une petite perte prévue à l'avance.<br />Avec un compte de <b>2 000 $</b> et 1 % de risque, vous acceptez de perdre <b>20 $</b>. 20 $ ÷ 40 pips = 0,50 $ par pip, soit <b>0,05 lot</b> (un lot d'euro-dollar vaut 10 $ par pip). C'est deux fois moins que les 0,10 lot habituels de la série, parce que le stop est deux fois plus large que 20 pips : <b>le stop décide de la taille</b>, pas l'inverse.",
        },

        { t: "h", texte: "La confluence : deux raisons au même endroit" },
        { t: "p", html: "Encore mieux : quand la zone tombe sur <b>un ancien niveau</b>, où le prix a déjà réagi. Ici, pendant la montée, le prix avait calé à <b>1,1092</b> : un ancien sommet, qui peut maintenant servir de plancher (leçon 33). Il tombe en plein dans la zone 50 à 61,8 %. Deux raisons au même endroit, c'est une <span class=\"mot\">confluence</span> (confluence)." },
        {
          t: "graphique",
          cfg: { bougies: fibo, unite: "heure", jusqua: 60, niveaux: [...fibNiveaux, { prix: 1.1092, label: "Ancien sommet 1,1092", couleur: "var(--cap-ocean)", pointille: false, epaisseur: 2 }], zones: [zone], marques: [{ i: 22, type: "point", prix: 1.1092 }, { i: 53, type: "achat", prix: 1.1066 }] },
          legende: "L'ancien sommet de la bougie 23 et la zone de Fibonacci se superposent : le prix a rebondi là.",
        },
        { t: "piege", html: "<b>Retracer jusqu'à trouver le niveau qui arrange.</b> Partez du petit creux à 1,1058 (bougie 28) au lieu du vrai creux à 1,1000, et tous les niveaux changent : le 61,8 % passe de 1,1076 à 1,1112. Avec assez d'essais, on finit toujours par trouver un niveau « qui marche » sur le passé. Choisissez votre mouvement <b>avant</b>, le plus net, et ne le changez plus." },
        {
          t: "qr",
          items: [
            { q: "Et dans une baisse ?", r: "C'est la même chose à l'envers : on trace du sommet au creux, et on cherche à vendre quand le prix remonte dans la zone 50 à 61,8 %, avec le stop au-dessus." },
            { q: "Sur quelle unité de temps ?", r: "Sur celle où vous voyez un mouvement net. Un mouvement visible en journalier est surveillé par plus de monde qu'un mouvement de cinq minutes." },
            { q: "Et si le prix ne revient pas jusqu'à la zone ?", r: "Vous n'entrez pas. Il repart parfois après un petit retour de 23,6 % ou 38,2 % : vous ratez le mouvement, et ce n'est pas grave. Une autre occasion viendra." },
          ],
        },
      ],
    },
    {
      titre: "Les extensions, où sortir",
      blocs: [
        { t: "h", texte: "Le problème de la sortie" },
        { t: "p", html: "Vous êtes entré au bon endroit. Mais où sortir ? Trop tôt, vous ratez une partie du mouvement. Trop tard, le prix s'est retourné et votre gain a fondu. Les <span class=\"mot\">extensions de Fibonacci</span> (Fibonacci extensions) donnent des objectifs, décidés <b>avant</b> d'entrer." },
        { t: "h", texte: "127,2 % et 161,8 % du mouvement" },
        { t: "p", html: "On reprend le mouvement, du creux au sommet : c'est <b>100 %</b>. On le prolonge au-dessus du sommet, à <b>127,2 %</b>, puis à <b>161,8 %</b> de sa hauteur, toujours <b>mesurés depuis le creux</b>." },
        {
          t: "exemple",
          titre: "Les deux objectifs",
          html: "Le mouvement va de 1,1000 à 1,1200 : 200 pips.<br />127,2 % de 200 = 254 pips. Depuis le creux : 1,1000 + 0,0254 = <b>1,1254</b>, le premier objectif.<br />161,8 % de 200 = 324 pips. Depuis le creux : 1,1000 + 0,0324 = <b>1,1324</b>, le deuxième objectif.<br />Depuis votre entrée à 1,1080, le premier est à <b>174 pips</b>, le deuxième à 244 pips.",
        },
        {
          t: "scenes",
          titre: "Les objectifs sur le graphique",
          scenes: [
            { legende: "Vous êtes acheteur à 1,1080, stop à 1,1040.", cfg: { bougies: fibo, unite: "heure", jusqua: 54, niveaux: [{ prix: 1.12, label: "100 % : 1,1200", couleur: "var(--cap-ink-3)", epaisseur: 1 }, { prix: 1.104, label: "Stop", couleur: "var(--cap-down)", pointille: false }], marques: [{ i: 53, type: "achat", prix: 1.1066, label: "Achat" }] } },
            { legende: "Le premier objectif, <b>127,2 %</b> : 1,1254. Proche, plus facile à atteindre.", cfg: { bougies: fibo, unite: "heure", jusqua: 54, niveaux: [{ prix: 1.12, label: "100 % : 1,1200", couleur: "var(--cap-ink-3)", epaisseur: 1 }, { prix: T1, label: "127,2 % : 1,1254", couleur: "var(--cap-up)", pointille: false }, { prix: 1.104, label: "Stop", couleur: "var(--cap-down)", pointille: false }], marques: [{ i: 53, type: "achat", prix: 1.1066, label: "Achat" }] } },
            { legende: "Le deuxième, <b>161,8 %</b> : 1,1324. Plus loin, plus ambitieux.", cfg: { bougies: fibo, unite: "heure", jusqua: 54, niveaux: [{ prix: 1.12, label: "100 % : 1,1200", couleur: "var(--cap-ink-3)", epaisseur: 1 }, { prix: T1, label: "127,2 % : 1,1254", couleur: "var(--cap-up)", pointille: false }, { prix: T2, label: "161,8 % : 1,1324", couleur: "var(--cap-up)", pointille: false }, { prix: 1.104, label: "Stop", couleur: "var(--cap-down)", pointille: false }], marques: [{ i: 53, type: "achat", prix: 1.1066, label: "Achat" }] } },
            { legende: "Le prix monte et touche le premier objectif à la bougie 77. Vous sortez <b>la moitié</b> et vous remontez le stop à votre entrée, 1,1080.", cfg: { bougies: fibo, unite: "heure", jusqua: 76, niveaux: [{ prix: T1, label: "127,2 % : 1,1254", couleur: "var(--cap-up)", pointille: false }, { prix: T2, label: "161,8 % : 1,1324", couleur: "var(--cap-up)", pointille: false }, { prix: 1.108, label: "Stop remonté à l'entrée", couleur: "var(--cap-ink)", pointille: false }], marques: [{ i: 53, type: "achat", prix: 1.1066, label: "Achat" }, { i: 76, type: "vente", label: "La moitié" }] } },
            { legende: "Le prix recule, puis repart. Le deuxième objectif n'est pas encore atteint : le reste court toujours, et il ne peut plus perdre, au pire il sort à l'entrée.", cfg: { bougies: fibo, unite: "heure", niveaux: [{ prix: T1, label: "127,2 % : 1,1254", couleur: "var(--cap-up)", pointille: false }, { prix: T2, label: "161,8 % : 1,1324", couleur: "var(--cap-up)", pointille: false }, { prix: 1.108, label: "Stop remonté à l'entrée", couleur: "var(--cap-ink)", pointille: false }], marques: [{ i: 53, type: "achat", prix: 1.1066, label: "Achat" }, { i: 76, type: "vente", label: "La moitié" }] } },
          ],
        },
        { t: "h", texte: "Deux objectifs, et le stop à l'entrée" },
        { t: "p", html: "Une idée simple : au premier objectif, <b>sortez la moitié</b> de votre position. Puis <b>remontez votre stop à votre prix d'entrée</b> : c'est le <span class=\"mot\">break-even</span> (le point mort, ni gain ni perte). Si le prix se retourne, le reste sort à zéro : il est protégé. S'il continue, le reste vise le deuxième objectif." },
        {
          t: "outil",
          titre: "Réglez votre trade",
          consigne: "Déplacez l'entrée et le stop. Regardez le risque, les objectifs, la taille de position, puis choisissez une suite.",
          el: <ExtensionsFibonacci />,
        },

        { t: "h", texte: "Avant d'entrer : comparer le risque à l'objectif" },
        { t: "p", html: "Avant chaque trade, posez-vous une question : <b>combien je risque, pour viser combien ?</b> C'est le rapport <span class=\"mot\">risque / rendement</span> (risk/reward). Ici, vous risquez <b>40 pips</b>, jusqu'au stop, et vous visez <b>174 pips</b>, jusqu'au premier objectif : <b>plus de quatre fois plus</b>. Même si une partie de vos trades touche le stop, ceux qui atteignent l'objectif peuvent compenser. Un trade qui risque 40 pips pour en viser 30 ne vaut, lui, presque jamais la peine." },
        {
          t: "exemple",
          titre: "Ce que vaut le plan, en dollars",
          html: "Avec 0,05 lot (0,50 $ par pip) : le stop coûte <b>40 × 0,50 = 20 $</b>. Le premier objectif, à 174 pips (174,4 exactement), rapporterait environ <b>87 $</b> sur toute la position.<br />En sortant la moitié au premier objectif, 0,02 lot (la plateforme n'accepte que des centièmes de lot), soit 0,20 $ par pip : 174,4 × 0,20 = <b>34,88 $</b>. Les 0,03 lot restants (0,30 $ par pip) sortent à zéro si le prix revient à l'entrée, ou rapportent 243,6 × 0,30 = <b>73,08 $</b> de plus au deuxième objectif.",
        },
        { t: "piege", html: "<b>Prendre les extensions pour des promesses.</b> Le prix peut s'arrêter bien avant le premier objectif, ou aller bien plus loin que le second. Les extensions sont des <b>repères pour votre plan</b>, décidés à l'avance pour ne pas sortir sur un coup de peur ou d'avidité. Elles ne disent pas ce que le prix va faire." },

        { t: "h", texte: "La série en résumé" },
        {
          t: "liste",
          numerotee: true,
          items: [
            "Les pourcentages viennent de la suite de Fibonacci et du <b>nombre d'or</b> : 23,6 %, 38,2 %, 61,8 %, plus le 50 % que tout le monde surveille.",
            "Le <b>retracement</b>, tracé du creux au sommet d'un mouvement clair, donne des zones pour entrer : surtout <b>50 à 61,8 %</b>.",
            "Dans la zone, on attend <b>un signal</b> (une bougie qui la rejette), avec le <b>stop sous la zone</b>.",
            "Une <b>confluence</b> avec un ancien niveau rend la zone plus intéressante.",
            "Les <b>extensions</b> 127,2 % et 161,8 % donnent deux objectifs pour sortir.",
            "Et toujours : un signal, un stop, une taille calculée pour risquer 1 %. Rien n'est garanti.",
          ],
        },
        { t: "nimbo", texte: "Sur la page Analyse, je décris le dernier mouvement d'un actif (par exemple « correction de 40 % de la dernière hausse »). Mais je vous le dis franchement : mesurées sur 40 actifs, les zones de Fibonacci n'ont pas montré d'avantage stable. Elles ne comptent pas dans mon score. Un repère, pas une raison d'acheter.", humeur: "pointe" },
      ],
    },
  ],
  mots: [
    { terme: "Fibonacci", en: "Fibonacci", def: "Le surnom de Léonard de Pise, qui a fait connaître en 1202 la suite où chaque nombre est la somme des deux d'avant." },
    { terme: "Nombre d'or", en: "golden ratio", def: "Environ 1,618 : le rapport vers lequel tend un nombre de la suite divisé par celui d'avant." },
    { terme: "Retracement", en: "retracement", def: "Le retour en arrière du prix après un mouvement, mesuré en pourcentage de ce mouvement." },
    { terme: "Creux", en: "swing low", def: "Le point le plus bas d'où part une montée." },
    { terme: "Sommet", en: "swing high", def: "Le point le plus haut qu'atteint une montée." },
    { terme: "Confluence", en: "confluence", def: "Deux raisons au même endroit : une zone de Fibonacci sur un ancien niveau, par exemple." },
    { terme: "Extension", en: "Fibonacci extension", def: "Le mouvement prolongé au-delà du sommet, à 127,2 % ou 161,8 % de sa hauteur : des objectifs de sortie." },
    { terme: "Point mort", en: "break-even", def: "Le stop remonté au prix d'entrée : si le prix revient, on sort sans gain ni perte." },
    { terme: "Risque / rendement", en: "risk/reward", def: "Ce que l'on risque jusqu'au stop, comparé à ce que l'on vise jusqu'à l'objectif." },
  ],
  retenir: [
    "Chaque nombre de la suite est <b>la somme des deux d'avant</b> ; divisé par celui d'avant, il tend vers <b>1,618</b>, le nombre d'or.",
    "Les niveaux surveillés : <b>23,6 %, 38,2 %, 61,8 %</b>, et le 50 %, qui n'est pas un nombre de Fibonacci.",
    "On trace le retracement <b>du creux au sommet</b> d'un mouvement clair, accroché aux mèches ; la zone la plus surveillée va de <b>50 à 61,8 %</b>.",
    "Dans la zone, on attend <b>un signal</b>, avec le <b>stop sous la zone</b> ; une confluence avec un ancien niveau est un plus.",
    "Les <b>extensions</b> 127,2 % et 161,8 %, mesurées depuis le creux, donnent deux objectifs : sortir la moitié au premier, stop à l'entrée.",
    "Comparez le risque à l'objectif avant d'entrer. Ces niveaux sont <b>des repères, pas des promesses</b>.",
  ],
  quiz: [
    { question: "Quel est le nombre qui suit dans la suite 0, 1, 1, 2, 3, 5, 8, 13 ?", options: ["18", "21", "26"], correct: 1, explanation: "Chaque nombre est la somme des deux d'avant : 8 + 13 = 21." },
    { question: "Le 50 % fait-il partie des nombres de Fibonacci ?", options: ["Oui, c'est le plus important", "Non, mais beaucoup de traders le surveillent", "Oui, c'est 1 ÷ 2 dans la suite"], correct: 1, explanation: "61,8 %, 38,2 % et 23,6 % viennent de la suite. Le 50 % est simplement la moitié du mouvement, ajoutée parce qu'elle est très regardée." },
    { question: "Pour tracer un retracement dans une hausse, où cliquez-vous ?", options: ["Du creux au sommet du mouvement", "Sur deux bougies au hasard", "Du sommet d'aujourd'hui au creux d'il y a un an"], correct: 0, explanation: "On mesure un mouvement clair : du creux, le point le plus bas d'où part la montée, au sommet, le plus haut qu'elle atteint, accroché aux mèches." },
    { question: "Le prix arrive dans la zone 50 à 61,8 %. Que faites-vous ?", options: ["J'achète tout de suite, c'est garanti", "J'attends un signal, comme une bougie à longue mèche basse, et je place le stop sous la zone", "Je retrace depuis un autre creux pour trouver un meilleur niveau"], correct: 1, explanation: "Le prix peut traverser la zone. On attend qu'il la rejette, et on place le stop sous la zone. Changer de creux pour trouver un niveau qui arrange est l'erreur classique." },
    { question: "Mouvement de 1,1000 à 1,1200. Où se trouve l'extension à 127,2 % ?", options: ["1,1127", "1,1254", "1,1324"], correct: 1, explanation: "127,2 % de 200 pips = 254 pips, mesurés depuis le creux : 1,1000 + 0,0254 = 1,1254. Le 1,1324 est l'extension à 161,8 %." },
  ],
  pratique: [
    { texte: "Ouvrez l'analyse d'un actif et lisez la description de son dernier mouvement.", href: "/analysis", bouton: "Ouvrir l'analyse" },
    { texte: "Écrivez dans votre stratégie où vous entrez, où vous placez le stop et où vous sortez.", href: "/strategie", bouton: "Ma stratégie" },
  ],
};

export default lecon;
