import { serie } from "../marche";
import type { LeconSerie } from "../types";
import { AtelierBollinger } from "@/components/cours/outils/AtelierBollinger";
import { GrapheDecision } from "@/components/cours/outils/GrapheDecision";

// L'or, vers 4 000 $ l'once. Calme, puis agité, puis calme.
const humeur = serie([[0, 4000], [10, 4012], [20, 3996], [28, 4006], [31, 4060], [34, 4012], [37, 4078], [40, 4022], [43, 4092], [47, 4040], [52, 4064], [60, 4056], [70, 4062], [80, 4058], [90, 4061]], { graine: 91, bruit: 0.0015 });
// Un range de plus en plus serré, puis la cassure.
const squeezeHaut = serie([[0, 3980], [6, 4035], [12, 3985], [18, 4030], [24, 4000], [30, 4016], [36, 4004], [42, 4012], [48, 4006], [54, 4010], [58, 4008], [61, 4060], [66, 4100], [70, 4092], [76, 4130]], { graine: 92, bruit: 0.0012 });
const squeezeBas = serie([[0, 4040], [6, 3990], [12, 4036], [18, 3996], [24, 4024], [30, 4004], [36, 4016], [42, 4006], [48, 4013], [54, 4008], [58, 4010], [61, 3962], [66, 3926], [70, 3938], [76, 3896]], { graine: 93, bruit: 0.0012 });
const squeezeTrois = serie([[0, 4010], [6, 4060], [12, 4005], [18, 4050], [24, 4020], [30, 4040], [36, 4026], [42, 4036], [48, 4029], [54, 4033], [58, 4031], [60, 4022], [63, 4080], [68, 4115], [72, 4105], [76, 4150]], { graine: 95, bruit: 0.0012 });
// Une forte hausse : le prix longe la bande du haut.
const longe = serie([[0, 3950], [20, 3960], [26, 3972], [32, 3992], [37, 4018], [41, 4045], [45, 4078], [48, 4108], [51, 4142], [54, 4180], [56, 4206], [59, 4196], [64, 4170], [72, 4178]], { graine: 94, bruit: 0.001 });
// Un range : la bande du haut touchée, et le prix revient.
const range = serie([[0, 4005], [8, 4010], [14, 4000], [20, 4008], [26, 4002], [29, 4030, "haut"], [33, 4006], [40, 4000], [46, 4008], [49, 4031, "haut"], [53, 4004], [60, 4000], [66, 4007], [69, 4032, "haut"], [73, 4005], [80, 4002]], { graine: 96, bruit: 0.0008 });

