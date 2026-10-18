import { serie, type Bougie } from "../marche";
import type { LeconSerie } from "../types";
import { SimulateurAnnonce } from "@/components/cours/outils/SimulateurAnnonce";
import { CalendrierAnnonces } from "@/components/cours/outils/CalendrierAnnonces";

// L'euro-dollar en bougies d'une minute, de 14 h 10 à 14 h 49 : le calme, le saut de 14 h 30, l'aller-retour.
function annonce(): Bougie[] {
  const avant = serie([[0, 1.0998], [7, 1.1002], [13, 1.0999], [19, 1.1000]], { graine: 131, bruit: 0.00012, volume: 300, meche: 0.8 });
  const saut: Bougie[] = [
    { o: 1.1000, h: 1.1007, l: 1.0958, c: 1.0967, v: 3200 },
    { o: 1.0967, h: 1.0989, l: 1.0962, c: 1.0985, v: 2100 },
    { o: 1.0985, h: 1.0993, l: 1.0974, c: 1.0978, v: 1300 },
  ];
  const apres = serie([[0, 1.0978], [5, 1.0983], [11, 1.0976], [16, 1.0980]], { graine: 132, bruit: 0.00022, volume: 650, meche: 0.8 });
  apres[0].o = 1.0978;
  apres[0].h = Math.max(apres[0].h, apres[0].o);
  apres[0].l = Math.min(apres[0].l, apres[0].o);
  return [...avant, ...saut, ...apres];
}
const minute = annonce();
const avantNiveau = { prix: 1.1, label: "Avant l'annonce", couleur: "var(--cap-ink-3)" };
const stop = { prix: 1.098, label: "Stop à 1,0980", couleur: "var(--cap-down)" };

