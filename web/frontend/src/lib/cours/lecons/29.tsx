import { serie } from "../marche";
import type { LeconSerie } from "../types";
import { TraceLigneTendance } from "@/components/cours/outils/TraceLigneTendance";

// La ligne de la leçon : creux à 3 900 $ (bougie 6) et 3 940 $ (bougie 20), soit 40 $ en 14 bougies.
const pente = 40 / 14;
const ligne = (i: number) => 3900 + pente * (i - 6);
const tendance = serie([[0, 3920], [6, 3900, "bas"], [13, 3955, "haut"], [20, 3940, "bas"], [27, 3995, "haut"], [34, 3980, "bas"], [41, 4045, "haut"], [46, 4035], [48, 4030], [49, 4027], [50, 4005], [55, 3985]], { graine: 291, bruit: 0.0013 });
// L'exercice : la même idée sur l'euro-dollar.
const exo = serie([[0, 1.0880], [5, 1.0862, "bas"], [11, 1.0905, "haut"], [18, 1.0890, "bas"], [24, 1.0938, "haut"], [28, 1.0925], [31, 1.0918, "bas"], [37, 1.0966, "haut"], [41, 1.0952], [42, 1.0949], [43, 1.0925], [47, 1.0905]], { graine: 292, bruit: 0.0005 });
// Pente de l'exercice : 1,0862 → 1,0890 en 13 bougies.
const lexo = (i: number) => 1.0862 + ((1.089 - 1.0862) / 13) * (i - 5);
// La tendance baissière, par les sommets.
const baisse = serie([[0, 4110], [5, 4120, "haut"], [11, 4060, "bas"], [18, 4090, "haut"], [24, 4030], [27, 4025, "bas"], [33, 4055, "haut"], [40, 4000, "bas"], [46, 4005], [50, 3985]], { graine: 293, bruit: 0.0012 });
// Une ligne trop raide, et une ligne raisonnable.
const raide = serie([[0, 100], [4, 99.5, "bas"], [8, 103.5, "bas"], [10, 107.5], [12, 108.5], [15, 106.8], [18, 108], [22, 104, "bas"], [27, 109], [31, 106.3, "bas"], [36, 111], [40, 112]], { graine: 294 });
// La ligne forcée : elle coupe des bougies.
const forcee = serie([[0, 100.5], [5, 100, "bas"], [10, 103], [14, 101.2, "bas"], [19, 104.5], [24, 101.6, "bas"], [29, 105], [34, 103.4, "bas"], [40, 106.5]], { graine: 295 });

