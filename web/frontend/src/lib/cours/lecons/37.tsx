import { hasard, serie, type Ancre, type Bougie } from "../marche";
import type { LeconSerie } from "../types";
import { GrapheDecision } from "@/components/cours/outils/GrapheDecision";
import { VolumeCassure } from "@/components/cours/outils/VolumeCassure";

/**
 * Les volumes sont dessinés à la main : une base qui suit l'histoire (le calme
 * d'un range, l'élan d'une sortie), un peu de hasard, et la bougie de cassure
 * réglée en multiple de la moyenne des 20 bougies d'avant.
 */
function volumes(b: Bougie[], base: (i: number) => number, graine: number, ib?: number, mult?: number): Bougie[] {
  const r = hasard(graine);
  const out = b.map((x, i) => ({ ...x, v: Math.round(base(i) * (0.8 + 0.4 * r())) }));
  if (ib != null && mult != null) {
    const moy = out.slice(ib - 20, ib).reduce((a, x) => a + x.v, 0) / 20;
    out[ib] = { ...out[ib], v: Math.round(moy * mult) };
  }
  return out;
}

// L'or sous 4 000 $, trois contacts, puis la bougie 40 qui sort.
const RANGE: Ancre[] = [[0, 3962], [5, 3945, "bas"], [10, 4000, "haut"], [16, 3948, "bas"], [22, 3998, "haut"], [28, 3946, "bas"], [34, 3999, "haut"], [37, 3972], [39, 3990]];
const s = (suite: Ancre[], graine: number) => serie([...RANGE, ...suite], { graine, bruit: 0.0015 });
const monte: Ancre[] = [[40, 4032], [44, 4052], [49, 4012, "bas"], [55, 4062], [62, 4090]];
const retombe: Ancre[] = [[40, 4014], [42, 4002], [46, 3976], [52, 3960], [58, 3950], [62, 3936]];
const calmeRange = (i: number) => (i < 40 ? 1050 - i * 6 : 1150);

const avecVolume = volumes(s(monte, 371), calmeRange, 1, 40, 2.6);
const sansVolume = volumes(s(retombe, 372), calmeRange, 2, 40, 0.7);
// Pour l'outil : la même cassure, le volume de la bougie 40 se règle.
const reglable = volumes(s(monte, 373), calmeRange, 3);
// Le range qui s'endort : le volume baisse de contact en contact.
const endormi = volumes(s([[40, 4034], [44, 4058], [50, 4046], [56, 4078], [62, 4096]], 374), (i) => (i < 40 ? 1500 - i * 22 : 1300), 4, 40, 3);
// Un triangle symétrique : sommets plus bas, creux plus hauts, volume qui fond.
const triangle = volumes(
  serie([[0, 3940], [5, 4040, "haut"], [11, 3956, "bas"], [17, 4028, "haut"], [23, 3968, "bas"], [29, 4016, "haut"], [34, 3980, "bas"], [38, 4004, "haut"], [41, 3990], [43, 4030], [48, 4062], [54, 4050], [60, 4080]], { graine: 375, bruit: 0.0012 }),
  (i) => (i < 42 ? 1600 - i * 25 : 1250), 5, 43, 2.8,
);
// L'exercice.
const casA = volumes(s([[40, 4030], [44, 4048], [50, 4014, "bas"], [56, 4058], [62, 4084]], 376), calmeRange, 6, 40, 2.8);
const casB = volumes(s([[40, 4016], [43, 4004], [47, 3980], [54, 3962], [62, 3950]], 377), calmeRange, 7, 40, 0.6);
const casC = volumes(s([[40, 4031], [42, 4038], [45, 4006], [49, 3984], [56, 3966], [62, 3958]], 378), calmeRange, 8, 40, 2.7);
const casD = volumes(s([[40, 4022], [44, 4040], [50, 4058], [56, 4064], [62, 4088]], 379), calmeRange, 9, 40, 0.8);

const plafond = { prix: 4000, zone: 6, label: "Résistance 4 000 $", couleur: "var(--cap-down)" };
const choix = ["Crédible", "À surveiller"];

