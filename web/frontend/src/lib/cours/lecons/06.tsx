import { serie, type Bougie } from "../marche";
import type { LeconSerie } from "../types";
import { FenetreMoyenne } from "@/components/cours/outils/FenetreMoyenne";
import { PeriodeMoyenne } from "@/components/cours/outils/PeriodeMoyenne";

/** Des bougies aux clôtures rondes, pour que le calcul à la main tombe juste. */
function bougiesDe(closes: number[]): Bougie[] {
  return closes.map((c, i) => {
    const o = i === 0 ? c - 7 : closes[i - 1];
    return { o, c, h: Math.max(o, c) + 3 + ((i * 7) % 6), l: Math.min(o, c) - 3 - ((i * 5) % 6), v: 1000 };
  });
}

// L'or, en bougies d'un jour, autour de 4 000 $ l'once.
const fenetre = bougiesDe([4002, 4010, 3998, 4015, 4021, 4012, 4030, 4026, 4041, 4035, 4050, 4044, 4062, 4055, 4070, 4066]);
// Une baisse, une hausse, une baisse : 430 jours. Creux vers la bougie 162, sommet vers la 317.
const longue = serie([[0, 3980], [30, 3900], [60, 3940], [100, 3780], [140, 3700], [175, 3640], [200, 3720], [240, 3900], [280, 4120], [310, 4260], [335, 4220], [370, 4040], [400, 3900], [429, 3860]], { graine: 61, bruit: 0.007 });
// Un marché sans tendance : le prix fait des allers-retours entre 3 950 et 4 050 $.
const plat = serie([[0, 4000], [20, 4060], [42, 3950], [65, 4050], [88, 3945], [110, 4055], [132, 3950], [155, 4045], [178, 3955], [200, 4050], [222, 3950], [245, 4055], [268, 3960], [290, 4040], [299, 3990]], { graine: 62, bruit: 0.006 });
const courte = longue.slice(200, 330);

const MA20 = { n: 20, couleur: "var(--cap-ocean)", label: "MA 20" };
const MA50 = { n: 50, couleur: "var(--cap-amber-ink)", label: "MA 50" };
const MA200 = { n: 200, couleur: "var(--cap-ink-3)", label: "MA 200" };