const lecon: LeconSerie = {
  numero: 29,
  accroche: "Deux creux, une règle, et la tendance apparaît.",
  promesse: "À la fin de cette leçon, vous saurez tracer une ligne de tendance proprement, savoir quand elle est confirmée, vous en servir comme repère, et éviter les deux pièges classiques : la ligne forcée et la ligne trop raide.",
  parties: [{
    titre: "",
    blocs: [
      { t: "h", texte: "Une droite qui relie les creux" },
      { t: "p", html: "Une <span class=\"mot\">ligne de tendance</span> (<em>trend line</em>), c'est une droite qui relie <b>les creux d'une hausse</b>, ou <b>les sommets d'une baisse</b>. Elle rend visible ce que la structure du marché (leçon 28) dit en chiffres : en hausse, les creux sont de plus en plus hauts ; une droite qui passe par eux monte." },
      { t: "h", texte: "Tracer en hausse, geste par geste" },
      {
        t: "scenes",
        titre: "Deux creux, une règle",
        scenes: [
          { legende: "Une hausse sur l'or (prix d'exemple). Le présent est la dernière bougie visible.", cfg: { bougies: tendance, jusqua: 26 } },
          { legende: "Prenez <b>deux creux bien nets</b>, le deuxième plus haut que le premier : 3 900 $ puis 3 940 $.", cfg: { bougies: tendance, jusqua: 26, marques: [{ i: 6, type: "point" }, { i: 20, type: "point" }] } },
          { legende: "Reliez-les <b>par le bas</b> : la ligne touche les plus bas, sans traverser aucune bougie.", cfg: { bougies: tendance, jusqua: 26, marques: [{ i: 6, type: "point" }, { i: 20, type: "point" }], traits: [{ de: [6, 3900], a: [20, 3940], couleur: "var(--cap-up)" }] } },
          { legende: "<b>Prolongez-la vers la droite</b>, dans le futur : c'est là qu'elle va servir.", cfg: { bougies: tendance, jusqua: 26, marques: [{ i: 6, type: "point" }, { i: 20, type: "point" }], traits: [{ de: [6, 3900], a: [20, 3940], couleur: "var(--cap-up)", prolonger: true }] } },
          { legende: "Le prix revient toucher la ligne vers 3 980 $, et repart : c'est le <b>troisième contact</b>. La ligne est confirmée.", cfg: { bougies: tendance, jusqua: 37, marques: [{ i: 6, type: "point" }, { i: 20, type: "point" }, { i: 34, type: "achat", label: "3e contact" }], traits: [{ de: [6, 3900], a: [20, 3940], couleur: "var(--cap-up)", prolonger: true }] } },
        ],
      },
      { t: "p", html: "Retenez la différence : <b>deux points suffisent pour tracer</b> une ligne (on peut toujours relier deux points), mais c'est <b>le troisième contact qui la confirme</b>. Quand le prix revient toucher la ligne et repart, c'est que d'autres traders la voient et y achètent. Avant ce troisième contact, la ligne n'est qu'une hypothèse." },
      {
        t: "exemple",
        html: "Les deux creux : <b>3 900 $</b> à la bougie 6, <b>3 940 $</b> à la bougie 20. La ligne monte de 40 $ en 14 bougies, soit environ <b>2,86 $ par bougie</b>. À la bougie 34, elle passe donc à 3 900 + 28 × 40 ÷ 14 = 3 900 + 80 = <b>3 980 $</b>. C'est exactement là que le prix est revenu la toucher. Vous pouvez faire ce calcul à l'avance : il dit où sera la ligne demain, et donc où surveiller le prix.",
      },
      { t: "h", texte: "Les mèches ou les corps : une seule façon" },
      { t: "p", html: "Faut-il relier les mèches (les plus bas) ou les corps des bougies ? Les deux se font. Les mèches donnent les vrais extrêmes ; les corps ignorent les excès d'un instant. La règle : <b>choisissez une façon, et gardez-la</b>, sur tous vos graphiques. Et quelle que soit la façon, <b>ne coupez pas les bougies</b> pour que la ligne passe là où vous voulez." },
      {
        t: "outil",
        titre: "Tracez la ligne de tendance",
        consigne: "Touchez deux creux sur le graphique : la ligne s'accroche au plus bas tout proche et se prolonge. Si elle tient, faites avancer le temps pour voir ce qu'elle annonçait.",
        el: <TraceLigneTendance bougies={tendance} fin={27} reference={[6, 20]}
          suite={[
            { jusqua: 37, legende: "Le prix revient sur la ligne vers 3 980 $ et repart : <b>troisième contact</b>, la ligne est confirmée.", marques: [{ i: 34, type: "achat", label: "3e contact" }] },
            { jusqua: 46, legende: "Au-dessus de la ligne, la hausse continue : nouveau sommet à 4 045 $. Chaque retour vers la ligne est un endroit à surveiller." },
            { jusqua: 50, legende: `Une bougie <b>clôture nettement sous la ligne</b>, à ${Math.round(tendance[50].c).toLocaleString("fr-FR")} $, alors que la ligne passe vers ${Math.round(ligne(50)).toLocaleString("fr-FR")} $. La ligne est cassée : la hausse s'essouffle.`, marques: [{ i: 50, type: "croix", prix: tendance[50].c }] },
            { jusqua: 55, legende: "La suite baisse. Ici, la cassure était vraie. Parfois, le prix repasse au-dessus juste après : c'est la fausse cassure, le sujet de la leçon 30." },
          ]} />,
      },
      { t: "h", texte: "Ensuite, un repère" },
      { t: "p", html: "Une fois tracée, la ligne devient un repère simple :" },
      {
        t: "liste", items: [
          "<b>Tant que le prix reste au-dessus</b>, la hausse continue.",
          "<b>Chaque retour sur la ligne est à surveiller</b> : c'est un endroit où les acheteurs sont revenus jusqu'ici. Beaucoup de traders y cherchent un achat, avec un stop sous la ligne.",
          "<b>Une clôture nettement sous la ligne</b> la casse : la hausse s'essouffle. Pas forcément une baisse, mais un signal que l'escalier ne monte plus au même rythme.",
          "<b>Attention aux fausses cassures</b> : une mèche dessous, ou une clôture à peine dessous, puis le prix repasse au-dessus. Attendez une clôture nette (leçon 30).",
        ],
      },
      { t: "h", texte: "En baisse, l'inverse" },
      { t: "p", html: "En tendance baissière, on relie <b>les sommets, par le haut</b>. Deux sommets nets, le deuxième plus bas que le premier. La ligne descend, et le prix reste dessous. Chaque retour vers la ligne est un endroit où les vendeurs sont revenus ; une clôture nettement au-dessus la casse." },
      {
        t: "graphique",
        cfg: { bougies: baisse, marques: [{ i: 5, type: "point", prix: 4120 }, { i: 18, type: "point", prix: 4090 }, { i: 33, type: "vente", label: "3e contact" }], traits: [{ de: [5, 4120], a: [18, 4090], couleur: "var(--cap-down)", prolonger: true }] },
        legende: "Deux sommets (4 120 $ puis 4 090 $), une ligne qui descend, et un troisième contact vers 4 055 $ : les vendeurs défendent la ligne.",
      },
      { t: "h", texte: "Les pièges" },
      { t: "p", html: "<b>Forcer la ligne.</b> On a envie d'une ligne, alors on choisit les points qui arrangent, on traverse quelques bougies, on ignore une mèche. Si vous devez tricher pour faire passer la ligne, <b>c'est qu'il n'y a pas de ligne</b>. Une bonne ligne saute aux yeux." },
      {
        t: "graphique",
        cfg: { bougies: forcee, traits: [{ de: [5, 100], a: [34, 103.4], couleur: "var(--cap-down)", prolonger: true, label: "Ligne forcée" }], marques: [{ i: 24, type: "croix", prix: 101.6 }] },
        legende: "Cette ligne relie le premier et le dernier creux, mais passe au-dessus du creux à 101,6 : elle coupe des bougies. Ce n'est pas une ligne de tendance, c'est un vœu.",
      },
      { t: "p", html: "<b>Une ligne trop raide.</b> Au début d'une hausse rapide, deux creux très proches donnent une ligne presque verticale. Aucune tendance ne monte à ce rythme longtemps : <b>elle casse vite</b>, sans que la hausse soit finie. Une ligne plus douce, tracée sur des creux plus espacés, en dit davantage." },
      {
        t: "scenes",
        titre: "La ligne trop raide",
        scenes: [
          { legende: "Une hausse rapide. Deux creux proches, à 99,5 et 103,5, en 4 bougies : la ligne est très raide.", cfg: { bougies: raide, jusqua: 12, traits: [{ de: [4, 99.5], a: [8, 103.5], couleur: "var(--cap-down)", prolonger: true, label: "Trop raide" }], marques: [{ i: 4, type: "point" }, { i: 8, type: "point" }] } },
          { legende: "Le prix ralentit, et la ligne est cassée quelques bougies plus tard. La hausse, elle, n'est pas finie.", cfg: { bougies: raide, jusqua: 22, traits: [{ de: [4, 99.5], a: [8, 103.5], couleur: "var(--cap-down)", prolonger: true, label: "Trop raide" }] } },
          { legende: "Une ligne plus douce, sur des creux espacés (99,5 puis 104), tient bien plus longtemps et décrit la vraie tendance.", cfg: { bougies: raide, traits: [{ de: [4, 99.5], a: [8, 103.5], couleur: "var(--cap-down)", prolonger: true, pointille: true }, { de: [4, 99.5], a: [22, 104], couleur: "var(--cap-up)", prolonger: true, label: "Plus juste" }], marques: [{ i: 4, type: "point" }, { i: 22, type: "point" }, { i: 31, type: "achat" }] } },
        ],
      },
      { t: "piege", html: "<b>Redessiner la ligne après chaque cassure.</b> Le prix casse votre ligne ; vous en tracez une nouvelle, moins raide, qui « tient encore ». Puis une autre. À la fin, la ligne ne sert plus à rien : elle suit le prix au lieu de vous renseigner. Une ligne cassée est une information. Acceptez-la." },
      {
        t: "outil",
        titre: "À vous, sur l'euro-dollar",
        consigne: "Cette fois sans aide : deux creux, une ligne, et voyez si elle tient. Essayez aussi en accrochant aux corps.",
        el: <TraceLigneTendance bougies={exo} fin={33} reference={[5, 18]}
          suite={[
            { jusqua: 40, legende: `Le prix touche la ligne vers ${lexo(31).toFixed(4).replace(".", ",")} (bougie 31) et repart vers 1,0966 : troisième contact.`, marques: [{ i: 31, type: "achat", label: "3e contact" }] },
            { jusqua: 43, legende: `Une clôture nette sous la ligne, vers ${exo[43].c.toFixed(4).replace(".", ",")} : la ligne est cassée.`, marques: [{ i: 43, type: "croix", prix: exo[43].c }] },
            { jusqua: 47, legende: "La baisse continue. La ligne a fait son travail : elle a montré la tendance, puis signalé son essoufflement." },
          ]} />,
      },
      {
        t: "qr", items: [
          { q: "Combien de contacts faut-il ?", r: "Deux pour tracer, trois pour confirmer. Au-delà, la ligne est d'autant plus regardée, mais chaque contact l'use aussi un peu : les acheteurs qui la défendent finissent par manquer." },
          { q: "Sur quelle unité de temps la tracer ?", r: "Celle sur laquelle vous lisez la tendance, souvent le journalier ou le 4 heures. Une ligne journalière vaut plus qu'une ligne de 15 minutes, comme pour les supports et les résistances." },
          { q: "La ligne de tendance remplace-t-elle la structure ?", r: "Non, elle la complète. La structure (leçon 28) dit si l'escalier monte ; la ligne dit à quel rythme, et où le prix devrait trouver des acheteurs. Quand les deux cassent ensemble, le signal est plus net." },
        ],
      },
      { t: "nimbo", texte: "Sur la page Analyse, repérez deux creux nets sur le journalier d'un actif en hausse, et calculez où passera la ligne dans cinq bougies, comme dans l'exemple. Puis revenez voir.", humeur: "pointe" },
    ],
  }],
  mots: [
    { terme: "Ligne de tendance", en: "trend line", def: "Une droite qui relie les creux d'une hausse, ou les sommets d'une baisse, prolongée vers la droite." },
    { terme: "Contact", en: "touch", def: "Un passage du prix sur la ligne, suivi d'un rebond. Le troisième confirme la ligne." },
    { terme: "Cassure", en: "break", def: "Une clôture nettement de l'autre côté de la ligne : la tendance s'essouffle." },
    { terme: "Fausse cassure", en: "fakeout, false break", def: "Le prix passe la ligne un instant, puis revient de son côté." },
    { terme: "Pente", en: "slope", def: "La vitesse à laquelle monte la ligne : trop raide, elle casse vite." },
  ],
  retenir: [
    "Une ligne de tendance relie <b>les creux d'une hausse</b> (par le bas) ou <b>les sommets d'une baisse</b> (par le haut), prolongée vers la droite.",
    "<b>Deux points pour tracer, un troisième contact pour confirmer.</b>",
    "Les mèches ou les corps : <b>une seule façon</b>, et sans couper les bougies.",
    "Au-dessus, la hausse continue ; <b>chaque retour sur la ligne est à surveiller</b>.",
    "Une <b>clôture nettement dessous</b> la casse ; attention aux fausses cassures.",
    "Si vous devez tricher, <b>il n'y a pas de ligne</b> ; et une ligne trop raide casse vite.",
  ],
  quiz: [
    { question: "En tendance haussière, que relie la ligne de tendance ?", options: ["Les sommets, par le haut", "Les creux, par le bas", "Les clôtures, au milieu"], correct: 1, explanation: "En hausse, on relie les creux (le deuxième plus haut que le premier), par le bas. En baisse, les sommets, par le haut." },
    { question: "Qu'est-ce qui confirme une ligne de tendance ?", options: ["Le deuxième point", "Le troisième contact", "Une bougie verte"], correct: 1, explanation: "On peut toujours relier deux points. C'est quand le prix revient toucher la ligne une troisième fois, et repart, qu'elle est confirmée." },
    { question: "Les creux sont à 3 900 $ (bougie 6) et 3 940 $ (bougie 20). Où passe la ligne à la bougie 34 ?", options: ["3 960 $", "3 980 $", "4 020 $"], correct: 1, explanation: "La ligne monte de 40 $ en 14 bougies. De la bougie 6 à la bougie 34, il y a 28 bougies, soit deux fois plus : 80 $. 3 900 + 80 = 3 980 $." },
    { question: "Une mèche passe sous la ligne, mais la bougie clôture au-dessus. La ligne est-elle cassée ?", options: ["Oui", "Non", "Il faut la redessiner"], correct: 1, explanation: "On juge à la clôture, et une clôture nette. Une mèche dessous peut être une fausse cassure : la ligne tient encore." },
    { question: "Pour faire passer votre ligne, vous devez traverser deux bougies. Que faire ?", options: ["Tant pis, c'est presque bon", "Accepter qu'il n'y a pas de ligne ici", "Passer en 1 minute"], correct: 1, explanation: "Si vous devez tricher, il n'y a pas de ligne. Une bonne ligne de tendance passe sous toutes les bougies sans les couper." },
  ],
  pratique: [
    { texte: "Tracez la ligne de tendance d'un actif en hausse sur le journalier, et notez où elle passera dans une semaine.", href: "/analysis", bouton: "Ouvrir l'analyse" },
    { texte: "Placez un achat fictif sur un retour vers la ligne, avec un stop sous la ligne.", href: "/trading", bouton: "Prendre position" },
  ],
};

export default lecon;
