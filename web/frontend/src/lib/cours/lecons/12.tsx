import { serie, type Ancre, type Bougie } from "../marche";
import type { LeconSerie } from "../types";
import { HorlogeSessions } from "@/components/cours/outils/HorlogeSessions";

/** Une journée faite de morceaux plus ou moins agités, recollés bout à bout. */
function morceaux(parts: { ancres: Ancre[]; bruit: number; volume: number; graine: number }[], recoller = true): Bougie[] {
  const out: Bougie[] = [];
  for (const p of parts) {
    const s = serie(p.ancres, { graine: p.graine, bruit: p.bruit, volume: p.volume, meche: 0.7 });
    if (recoller && out.length) {
      const b = s[0];
      b.o = out[out.length - 1].c;
      b.h = Math.max(b.h, b.o, b.c);
      b.l = Math.min(b.l, b.o, b.c);
    }
    out.push(...s);
  }
  return out;
}

// Une journée d'euro-dollar en bougies de 30 minutes, de minuit à minuit (heure de Paris, en hiver).
const journee = morceaux([
  { ancres: [[0, 1.0996], [6, 1.0992], [12, 1.0999], [17, 1.0995]], bruit: 0.00022, volume: 260, graine: 121 },
  { ancres: [[0, 1.0997], [3, 1.1012], [6, 1.1006], [9, 1.1024]], bruit: 0.0007, volume: 900, graine: 122 },
  { ancres: [[0, 1.1022], [1, 1.0986, "bas"], [3, 1.1004], [5, 1.0998], [7, 1.1031]], bruit: 0.0012, volume: 1700, graine: 123 },
  { ancres: [[0, 1.1028], [4, 1.1020], [9, 1.1024]], bruit: 0.00045, volume: 560, graine: 124 },
  { ancres: [[0, 1.1023], [1, 1.1022]], bruit: 0.0002, volume: 180, graine: 125 },
]);
const bas = 1.0968;
const bandes = [
  { i0: 2, i1: 19, p0: bas + 0.0007, p1: bas + 0.0011, label: "Tokyo", couleur: "var(--cap-ink-3)" },
  { i0: 18, i1: 35, p0: bas + 0.0001, p1: bas + 0.0005, label: "Londres", couleur: "var(--cap-ocean)" },
  { i0: 28, i1: 45, p0: bas - 0.0005, p1: bas - 0.0001, label: "New York", couleur: "var(--cap-ink-2)" },
];
const chevauchement = { i0: 28, i1: 35, p0: 1.0984, p1: 1.1036, couleur: "var(--cap-ambre)", label: "14 h à 18 h" };

// Le week-end : vendredi soir, puis la réouverture du dimanche, plus bas.
const weekEnd = morceaux([
  { ancres: [[0, 1.0992], [6, 1.0998], [11, 1.0996], [16, 1.1008], [19, 1.1015]], bruit: 0.0004, volume: 500, graine: 126 },
  { ancres: [[0, 1.0968], [4, 1.0975], [10, 1.0982]], bruit: 0.0006, volume: 400, graine: 127 },
], false);