const lecon: LeconSerie = {
  numero: 6,
  accroche: "Cette ligne qui suit le prix, presque tous les traders l'utilisent. Savez-vous la lire ?",
  promesse: "À la fin de cette leçon, vous saurez ce qu'est une moyenne mobile, comment elle se calcule, lire la 20, la 50 et la 200, reconnaître un golden cross et un death cross, et vous saurez pourquoi ils arrivent toujours en retard.",
  parties: [{
    titre: "",
    blocs: [
      { t: "h", texte: "Une moyenne, recalculée à chaque bougie" },
      { t: "p", html: "Une <span class=\"mot\">moyenne mobile</span> (en anglais <em>moving average</em>, MA), c'est <b>la moyenne des derniers prix de clôture</b>. La <span class=\"mot\">clôture</span> est le dernier prix d'une bougie. Une moyenne mobile 5 additionne les 5 dernières clôtures et divise par 5. On pose ce chiffre sous la bougie, comme un point." },
      { t: "p", html: "« Mobile », parce qu'elle avance avec le temps. À chaque nouvelle bougie, <b>la clôture la plus ancienne sort du calcul et la nouvelle y entre</b>. On recalcule, on pose un nouveau point. Relier ces points donne la ligne que vous voyez sur les graphiques." },
      {
        t: "exemple",
        html: "Cinq jours d'or : 4 002, 4 010, 3 998, 4 015 et 4 021 $. La somme fait <b>20 046 $</b>, divisée par 5 : la moyenne vaut <b>4 009,2 $</b>. Le lendemain, l'or clôture à 4 012 $. Le 4 002 sort, le 4 012 entre : 20 046 − 4 002 + 4 012 = 20 056, divisé par 5 : <b>4 011,2 $</b>. La moyenne a monté de 2 $, soit l'écart entre l'entrant et le sortant (10 $), divisé par 5.",
      },
      {
        t: "outil",
        titre: "Faites avancer la fenêtre",
        consigne: "Chaque appui ajoute une bougie : la plus ancienne clôture sort, la nouvelle entre, et le point de la moyenne se pose. Regardez la ligne naître.",
        el: <FenetreMoyenne bougies={fenetre} periode={5} />,
      },
      { t: "h", texte: "Elle lisse le prix" },
      { t: "p", html: "Le prix monte et descend sans arrêt. La moyenne, elle, <b>efface les petits mouvements</b> : une clôture plus haute un jour, plus basse le lendemain, et la moyenne bouge à peine. Il reste la direction. C'est le <span class=\"mot\">lissage</span> (<em>smoothing</em>)." },
      {
        t: "scenes",
        titre: "Le prix, puis sa moyenne",
        scenes: [
          { legende: "Le prix seul, sur 130 jours : des hausses, des replis, des hésitations. La direction n'est pas si simple à lire.", cfg: { bougies: courte, unite: "jour" } },
          { legende: "On ajoute la <b>moyenne 20</b> : les petits replis disparaissent. Il reste une ligne qui monte : la hausse est nette.", cfg: { bougies: courte, moyennes: [MA20], unite: "jour" } },
        ],
      },
      { t: "h", texte: "La 20, la 50 et la 200" },
      { t: "p", html: "Le nombre dit combien de bougies entrent dans le calcul. Les trois plus suivies : la <span class=\"mot\">MA 20</span>, la <span class=\"mot\">MA 50</span> et la <span class=\"mot\">MA 200</span>. <b>Plus le nombre est grand, plus la moyenne est lente</b> : une clôture de plus ne pèse qu'un deux-centième dans la 200, mais un vingtième dans la 20. On parle de moyenne <span class=\"mot\">rapide</span> (<em>fast MA</em>) pour la 20 et de moyenne <span class=\"mot\">lente</span> (<em>slow MA</em>) pour la 200." },
      {
        t: "tableau",
        entetes: ["Moyenne", "Sur des bougies d'un jour", "Ce qu'elle montre"],
        lignes: [
          ["MA 20", "Environ un mois de bourse", "Le mouvement du moment. Elle colle au prix."],
          ["MA 50", "Environ deux à trois mois", "La tendance de moyen terme."],
          ["MA 200", "Presque une année de bourse", "<b>La tendance de fond.</b> Beaucoup de professionnels la regardent."],
        ],
        legende: "Les mêmes réglages servent sur toutes les unités de temps : une MA 20 en bougies d'une heure couvre 20 heures.",
      },
      {
        t: "outil",
        titre: "Réglez la moyenne",
        consigne: "Faites glisser le curseur de 5 à 200, ou choisissez la 20, la 50 ou la 200. Comparez le creux et le sommet du prix (points noirs) à ceux de la moyenne (points de couleur).",
        el: <PeriodeMoyenne bougies={longue} zoneCreux={[120, 260]} zoneSommet={[260, 400]} />,
      },
      {
        t: "graphique",
        cfg: { bougies: longue, type: "ligne", moyennes: [MA20, MA50, MA200], unite: "jour" },
        legende: "Les trois ensemble : la 20 (bleue) suit chaque mouvement, la 50 (ambre) tourne plus tard, la 200 (grise) commence à la bougie 200 et tourne lentement.",
      },
      { t: "h", texte: "Au-dessus ou en dessous" },
      { t: "p", html: "La lecture la plus simple : <b>le prix est au-dessus de sa moyenne ? Tendance plutôt haussière</b>, en anglais <span class=\"mot\">bullish</span>. <b>En dessous ? Plutôt baissière</b>, <span class=\"mot\">bearish</span>. Pourquoi ? Si le prix du jour est plus haut que la moyenne des 50 derniers jours, c'est qu'il a monté en moyenne sur la période." },
      {
        t: "scenes",
        titre: "Le prix et sa MA 50",
        scenes: [
          { legende: "Au jour 151, l'or (3 680 $) est <b>sous</b> sa MA 50 (3 729 $) : depuis des semaines, il baisse. Plutôt baissier.", cfg: { bougies: longue, type: "ligne", moyennes: [MA50], jusqua: 150, unite: "jour" } },
          { legende: "Au jour 301, il est <b>au-dessus</b> (4 222 $ contre 4 092 $) : la tendance s'est retournée. Plutôt haussier.", cfg: { bougies: longue, type: "ligne", moyennes: [MA50], jusqua: 300, unite: "jour" } },
          { legende: "À la fin, il repasse dessous (3 860 $ contre 3 907 $). « Plutôt », parce que le prix traverse souvent sa moyenne sans que la tendance change vraiment.", cfg: { bougies: longue, type: "ligne", moyennes: [MA50], unite: "jour" } },
        ],
      },
      { t: "h", texte: "Le golden cross et le death cross" },
      { t: "p", html: "Le signal le plus connu fait se croiser deux moyennes. Quand la <b>50 passe au-dessus de la 200</b>, c'est le <span class=\"mot\">golden cross</span>, la croix dorée : la tendance de moyen terme repasse au-dessus de la tendance de fond, un signal haussier. Quand la <b>50 repasse sous la 200</b>, c'est le <span class=\"mot\">death cross</span>, la croix de la mort : un signal baissier." },
      {
        t: "scenes",
        titre: "Deux croisements, sur 430 jours",
        scenes: [
          { legende: "Le prix a touché son creux et remonte. La MA 50 (ambre) est encore sous la MA 200 (grise).", cfg: { bougies: longue, type: "ligne", moyennes: [MA50, MA200], jusqua: 225, unite: "jour" } },
          { legende: "Jour 239 : la 50 passe au-dessus de la 200. <b>Golden cross</b>, un signal haussier.", cfg: { bougies: longue, type: "ligne", moyennes: [MA50, MA200], jusqua: 238, marques: [{ i: 238, type: "achat", label: "Golden cross" }], unite: "jour" } },
          { legende: "La hausse continue jusqu'à un sommet vers 4 290 $, puis le prix repart à la baisse.", cfg: { bougies: longue, type: "ligne", moyennes: [MA50, MA200], jusqua: 370, marques: [{ i: 238, type: "achat", label: "Golden cross" }], unite: "jour" } },
          { legende: "Jour 398 : la 50 repasse sous la 200. <b>Death cross</b>, un signal baissier.", cfg: { bougies: longue, type: "ligne", moyennes: [MA50, MA200], marques: [{ i: 238, type: "achat", label: "Golden cross" }, { i: 397, type: "vente", label: "Death cross" }], unite: "jour" } },
        ],
      },
      { t: "h", texte: "Toujours en retard" },
      { t: "p", html: "Une moyenne est faite de prix passés. Elle ne peut tourner qu'<b>après</b> le prix : c'est un <span class=\"mot\">indicateur retardé</span> (<em>lagging indicator</em>). Plus elle est lente, plus le retard est grand. Ses croisements ne prédisent rien : ils constatent, tard, ce qui s'est déjà passé." },
      {
        t: "exemple",
        titre: "Le retard, en chiffres",
        html: "Sur le graphique ci-dessus, l'or touche son creux vers <b>3 625 $</b>, au jour 162. Le golden cross n'arrive qu'au jour 239, avec l'or à <b>3 906 $</b> : environ <b>280 $ de hausse</b> étaient déjà passés. À l'autre bout, le sommet est vers <b>4 291 $</b> (jour 317) et le death cross au jour 398, à <b>3 920 $</b> : environ <b>370 $ sous le sommet</b>. Le signal est juste sur la direction, mais il arrive tard.",
      },
      { t: "p", html: "Et quand il n'y a pas de tendance, c'est pire. Le prix fait des allers-retours, les moyennes s'entremêlent, et chaque croisement arrive au mauvais moment : juste avant que le prix reparte dans l'autre sens." },
      {
        t: "scenes",
        titre: "Un marché sans tendance",
        scenes: [
          { legende: "300 jours d'or entre 3 950 et 4 050 $, avec la MA 20 (bleue) et la MA 50 (ambre).", cfg: { bougies: plat, type: "ligne", moyennes: [MA20, MA50], unite: "jour" } },
          { legende: "On achète chaque fois que la 20 passe au-dessus de la 50, on revend quand elle repasse dessous. Les achats tombent près du haut, vers 4 050 $…", cfg: { bougies: plat, type: "ligne", moyennes: [MA20, MA50], marques: [65, 109, 155, 199, 244].map((i) => ({ i, type: "achat" as const })), unite: "jour" } },
          { legende: "… et les ventes près du bas, vers 3 950 $. Cinq allers-retours, cinq pertes : entre 88 et 99 $ chacune, <b>469 $ par once</b> en tout.", cfg: { bougies: plat, type: "ligne", moyennes: [MA20, MA50], marques: [...[65, 109, 155, 199, 244].map((i) => ({ i, type: "achat" as const })), ...[87, 131, 177, 222, 268].map((i) => ({ i, type: "vente" as const }))], unite: "jour" } },
        ],
      },
      { t: "piege", html: "<b>Acheter chaque golden cross, vendre chaque death cross.</b> Dans une belle tendance, vous entrez tard et sortez tard. Sans tendance, les croisements se suivent et chacun coûte un peu. Un croisement dit qu'un changement est <em>possible</em>, jamais qu'il est sûr. <b>Rien n'est garanti</b> : confirmez avec le prix (sommets, creux, supports), et gardez toujours un stop (leçon 7)." },
      { t: "h", texte: "S'en servir, sans s'y fier" },
      {
        t: "liste",
        items: [
          "<b>Pour situer la tendance</b> : prix au-dessus de la 200, on cherche plutôt des achats ; en dessous, on se méfie des achats.",
          "<b>Pour voir le calme et l'agitation</b> : quand les moyennes s'emmêlent et restent à plat, il n'y a pas de tendance. Les signaux de croisement y sont à éviter.",
          "<b>Comme repère</b> : dans une hausse, le prix revient souvent vers sa MA 20 ou sa MA 50 avant de repartir. Un repère, pas un mur.",
          "<b>Toujours avec autre chose</b> : la structure du prix (leçon 28), un support, une bougie de rejet.",
        ],
      },
      {
        t: "qr",
        items: [
          { q: "Simple ou exponentielle ?", r: "Ici, toutes les moyennes sont <b>simples</b> (SMA) : chaque clôture pèse autant. La moyenne <b>exponentielle</b> (EMA) donne plus de poids aux dernières clôtures : elle réagit un peu plus vite, avec un peu plus de faux signaux. Le MACD en utilise deux (leçon 8)." },
          { q: "Quelle moyenne choisir ?", r: "Celles que les autres regardent : la 20, la 50, la 200. Un réglage « secret » à 37 ne marche pas mieux, et personne d'autre ne le voit." },
          { q: "Elle marche sur toutes les unités de temps ?", r: "Oui, le calcul est le même. Mais une MA 200 en bougies de 5 minutes ne couvre que 16 heures : ce n'est plus du tout la « tendance de fond »." },
        ],
      },
      { t: "nimbo", texte: "Sur la page Analyse, la rubrique « Les indicateurs » donne les moyennes 20, 50 et 200 de chaque actif, et dit si la courte est au-dessus de la longue. Comparez avec ce que vous lisez sur le graphique.", humeur: "pointe" },
    ],
  }],
  mots: [
    { terme: "Moyenne mobile", en: "moving average (MA)", def: "La moyenne des dernières clôtures, recalculée à chaque bougie." },
    { terme: "MA 20, MA 50, MA 200", en: "MA 20 / 50 / 200", def: "Les moyennes sur 20, 50 et 200 bougies : du mouvement du moment à la tendance de fond." },
    { terme: "Lissage", en: "smoothing", def: "Effacer les petits mouvements du prix pour ne garder que sa direction." },
    { terme: "Moyenne rapide, moyenne lente", en: "fast MA, slow MA", def: "Sur peu de bougies, elle suit le prix de près ; sur beaucoup, elle bouge lentement." },
    { terme: "Haussier, baissier", en: "bullish, bearish", def: "Qui va vers la hausse, vers la baisse. Prix au-dessus de sa moyenne : plutôt haussier." },
    { terme: "Croix dorée", en: "golden cross", def: "La MA 50 passe au-dessus de la MA 200 : un signal haussier." },
    { terme: "Croix de la mort", en: "death cross", def: "La MA 50 repasse sous la MA 200 : un signal baissier." },
    { terme: "Indicateur retardé", en: "lagging indicator", def: "Un indicateur fait de prix passés, qui confirme un mouvement après coup." },
  ],
  retenir: [
    "Une <b>moyenne mobile</b> est la moyenne des dernières clôtures, recalculée à chaque bougie : la plus ancienne sort, la nouvelle entre.",
    "Elle <b>lisse</b> le prix : il reste la direction.",
    "<b>Plus le nombre est grand, plus elle est lente</b> : la 20 suit le mouvement, la 200 montre la tendance de fond.",
    "Prix <b>au-dessus</b> : plutôt haussier. <b>En dessous</b> : plutôt baissier.",
    "La 50 qui passe au-dessus de la 200, c'est le <b>golden cross</b> ; en dessous, le <b>death cross</b>.",
    "Ses signaux arrivent <b>toujours en retard</b> et se trompent souvent sans tendance : jamais une garantie.",
  ],
  quiz: [
    { question: "Les 5 dernières clôtures sont 10, 12, 11, 13 et 14. Que vaut la moyenne mobile 5 ?", options: ["12", "14", "60"], correct: 0, explanation: "10 + 12 + 11 + 13 + 14 = 60, divisé par 5 : 12. La moyenne se pose sous la dernière bougie." },
    { question: "Laquelle réagit le plus lentement ?", options: ["La MA 20", "La MA 50", "La MA 200"], correct: 2, explanation: "Plus il y a de bougies dans le calcul, moins une clôture nouvelle la fait bouger : la 200 est la plus lente, elle montre la tendance de fond." },
    { question: "Le prix est nettement au-dessus de sa MA 200. Que pouvez-vous dire ?", options: ["Il va forcément monter", "La tendance de fond est plutôt haussière", "Il faut vendre"], correct: 1, explanation: "Au-dessus de sa moyenne, le prix a monté sur la période : tendance plutôt haussière. Plutôt, pas forcément : rien ne dit ce que fera la suite." },
    { question: "La MA 50 passe sous la MA 200. Comment s'appelle ce croisement ?", options: ["Un golden cross", "Un death cross", "Un pullback"], correct: 1, explanation: "La 50 sous la 200 : la croix de la mort, ou death cross, un signal baissier. L'inverse est le golden cross." },
    { question: "Pourquoi un golden cross arrive-t-il souvent bien après le creux du prix ?", options: ["Parce qu'une moyenne est faite de prix passés", "Parce que le graphique est lent à charger", "Parce que les courtiers le retardent"], correct: 0, explanation: "Une moyenne ne peut tourner qu'après le prix : c'est un indicateur retardé. Plus elle est lente, plus le signal arrive tard." },
  ],
  pratique: [
    { texte: "Ouvrez l'analyse d'un actif : où est le prix par rapport à ses moyennes 20, 50 et 200 ?", href: "/analysis", bouton: "Ouvrir l'analyse" },
  ],
};

export default lecon;