const lecon: LeconSerie = {
  numero: 37,
  accroche: "Sous le graphique, ces petites barres qui montent et descendent : que racontent-elles ?",
  promesse: "À la fin de cette leçon, vous saurez lire le volume, ce qu'il confirme et ce qu'il ne confirme pas, et pourquoi sur le forex il faut le lire avec prudence.",
  parties: [{
    titre: "",
    blocs: [
      { t: "h", texte: "Le volume : ce qui s'est échangé" },
      { t: "p", html: "Le <span class=\"mot\">volume</span> (volume), c'est <b>la quantité échangée pendant une bougie</b> : combien d'actions, de contrats ou de lots ont changé de mains entre l'ouverture et la clôture. Sur la plupart des plateformes, il s'affiche <b>sous le graphique</b>, en barres : une barre par bougie, d'autant plus haute qu'il s'est échangé beaucoup." },
      {
        t: "scenes",
        titre: "Les barres sous le graphique",
        scenes: [
          { legende: "Le prix de l'or, en bougies d'une heure, sous 4 000 $ l'once.", cfg: { bougies: avecVolume, unite: "heure", jusqua: 39 } },
          { legende: "On ajoute le volume, dessous : une barre par bougie, de la couleur de la bougie. Survolez une barre pour lire sa valeur.", cfg: { bougies: avecVolume, unite: "heure", jusqua: 39, panneaux: ["volume"] } },
          { legende: "La 41<sup>e</sup> bougie sort au-dessus de 4 000 $. Sa barre de volume est <b>bien plus haute</b> que les autres : il s'est passé quelque chose.", cfg: { bougies: avecVolume, unite: "heure", jusqua: 40, panneaux: ["volume"], niveaux: [plafond], surligne: [40] } },
        ],
      },

      { t: "h", texte: "Ce qu'il raconte : l'intérêt du marché" },
      { t: "p", html: "Le prix dit <b>où</b> le marché est allé. Le volume dit <b>combien de monde</b> a participé. Un mouvement avec beaucoup de volume, c'est un mouvement que beaucoup de traders ont voulu : achats, ventes, stops déclenchés. Un mouvement avec peu de volume, c'est un mouvement que peu de gens ont suivi. Le volume mesure <b>l'intérêt du marché pour un mouvement</b>." },
      {
        t: "qr",
        items: [
          { q: "Un gros volume veut-il dire que le prix monte ?", r: "Non. Il y a toujours un acheteur et un vendeur pour chaque échange : le volume ne dit pas qui a gagné. Il dit que l'échange a été intense. Le sens, c'est la bougie qui le donne." },
          { q: "Pourquoi les barres sont-elles vertes ou rouges ?", r: "Elles prennent la couleur de leur bougie : verte si la bougie a clôturé plus haut qu'elle n'a ouvert, rouge sinon. C'est une aide à la lecture, rien de plus." },
          { q: "Qu'est-ce qu'un volume « fort » ?", r: "Fort par rapport aux bougies d'avant, sur le même actif et la même unité de temps. On compare souvent à la moyenne des 20 dernières barres. Un chiffre seul ne veut rien dire." },
        ],
      },

      { t: "h", texte: "Une cassure avec beaucoup de volume, plus crédible" },
      { t: "p", html: "Rappelez-vous la cassure (leçon 30) : le prix sort d'une zone qu'il respectait. Si cette sortie se fait <b>avec beaucoup de volume</b>, beaucoup d'acteurs y ont participé : des acheteurs qui entrent, des vendeurs dont les stops sautent. La cassure est <b>plus crédible</b>. Si elle se fait <b>sans volume</b>, presque personne ne suit : elle est <b>à surveiller</b>, plus facile à défaire." },
      {
        t: "graphique",
        cfg: { bougies: avecVolume, unite: "heure", panneaux: ["volume"], niveaux: [plafond], surligne: [40] },
        legende: "Avec volume : la bougie de cassure échange 2,6 fois plus que la moyenne des 20 bougies d'avant. Le prix revient tester 4 000 $, puis repart.",
      },
      {
        t: "graphique",
        cfg: { bougies: sansVolume, unite: "heure", panneaux: ["volume"], niveaux: [plafond], surligne: [40] },
        legende: "Sans volume : la sortie se fait avec 0,7 fois la moyenne, moins que d'habitude. Le prix retombe aussitôt sous 4 000 $ : une fausse cassure.",
      },
      {
        t: "exemple",
        titre: "Comparer à la moyenne",
        html: "Premier graphique : sur les 20 bougies avant la cassure, il s'échange en moyenne <b>862</b> lots par heure (les chiffres exacts dépendent de la plateforme). La bougie de cassure en échange <b>2 241</b> : 2 241 ÷ 862 ≈ <b>2,6 fois</b> la moyenne. C'est net.<br />Second graphique : moyenne de <b>852</b>, et une cassure à <b>597</b> lots : 597 ÷ 852 ≈ <b>0,7 fois</b> la moyenne, moins qu'une heure ordinaire. Le prix sort, mais le marché ne s'y intéresse pas.",
      },
      {
        t: "outil",
        titre: "Réglez le volume de la cassure",
        consigne: "La bougie encadrée casse les 4 000 $. Faites varier son volume et regardez ce que cela change à votre lecture.",
        el: <VolumeCassure bougies={reglable} ib={40} niveau={4000} />,
      },

      { t: "h", texte: "Le volume qui baisse dans un range ou un triangle" },
      { t: "p", html: "Dans un range (leçon 34), le prix va et vient, et souvent <b>le volume baisse</b> au fil des allers-retours : le marché se lasse, il attend. Dans un triangle (leçon 35), c'est encore plus net : plus le prix se resserre, moins il s'échange. Puis, à la sortie, le volume <b>se réveille d'un coup</b>. Cette baisse ne dit pas de quel côté le prix sortira. Elle dit que le marché retient son souffle, comme le squeeze des bandes de Bollinger (leçon 9)." },
      {
        t: "scenes",
        titre: "Le range s'endort, puis se réveille",
        scenes: [
          { legende: "Un range sous 4 000 $. Regardez les barres : elles baissent de contact en contact.", cfg: { bougies: endormi, unite: "heure", jusqua: 39, panneaux: ["volume"], niveaux: [plafond, { prix: 3946, zone: 6, label: "Support 3 946 $", couleur: "var(--cap-up)" }] } },
          { legende: "La sortie : une grande bougie verte, et un volume <b>trois fois plus fort</b> que la moyenne.", cfg: { bougies: endormi, unite: "heure", jusqua: 40, panneaux: ["volume"], niveaux: [plafond, { prix: 3946, zone: 6, label: "Support 3 946 $", couleur: "var(--cap-up)" }], surligne: [40] } },
          { legende: "La hausse continue, avec un volume plus fort qu'au cœur du range.", cfg: { bougies: endormi, unite: "heure", panneaux: ["volume"], niveaux: [plafond], surligne: [40] } },
        ],
      },
      {
        t: "graphique",
        cfg: { bougies: triangle, unite: "heure", panneaux: ["volume"], surligne: [43], traits: [{ de: [5, 4040], a: [38, 4004], couleur: "var(--cap-down)" }, { de: [11, 3956], a: [34, 3980], couleur: "var(--cap-up)" }] },
        legende: "Un triangle symétrique : à mesure que le prix se resserre, les barres de volume fondent. À la sortie, bougie 44, elles bondissent.",
      },

      { t: "h", texte: "Sur le forex, le volume de la plateforme" },
      { t: "p", html: "Ici, il faut être honnête. Une action se négocie sur <b>une bourse</b> : toutes les transactions y passent, et le volume affiché est le vrai volume du marché. Le forex, lui, n'a pas de bourse centrale : il se négocie <b>de gré à gré</b> (OTC, over the counter), entre des milliers de banques et de courtiers dans le monde. Personne ne connaît le volume total. L'or au comptant et la plupart des CFD sont dans le même cas." },
      { t: "p", html: "Ce que votre plateforme affiche alors, c'est <b>son propre volume</b> : souvent le nombre de variations de prix qu'elle a reçues pendant la bougie (le <span class=\"mot\">volume en ticks</span>, tick volume), ou les échanges de ses propres clients. <b>Pas tout le marché.</b> Ce volume suit souvent l'activité réelle : quand le marché s'agite, les prix changent plus souvent. Mais c'est une approximation." },
      {
        t: "tableau",
        entetes: ["Le marché", "Ce que montre le volume", "Ce qu'il vaut"],
        lignes: [
          ["Actions, contrats à terme (bourse)", "Toutes les transactions de la bourse", "Une vraie mesure"],
          ["Forex, or au comptant, CFD", "Le volume de la plateforme, souvent en ticks", "Une approximation de l'activité"],
          ["Cryptomonnaies", "Le volume de la plateforme d'échange choisie", "Une partie du marché seulement"],
        ],
        legende: "Comparez toujours le volume d'une plateforme à lui-même : une bougie face aux précédentes, jamais une plateforme face à une autre.",
      },

      { t: "h", texte: "Un indice, pas une preuve" },
      { t: "p", html: "Le volume <b>renforce</b> une lecture ; il ne la remplace pas. Une cassure avec un gros volume peut échouer quand même. Une cassure sans volume peut très bien continuer, par exemple pendant une heure calme de la journée (leçon 12). Le volume vous aide à <b>choisir lesquelles prendre</b> et à <b>vous méfier</b> de certaines. Il ne dit jamais ce que fera le prix." },
      {
        t: "outil",
        titre: "Crédible ou à surveiller ?",
        consigne: "Quatre cassures de 4 000 $, avec leur volume. Jugez la cassure d'après son volume, puis regardez la suite.",
        el: <GrapheDecision question="D'après son volume, cette cassure est-elle crédible ?" cas={[
          {
            titre: "Premier cas", cfg: { bougies: casA, niveaux: [plafond], panneaux: ["volume"], jusqua: 40, surligne: [40] }, choix, bon: 0,
            explication: "Volume de près de trois fois la moyenne, clôture nette au-dessus : beaucoup de monde a suivi. Crédible, et le prix a confirmé.",
          },
          {
            titre: "Deuxième cas", cfg: { bougies: casB, niveaux: [plafond], panneaux: ["volume"], jusqua: 40, surligne: [40] }, choix, bon: 1,
            explication: "Une sortie timide, avec moins de volume qu'une heure ordinaire : à surveiller. Le prix est retombé sous 4 000 $.",
          },
          {
            titre: "Troisième cas", cfg: { bougies: casC, niveaux: [plafond], panneaux: ["volume"], jusqua: 40, surligne: [40] }, choix, bon: 0,
            explication: "Gros volume, belle clôture : crédible, d'après tout ce qu'on sait. Et pourtant, le prix est retombé. <b>Un indice, pas une preuve</b> : le stop sous 4 000 $ limite la perte.",
          },
          {
            titre: "Quatrième cas", cfg: { bougies: casD, niveaux: [plafond], panneaux: ["volume"], jusqua: 40, surligne: [40] }, choix, bon: 1,
            explication: "Volume faible : à surveiller. Le prix a pourtant continué. « À surveiller » ne veut pas dire « fausse » : on attendait une confirmation, comme le retour sur le niveau, et elle est venue.",
          },
        ]} />,
      },
      { t: "piege", html: "<b>Prendre le volume pour un signal à lui seul.</b> Une barre géante ne dit pas d'acheter : elle peut accompagner une chute aussi bien qu'une hausse, ou marquer la fin d'un mouvement, quand les derniers retardataires entrent. Lisez-le <b>avec</b> le prix : un niveau, une clôture, un retour. Et sur le forex, souvenez-vous qu'il s'agit du volume de votre plateforme." },
      { t: "nimbo", texte: "Sur la page Analyse, la ligne « Volume » compare le volume récent d'un actif à sa moyenne (par exemple 1,8×). Au-dessus de 1, il s'échange plus que d'habitude. C'est un indice de plus, que je ne lis jamais seul.", humeur: "pointe" },
    ],
  }],
  mots: [
    { terme: "Volume", en: "volume", def: "La quantité échangée pendant une bougie : actions, contrats ou lots qui ont changé de mains." },
    { terme: "Barres de volume", en: "volume bars", def: "Les barres sous le graphique, une par bougie, d'autant plus hautes que l'échange a été intense." },
    { terme: "Volume moyen", en: "average volume", def: "La moyenne des volumes des dernières bougies (souvent 20), pour savoir si une barre est forte ou faible." },
    { terme: "Volume en ticks", en: "tick volume", def: "Le nombre de variations de prix reçues par la plateforme pendant une bougie : le volume affiché sur le forex." },
    { terme: "Gré à gré", en: "over the counter, OTC", def: "Un marché sans bourse centrale, comme le forex : personne n'y voit le volume total." },
    { terme: "Confirmation", en: "confirmation", def: "Un indice de plus qui va dans le sens de votre lecture, comme un fort volume sur une cassure." },
  ],
  retenir: [
    "Le <b>volume</b>, c'est ce qui s'est échangé pendant une bougie : les barres sous le graphique.",
    "Il mesure <b>l'intérêt du marché</b> pour un mouvement, pas son sens.",
    "Une cassure avec <b>beaucoup de volume</b> est plus crédible ; <b>sans volume</b>, elle est à surveiller.",
    "Dans un range ou un triangle, le volume <b>baisse souvent</b>, puis se réveille à la sortie.",
    "Sur le forex, c'est <b>le volume de la plateforme</b>, souvent en ticks : pas tout le marché.",
    "Le volume est <b>un indice, pas une preuve</b> : il se lit avec le prix, jamais seul.",
  ],
  quiz: [
    { question: "Que représente une barre de volume ?", options: ["Le prix le plus haut de la bougie", "La quantité échangée pendant la bougie", "Le nombre de traders gagnants"], correct: 1, explanation: "Le volume, c'est ce qui a changé de mains entre l'ouverture et la clôture de la bougie." },
    { question: "Une cassure se fait avec trois fois le volume moyen. Qu'en pensez-vous ?", options: ["Elle est plus crédible : beaucoup de monde y a participé", "Elle va forcément continuer", "Le volume n'a aucun rapport"], correct: 0, explanation: "Un fort volume montre l'intérêt du marché : la cassure est plus crédible. Mais rien n'est garanti : c'est un indice, pas une preuve." },
    { question: "Dans un triangle, le volume baisse peu à peu. Qu'est-ce que cela dit ?", options: ["Que le prix va sortir par le bas", "Que le marché attend, souvent avant une sortie", "Que la plateforme est en panne"], correct: 1, explanation: "Le volume qui fond dans un range ou un triangle montre un marché qui retient son souffle. Il ne dit pas de quel côté il sortira." },
    { question: "Sur le forex, le volume affiché par votre plateforme est…", options: ["Le volume de tout le marché mondial", "Le volume de la plateforme, souvent en ticks, pas tout le marché", "Toujours faux"], correct: 1, explanation: "Le forex se négocie de gré à gré, sans bourse centrale. La plateforme montre son propre volume : une approximation utile, à comparer à lui-même." },
    { question: "Une cassure sans volume a continué quand même. Le volume s'est-il trompé ?", options: ["Oui, il ne sert à rien", "Non : « à surveiller » ne veut pas dire « fausse », c'est un indice", "Oui, il fallait vendre"], correct: 1, explanation: "Le volume donne des indices, pas des certitudes. Une cassure sans volume demande une confirmation ; elle peut très bien réussir." },
  ],
  pratique: [
    { texte: "Ouvrez l'analyse d'un actif et regardez son volume comparé à la moyenne.", href: "/analysis", bouton: "Ouvrir l'analyse" },
    { texte: "Repérez une cassure récente dans le scanner et regardez si elle s'est faite avec du volume.", href: "/scanner", bouton: "Ouvrir le scanner" },
  ],
};

export default lecon;