const lecon: LeconSerie = {
  numero: 9,
  accroche: "Ces deux bandes qui suivent le prix, au-dessus et en dessous : que disent-elles ?",
  promesse: "À la fin de cette leçon, vous saurez lire les bandes de Bollinger : ce qu'elles mesurent, ce que veut dire un squeeze, et pourquoi une bande touchée n'est pas un signal.",
  parties: [{
    titre: "",
    blocs: [
      { t: "h", texte: "Trois lignes autour du prix" },
      { t: "p", html: "Les <span class=\"mot\">bandes de Bollinger</span> (Bollinger bands, du nom de John Bollinger, qui les a inventées dans les années 1980) sont trois lignes qui suivent le prix. Elles ne disent pas où le prix va aller. Elles disent <b>où il se trouve par rapport à ses derniers prix</b>, et <b>à quel point il s'agite</b>." },
      {
        t: "scenes",
        titre: "Les trois bandes, une par une",
        scenes: [
          { legende: "Le prix de l'or, en bougies d'une heure, vers 4 000 $ l'once. Pour l'instant, rien d'autre.", cfg: { bougies: humeur, unite: "heure" } },
          { legende: "On ajoute les bandes. Celle du <b>milieu</b>, en pointillé, est une moyenne mobile : la moyenne des <b>20 derniers prix de clôture</b> (leçon 6). Les deux autres l'entourent, à égale distance.", cfg: { bougies: humeur, unite: "heure", bollinger: { n: 20, k: 2 } } },
          { legende: "Elles commencent à la 20<sup>e</sup> bougie : avant, il n'y a pas encore 20 clôtures pour faire la moyenne. Entre les deux bandes extérieures, on trouve <b>la plupart des clôtures</b>.", cfg: { bougies: humeur, unite: "heure", bollinger: { n: 20, k: 2 }, surligne: [19] } },
        ],
      },
      { t: "p", html: "La <span class=\"mot\">bande du milieu</span> (middle band) est donc une moyenne mobile sur 20 bougies, la MA 20. La <span class=\"mot\">bande du haut</span> (upper band) se place à <b>deux écarts-types au-dessus</b> de cette moyenne, la <span class=\"mot\">bande du bas</span> (lower band) à <b>deux écarts-types en dessous</b>. Reste à comprendre ce qu'est un écart-type." },

      { t: "h", texte: "L'écart-type, la mesure de l'agitation" },
      { t: "p", html: "L'<span class=\"mot\">écart-type</span> (standard deviation) mesure <b>de combien les prix s'éloignent, en moyenne, de leur moyenne</b>. Des prix serrés autour de leur moyenne donnent un petit écart-type. Des prix qui partent dans tous les sens en donnent un grand. C'est une mesure de la <span class=\"mot\">volatilité</span> (volatility) : l'agitation du prix." },
      {
        t: "exemple",
        titre: "Un écart-type, à la main",
        html: "Prenons cinq clôtures (la vraie bande en prend 20, le principe est le même) : <b>4 000, 4 010, 3 990, 4 020 et 3 980 $</b>.<br />1. La moyenne : 20 000 ÷ 5 = <b>4 000 $</b>.<br />2. L'écart de chaque prix à la moyenne : 0, +10, −10, +20, −20.<br />3. On met ces écarts au carré (pour que les négatifs comptent aussi) : 0, 100, 100, 400, 400. Leur moyenne : 1 000 ÷ 5 = 200.<br />4. On prend la racine carrée de 200 : environ <b>14,1 $</b>. C'est l'écart-type.<br />Les bandes se placent à deux écarts-types : 4 000 + 28,3 = <b>4 028,3 $</b> en haut, 4 000 − 28,3 = <b>3 971,7 $</b> en bas.<br />Si les mêmes cinq prix s'écartaient deux fois plus (4 000, 4 020, 3 980, 4 040, 3 960), l'écart-type doublerait (28,3 $) et les bandes s'éloigneraient deux fois plus du milieu.",
      },
      { t: "p", html: "Vous n'aurez jamais à faire ce calcul : la plateforme le fait à chaque bougie. Mais il dit l'essentiel : <b>la distance entre les bandes, c'est l'agitation du marché</b>." },

      { t: "h", texte: "Elles s'écartent, elles se resserrent" },
      { t: "p", html: "Le prix s'agite ? L'écart-type grandit, et <b>les bandes s'écartent</b>. Il se calme ? L'écart-type diminue, et <b>les bandes se resserrent</b>. Les bandes respirent avec le marché." },
      {
        t: "scenes",
        titre: "Le marché change d'humeur",
        scenes: [
          { legende: "Un marché calme : le prix fait de petits pas autour de 4 000 $. Les bandes sont proches l'une de l'autre.", cfg: { bougies: humeur, unite: "heure", bollinger: { n: 20, k: 2 }, jusqua: 28 } },
          { legende: "Le prix se met à faire de grands allers-retours, de 60 à 80 $ en quelques heures. Les bandes <b>s'écartent</b> pour les contenir.", cfg: { bougies: humeur, unite: "heure", bollinger: { n: 20, k: 2 }, jusqua: 48, zones: [{ i0: 29, i1: 48, p0: 3990, p1: 4100, couleur: "var(--cap-ocean)", label: "Agitation" }] } },
          { legende: "Le calme revient. Il faut une vingtaine de bougies pour que les grands écarts sortent de la moyenne, puis les bandes <b>se resserrent</b>.", cfg: { bougies: humeur, unite: "heure", bollinger: { n: 20, k: 2 }, zones: [{ i0: 29, i1: 48, p0: 3990, p1: 4100, couleur: "var(--cap-ocean)", label: "Agitation" }] } },
        ],
      },
      {
        t: "outil",
        titre: "L'atelier des bandes",
        consigne: "Changez l'humeur du marché, puis les deux réglages. Regardez la largeur des bandes, et combien de clôtures restent dedans.",
        el: <AtelierBollinger />,
      },
      { t: "p", html: "Les réglages habituels, <b>20 bougies et 2 écarts-types</b>, sont ceux de John Bollinger, et presque toutes les plateformes les proposent par défaut. Avec un seul écart-type, le prix sort tout le temps des bandes ; avec trois, presque jamais. Gardez les réglages habituels : ce sont ceux que tout le monde regarde." },

      { t: "h", texte: "Le squeeze : le calme avant le mouvement" },
      { t: "p", html: "Quand les bandes deviennent <b>très serrées</b>, plus serrées que depuis longtemps, les traders parlent de <span class=\"mot\">squeeze</span> (« l'étau »). Le marché s'est endormi : acheteurs et vendeurs attendent. Ce calme ne dure pas : il est <b>souvent suivi d'un gros mouvement</b>, quand le prix sort de sa petite zone. Cette sortie, c'est la <span class=\"mot\">cassure</span> (breakout, leçon 30)." },
      {
        t: "scenes",
        titre: "L'étau, puis la sortie",
        scenes: [
          { legende: "Le prix va et vient entre 3 980 et 4 035 $, en allers-retours de plus en plus petits.", cfg: { bougies: squeezeHaut, unite: "heure", bollinger: { n: 20, k: 2 }, jusqua: 36 } },
          { legende: "Les bandes se resserrent jusqu'à presque se toucher : c'est le <b>squeeze</b>. Elles n'ont jamais été aussi proches sur ce graphique.", cfg: { bougies: squeezeHaut, unite: "heure", bollinger: { n: 20, k: 2 }, jusqua: 57, zones: [{ i0: 44, i1: 57, p0: 3998, p1: 4020, couleur: "var(--cap-amber-ink)", label: "Squeeze" }] } },
          { legende: "Le prix sort, d'un coup, et les bandes s'ouvrent derrière lui. Ici par le haut. Mais rien, pendant le squeeze, ne l'annonçait.", cfg: { bougies: squeezeHaut, unite: "heure", bollinger: { n: 20, k: 2 }, zones: [{ i0: 44, i1: 57, p0: 3998, p1: 4020, couleur: "var(--cap-amber-ink)", label: "Squeeze" }], marques: [{ i: 61, type: "point", label: "Cassure" }] } },
        ],
      },
      { t: "p", html: "Le squeeze dit <b>qu'un mouvement se prépare</b>. Il ne dit <b>pas dans quel sens</b>. Le prix peut casser par le haut, ou par le bas. Ceux qui achètent pendant le squeeze « parce que ça va exploser » jouent à pile ou face." },
      {
        t: "outil",
        titre: "Par le haut ou par le bas ?",
        consigne: "Trois squeezes. À chaque fois, le graphique s'arrête au plus serré. Dans quel sens va-t-il casser ?",
        el: <GrapheDecision question="D'après les bandes, de quel côté le prix va-t-il sortir ?" cas={[
          {
            titre: "Premier squeeze", cfg: { bougies: squeezeHaut, bollinger: { n: 20, k: 2 }, jusqua: 57 }, choix: ["Par le haut", "Par le bas", "Impossible à dire"], bon: 2,
            explication: "Le prix est sorti par le haut. Mais avant la cassure, rien dans les bandes ne le disait : elles étaient serrées, c'est tout. La seule bonne réponse, c'est <b>« impossible à dire »</b>.",
          },
          {
            titre: "Deuxième squeeze", cfg: { bougies: squeezeBas, bollinger: { n: 20, k: 2 }, jusqua: 57 }, choix: ["Par le haut", "Par le bas", "Impossible à dire"], bon: 2,
            explication: "Cette fois, par le bas. Le dessin était presque le même que le premier : le squeeze annonce un mouvement, <b>jamais son sens</b>.",
          },
          {
            titre: "Troisième squeeze", cfg: { bougies: squeezeTrois, bollinger: { n: 20, k: 2 }, jusqua: 57 }, choix: ["Par le haut", "Par le bas", "Impossible à dire"], bon: 2,
            explication: "Le prix a d'abord glissé vers le bas, puis il est reparti par le haut. Ceux qui ont vendu à la première sortie se sont fait prendre. On attend une <b>clôture nette</b> hors de la zone, et on garde un stop (leçon 30).",
          },
        ]} />,
      },
      {
        t: "qr",
        items: [
          { q: "Alors, à quoi sert le squeeze, s'il ne donne pas le sens ?", r: "À se préparer. Vous savez qu'un mouvement approche : vous repérez le haut et le bas de la petite zone, et vous attendez que le prix en sorte, avec une clôture nette. C'est la cassure qui donne le sens, pas le squeeze." },
          { q: "Combien de temps dure un squeeze ?", r: "Aucune durée fixe : quelques bougies, ou des dizaines. Les bandes peuvent rester serrées longtemps. N'entrez pas « parce que ça a assez duré »." },
          { q: "Est-ce que le mouvement est toujours gros ?", r: "Souvent, pas toujours. Le prix peut sortir un peu, revenir, et se rendormir. Rien n'est garanti, d'où le stop." },
        ],
      },

      { t: "h", texte: "Toucher la bande du haut n'est pas un signal de vente" },
      { t: "p", html: "Le prix touche la bande du haut (band touch) ? Cela veut dire une seule chose : <b>il est haut par rapport à ses 20 derniers prix</b>. Ce n'est pas une promesse de baisse. Dans un marché qui tourne en rond, le prix revient souvent vers le milieu. Dans un marché qui monte fort, il peut rester collé à la bande pendant des dizaines de bougies : il <span class=\"mot\">longe la bande</span> (walking the bands)." },
      {
        t: "graphique",
        cfg: { bougies: range, unite: "heure", bollinger: { n: 20, k: 2 }, marques: [{ i: 29, type: "point", prix: 4030 }, { i: 49, type: "point", prix: 4031 }, { i: 69, type: "point", prix: 4032 }] },
        legende: "Dans un range, le prix touche la bande du haut et redescend vers le milieu. Trois fois, la touche tombe sur le plafond du range, vers 4 030 $ : c'est surtout le plafond qui fait redescendre le prix, pas la bande.",
      },
      {
        t: "scenes",
        titre: "Le prix qui longe la bande",
        scenes: [
          { legende: "L'or démarre une forte hausse. À la 27<sup>e</sup> bougie, il touche la bande du haut. Celui qui vend « parce que la bande est touchée » parie contre la hausse.", cfg: { bougies: longe, unite: "heure", bollinger: { n: 20, k: 2 }, jusqua: 26, surligne: [26] } },
          { legende: "Le prix continue, collé à la bande, bougie après bougie. Elle monte avec lui : il la touche encore et encore.", cfg: { bougies: longe, unite: "heure", bollinger: { n: 20, k: 2 }, jusqua: 47, surligne: [26] } },
          { legende: "Le vendeur trop pressé a vendu vers 3 975 $, et le prix est monté jusqu'à 4 200 $. Une bande touchée dans une forte tendance, c'est surtout <b>le signe que la tendance est forte</b>.", cfg: { bougies: longe, unite: "heure", bollinger: { n: 20, k: 2 }, surligne: [26], marques: [{ i: 26, type: "vente", label: "Vente trop pressée" }] } },
        ],
      },
      {
        t: "tableau",
        entetes: ["Ce que vous voyez", "Ce que ça veut dire", "Ce que ça ne veut pas dire"],
        lignes: [
          ["Bandes écartées", "Le prix s'agite beaucoup", "Que la hausse ou la baisse va continuer"],
          ["Bandes très serrées (squeeze)", "Le marché est calme, un mouvement se prépare souvent", "Dans quel sens il partira"],
          ["Le prix touche la bande du haut", "Il est haut par rapport à ses 20 derniers prix", "Qu'il va baisser"],
          ["Le prix longe la bande du haut", "La hausse est forte", "Qu'elle va bientôt s'arrêter"],
          ["Le prix revient au milieu", "Il retrouve sa moyenne des 20 dernières bougies", "Que la tendance est finie"],
        ],
        legende: "Les bandes décrivent le prix. Pour décider, il faut un niveau, une tendance, une clôture (leçons 30 à 35).",
      },
      { t: "piege", html: "<b>Vendre à chaque bande du haut, acheter à chaque bande du bas.</b> Cela semble marcher dans un range, et cela coûte très cher le jour où une tendance démarre : le prix longe la bande, et vous vendez encore et encore contre lui. Les bandes ne sont pas des murs. Si vous jouez un retour vers le milieu, faites-le sur un vrai niveau, avec un stop de l'autre côté." },
      { t: "nimbo", texte: "Sur la page Analyse, la fiche de chaque actif donne ses bandes de Bollinger et sa volatilité, comparée à son passé. Quand elle est très basse, c'est le moment de surveiller la cassure, pas de deviner son sens.", humeur: "pointe" },
    ],
  }],
  mots: [
    { terme: "Bandes de Bollinger", en: "Bollinger bands", def: "Trois lignes autour du prix : une moyenne mobile et deux bandes à deux écarts-types au-dessus et en dessous." },
    { terme: "Bande du milieu", en: "middle band (MA 20)", def: "La moyenne des 20 derniers prix de clôture." },
    { terme: "Bandes du haut et du bas", en: "upper band, lower band", def: "Les deux lignes placées à deux écarts-types au-dessus et en dessous de la moyenne." },
    { terme: "Écart-type", en: "standard deviation", def: "De combien les prix s'éloignent, en moyenne, de leur moyenne : la mesure de leur agitation." },
    { terme: "Volatilité", en: "volatility", def: "L'agitation du prix : plus il fait de grands mouvements, plus elle est forte." },
    { terme: "Squeeze", en: "squeeze", def: "Des bandes très serrées : le marché est calme, et un gros mouvement se prépare souvent, sans sens annoncé." },
    { terme: "Cassure", en: "breakout", def: "La sortie du prix hors de la zone qu'il respectait." },
    { terme: "Toucher, longer la bande", en: "band touch, walking the bands", def: "Le prix qui atteint une bande, ou qui reste collé à elle pendant une forte tendance." },
  ],
  retenir: [
    "La bande du milieu est la <b>moyenne des 20 dernières clôtures</b> ; les deux autres sont à <b>deux écarts-types</b> au-dessus et en dessous.",
    "L'écart-type mesure <b>l'agitation du prix</b>, la volatilité : la distance entre les bandes la montre.",
    "Le prix s'agite, <b>les bandes s'écartent</b> ; il se calme, <b>elles se resserrent</b>.",
    "Très serrées, c'est le <b>squeeze</b> : souvent le calme avant un gros mouvement, <b>sans dire dans quel sens</b>.",
    "Toucher la bande du haut, c'est être <b>haut par rapport aux derniers prix</b>, pas un signal de vente.",
    "En forte tendance, le prix peut <b>longer la bande</b> longtemps.",
  ],
  quiz: [
    { question: "Que représente la bande du milieu ?", options: ["Le prix le plus haut des 20 dernières bougies", "La moyenne des 20 derniers prix de clôture", "Le prix d'ouverture du jour"], correct: 1, explanation: "C'est une moyenne mobile sur 20 bougies : la MA 20. Les deux autres bandes se placent autour d'elle." },
    { question: "Les bandes s'écartent fortement. Que se passe-t-il ?", options: ["Le prix s'agite : la volatilité augmente", "Le prix va forcément monter", "Le marché est fermé"], correct: 0, explanation: "Les bandes sont à deux écarts-types de la moyenne. Si les prix s'éloignent de leur moyenne, l'écart-type grandit et les bandes s'écartent. Elles ne donnent pas de sens." },
    { question: "Les bandes sont plus serrées que jamais. Que pouvez-vous en dire ?", options: ["Le prix va casser par le haut", "Un mouvement se prépare souvent, sans sens annoncé", "Il ne se passera plus rien"], correct: 1, explanation: "C'est le squeeze : souvent le calme avant un gros mouvement. Mais il ne dit pas dans quel sens : on attend la cassure, avec une clôture nette." },
    { question: "En pleine hausse, le prix touche la bande du haut. Faut-il vendre ?", options: ["Oui, c'est un signal de vente", "Non : il est haut par rapport à ses derniers prix, et il peut longer la bande", "Oui, mais seulement le lundi"], correct: 1, explanation: "Une bande touchée n'est pas un signal. En forte tendance, le prix peut rester collé à la bande longtemps : vendre là, c'est parier contre la hausse." },
    { question: "Pourquoi les bandes ne commencent-elles qu'à la 20e bougie ?", options: ["Parce qu'il faut 20 clôtures pour calculer la moyenne et l'écart-type", "Parce que la plateforme est lente", "Parce que les 19 premières bougies sont fausses"], correct: 0, explanation: "La bande du milieu est la moyenne des 20 dernières clôtures. Avant la 20e bougie, il n'y en a pas encore assez." },
  ],
  pratique: [
    { texte: "Ouvrez l'analyse de l'or et cherchez une période où le prix s'est endormi, puis réveillé.", href: "/analysis", bouton: "Ouvrir l'analyse" },
    { texte: "Retrouvez squeeze, volatilité et écart-type dans le glossaire.", href: "/learn/glossaire", bouton: "Voir le glossaire" },
  ],
};

export default lecon;
