import { serie } from "../marche";
import type { LeconSerie } from "../types";
import { MacdCouches } from "@/components/cours/outils/MacdCouches";

// L'or, en bougies d'un jour : une hésitation, une hausse, puis une baisse.
const cours = serie([[0, 4000], [25, 4010], [35, 3975], [45, 3990], [75, 4180], [85, 4170], [100, 4060], [125, 3920], [139, 3950]], { graine: 83, bruit: 0.005 });
// Un marché sans tendance, entre 3 960 et 4 045 $.
const plat = serie([[0, 4000], [12, 4040], [24, 3965], [36, 4035], [48, 3960], [60, 4045], [72, 3970], [84, 4030], [96, 3960], [108, 4040], [119, 4000]], { graine: 84, bruit: 0.005 });

const EMA12 = { n: 12, type: "ema" as const, couleur: "var(--cap-ocean)", label: "EMA 12" };
const EMA26 = { n: 26, type: "ema" as const, couleur: "var(--cap-ink-3)", label: "EMA 26" };

const lecon: LeconSerie = {
  numero: 8,
  accroche: "Ces deux lignes et ces barres sous le graphique, c'est le MACD. Savez-vous ce qu'elles racontent ?",
  promesse: "À la fin de cette leçon, vous saurez d'où vient le MACD, lire sa ligne, sa ligne de signal et son histogramme, reconnaître ses croisements, et pourquoi il faut toujours confirmer avec le prix.",
  parties: [{
    titre: "",
    blocs: [
      { t: "h", texte: "Deux moyennes, une rapide et une lente" },
      { t: "p", html: "Le <span class=\"mot\">MACD</span> (<em>Moving Average Convergence Divergence</em>, la convergence et la divergence des moyennes mobiles) a été créé par Gerald Appel à la fin des années 1970. Il part de <b>deux moyennes mobiles</b> (leçon 6) : une <b>rapide</b>, sur 12 bougies, et une <b>lente</b>, sur 26." },
      { t: "p", html: "Ce sont des moyennes <b>exponentielles</b>, notées <span class=\"mot\">EMA 12</span> et <span class=\"mot\">EMA 26</span> (<em>exponential moving average</em>) : elles donnent plus de poids aux dernières clôtures, et réagissent donc un peu plus vite qu'une moyenne simple." },
      {
        t: "scenes",
        titre: "Le prix, puis ses deux moyennes",
        scenes: [
          { legende: "140 jours d'or : une hésitation autour de 4 000 $, une hausse jusqu'à 4 190 $, puis une baisse.", cfg: { bougies: cours, unite: "jour" } },
          { legende: "On ajoute l'<b>EMA 12</b>, la rapide (bleue) : elle colle au prix.", cfg: { bougies: cours, moyennes: [EMA12], unite: "jour" } },
          { legende: "Puis l'<b>EMA 26</b>, la lente (grise) : elle suit avec plus de retard. Tout le MACD vient de l'écart entre ces deux lignes.", cfg: { bougies: cours, moyennes: [EMA12, EMA26], unite: "jour" } },
        ],
      },
      { t: "h", texte: "La ligne MACD : leur écart" },
      { t: "p", html: "La <span class=\"mot\">ligne MACD</span> (<em>MACD line</em>), c'est simplement <b>l'EMA 12 moins l'EMA 26</b>. On la trace dans un panneau sous le graphique, autour d'une ligne horizontale : la <span class=\"mot\">ligne zéro</span> (<em>zero line</em>)." },
      {
        t: "liste",
        items: [
          "<b>Au-dessus de zéro</b> : la rapide est au-dessus de la lente. Les derniers prix sont plus hauts : plutôt haussier.",
          "<b>En dessous de zéro</b> : la rapide est sous la lente : plutôt baissier.",
          "<b>Plus elle s'éloigne de zéro</b>, plus l'écart entre les deux moyennes est grand : le mouvement est rapide.",
        ],
      },
      {
        t: "exemple",
        html: "Au jour 59, l'EMA 12 vaut <b>4 040,1 $</b> et l'EMA 26 <b>4 022,6 $</b>. La ligne MACD vaut 4 040,1 − 4 022,6 = <b>17,5</b>. C'est positif : la rapide est au-dessus de la lente, plutôt haussier. Sur l'or, le MACD se lit en dollars ; sur l'euro-dollar, il serait minuscule (0,0012, par exemple). C'est le signe et la forme qui comptent, pas le chiffre.",
      },
      { t: "h", texte: "La ligne de signal" },
      { t: "p", html: "On ajoute une deuxième ligne : la <span class=\"mot\">ligne de signal</span> (<em>signal line</em>). C'est <b>une moyenne du MACD lui-même</b>, sur 9 bougies : elle est plus lente que lui, et le suit. D'où les trois nombres que l'on voit partout : MACD (12, 26, 9)." },
      { t: "h", texte: "Les croisements" },
      { t: "p", html: "Quand le MACD <b>passe au-dessus de sa ligne de signal</b>, c'est un <span class=\"mot\">croisement</span> (<em>crossover</em>) haussier : l'écart entre les moyennes se remet à grandir vers le haut. Quand il <b>passe en dessous</b>, c'est un croisement baissier." },
      {
        t: "outil",
        titre: "Le MACD, couche par couche",
        consigne: "Ajoutez les couches une à une, de 1 à 5. Déplacez le curseur (ou glissez le doigt sur le graphique) : les chiffres de la bougie se calculent sous vos yeux.",
        el: <MacdCouches bougies={cours} depart={58} />,
      },
      {
        t: "scenes",
        titre: "Les signaux, au fil du temps",
        scenes: [
          { legende: "Jour 43 : le MACD passe au-dessus de son signal. <b>Signal haussier</b>. Le prix a fait son creux 6 jours plus tôt, vers 3 972 $.", cfg: { bougies: cours, panneaux: ["macd"], moyennes: [EMA12, EMA26], jusqua: 42, marques: [{ i: 42, type: "achat", label: "Haussier" }], unite: "jour" } },
          { legende: "Jour 49 : le MACD passe au-dessus de zéro. L'EMA 12 a dépassé l'EMA 26 : la hausse se confirme.", cfg: { bougies: cours, panneaux: ["macd"], moyennes: [EMA12, EMA26], jusqua: 48, marques: [{ i: 42, type: "achat", label: "Haussier" }], unite: "jour" } },
          { legende: "Jour 81 : il repasse sous son signal. <b>Signal baissier</b>, deux jours après le sommet à 4 193 $.", cfg: { bougies: cours, panneaux: ["macd"], moyennes: [EMA12, EMA26], jusqua: 80, marques: [{ i: 42, type: "achat", label: "Haussier" }, { i: 80, type: "vente", label: "Baissier" }], unite: "jour" } },
          { legende: "Jour 94 : il passe sous zéro, la baisse se confirme. Puis un nouveau croisement haussier, au jour 128, quand la baisse ralentit.", cfg: { bougies: cours, panneaux: ["macd"], moyennes: [EMA12, EMA26], marques: [{ i: 42, type: "achat", label: "Haussier" }, { i: 80, type: "vente", label: "Baissier" }, { i: 127, type: "achat" }], unite: "jour" } },
        ],
      },
      { t: "h", texte: "L'histogramme : la force du mouvement" },
      { t: "p", html: "Les barres, c'est l'<span class=\"mot\">histogramme</span> (<em>histogram</em>) : <b>l'écart entre le MACD et sa ligne de signal</b>. Barres vertes au-dessus de zéro quand le MACD est au-dessus du signal, rouges en dessous. Quand les barres <b>grandissent</b>, le mouvement prend de la force ; quand elles <b>rapetissent</b>, il en perd. Cette force, les traders l'appellent le <span class=\"mot\">momentum</span>." },
      {
        t: "exemple",
        titre: "Des barres qui rapetissent",
        html: "Au jour 59, l'histogramme vaut 17,5 − 11,6 = <b>5,9</b>. Il a culminé au jour 57, à 6,6, avec l'or vers 4 060 $. Ensuite, l'or a continué de monter, jusqu'à 4 193 $ au jour 79… mais les barres rapetissaient : 5,0 au jour 71, 1,7 au jour 79. La hausse continuait, avec de moins en moins de force. Au jour 81, la barre passe sous zéro : c'est le croisement baissier.",
      },
      { t: "h", texte: "Toujours en retard" },
      { t: "p", html: "Le MACD est fait de moyennes, et une moyenne est faite de prix passés : c'est un <span class=\"mot\">indicateur retardé</span> (<em>lagging indicator</em>). Ses signaux arrivent <b>après</b> le creux ou le sommet. Dans une belle tendance, ce retard coûte une partie du mouvement. Sans tendance, il coûte plus cher : les croisements se suivent." },
      {
        t: "graphique",
        cfg: { bougies: plat, panneaux: ["macd"], unite: "jour" },
        legende: "120 jours sans tendance, entre 3 960 et 4 045 $ : le MACD croise son signal 7 fois. Chaque signal arrive quand le prix est déjà sur le point de repartir dans l'autre sens.",
      },
      { t: "piege", html: "<b>Entrer à chaque croisement.</b> Sans tendance, vous achetez près du haut et vendez près du bas, encore et encore. Un croisement est un signal, pas une garantie : <b>rien n'est garanti</b>. Regardez d'abord si le prix a une tendance (des sommets et des creux qui montent, leçon 28), confirmez avec le prix, et posez un stop (leçon 7)." },
      {
        t: "qr",
        items: [
          { q: "Le MACD et le RSI, c'est pareil ?", r: "Non. Le RSI compare les hausses aux baisses et reste entre 0 et 100 (leçon 4). Le MACD mesure l'écart entre deux moyennes, sans limite. Les deux parlent de force, chacun à sa façon." },
          { q: "Le MACD fait aussi des divergences ?", r: "Oui, comme le RSI : un sommet du prix plus haut, un sommet du MACD plus bas. La même règle s'applique : un avertissement, à confirmer sur le prix." },
          { q: "Faut-il changer les réglages 12, 26, 9 ?", r: "Non, pour commencer. Ce sont ceux que tout le monde regarde, sur toutes les plateformes. Un réglage personnel ne rend pas le signal plus juste." },
        ],
      },
      { t: "nimbo", texte: "Sur la page Analyse, la rubrique « Les indicateurs » donne l'histogramme du MACD de chaque actif : positif, la dynamique courte dépasse la longue. Comparez-le à ce que fait le prix.", humeur: "pointe" },
    ],
  }],
  mots: [
    { terme: "MACD", en: "Moving Average Convergence Divergence", def: "Un indicateur fait de deux moyennes mobiles, de leur écart et d'une moyenne de cet écart." },
    { terme: "EMA 12, EMA 26", en: "EMA 12 / EMA 26", def: "Les deux moyennes exponentielles du MACD : la rapide, sur 12 bougies, et la lente, sur 26." },
    { terme: "Ligne MACD", en: "MACD line", def: "L'EMA 12 moins l'EMA 26." },
    { terme: "Ligne zéro", en: "zero line", def: "Au-dessus, la rapide est au-dessus de la lente : plutôt haussier. En dessous : plutôt baissier." },
    { terme: "Ligne de signal", en: "signal line", def: "La moyenne du MACD sur 9 bougies : plus lente que lui." },
    { terme: "Croisement", en: "crossover", def: "Le MACD qui passe au-dessus (haussier) ou en dessous (baissier) de sa ligne de signal." },
    { terme: "Histogramme", en: "histogram", def: "Les barres : l'écart entre le MACD et sa ligne de signal." },
    { terme: "Force du mouvement", en: "momentum", def: "La vitesse du prix : des barres qui grandissent, un mouvement qui accélère." },
    { terme: "Indicateur retardé", en: "lagging indicator", def: "Fait de prix passés, il confirme un mouvement après coup." },
  ],
  retenir: [
    "Le MACD part de <b>deux moyennes</b> : une rapide (EMA 12) et une lente (EMA 26).",
    "La <b>ligne MACD</b> est leur écart : au-dessus de <b>zéro</b>, plutôt haussier ; en dessous, plutôt baissier.",
    "La <b>ligne de signal</b> est une moyenne du MACD, plus lente.",
    "MACD au-dessus de son signal : <b>signal haussier</b> ; en dessous : <b>signal baissier</b>.",
    "L'<b>histogramme</b> mesure la force : des barres qui grandissent, un mouvement qui accélère.",
    "Il réagit <b>en retard</b> : confirmez toujours avec le prix.",
  ],
  quiz: [
    { question: "L'EMA 12 vaut 4 050 $ et l'EMA 26 vaut 4 030 $. Que vaut la ligne MACD ?", options: ["20", "−20", "4 040"], correct: 0, explanation: "La ligne MACD est la rapide moins la lente : 4 050 − 4 030 = 20. Positive : plutôt haussier." },
    { question: "La ligne MACD est sous zéro. Qu'est-ce que ça veut dire ?", options: ["La moyenne rapide est sous la lente : plutôt baissier", "Le prix est négatif", "Il faut acheter"], correct: 0, explanation: "Sous zéro, l'EMA 12 est plus basse que l'EMA 26 : les derniers prix sont plus bas, plutôt baissier." },
    { question: "Qu'est-ce que la ligne de signal ?", options: ["Le prix de clôture", "Une moyenne du MACD, plus lente que lui", "La ligne zéro"], correct: 1, explanation: "C'est la moyenne du MACD sur 9 bougies. Le MACD qui la croise donne les signaux." },
    { question: "Le prix monte encore, mais les barres de l'histogramme rapetissent. Que lisez-vous ?", options: ["La hausse accélère", "La hausse perd de la force", "Rien du tout"], correct: 1, explanation: "Des barres plus petites : le MACD se rapproche de son signal, le mouvement ralentit. Un avertissement, pas un ordre." },
    { question: "Pourquoi le MACD donne-t-il beaucoup de faux signaux sans tendance ?", options: ["Parce qu'il est fait de moyennes, en retard sur le prix", "Parce qu'il est mal réglé", "Parce que les courtiers le faussent"], correct: 0, explanation: "Ses croisements arrivent après les mouvements. Sans tendance, le prix repart dans l'autre sens juste après chaque signal." },
  ],
  pratique: [
    { texte: "Sur la page Analyse, regardez l'histogramme du MACD d'un actif, puis le graphique : la tendance est-elle là ?", href: "/analysis", bouton: "Ouvrir l'analyse" },
  ],
};

export default lecon;
