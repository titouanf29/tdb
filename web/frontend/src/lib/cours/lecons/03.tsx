import { serie, type Bougie } from "../marche";
import type { LeconSerie } from "../types";
import { AtelierBougie } from "@/components/cours/outils/AtelierBougie";
import { BougieMinuteParMinute } from "@/components/cours/outils/BougieMinuteParMinute";
import { TrouveBougies } from "@/components/cours/outils/TrouveBougies";

/** Remplace une bougie par celle que la leçon veut montrer, et raccorde la suivante. */
function poser(b: Bougie[], i: number, [o, h, l, c]: [number, number, number, number]) {
  b[i] = { ...b[i], o, h, l, c };
  const s = b[i + 1];
  if (s) { s.o = c; s.h = Math.max(s.h, s.o, s.c); s.l = Math.min(s.l, s.o, s.c); }
  return b;
}

// Quelques bougies d'une heure sur l'or, assez grandes pour être lues.
const quatre = poser(serie([[0, 3978], [4, 3990], [7, 3984], [11, 3998], [13, 4000]], { graine: 31, bruit: 0.0016, meche: 1.2 }), 8, [3986, 4012, 3979, 4004]);
// Le rejet par le haut, sous une résistance.
const rejetHaut = poser(serie([[0, 3960], [8, 4030], [12, 4010], [20, 4045], [22, 4034], [30, 3992], [34, 3985]], { graine: 32, bruit: 0.0014 }), 22, [4036, 4066, 4031, 4034]);
// Le rejet par le bas, sur un support.
const rejetBas = poser(serie([[0, 4060], [8, 3990], [12, 4010], [20, 3970], [22, 3968], [30, 4012], [34, 4020]], { graine: 33, bruit: 0.0014 }), 22, [3966, 3970, 3934, 3968]);
// Le marteau après une baisse, puis la confirmation.
const marteau = poser(poser(serie([[0, 4080], [10, 4030], [14, 4040], [24, 3975], [26, 3978], [27, 3992], [34, 4030], [38, 4035]], { graine: 34, bruit: 0.0013 }), 25, [3972, 3980, 3945, 3978]), 26, [3978, 3995, 3975, 3992]);
// L'avalement haussier.
const avalement = poser(poser(serie([[0, 4070], [10, 4020], [14, 4032], [22, 3982], [24, 3980], [25, 3996], [32, 4030], [36, 4038]], { graine: 35, bruit: 0.0013 }), 23, [3991, 3993, 3976, 3978]), 24, [3976, 3999, 3973, 3997]);
// Le doji au sommet d'une hausse.
const doji = poser(serie([[0, 3960], [10, 4010], [14, 3998], [22, 4038], [24, 4040], [32, 4000], [36, 3990]], { graine: 36, bruit: 0.0013 }), 23, [4039, 4052, 4027, 4039.5]);
// Le marteau qui ne tient pas.
const rate = poser(serie([[0, 4080], [10, 4030], [14, 4040], [24, 3975], [26, 3968], [32, 3930], [38, 3910]], { graine: 37, bruit: 0.0013 }), 25, [3972, 3980, 3945, 3978]);
// L'exercice : un marteau, un doji, un avalement, dans le même graphique.
const exo = (() => {
  const b = serie([[0, 4060], [8, 3982], [9, 3990], [16, 4044], [18, 4048], [19, 4046], [25, 4004], [27, 4012], [33, 4050], [35, 4056]], { graine: 38, bruit: 0.0011 });
  poser(b, 8, [3982, 3991, 3958, 3989]);
  poser(b, 18, [4047, 4059, 4036, 4047.4]);
  poser(b, 24, [4014, 4016, 4001, 4003]);
  poser(b, 25, [4002, 4019, 3999, 4017]);
  return b;
})();

