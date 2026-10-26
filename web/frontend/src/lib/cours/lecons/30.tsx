import { serie, type Ancre, type Bougie } from "../marche";
import type { LeconSerie } from "../types";
import { GrapheDecision } from "@/components/cours/outils/GrapheDecision";
import { BougieQuiSeForme } from "@/components/cours/outils/BougieQuiSeForme";

// L'euro-dollar sous un plafond à 1,1000 : trois contacts, puis la bougie 40 décide.
const RANGE: Ancre[] = [[0, 1.0962], [5, 1.0945, "bas"], [10, 1.1, "haut"], [16, 1.0948, "bas"], [22, 1.0998, "haut"], [28, 1.0946, "bas"], [34, 1.0999, "haut"], [37, 1.0972], [39, 1.0991]];

/** Le range, puis une bougie de décision dessinée exactement ([o, h, l, c]), puis la suite. */
function cassure(graine: number, decision: [number, number, number, number], suite: Ancre[]): Bougie[] {
  const [o, h, l, c] = decision;
  const b = serie([...RANGE, [40, c], ...suite], { graine, bruit: 0.0006 });
  b[40] = { ...b[40], o, h, l, c };
  const s = b[41];
  b[41] = { ...s, o: c, h: Math.max(s.h, c, s.c), l: Math.min(s.l, c, s.c) };
  return b;
}

const vraie = cassure(301, [1.0991, 1.1033, 1.099, 1.103], [[44, 1.1052], [50, 1.1004, "bas"], [56, 1.106], [62, 1.1092]]);
const fausse = cassure(306, [1.0991, 1.1018, 1.0987, 1.0992], [[42, 1.0978], [46, 1.0962], [52, 1.0968], [58, 1.0938], [62, 1.0926]]);
const casA = cassure(302, [1.0993, 1.1031, 1.099, 1.1028], [[44, 1.105], [49, 1.1006, "bas"], [56, 1.1065], [62, 1.109]]);
const casB = cassure(303, [1.099, 1.1017, 1.0986, 1.0991], [[43, 1.0975], [48, 1.0958], [54, 1.0962], [62, 1.0925]]);
const casC = cassure(304, [1.0992, 1.1024, 1.0989, 1.1002], [[42, 1.099], [46, 1.0968], [54, 1.095], [62, 1.094]]);
const casD = cassure(305, [1.0994, 1.1026, 1.0992, 1.1022], [[42, 1.103], [45, 1.1005], [48, 1.098], [54, 1.0955], [62, 1.095]]);

const plafond = { prix: 1.1, zone: 0.0006, label: "Résistance 1,1000", couleur: "var(--cap-down)" };
const plancher = { prix: 1.1, zone: 0.0006, label: "Ancien plafond, nouveau plancher", couleur: "var(--cap-up)" };
const contacts = [{ i: 10, type: "point" as const, prix: 1.1 }, { i: 22, type: "point" as const, prix: 1.0998 }, { i: 34, type: "point" as const, prix: 1.0999 }];
const choix = ["Vraie cassure", "Fausse cassure, un piège"];