const lecon: LeconSerie = {
  numero: 12,
  accroche: "À 3 heures du matin, le prix bouge à peine. À 15 heures, il s'agite. Pourquoi ?",
  promesse: "À la fin de cette leçon, vous saurez quelles places financières sont ouvertes à chaque heure, quand le marché est calme ou agité, et pourquoi le spread grandit la nuit.",
  parties: [{
    titre: "",
    blocs: [
      { t: "h", texte: "Un marché qui suit le soleil" },
      { t: "p", html: "Le forex n'a pas de bâtiment ni de cloche d'ouverture. Les devises s'échangent directement entre des banques, partout dans le monde. Quand la journée de travail se termine dans une ville, elle commence dans une autre, plus à l'ouest. Le marché passe ainsi <b>de ville en ville</b>, du dimanche soir au vendredi soir, sans s'arrêter." },
      { t: "p", html: "Chaque grande place a ses heures de bureau : c'est une <span class=\"mot\">session</span> (en anglais, <em>session</em>). On en retient trois : <b>Tokyo, Londres et New York</b>. Selon celles qui sont ouvertes, le marché est calme ou agité." },
      {
        t: "tableau",
        entetes: ["Session", "Heure de Paris, en hiver", "Heure de Paris, en été", "Pour l'euro-dollar"],
        lignes: [
          ["<b>Tokyo</b> (asiatique)", "1 h à 10 h", "2 h à 11 h", "Souvent calme"],
          ["<b>Londres</b>", "9 h à 18 h", "9 h à 18 h", "Le marché se réveille"],
          ["<b>New York</b>", "14 h à 23 h", "14 h à 23 h", "Agité au début, puis plus calme"],
          ["<b>Chevauchement</b> Londres et New York", "14 h à 18 h", "14 h à 18 h", "Souvent le plus agité"],
        ],
        legende: "Des heures approximatives : il n'y a pas d'horaire officiel, chaque banque a les siens. Retenez les ordres de grandeur.",
      },

      { t: "h", texte: "La nuit, Tokyo : la session asiatique" },
      { t: "p", html: "Pendant que vous dormez, c'est la <span class=\"mot\">session asiatique</span> (<em>Asian session</em>), menée par Tokyo, avec Sydney, Singapour et Hong Kong. Elle va à peu près de <b>1 h à 10 h, heure de Paris, en hiver</b>. Le yen japonais et le dollar australien y sont actifs. Pour l'euro, en revanche, c'est souvent <b>calme</b> : l'Europe dort, peu d'ordres sur sa monnaie, et le prix tourne dans un couloir étroit." },

      { t: "h", texte: "Vers 9 h, Londres : le marché se réveille" },
      { t: "p", html: "Vers 9 h, heure de Paris, Londres ouvre. C'est <b>la plus grande place du forex au monde</b> : une grosse part des échanges de devises y passe chaque jour. La <span class=\"mot\">session de Londres</span> (<em>London session</em>) dure jusque vers 18 h. Le volume grimpe d'un coup, le prix sort souvent du couloir de la nuit, et les chiffres européens (souvent publiés vers 10 h) donnent du mouvement." },
      { t: "p", html: "Pourquoi Londres et pas Paris ou Francfort ? Pour des raisons d'histoire : la ville est depuis longtemps le centre du commerce des devises, et les grandes banques y ont leurs salles de marché." },

      { t: "h", texte: "Vers 14 h, New York, et le chevauchement" },
      { t: "p", html: "Vers 14 h, heure de Paris, New York commence sa journée : c'est la <span class=\"mot\">session de New York</span> (<em>New York session</em>). Londres, elle, est encore ouverte jusque vers 18 h. Pendant ces quatre heures, les deux plus grandes places travaillent en même temps : c'est le <span class=\"mot\">chevauchement</span> (<em>overlap</em>)." },
      { t: "p", html: "C'est souvent <b>le moment le plus agité de la journée</b> : le plus de monde, donc le plus de <span class=\"mot\">liquidité</span> (<em>liquidity</em> : la quantité d'acheteurs et de vendeurs prêts à échanger), et souvent les plus grands mouvements. La <span class=\"mot\">volatilité</span> (<em>volatility</em> : la force des mouvements du prix) y est souvent la plus forte." },
      {
        t: "scenes",
        titre: "Une journée d'euro-dollar, de minuit à minuit",
        scenes: [
          { legende: "<b>La nuit</b>, avec Tokyo : le prix tient dans un couloir de quelques pips. Les barres du volume, en bas, sont petites.", cfg: { bougies: journee, jusqua: 17, zones: bandes.slice(0, 1), panneaux: ["volume"], unite: "demi-heure" } },
          { legende: "<b>9 h, Londres ouvre</b> : le volume grimpe, le prix sort du couloir et monte franchement.", cfg: { bougies: journee, jusqua: 27, zones: bandes.slice(0, 2), panneaux: ["volume"], unite: "demi-heure" } },
          { legende: "<b>14 h, New York arrive</b> : le chevauchement, en ambre. À 14 h 30, un chiffre américain fait plonger le prix, qui repart aussitôt. Le volume est au plus haut.", cfg: { bougies: journee, jusqua: 35, zones: [...bandes, chevauchement], panneaux: ["volume"], surligne: [29], unite: "demi-heure" } },
          { legende: "<b>Le soir</b>, Londres a fermé : New York seule, le marché se calme peu à peu, puis s'endort vers 23 h.", cfg: { bougies: journee, zones: [...bandes, chevauchement], panneaux: ["volume"], unite: "demi-heure" } },
        ],
      },
      { t: "p", html: "Ce graphique est un exemple : toutes les journées ne se ressemblent pas. Une nuit peut être agitée si une nouvelle tombe en Asie, et un après-midi peut rester calme si rien n'est publié. Mais le <b>rythme général</b>, calme la nuit, réveil à Londres, pic au chevauchement, est celui qu'on retrouve le plus souvent." },

      { t: "h", texte: "14 h 30 : les chiffres américains" },
      { t: "p", html: "Pendant le chevauchement tombent les grands chiffres de l'économie américaine : l'emploi, l'inflation, les ventes. Beaucoup sont publiés à <b>8 h 30 à New York, soit 14 h 30 à Paris</b>. À cet instant, le prix peut bouger en une minute plus qu'en toute la nuit. C'est le sujet de la leçon 13, les annonces économiques." },

      { t: "h", texte: "Le soir et la nuit : moins de monde, un spread plus large" },
      { t: "p", html: "À 18 h, Londres ferme. New York reste seule, et l'activité retombe. Vers <b>23 h</b>, New York ferme à son tour, avant que Tokyo n'ouvre. Ce creux est le moment où il y a le moins de monde : <b>moins de liquidité</b>." },
      { t: "p", html: "Moins de monde, c'est moins d'offres d'achat et de vente. L'écart entre le prix d'achat et le prix de vente, le <span class=\"mot\">spread</span>, peut alors <b>grandir</b> (la leçon 16 lui est consacrée). Et un prix peu suivi peut faire un saut brusque sur un ordre isolé." },
      {
        t: "exemple",
        html: "Sur l'euro-dollar, avec <b>0,10 lot</b>, un pip vaut 1 $. En plein après-midi, le spread est par exemple de <b>0,6 pip</b> : chaque trade vous coûte 0,60 $ à l'entrée. Vers 23 h, il peut passer à <b>2 pips</b> ou plus : 2 $ pour le même trade, plus de trois fois plus cher. Sur un stop de 20 pips (20 $ de risque, 1 % d'un compte de 2 000 $), ces 2 pips de départ représentent déjà un dixième du risque. Les chiffres varient selon le courtier ; l'écart entre le jour et la nuit, lui, se voit partout.",
      },

      { t: "h", texte: "Le week-end, le forex est fermé" },
      { t: "p", html: "Du vendredi vers 23 h au dimanche vers 23 h (heure de Paris), le forex est <b>fermé</b>. Vous ne pouvez ni ouvrir ni fermer une position. Si une nouvelle importante tombe pendant le week-end, le prix en tient compte d'un coup à la réouverture : il peut repartir d'un autre niveau que celui de vendredi soir. C'est un <span class=\"mot\">écart</span> (<em>gap</em>)." },
      {
        t: "graphique",
        cfg: { bougies: weekEnd, niveaux: [{ prix: 1.1015, label: "Clôture de vendredi", couleur: "var(--cap-ink-3)" }], notes: [{ i: 20, prix: 1.0968, texte: "Dimanche, 23 h", dessous: true }], unite: "heure" },
        legende: "Vendredi soir, l'euro-dollar ferme vers 1,1015. Dimanche, il rouvre à 1,0968 : 47 pips plus bas, sans avoir coté entre les deux. Un stop placé à 1,0990 n'aurait pas pu servir à 1,0990.",
      },
      { t: "p", html: "Les cryptos, elles, cotent tout le temps, week-end compris (leçon 2). Les actions et les indices suivent les horaires de leur bourse." },

      { t: "h", texte: "Au changement d'heure, tout peut bouger d'une heure" },
      { t: "p", html: "Toutes ces heures sont données à Paris. Mais Tokyo ne change pas d'heure, et l'Europe et les États-Unis ne changent pas le même jour : l'Europe le dernier dimanche de mars et d'octobre, les États-Unis le deuxième dimanche de mars et le premier de novembre." },
      {
        t: "liste",
        items: [
          "<b>Tokyo</b> ouvre vers 1 h en hiver, vers 2 h en été (pour Paris).",
          "<b>Londres et New York</b> changent d'heure comme Paris, ou presque : vers 9 h et 14 h toute l'année.",
          "Pendant <b>deux ou trois semaines en mars</b>, et <b>une semaine fin octobre</b>, les deux côtés de l'Atlantique sont décalés : New York ouvre vers 13 h et ferme vers 22 h, pour Paris. Les chiffres de 14 h 30 tombent alors à <b>13 h 30</b>.",
        ],
      },
      { t: "p", html: "Le réflexe : au moment du changement d'heure, vérifiez l'heure des annonces dans le calendrier plutôt que de vous fier à l'habitude." },

      {
        t: "outil",
        titre: "L'horloge des sessions",
        consigne: "Faites tourner l'heure, changez de jour et de saison, ou prenez l'heure réelle. L'outil dit quelles places sont ouvertes et ce que vous pouvez attendre du marché.",
        el: <HorlogeSessions />,
      },

      { t: "h", texte: "Ce que ça change pour vous" },
      { t: "p", html: "Les sessions ne disent pas où va le prix. Elles disent <b>quand il a des chances de bouger, et combien ça coûte de trader</b>. Choisissez vos heures en connaissance de cause :" },
      {
        t: "liste",
        items: [
          "Vous voulez des mouvements nets et un spread serré : le matin de Londres et le chevauchement sont les heures les plus actives.",
          "Vous ne pouvez trader que le soir : New York seule, plus calme. Des mouvements plus petits, donc des objectifs plus modestes.",
          "Vous tradez la nuit : attendez-vous à peu de mouvement sur l'euro, et à un spread plus large.",
          "Avant 14 h 30 et avant le week-end : demandez-vous si vous voulez vraiment être en position à ce moment-là.",
        ],
      },
      { t: "piege", html: "<b>Croire que l'agitation est une occasion.</b> Le chevauchement bouge davantage, mais <b>dans les deux sens</b> : un mouvement plus grand, c'est un gain possible plus grand, et une perte possible plus grande. Et la nuit « calme » a son propre piège : le spread large et les sauts sur un marché vide peuvent toucher un stop trop serré. Aucune heure n'est sûre ; certaines sont simplement plus prévisibles dans leur rythme." },
      {
        t: "qr", items: [
          { q: "Le forex est-il vraiment ouvert la nuit ?", r: "Oui, en semaine. C'est la session asiatique. Vous pouvez trader à 3 h du matin, mais pour l'euro le marché est souvent calme, avec un spread parfois plus large." },
          { q: "Et l'or ?", r: "L'or suit à peu près les mêmes horaires que le forex, avec une courte pause chaque soir vers 23 h, et il bouge surtout l'après-midi, quand Londres et New York sont ouverts (leçon 5)." },
          { q: "Les cryptos ont-elles des sessions ?", r: "Elles cotent 24 h sur 24 et 7 jours sur 7. Elles sont souvent plus actives quand l'Europe et les États-Unis sont réveillés, et plus calmes le week-end, mais rien ne ferme." },
          { q: "Faut-il trader seulement pendant le chevauchement ?", r: "Non. C'est un repère, pas une règle. Ce qui compte, c'est de savoir à quoi vous attendre à l'heure où vous tradez, et d'adapter votre stop et votre objectif." },
        ],
      },
      { t: "nimbo", texte: "Sur l'Agenda macro, les annonces du jour sont données à l'heure de Paris : un coup d'œil le matin vous dit ce qui tombera pendant le chevauchement.", humeur: "pointe" },
    ],
  }],
  mots: [
    { terme: "Session", en: "session", def: "Les heures de travail d'une grande place financière, pendant lesquelles ses banques échangent." },
    { terme: "Session asiatique", en: "Asian session", def: "La nuit pour Paris (vers 1 h à 10 h en hiver), menée par Tokyo. Souvent calme pour l'euro." },
    { terme: "Session de Londres", en: "London session", def: "De 9 h à 18 h environ, heure de Paris : la plus grande place du forex, le marché se réveille." },
    { terme: "Session de New York", en: "New York session", def: "De 14 h à 23 h environ, heure de Paris, avec les chiffres américains de 14 h 30." },
    { terme: "Chevauchement", en: "overlap", def: "Les heures où deux sessions sont ouvertes ensemble ; Londres et New York, de 14 h à 18 h, souvent le moment le plus agité." },
    { terme: "Volatilité", en: "volatility", def: "La force des mouvements du prix : faible quand il bouge peu, forte quand il bouge beaucoup." },
    { terme: "Liquidité", en: "liquidity", def: "La quantité d'acheteurs et de vendeurs prêts à échanger. Beaucoup de liquidité, c'est des échanges faciles et un spread serré." },
    { terme: "Spread", en: "spread", def: "L'écart entre le prix d'achat et le prix de vente. Il grandit souvent quand la liquidité baisse, la nuit ou aux annonces." },
  ],
  retenir: [
    "Le forex est ouvert jour et nuit en semaine, <b>de ville en ville</b> : ce sont les sessions.",
    "La nuit, <b>Tokyo</b> (vers 1 h à 10 h en hiver) : souvent calme pour l'euro.",
    "Vers <b>9 h, Londres</b>, la plus grande place du forex : le marché se réveille.",
    "De <b>14 h à 18 h</b>, Londres et New York ensemble : le chevauchement, souvent le plus agité, avec les chiffres de <b>14 h 30</b>.",
    "Vers <b>23 h</b>, New York ferme : moins de liquidité, le spread peut grandir. Le <b>week-end</b>, le forex est fermé.",
    "Au <b>changement d'heure</b>, les horaires peuvent bouger d'une heure : vérifiez le calendrier.",
  ],
  quiz: [
    { question: "Il est 3 h du matin à Paris, un mardi. Quelle session est ouverte ?", options: ["Londres", "La session asiatique, avec Tokyo", "Aucune, le forex est fermé"], correct: 1, explanation: "La nuit, c'est la session asiatique. Le forex est ouvert, mais souvent calme pour l'euro." },
    { question: "Quand le chevauchement de Londres et New York a-t-il lieu, heure de Paris ?", options: ["De 9 h à 11 h", "De 14 h à 18 h", "De 23 h à 1 h"], correct: 1, explanation: "New York ouvre vers 14 h et Londres ferme vers 18 h : quatre heures avec les deux plus grandes places ouvertes." },
    { question: "Pourquoi le spread grandit-il souvent vers 23 h ?", options: ["Parce que le courtier a envie de gagner plus", "Parce qu'il y a moins d'acheteurs et de vendeurs : moins de liquidité", "Parce que les prix sont plus hauts"], correct: 1, explanation: "Entre la fermeture de New York et l'ouverture de Tokyo, il y a peu de monde. Moins d'offres, c'est un écart plus large entre achat et vente." },
    { question: "Le forex ferme vendredi soir à 1,1015 et rouvre dimanche à 1,0968. Comment s'appelle ce saut ?", options: ["Un gap, un écart", "Un chevauchement", "Une session"], correct: 0, explanation: "Le prix n'a pas coté pendant le week-end : il repart d'un autre niveau. C'est un écart, ou gap, et un stop ne peut pas être exécuté au milieu." },
    { question: "Fin octobre, l'Europe est passée à l'heure d'hiver, pas encore les États-Unis. Les chiffres américains de 14 h 30 tombent à…", options: ["14 h 30, comme toujours", "13 h 30, heure de Paris", "15 h 30, heure de Paris"], correct: 1, explanation: "Pendant cette semaine de décalage, New York est à cinq heures de Paris au lieu de six : 8 h 30 là-bas, c'est 13 h 30 ici." },
  ],
  pratique: [
    { texte: "Regardez dans l'Agenda macro les annonces du jour et l'heure où elles tombent.", href: "/macro", bouton: "Ouvrir l'Agenda macro" },
    { texte: "Comparez le spread de l'euro-dollar l'après-midi et tard le soir, en argent fictif.", href: "/trading", bouton: "Ouvrir le trading" },
  ],
};

export default lecon;