const lecon: LeconSerie = {
  numero: 13,
  accroche: "À 14 h 30, le prix a sauté d'un coup. Pourquoi ? Et comment savoir quand ça arrive ?",
  promesse: "À la fin de cette leçon, vous saurez lire un calendrier économique, repérer les annonces fortes, comprendre ce qui fait bouger le prix à leur sortie, et vous protéger de leurs pièges.",
  parties: [{
    titre: "",
    blocs: [
      { t: "h", texte: "Un chiffre officiel, à une heure précise" },
      { t: "p", html: "Une <span class=\"mot\">annonce économique</span> (en anglais, <em>economic news</em>), c'est <b>un chiffre officiel, publié à une heure fixée à l'avance</b>. Il dit comment va l'économie d'un pays : combien d'emplois ont été créés, de combien les prix ont monté, si la banque centrale change ses taux. Ces chiffres viennent d'organismes de statistiques ou des banques centrales, et ils tombent à la seconde près." },
      { t: "p", html: "Pourquoi le marché s'y intéresse autant ? Parce que ces chiffres changent ce que les grands acteurs attendent pour la suite, surtout pour les <b>taux d'intérêt</b>. Et quand les taux attendus changent, la valeur d'une monnaie change, en quelques secondes." },

      { t: "h", texte: "Le calendrier économique" },
      { t: "p", html: "Toutes ces annonces sont rangées dans le <span class=\"mot\">calendrier économique</span> (<em>economic calendar</em>) : une liste, jour par jour, avec l'heure, le pays, le nom de l'annonce et son <b>importance</b>, souvent notée de un à trois points (ou trois couleurs) : <b>faible, moyenne, forte</b>. Une annonce d'<span class=\"mot\">importance forte</span> (<em>high impact</em>) peut faire bouger le prix de dizaines de pips en une minute ; une annonce faible passe souvent inaperçue." },
      {
        t: "outil",
        titre: "Lire un calendrier",
        consigne: "Filtrez par importance, puis touchez une ligne pour savoir ce que mesure l'annonce.",
        el: <CalendrierAnnonces />,
      },

      { t: "h", texte: "Trois chiffres pour chaque annonce" },
      { t: "p", html: "Dans le calendrier, chaque annonce porte trois chiffres :" },
      {
        t: "liste",
        items: [
          "<b>Le précédent</b> (<em>previous</em>) : le chiffre de la fois d'avant. Il sert de point de comparaison, et il est parfois corrigé le jour même (on parle de révision).",
          "<b>Le prévu</b> (<em>forecast</em>) : ce que les économistes attendent, en moyenne. C'est ce que le marché a déjà en tête, et souvent déjà dans le prix.",
          "<b>Le publié</b> (<em>actual</em>) : le vrai chiffre, vide jusqu'à l'heure dite, puis rempli à la seconde où il tombe.",
        ],
      },
      {
        t: "exemple",
        html: "L'emploi américain du mois dernier : <b>150 000</b> emplois créés (le précédent). Les économistes en attendent <b>170 000</b> (le prévu). À 14 h 30, le chiffre tombe : <b>230 000</b> (le publié). C'est <b>60 000 de plus que prévu</b> : une vraie surprise.",
      },

      { t: "h", texte: "Les plus fortes : l'emploi, l'inflation, les taux" },
      {
        t: "tableau",
        entetes: ["Annonce", "Ce qu'elle mesure", "Quand (heure de Paris)"],
        lignes: [
          ["<b>NFP</b>, l'emploi américain", "Les emplois créés en un mois aux États-Unis, hors agriculture (<em>Non-Farm Payrolls</em>)", "En général le premier vendredi du mois, <b>14 h 30</b>"],
          ["<b>CPI</b>, l'inflation américaine", "La hausse des prix à la consommation (<em>Consumer Price Index</em>)", "Une fois par mois, souvent vers le milieu, <b>14 h 30</b>"],
          ["<b>Décision de taux de la Fed</b>", "Le taux directeur de la banque centrale américaine", "Huit fois par an, <b>20 h</b>, puis conférence de presse à 20 h 30"],
          ["<b>Décision de taux de la BCE</b>", "Le taux directeur de la Banque centrale européenne", "Huit fois par an, <b>14 h 15</b>, puis conférence de presse à 14 h 45"],
        ],
        legende: "14 h 30 à Paris, c'est 8 h 30 à New York. Pendant les semaines de décalage du changement d'heure, ces chiffres tombent à 13 h 30 (leçon 12).",
      },
      { t: "p", html: "Le <span class=\"mot\">NFP</span> et le <span class=\"mot\">CPI</span> tombent pendant le chevauchement de Londres et New York, quand le marché est déjà le plus actif. La <span class=\"mot\">décision de taux</span> (<em>interest rate decision</em>) de la <b>Fed</b> (la banque centrale des États-Unis) ou de la <b>BCE</b> (en anglais <em>ECB</em>, celle de la zone euro) est encore plus directe : le taux est le prix de l'argent, et il pèse sur toute la monnaie." },

      { t: "h", texte: "C'est la surprise qui fait bouger" },
      { t: "p", html: "Le marché n'attend pas l'annonce pour réfléchir : il a déjà intégré le chiffre prévu dans le prix. Ce qui le fait bouger, c'est <b>l'écart entre le publié et le prévu</b> : la <b>surprise</b>." },
      {
        t: "tableau",
        entetes: ["Prévu", "Publié", "Surprise", "Réaction la plus probable"],
        lignes: [
          ["170 000", "172 000", "Presque aucune", "Un petit aller-retour, puis rien de net"],
          ["170 000", "230 000", "Forte, à la hausse", "Dollar plus fort : l'euro-dollar baisse vite"],
          ["170 000", "90 000", "Forte, à la baisse", "Dollar plus faible : l'euro-dollar monte vite"],
        ],
        legende: "Un chiffre « bon » qui était déjà attendu ne fait presque rien. Un chiffre moyen mais inattendu peut tout faire bouger.",
      },
      { t: "p", html: "Pourquoi plus d'emplois renforcent-ils le dollar ? Une économie solide laisse moins de raisons à la Fed de baisser ses taux. Des taux plus hauts rendent le dollar plus intéressant à détenir. C'est une tendance, <b>pas une règle mécanique</b> : la révision du chiffre précédent, un détail du rapport ou une autre nouvelle du jour peuvent inverser la réaction." },

      { t: "h", texte: "À l'annonce : le saut, l'aller-retour, le spread, le slippage" },
      {
        t: "scenes",
        titre: "L'euro-dollar en bougies d'une minute, autour de 14 h 30",
        scenes: [
          { legende: "<b>14 h 29.</b> Le prix attend, dans un couloir de quelques pips. Le volume est faible : beaucoup de traders se sont retirés avant le chiffre.", cfg: { bougies: minute, jusqua: 19, niveaux: [avantNiveau], panneaux: ["volume"], unite: "minute" } },
          { legende: "<b>14 h 30.</b> Le chiffre tombe. Une seule bougie d'une minute fait <b>49 pips</b> : un sursaut vers le haut, puis la chute. C'est le <span class=\"mot\">saut</span> (<em>spike</em>).", cfg: { bougies: minute, jusqua: 20, niveaux: [avantNiveau], surligne: [20], panneaux: ["volume"], unite: "minute" } },
          { legende: "Un acheteur avait un <b>stop à 1,0980</b>. Le prix l'a traversé sans s'y arrêter : il a été exécuté plus bas, vers <b>1,0965</b>. C'est le slippage.", cfg: { bougies: minute, jusqua: 20, niveaux: [avantNiveau, stop], marques: [{ i: 20, type: "croix", prix: 1.0965, label: "Exécuté ici" }], panneaux: ["volume"], unite: "minute" } },
          { legende: "<b>14 h 31.</b> Le prix remonte de près de 20 pips : l'<b>aller-retour</b>. Ceux qui avaient vendu sur le saut prennent leurs gains, d'autres trouvent la baisse exagérée.", cfg: { bougies: minute, jusqua: 21, niveaux: [avantNiveau, stop], surligne: [21], panneaux: ["volume"], unite: "minute" } },
          { legende: "Puis le marché se calme, <b>plus bas qu'avant</b> : il a digéré la surprise. Le volume, lui, reste plus haut qu'avant l'annonce.", cfg: { bougies: minute, niveaux: [avantNiveau], panneaux: ["volume"], unite: "minute" } },
        ],
      },
      { t: "p", html: "Trois choses se passent en même temps, à chaque annonce forte :" },
      {
        t: "liste",
        numerotee: true,
        items: [
          "<b>Le prix saute</b>, souvent dans un sens puis dans l'autre. Le premier mouvement n'est pas toujours le bon.",
          "<b>Le spread s'élargit</b> : pendant quelques secondes, les fournisseurs de prix se protègent, et l'écart entre achat et vente peut être multiplié par cinq ou plus (leçon 16).",
          "<b>Un ordre peut passer plus loin</b> que le prix demandé : c'est le <span class=\"mot\">slippage</span> (le glissement). Quand le prix saute de 1,0980 à 1,0965 sans coter entre les deux, un stop à 1,0980 est exécuté au premier prix disponible.",
        ],
      },
      {
        t: "exemple",
        html: "Vous avez acheté l'euro-dollar à <b>1,1000</b> avec <b>0,10 lot</b> (un pip vaut 1 $), un stop à <b>1,0980</b> : 20 pips, soit <b>20 $</b>, 1 % de votre compte de 2 000 $. À 14 h 30, le prix saute de 1,1000 à 1,0965. Votre stop est exécuté à 1,0965 : <b>15 pips de slippage</b>, une perte de <b>35 $</b> au lieu de 20 $, soit 1,75 % du compte. Le stop a bien fonctionné, mais il ne garantit pas le prix.",
      },
      {
        t: "outil",
        titre: "Le simulateur d'annonce",
        consigne: "Choisissez l'annonce et le chiffre publié, faites un pronostic si vous voulez, puis publiez. Essayez un chiffre égal au prévu, puis une grosse surprise.",
        el: <SimulateurAnnonce />,
      },

      { t: "h", texte: "Le réflexe : le calendrier chaque matin" },
      {
        t: "liste",
        items: [
          "<b>Chaque matin</b>, ouvrez le calendrier et repérez les annonces fortes du jour, avec leur heure.",
          "Regardez celles qui concernent <b>vos marchés</b> : le dollar touche l'euro-dollar, l'or, les indices américains ; la BCE touche l'euro.",
          "<b>Juste avant une annonce forte</b>, méfiez-vous : beaucoup de traders n'ouvrent pas de position dans les minutes qui précèdent et qui suivent.",
          "Si vous êtes déjà en position, décidez <b>avant</b> : la garder en acceptant que le stop puisse glisser, réduire la taille, ou fermer. Ne retirez jamais votre stop pour « laisser passer » l'annonce.",
          "Le vendredi du NFP et le soir de la Fed, attendez-vous à un marché nerveux, même après le chiffre.",
        ],
      },
      { t: "piege", html: "<b>Trader l'annonce pour gagner vite.</b> Parier sur le sens du chiffre, c'est jouer à pile ou face avec un spread large et un slippage possible des deux côtés : même avec le bon pronostic, l'aller-retour peut toucher votre stop avant que le prix parte dans votre sens. Une annonce n'est pas une occasion garantie, c'est un moment où <b>le risque grandit</b>." },
      {
        t: "qr", items: [
          { q: "Pourquoi le prix bouge-t-il parfois avant l'heure ?", r: "Le marché se positionne sur le chiffre prévu, et certains réduisent leurs positions avant l'annonce. Mais le vrai saut arrive à la seconde de la publication." },
          { q: "Un bon chiffre fait-il toujours monter la monnaie ?", r: "Non. S'il était attendu, il est déjà dans le prix. Et si le chiffre précédent est corrigé à la baisse en même temps, la réaction peut s'inverser. Rien n'est garanti." },
          { q: "Combien de temps dure l'agitation ?", r: "Le gros du saut se joue en quelques secondes à quelques minutes. Le spread revient à la normale assez vite, mais le marché peut rester nerveux une heure ou plus, surtout après la Fed." },
          { q: "Et les annonces faibles ?", r: "Elles bougent rarement le prix seules. Elles comptent si elles surprennent beaucoup, ou si le marché attend justement ce chiffre-là." },
        ],
      },
      { t: "nimbo", texte: "L'Agenda macro du site liste les annonces de la semaine, avec leur heure de Paris et leur importance. Prenez l'habitude d'y jeter un œil chaque matin, avant d'ouvrir un graphique.", humeur: "pointe" },
    ],
  }],
  mots: [
    { terme: "Annonce économique", en: "economic news", def: "Un chiffre officiel sur l'économie, publié à une heure fixée à l'avance." },
    { terme: "Calendrier économique", en: "economic calendar", def: "La liste des annonces à venir, avec leur heure, leur pays et leur importance." },
    { terme: "Importance forte", en: "high impact", def: "Une annonce capable de faire bouger le prix de dizaines de pips en une minute." },
    { terme: "Précédent, prévu, publié", en: "previous, forecast, actual", def: "Le chiffre d'avant, celui qu'attendent les économistes, et le vrai chiffre, rempli à l'heure dite." },
    { terme: "NFP", en: "Non-Farm Payrolls", def: "L'emploi américain : les emplois créés en un mois hors agriculture, en général le premier vendredi du mois à 14 h 30." },
    { terme: "CPI", en: "Consumer Price Index", def: "L'inflation : la hausse des prix à la consommation, publiée chaque mois." },
    { terme: "Décision de taux", en: "interest rate decision", def: "Le taux directeur fixé par une banque centrale, la Fed aux États-Unis ou la BCE (ECB) en zone euro." },
    { terme: "Saut", en: "spike", def: "Le mouvement brutal du prix à la seconde de l'annonce, souvent suivi d'un aller-retour." },
    { terme: "Slippage", en: "slippage", def: "Un ordre exécuté plus loin que le prix demandé, parce que le prix a sauté sans coter entre les deux." },
  ],
  retenir: [
    "Une annonce économique est un <b>chiffre officiel publié à une heure précise</b>. Elles sont toutes dans le <b>calendrier économique</b>, avec leur importance : faible, moyenne, forte.",
    "Pour chacune, trois chiffres : <b>le précédent, le prévu, le publié</b>.",
    "Les plus fortes : <b>l'emploi américain (NFP) et l'inflation (CPI), souvent à 14 h 30</b>, et les <b>taux de la Fed et de la BCE</b>.",
    "Ce qui fait bouger, c'est <b>la surprise</b> : le publié comparé au prévu. Et la réaction n'est jamais garantie.",
    "À l'annonce, le prix <b>saute dans un sens puis dans l'autre</b>, le <b>spread s'élargit</b>, et un ordre peut passer plus loin : le <b>slippage</b>.",
    "Le réflexe : <b>le calendrier chaque matin</b>, et la méfiance juste avant une annonce forte.",
  ],
  quiz: [
    { question: "Le prévu est de 170 000 emplois, le publié de 172 000. À quoi vous attendez-vous ?", options: ["Un très grand mouvement", "Peu de chose : il n'y a presque pas de surprise", "Une fermeture du marché"], correct: 1, explanation: "Le marché avait déjà intégré 170 000. Avec 2 000 d'écart, il n'y a presque rien de neuf : souvent un petit aller-retour, sans direction nette." },
    { question: "À quelle heure de Paris tombent en général le NFP et le CPI ?", options: ["9 h", "14 h 30", "23 h"], correct: 1, explanation: "Ils sont publiés à 8 h 30 à New York, soit 14 h 30 à Paris (13 h 30 pendant les semaines de décalage du changement d'heure)." },
    { question: "Votre stop est à 1,0980. Le prix saute de 1,1000 à 1,0965 sans coter entre les deux. À quel prix sortez-vous ?", options: ["1,0980, comme prévu", "Vers 1,0965, au premier prix disponible", "Le stop est annulé"], correct: 1, explanation: "Un stop devient un ordre au marché quand il est touché : il passe au premier prix disponible. Les 15 pips d'écart, c'est le slippage." },
    { question: "Que fait souvent le spread à la seconde d'une annonce forte ?", options: ["Il s'élargit fortement, puis revient", "Il disparaît", "Il ne change jamais"], correct: 0, explanation: "Pendant quelques secondes, les fournisseurs de prix se protègent : l'écart entre achat et vente peut être multiplié par cinq ou plus." },
    { question: "Quel est le bon réflexe avant une annonce forte ?", options: ["Ouvrir une grosse position juste avant pour profiter du saut", "Retirer son stop pour ne pas être sorti par l'aller-retour", "Connaître l'heure grâce au calendrier, et se méfier juste avant"], correct: 2, explanation: "Le calendrier le matin, la méfiance avant le chiffre, et un stop toujours en place : c'est ce qui protège le mieux, même s'il peut glisser." },
  ],
  pratique: [
    { texte: "Ouvrez l'Agenda macro et notez les annonces fortes de la semaine, avec leur heure de Paris.", href: "/macro", bouton: "Ouvrir l'Agenda macro" },
    { texte: "Le jour d'une annonce forte, observez en argent fictif ce que fait le spread de l'euro-dollar.", href: "/trading", bouton: "Ouvrir le trading" },
  ],
};

export default lecon;