const lecon: LeconSerie = {
  numero: 30,
  accroche: "Le prix casse le plafond, et retombe aussitôt. Un piège. Comment le voir venir ?",
  promesse: "À la fin de cette leçon, vous saurez reconnaître une vraie cassure et une fausse, et vous aurez deux règles simples pour moins vous faire piéger.",
  parties: [{
    titre: "",
    blocs: [
      { t: "h", texte: "La cassure : le prix sort de sa zone" },
      { t: "p", html: "Une <span class=\"mot\">cassure</span> (breakout), c'est quand le prix <b>sort d'une zone qu'il respectait</b> : il passe au-dessus d'une résistance, ou sous un support (leçon 33). Le plafond qui l'arrêtait depuis des jours ne l'arrête plus. C'est souvent le début d'un nouveau mouvement, et beaucoup de traders veulent en profiter." },
      {
        t: "scenes",
        titre: "Un plafond, puis la sortie",
        scenes: [
          { legende: "L'euro-dollar bute trois fois sous <b>1,1000</b>.", cfg: { bougies: vraie, unite: "heure", jusqua: 39, marques: contacts } },
          { legende: "C'est une résistance : les vendeurs défendent ce plafond.", cfg: { bougies: vraie, unite: "heure", jusqua: 39, marques: contacts, niveaux: [plafond] } },
          { legende: "Puis une bougie passe au-dessus, et <b>clôture à 1,1030</b>, avec un grand corps vert : le prix est sorti.", cfg: { bougies: vraie, unite: "heure", jusqua: 40, marques: contacts, niveaux: [plafond], surligne: [40] } },
          { legende: "La hausse continue. Le plafond est cassé.", cfg: { bougies: vraie, unite: "heure", jusqua: 46, niveaux: [plafond], surligne: [40] } },
        ],
      },

      { t: "h", texte: "La vraie cassure se voit à la clôture" },
      { t: "p", html: "Une vraie cassure se juge quand la bougie est <b>fermée</b>, sur son prix de clôture. La bougie ferme <b>nettement de l'autre côté du niveau</b>, avec un <b>corps franc</b> : pas un pip au-dessus, mais une vraie distance, et un corps qui occupe l'essentiel de la bougie. Les acheteurs ont gardé le contrôle jusqu'à la dernière seconde." },
      { t: "h", texte: "La fausse cassure : un dépassement, puis le retour" },
      { t: "p", html: "La <span class=\"mot\">fausse cassure</span> (fakeout), c'est l'inverse. Le prix <b>dépasse le niveau, puis revient dedans</b>, souvent en laissant une <b>longue mèche</b> au-dessus du plafond. Pendant quelques minutes, tout le monde a cru à la sortie. À la clôture, il n'en reste qu'une mèche." },
      {
        t: "scenes",
        titre: "Le même plafond, une autre histoire",
        scenes: [
          { legende: "Le même plafond à 1,1000, touché trois fois.", cfg: { bougies: fausse, unite: "heure", jusqua: 39, niveaux: [plafond], marques: contacts } },
          { legende: "Une bougie monte jusqu'à <b>1,1018</b>, au-dessus du plafond… puis retombe et clôture à <b>1,0992</b>, dessous. Il ne reste qu'une longue mèche.", cfg: { bougies: fausse, unite: "heure", jusqua: 40, niveaux: [plafond], surligne: [40] } },
          { legende: "La baisse suit. Le dépassement n'était qu'un piège.", cfg: { bougies: fausse, unite: "heure", niveaux: [plafond], surligne: [40] } },
        ],
      },
      {
        t: "tableau",
        entetes: ["", "Vraie cassure", "Fausse cassure"],
        lignes: [
          ["La clôture", "Nettement de l'autre côté du niveau", "Revenue dans la zone, ou à peine dehors"],
          ["Le corps", "Grand, franc", "Petit"],
          ["La mèche", "Courte du côté de la cassure", "Longue, au-delà du niveau"],
          ["Ensuite", "Le prix continue, ou revient tester le niveau puis repart", "Le prix repart dans l'autre sens"],
        ],
        legende: "Ce sont des indices, à lire ensemble. Aucun ne suffit seul.",
      },

      { t: "h", texte: "Qui se fait piéger, et comment" },
      { t: "p", html: "La fausse cassure piège ceux qui <b>achètent trop vite</b>. Ils voient le prix passer au-dessus du plafond et achètent aussitôt, de peur de rater le mouvement. Le prix redescend, et leur stop est touché. Pire : leurs ventes forcées (le stop est un ordre de vente) poussent le prix encore plus bas." },
      {
        t: "exemple",
        titre: "Le piège, en chiffres",
        html: "Le prix dépasse 1,1000. Vous achetez tout de suite, à <b>1,1010</b>, avec un stop de 20 pips à <b>1,0990</b> et <b>0,10 lot</b> (1 $ par pip). La bougie clôture à 1,0992, et la suivante descend à 1,0978 : votre stop est touché. <b>−20 $</b>, soit 1 % d'un compte de 2 000 $, pour une cassure qui n'a jamais eu lieu.",
      },
      {
        t: "outil",
        titre: "Une bougie en direct",
        consigne: "La bougie d'une heure se forme face au plafond. Achetez quand vous voulez, ou attendez qu'elle soit fermée. Essayez les deux bougies.",
        el: <BougieQuiSeForme avant={fausse.slice(28, 40)} niveau={{ prix: 1.1, label: "Résistance 1,1000", couleur: "var(--cap-down)" }} decimales={4}
          scenarios={[
            {
              nom: "Première bougie",
              chemin: [1.0991, 1.0994, 1.0998, 1.0996, 1.1002, 1.1006, 1.1004, 1.1011, 1.1015, 1.1018, 1.1012, 1.1009, 1.1006, 1.1003, 1.1, 1.0997, 1.0999, 1.0995, 1.0993, 1.0996, 1.0994, 1.0992],
              siAction: "Vous avez acheté au-dessus du plafond, et la bougie a fermé <b>dessous</b>, avec une longue mèche : c'était une fausse cassure. Votre stop risque fort d'être touché.",
              sansAction: "Bien vu : vous avez attendu. La bougie a fermé <b>sous le plafond</b>, avec une longue mèche au-dessus. Pas de cassure, donc pas d'achat, et pas de perte.",
            },
            {
              nom: "Deuxième bougie",
              chemin: [1.0991, 1.0995, 1.0993, 1.0999, 1.1004, 1.1002, 1.1008, 1.1013, 1.1011, 1.1017, 1.1021, 1.1019, 1.1024, 1.1027, 1.1025, 1.1029, 1.1033, 1.103, 1.1028, 1.1031, 1.103],
              siAction: "Cette fois, la cassure était vraie : clôture nette à 1,1030. Mais pendant la bougie, vous ne pouviez pas le savoir : la première bougie ressemblait à celle-ci à mi-parcours.",
              sansAction: "Clôture <b>nette au-dessus</b> du plafond, avec un grand corps : une vraie cassure. Vous entrez un peu plus cher qu'en pleine bougie, mais en sachant ce que vous achetez. Ou vous attendez le retour sur le niveau.",
            },
          ]} />,
      },

      { t: "h", texte: "Se protéger, règle 1 : attendre la clôture" },
      { t: "p", html: "Première règle : <b>attendez que la bougie soit fermée</b>. Tant qu'elle se forme, tout peut changer. <b>Une mèche au-dessus du niveau ne compte pas</b> : seule la clôture dit si le prix est vraiment sorti. Vous entrerez parfois un peu plus cher. C'est le prix d'une information de plus." },
      { t: "h", texte: "Se protéger, règle 2 : le retour sur le niveau" },
      { t: "p", html: "Après une vraie cassure, le prix <b>revient souvent tester le niveau</b> qu'il vient de casser. L'ancien plafond devient un plancher (leçon 33). C'est un endroit <b>plus sûr pour entrer</b> : le prix a prouvé qu'il tenait au-dessus, et votre stop peut se placer juste en dessous. Ce retour a un nom, le pullback : c'est la leçon 31." },
      {
        t: "scenes",
        titre: "Le retour sur le plafond cassé",
        scenes: [
          { legende: "La cassure à 1,1030, puis la hausse jusqu'à 1,1052.", cfg: { bougies: vraie, unite: "heure", jusqua: 45, niveaux: [plafond], surligne: [40] } },
          { legende: "Le prix revient doucement vers 1,1000… et s'arrête à <b>1,1004</b>, juste au-dessus.", cfg: { bougies: vraie, unite: "heure", jusqua: 50, niveaux: [plancher] } },
          { legende: "Il repart vers le haut. L'ancien plafond a servi de plancher : une entrée vers <b>1,1010</b>, avec un stop sous le niveau, était bien placée.", cfg: { bougies: vraie, unite: "heure", niveaux: [plancher], marques: [{ i: 51, type: "achat", label: "Entrée" }] } },
        ],
      },
      { t: "h", texte: "Et toujours, le stop de l'autre côté du niveau" },
      { t: "p", html: "Placez votre stop <b>de l'autre côté du niveau cassé</b> : sous l'ancien plafond si vous achetez. Si le prix y retourne, la cassure était fausse, et vous sortez avec <b>une petite perte</b>. Le stop n'est pas un aveu d'échec : c'est ce qui rend une erreur supportable." },
      {
        t: "exemple",
        titre: "Deux entrées, deux stops",
        html: "<b>Sur le retour</b> : vous achetez à 1,1010, stop à 1,0990, sous le niveau. 20 pips, 0,10 lot : vous risquez <b>20 $</b>.<br /><b>À la clôture de la cassure</b> : vous achetez à 1,1030, stop au même endroit, 1,0990. Cette fois, 40 pips : pour garder 20 $ de risque, il faut <b>0,05 lot</b>.<br />Même stop, même risque en dollars. L'entrée sur le retour permet simplement une position deux fois plus grande pour la même perte possible.",
      },
      {
        t: "outil",
        titre: "Vraie ou fausse cassure ?",
        consigne: "Quatre cassures. Le graphique s'arrête à la clôture de la bougie qui décide. Jugez-la, puis regardez la suite.",
        el: <GrapheDecision question="D'après cette bougie fermée, la cassure est-elle vraie ?" cas={[
          {
            titre: "Premier cas", cfg: { bougies: casA, niveaux: [plafond], jusqua: 40, surligne: [40] }, choix, bon: 0,
            explication: "Clôture à 1,1028, presque 30 pips au-dessus du plafond, avec un grand corps et une mèche courte : tous les signes d'une vraie cassure. Le prix est même revenu tester 1,1000 avant de repartir.",
          },
          {
            titre: "Deuxième cas", cfg: { bougies: casB, niveaux: [plafond], jusqua: 40, surligne: [40] }, choix, bon: 1,
            explication: "La mèche est montée à 1,1017, mais la bougie a clôturé à 1,0991, <b>sous</b> le plafond. Une mèche ne compte pas : il n'y a même pas eu de cassure.",
          },
          {
            titre: "Troisième cas", cfg: { bougies: casC, niveaux: [plafond], jusqua: 40, surligne: [40] }, choix, bon: 1,
            explication: "Clôture à 1,1002 : à peine 2 pips au-dessus, avec une longue mèche de 22 pips et un petit corps. Ce n'est pas une clôture <b>nette</b>. Les vendeurs ont repris presque tout le terrain : prudence, et le prix est retombé.",
          },
          {
            titre: "Quatrième cas", cfg: { bougies: casD, niveaux: [plafond], jusqua: 40, surligne: [40] }, choix, bon: 0,
            explication: "Selon la règle, c'était une vraie cassure : clôture nette à 1,1022, corps franc. Et pourtant, le prix est retombé sous 1,1000. Avec un stop à 1,0990, vous perdez 32 pips, environ 20 $ avec 0,06 lot. <b>Aucune règle n'évite toutes les fausses cassures</b> : le stop fait que celle-ci coûte peu.",
          },
        ]} />,
      },
      { t: "piege", html: "<b>Croire qu'une règle évite tous les pièges.</b> Attendre la clôture et guetter le retour élimine beaucoup de fausses cassures, pas toutes. Certaines clôtures nettes échouent quand même. Le but n'est pas de ne jamais se tromper : c'est <b>d'en éviter beaucoup, et de perdre peu sur les autres</b>, grâce au stop de l'autre côté du niveau." },
      {
        t: "qr",
        items: [
          { q: "Combien de pips au-delà du niveau pour une clôture « nette » ?", r: "Il n'y a pas de chiffre universel : cela dépend de l'actif et de l'unité de temps. Comparez à la taille des bougies habituelles : une clôture au-delà du niveau d'un bon morceau de bougie, avec un corps franc, est nette. Deux pips au-dessus après une longue mèche ne l'est pas." },
          { q: "Et une cassure par le bas ?", r: "Tout fonctionne à l'envers : le prix clôture nettement sous un support, l'ancien plancher devient un plafond, et le vendeur place son stop au-dessus du niveau cassé." },
          { q: "Le volume peut-il aider ?", r: "Oui, comme indice : une cassure avec beaucoup d'échanges est plus crédible qu'une cassure sans intérêt. C'est la leçon 37." },
        ],
      },
      { t: "nimbo", texte: "Dans votre journal, notez pour chaque cassure si vous avez attendu la clôture. Au bout de quelques semaines, comparez : c'est souvent très parlant.", humeur: "pointe" },
    ],
  }],
  mots: [
    { terme: "Cassure", en: "breakout", def: "La sortie du prix hors d'une zone qu'il respectait : au-dessus d'une résistance, ou sous un support." },
    { terme: "Fausse cassure", en: "fakeout", def: "Un dépassement du niveau suivi d'un retour dans la zone, souvent avec une longue mèche : un piège." },
    { terme: "Clôture", en: "close", def: "Le dernier prix d'une bougie, celui qui décide si le niveau est vraiment cassé." },
    { terme: "Corps", en: "body", def: "La partie épaisse de la bougie, entre l'ouverture et la clôture." },
    { terme: "Retour sur le niveau", en: "retest", def: "Le prix qui revient tester le niveau qu'il vient de casser, souvent avant de repartir." },
    { terme: "Stop", en: "stop loss", def: "L'ordre qui vous sort automatiquement avec une petite perte si le prix va contre vous." },
  ],
  retenir: [
    "Une <b>cassure</b>, c'est le prix qui sort d'une zone qu'il respectait.",
    "La vraie se voit <b>à la clôture</b> : nettement de l'autre côté du niveau, avec un <b>corps franc</b>.",
    "La fausse dépasse puis revient, souvent avec une <b>longue mèche</b> : elle piège ceux qui achètent trop vite.",
    "Règle 1 : <b>attendre la clôture</b> ; une mèche au-delà du niveau ne compte pas.",
    "Règle 2 : <b>le retour sur le niveau</b>, souvent un endroit plus sûr pour entrer ; et le stop de l'autre côté du niveau.",
    "Aucune règle n'évite toutes les fausses cassures : <b>en éviter beaucoup, perdre peu sur les autres</b>.",
  ],
  quiz: [
    { question: "Une bougie monte au-dessus de la résistance, puis clôture en dessous. Qu'est-ce que c'est ?", options: ["Une vraie cassure", "Une fausse cassure : seule une mèche a dépassé", "Un nouveau support"], correct: 1, explanation: "Une mèche au-dessus du niveau ne compte pas. La bougie a clôturé dessous : le prix n'est pas sorti, c'est un piège typique." },
    { question: "À quoi reconnaît-on une vraie cassure ?", options: ["Le prix touche le niveau", "La bougie clôture nettement de l'autre côté, avec un corps franc", "Le prix dépasse le niveau d'un pip pendant une seconde"], correct: 1, explanation: "Elle se voit à la clôture : nettement au-delà du niveau, avec un grand corps. Les acheteurs ont gardé le contrôle jusqu'au bout." },
    { question: "Pourquoi attendre la fermeture de la bougie ?", options: ["Parce que la plateforme bloque les ordres avant", "Parce que tant qu'elle se forme, la mèche peut revenir dans la zone", "Parce que c'est moins cher"], correct: 1, explanation: "Pendant la bougie, le prix peut dépasser le niveau puis retomber. Seule la clôture dit si la cassure a eu lieu." },
    { question: "Après une vraie cassure d'un plafond, que fait souvent le prix ?", options: ["Il revient tester le niveau, qui sert alors de plancher", "Il ne revient jamais", "Il retourne au plus bas de l'année"], correct: 0, explanation: "Le retour sur le niveau est fréquent : l'ancien plafond devient un plancher, et c'est un endroit plus sûr pour entrer (leçon 31)." },
    { question: "Vous achetez une cassure. Où placer le stop ?", options: ["Très loin, pour ne jamais être touché", "De l'autre côté du niveau cassé", "Pas de stop : la cassure est confirmée"], correct: 1, explanation: "Sous l'ancien plafond : si le prix y retourne, la cassure était fausse, et vous sortez avec une petite perte prévue." },
  ],
  pratique: [
    { texte: "Repérez un plafond sur un graphique, et attendez une clôture nette avant d'acheter en fictif.", href: "/trading", bouton: "Prendre position" },
    { texte: "Notez vos cassures dans le journal : clôture attendue ou non, résultat.", href: "/journal", bouton: "Ouvrir le journal" },
  ],
};

export default lecon;