const lecon: LeconSerie = {
  numero: 3,
  accroche: "Une seule bougie peut vous dire qui a gagné : les acheteurs ou les vendeurs.",
  promesse: "À la fin de cette leçon, vous saurez lire les quatre prix d'une bougie, ce que racontent son corps et ses mèches, et reconnaître le marteau, l'avalement et le doji, sans les prendre pour des garanties.",
  parties: [{
    titre: "",
    blocs: [
      { t: "h", texte: "Quatre prix dans une bougie" },
      { t: "p", html: "Une <span class=\"mot\">bougie</span> (en anglais, <em>candlestick</em>) résume ce qui s'est passé pendant une période : une minute, une heure, un jour. Elle tient en <b>quatre prix</b>, que les traders désignent par leurs initiales anglaises, <span class=\"mot\">OHLC</span> :" },
      {
        t: "liste", items: [
          "<b>L'ouverture</b> (<em>open</em>) : le premier prix de la période.",
          "<b>Le plus haut</b> (<em>high</em>) : le prix le plus élevé atteint pendant la période.",
          "<b>Le plus bas</b> (<em>low</em>) : le prix le plus bas atteint.",
          "<b>La clôture</b> (<em>close</em>) : le dernier prix, celui où la période se termine.",
        ],
      },
      {
        t: "graphique",
        cfg: { bougies: quatre, surligne: [8], unite: "heure", hauteur: 260 },
        legende: "Des bougies d'une heure sur l'or (prix d'exemple). Survolez ou touchez une bougie : ses quatre prix s'affichent. Celle qui est encadrée a ouvert à 3 986 $ et clôturé à 4 004 $.",
      },
      { t: "h", texte: "Le corps et les mèches" },
      { t: "p", html: "Entre l'ouverture et la clôture, c'est le <span class=\"mot\">corps</span> (<em>body</em>), le rectangle épais. Au-dessus et en dessous, les traits fins sont les <span class=\"mot\">mèches</span> (<em>wicks</em>, ou <em>shadows</em>) : elles montrent <b>jusqu'où le prix est allé</b> pendant la période, avant d'en revenir." },
      { t: "p", html: "La couleur du corps dit qui a gagné. <b style=\"color:var(--cap-up)\">Vert</b> : la clôture est au-dessus de l'ouverture, le prix a monté, <b>les acheteurs ont gagné</b> la période. <b style=\"color:var(--cap-down)\">Rouge</b> : la clôture est en dessous, <b>les vendeurs l'ont emporté</b>. Sur une bougie verte, l'ouverture est en bas du corps ; sur une rouge, elle est en haut." },
      {
        t: "exemple",
        html: "Une bougie d'une heure sur l'or : ouverture <b>4 000 $</b>, plus haut <b>4 019 $</b>, plus bas <b>3 982 $</b>, clôture <b>4 010 $</b>. Elle est verte (4 010 est au-dessus de 4 000). Son corps mesure 4 010 − 4 000 = <b>10 $</b>. Sa mèche haute, 4 019 − 4 010 = <b>9 $</b>. Sa mèche basse, 4 000 − 3 982 = <b>18 $</b>. En une heure, le prix a parcouru 4 019 − 3 982 = <b>37 $</b> de haut en bas, mais n'a gagné que 10 $. La bougie le dit d'un coup d'œil : les deux camps ont attaqué, et les acheteurs ont fini devant, de peu.",
      },
      { t: "h", texte: "Une bougie qui se forme, minute par minute" },
      { t: "p", html: "Une bougie n'apparaît pas d'un coup : elle se construit pendant toute sa période. Tant que l'heure n'est pas finie, sa couleur, son corps et ses mèches peuvent encore changer. À la clôture, elle <b>se fige</b> : c'est seulement là qu'elle dit vraiment quelque chose." },
      {
        t: "outil",
        titre: "Regardez une bougie d'une heure se former",
        consigne: "Lancez la lecture, ou faites glisser le temps. À gauche, le prix minute par minute ; à droite, la bougie qui suit.",
        el: <BougieMinuteParMinute />,
      },
      { t: "p", html: "Retenez ce que montre l'outil : le plus haut et le plus bas <b>ne reviennent jamais en arrière</b>. Une fois le prix allé à 4 019 $, la mèche haute existe, même si le prix redescend. C'est pour ça que les mèches sont précieuses : elles gardent la trace des attaques qui ont échoué." },
      { t: "h", texte: "Ce que dit une grande mèche : le rejet" },
      { t: "p", html: "Une longue mèche en haut veut dire que le prix est monté, mais que <b>les vendeurs l'ont repoussé</b> avant la clôture. C'est un <span class=\"mot\">rejet</span> (<em>rejection</em>). Une longue mèche en bas, c'est l'inverse : le prix a plongé, et <b>les acheteurs l'ont repoussé</b>. Le rejet compte surtout quand il se produit sur un niveau important, un support ou une résistance (leçon 33)." },
      {
        t: "scenes",
        titre: "Deux rejets, deux camps",
        scenes: [
          { legende: "Le prix monte vers une résistance, autour de 4 045 $.", cfg: { bougies: rejetHaut, jusqua: 21, niveaux: [{ prix: 4045, zone: 8, label: "Résistance", couleur: "var(--cap-down)" }] } },
          { legende: "Une bougie perce jusqu'à 4 066 $… et clôture à 4 034 $. Sa longue mèche haute : les vendeurs ont repoussé l'attaque.", cfg: { bougies: rejetHaut, jusqua: 22, surligne: [22], niveaux: [{ prix: 4045, zone: 8, label: "Résistance", couleur: "var(--cap-down)" }] } },
          { legende: "La suite : le prix redescend. Ici le rejet a annoncé la baisse ; ce n'est pas toujours le cas.", cfg: { bougies: rejetHaut, surligne: [22], niveaux: [{ prix: 4045, zone: 8, label: "Résistance", couleur: "var(--cap-down)" }] } },
          { legende: "L'inverse sur un support : une mèche basse jusqu'à 3 934 $, une clôture à 3 968 $. Les acheteurs ont repoussé la baisse, et le prix remonte.", cfg: { bougies: rejetBas, surligne: [22], niveaux: [{ prix: 3968, zone: 8, label: "Support", couleur: "var(--cap-up)" }] } },
        ],
      },
      { t: "h", texte: "Trois bougies à connaître" },
      { t: "p", html: "Il existe des dizaines de noms de bougies. Trois suffisent pour commencer, parce qu'elles racontent clairement un changement de rapport de force." },
      { t: "p", html: "<b>Le <span class=\"mot\">marteau</span></b> (<em>hammer</em>) : après une baisse, un petit corps en haut et une longue mèche en bas, au moins deux fois le corps. Les vendeurs ont poussé le prix très bas, puis les acheteurs sont revenus et l'ont ramené près du haut. Les acheteurs reviennent." },
      {
        t: "scenes",
        titre: "Le marteau",
        scenes: [
          { legende: "Le prix baisse depuis des heures.", cfg: { bougies: marteau, jusqua: 24 } },
          { legende: "Un marteau : ouverture 3 972 $, plongée à 3 945 $, clôture à 3 978 $. Une mèche basse de 27 $ pour un corps de 6 $.", cfg: { bougies: marteau, jusqua: 25, surligne: [25] } },
          { legende: "La bougie suivante clôture au-dessus du plus haut du marteau (3 980 $) : c'est la <b>confirmation</b>. Les acheteurs ont vraiment repris la main.", cfg: { bougies: marteau, jusqua: 26, surligne: [25], marques: [{ i: 26, type: "achat", label: "Confirmation" }] } },
          { legende: "La suite : la baisse s'est arrêtée là. Cette fois.", cfg: { bougies: marteau, surligne: [25], marques: [{ i: 26, type: "achat", label: "Confirmation" }] } },
        ],
      },
      { t: "p", html: "<b>L'<span class=\"mot\">avalement</span></b> (<em>engulfing</em>) : une grande bougie verte dont le corps <b>avale tout le corps</b> de la bougie rouge d'avant. Elle ouvre plus bas que la clôture rouge et clôture plus haut que son ouverture. Les acheteurs ont non seulement arrêté la baisse, mais ils ont effacé toute la période précédente. Il existe aussi un avalement baissier, l'inverse, après une hausse." },
      {
        t: "graphique",
        cfg: { bougies: avalement, surligne: [23, 24], notes: [{ i: 24, prix: 3968, texte: "l'avalement", dessous: true }] },
        legende: "La bougie rouge va de 3 991 $ à 3 978 $ ; la verte qui suit va de 3 976 $ à 3 997 $ : son corps couvre entièrement le rouge. Le prix repart.",
      },
      { t: "p", html: "<b>Le <span class=\"mot\">doji</span></b> : l'ouverture et la clôture sont presque égales. Le corps n'est qu'un trait, avec des mèches de chaque côté. Ni les acheteurs ni les vendeurs n'ont gagné : <b>le marché hésite</b>. Après une longue hausse, cette hésitation peut annoncer une pause ou un retournement ; au milieu d'un range, elle ne dit presque rien." },
      {
        t: "graphique",
        cfg: { bougies: doji, surligne: [23], notes: [{ i: 23, prix: 4027, texte: "doji", dessous: true }] },
        legende: "Au sommet d'une hausse, un doji : ouverture 4 039 $, clôture 4 039,50 $. Les acheteurs n'ont plus réussi à pousser. La suite baisse, mais le doji seul ne l'annonçait pas avec certitude.",
      },
      {
        t: "outil",
        titre: "L'atelier de bougie",
        consigne: "Réglez les quatre prix, ou partez d'un modèle. L'outil garde les prix cohérents (le plus haut reste au-dessus de tout), nomme la bougie et dit ce qu'elle raconte. Changez aussi ce qui s'est passé avant : le nom peut changer.",
        el: <AtelierBougie />,
      },
      {
        t: "outil",
        titre: "Retrouvez-les sur un graphique",
        consigne: "Trois bougies se cachent dans ce graphique d'une heure. Touchez celle qui est demandée, puis vérifiez.",
        el: <TrouveBougies bougies={exo} cibles={[
          { nom: "Marteau", i: 8, signal: "achat", expliquer: "Après la baisse, un petit corps en haut (3 982 à 3 989 $) et une mèche basse jusqu'à 3 958 $ : un marteau. La hausse a suivi." },
          { nom: "Doji", i: 18, signal: "point", expliquer: "Au sommet, ouverture 4 047 $ et clôture 4 047,40 $ : un corps réduit à un trait. Le marché hésitait, et la baisse a suivi." },
          { nom: "Avalement", i: 25, signal: "achat", expliquer: "La rouge va de 4 014 $ à 4 003 $ ; la verte, de 4 002 $ à 4 017 $, avale tout son corps. Les acheteurs ont repris la main." },
        ]} />,
      },
      { t: "h", texte: "Des signaux, pas des garanties" },
      { t: "p", html: "Une bougie décrit une période qui vient de finir. Elle dit qui a gagné, pas ce qui va suivre. Les trois bougies de cette leçon sont des <b>signaux</b> : elles invitent à regarder de plus près, jamais à acheter les yeux fermés. Trois habitudes les rendent plus utiles :" },
      {
        t: "liste", items: [
          "<b>Attendez la clôture.</b> Une bougie en train de se former peut encore tout changer, vous l'avez vu dans l'outil.",
          "<b>Attendez la confirmation</b> : la bougie suivante qui va dans le sens du signal (pour un marteau, une clôture au-dessus de son plus haut).",
          "<b>Regardez où elle apparaît.</b> Un marteau sur un support solide, dans une tendance haussière, vaut beaucoup plus qu'un marteau au milieu de nulle part.",
        ],
      },
      {
        t: "scenes",
        titre: "Le marteau qui ne tient pas",
        scenes: [
          { legende: "Le même marteau qu'avant, après une baisse. Tentant d'acheter tout de suite.", cfg: { bougies: rate, jusqua: 25, surligne: [25] } },
          { legende: "Mais la bougie suivante ne confirme pas : elle clôture plus bas. Pas de confirmation, pas d'achat.", cfg: { bougies: rate, jusqua: 26, surligne: [25] } },
          { legende: "La baisse reprend, bien plus bas que le marteau. Celui qui avait acheté sans attendre, et sans stop, aurait souffert.", cfg: { bougies: rate, surligne: [25], marques: [{ i: 26, type: "croix", prix: rate[26].c }] } },
        ],
      },
      { t: "piege", html: "<b>Voir des marteaux partout.</b> Sur un graphique de 5 minutes, il y a des marteaux et des dojis toutes les heures : la plupart ne veulent rien dire. Une bougie compte d'autant plus que son <b>unité de temps est grande</b> (un marteau journalier pèse plus qu'un marteau de 5 minutes) et qu'elle apparaît <b>sur un niveau</b>. Et même alors, rien n'est garanti : le stop reste obligatoire." },
      {
        t: "qr", items: [
          { q: "La couleur suffit-elle à lire une bougie ?", r: "Non. Une bougie verte avec une immense mèche haute raconte que les acheteurs ont gagné de peu, après avoir été repoussés. Lisez toujours la couleur, la taille du corps et la longueur des mèches ensemble." },
          { q: "Le marteau doit-il être vert ?", r: "Pas forcément. Un marteau vert est un peu plus fort (les acheteurs ont fini au-dessus de l'ouverture), mais c'est la forme qui compte : petit corps en haut, longue mèche en bas, après une baisse." },
          { q: "Et si la même forme apparaît après une hausse ?", r: "Elle change de nom et de sens : c'est un pendu (<em>hanging man</em>), un avertissement que la hausse fatigue. L'atelier plus haut le montre quand vous changez le contexte." },
        ],
      },
      { t: "nimbo", texte: "Sur la page Analyse, passez le graphique en bougies et survolez-les : les quatre prix s'affichent. Cherchez une longue mèche sur un niveau : c'est là que les bougies parlent le plus.", humeur: "pointe" },
    ],
  }],
  mots: [
    { terme: "Bougie japonaise", en: "candlestick", def: "Le dessin d'une période en quatre prix : un corps et deux mèches." },
    { terme: "OHLC", en: "open, high, low, close", def: "Les quatre prix d'une bougie : ouverture, plus haut, plus bas, clôture." },
    { terme: "Corps", en: "body", def: "Le rectangle entre l'ouverture et la clôture : vert si le prix a monté, rouge s'il a baissé." },
    { terme: "Mèche", en: "wick, shadow", def: "Le trait fin au-dessus ou au-dessous du corps : jusqu'où le prix est allé." },
    { terme: "Rejet", en: "rejection", def: "Une longue mèche : le prix est allé loin, et un camp l'a repoussé avant la clôture." },
    { terme: "Marteau", en: "hammer", def: "Après une baisse, un petit corps en haut et une longue mèche en bas : les acheteurs reviennent." },
    { terme: "Avalement", en: "engulfing", def: "Une bougie dont le corps couvre entièrement celui de la précédente, de couleur opposée." },
    { terme: "Doji", en: "doji", def: "Une bougie dont l'ouverture et la clôture sont presque égales : le marché hésite." },
  ],
  retenir: [
    "Une bougie, c'est <b>quatre prix</b> : ouverture, plus haut, plus bas, clôture (OHLC).",
    "<b>Le corps dit qui a gagné</b> : vert, les acheteurs ; rouge, les vendeurs.",
    "<b>Les mèches disent qui a été repoussé</b> : une longue mèche est un rejet.",
    "Une bougie n'est finie qu'<b>à sa clôture</b> : avant, elle peut encore changer.",
    "Le <b>marteau</b>, l'<b>avalement</b> et le <b>doji</b> racontent un changement de rapport de force.",
    "Ce sont des <b>signaux, pas des garanties</b> : attendez la confirmation, regardez le niveau, gardez un stop.",
  ],
  quiz: [
    { question: "Une bougie ouvre à 4 000 $ et clôture à 3 985 $. De quelle couleur est-elle ?", options: ["Verte", "Rouge", "On ne peut pas savoir"], correct: 1, explanation: "La clôture (3 985 $) est sous l'ouverture (4 000 $) : le prix a baissé pendant la période, la bougie est rouge." },
    { question: "Que montre une longue mèche haute ?", options: ["Que les acheteurs ont gagné haut la main", "Que le prix est monté, puis a été repoussé par les vendeurs", "Que le volume était faible"], correct: 1, explanation: "La mèche garde la trace du plus haut. Si la clôture est loin en dessous, c'est que les vendeurs ont repoussé la hausse : un rejet." },
    { question: "Après une baisse, une bougie a un petit corps en haut et une longue mèche en bas. C'est…", options: ["Un marteau", "Un doji", "Un avalement baissier"], correct: 0, explanation: "C'est un marteau : les vendeurs ont poussé très bas, les acheteurs ont ramené le prix près du haut." },
    { question: "L'ouverture et la clôture sont presque égales, avec des mèches des deux côtés. Que dit cette bougie ?", options: ["Les acheteurs dominent", "Le marché hésite", "La baisse va reprendre à coup sûr"], correct: 1, explanation: "C'est un doji : personne n'a gagné la période. Il signale une hésitation, sans dire dans quel sens le prix partira." },
    { question: "Vous voyez un marteau. Que faites-vous ?", options: ["J'achète immédiatement, sans stop", "J'attends la confirmation et je regarde s'il est sur un niveau", "Je vends"], correct: 1, explanation: "Un marteau est un signal, pas une garantie. On attend la bougie suivante qui confirme, on vérifie qu'il apparaît sur un niveau, et on place un stop." },
  ],
  pratique: [
    { texte: "Ouvrez un graphique en bougies et cherchez un marteau, un avalement et un doji sur le journalier.", href: "/analysis", bouton: "Ouvrir l'analyse" },
    { texte: "Revoyez les mots de la leçon dans le glossaire.", href: "/learn/glossaire", bouton: "Voir le glossaire" },
  ],
};

export default lecon;
