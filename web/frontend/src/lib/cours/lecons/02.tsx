import { serie } from "../marche";
import type { LeconSerie } from "../types";
import { SemaineMarches } from "@/components/cours/outils/SemaineMarches";
import { ComparateurMarches } from "@/components/cours/outils/ComparateurMarches";
import { VolatiliteComparee } from "@/components/cours/outils/VolatiliteComparee";

// L'euro-dollar autour de 1,1000, en direct, pour ouvrir la leçon.
const euroDollar = serie([[0, 1.0962], [10, 1.0985], [18, 1.0974], [28, 1.1004], [34, 1.0993], [44, 1.1000]], { graine: 201, bruit: 0.0007 });
// L'or autour de 4 000 $ l'once.
const or = serie([[0, 3962], [8, 3990], [16, 3975], [26, 4018], [33, 3996], [44, 4000]], { graine: 202, bruit: 0.0022 });
// Le spread : l'achat au-dessus, la vente en dessous.
const spreadCours = serie([[0, 1.0998], [12, 1.10025], [20, 1.0999], [30, 1.1001]], { graine: 203, bruit: 0.00006 });

const lecon: LeconSerie = {
  numero: 2,
  accroche: "Forex, or, crypto, actions… Vous ne savez pas quoi trader ? À la fin de cette leçon, vous saurez choisir.",
  promesse: "À la fin de cette leçon, vous saurez ce qu'on achète sur chaque grand marché, quand il est ouvert, comment il bouge, et quel style de trading lui convient. Vous pourrez choisir le vôtre selon vos horaires, votre temps et votre rapport au risque.",
  parties: [{
    titre: "",
    blocs: [
      { t: "h", texte: "Le forex : des monnaies, par paires" },
      { t: "p", html: "Sur le <span class=\"mot\">forex</span> (de l'anglais <em>foreign exchange</em>, le change), on échange des monnaies. Toujours <b>l'une contre l'autre</b> : c'est une <span class=\"mot\">paire</span> (<em>pair</em>). La plus échangée au monde est l'euro contre le dollar, notée <b>EUR/USD</b>, ou euro-dollar." },
      { t: "p", html: "Son prix dit <b>combien de dollars vaut un euro</b>. À 1,1000, un euro s'échange contre 1,10 dollar. Si le prix monte à 1,1100, l'euro s'est renforcé face au dollar ; s'il baisse à 1,0900, il s'est affaibli. Acheter l'euro-dollar, c'est parier que l'euro va se renforcer face au dollar." },
      {
        t: "graphique",
        cfg: { bougies: euroDollar, vivant: true, unite: "heure", niveaux: [{ prix: 1.1, label: "1,1000", couleur: "var(--cap-ink-3)" }] },
        legende: "L'euro-dollar, autour de 1,1000 (cours d'exemple). La dernière bougie bouge comme en direct : le forex cote sans arrêt en semaine.",
      },

      { t: "h", texte: "L'or : le prix d'une once, en dollars" },
      { t: "p", html: "L'or, en anglais <span class=\"mot\">gold</span>, se note <b>XAU/USD</b> (XAU pour l'or, USD pour le dollar). Son prix est celui d'<b>une once</b>, environ 31 grammes, en dollars. Dans nos exemples, l'once vaut <b>4 000 $</b>. L'or a sa leçon à lui, en quatre parties : la leçon 5." },
      {
        t: "graphique",
        cfg: { bougies: or, unite: "heure", niveaux: [{ prix: 4000, label: "4 000 $", couleur: "var(--cap-ink-3)" }] },
        legende: "L'or autour de 4 000 $ l'once (cours d'exemple). Même dessin que l'euro-dollar, mais les mouvements sont bien plus grands en pourcentage, on le verra plus bas.",
      },

      { t: "h", texte: "La crypto, les actions et les indices" },
      { t: "p", html: "La <span class=\"mot\">crypto</span> regroupe les monnaies numériques : le <b>Bitcoin</b>, l'<b>Ethereum</b>… Leur prix se lit le plus souvent en dollars : « BTC/USD », combien de dollars vaut un bitcoin." },
      { t: "p", html: "Une <b>action</b> est un petit morceau d'entreprise : Airbus, Apple, LVMH. Un <span class=\"mot\">indice</span> (<em>index</em>) en regroupe plusieurs, pour donner la température d'une bourse entière :" },
      {
        t: "tableau",
        entetes: ["Indice", "Ce qu'il regroupe", "Bourse"],
        lignes: [
          ["<b>CAC 40</b>", "40 grandes entreprises françaises", "Paris"],
          ["<b>DAX</b>", "40 grandes entreprises allemandes", "Francfort"],
          ["<b>S&amp;P 500</b>", "500 grandes entreprises américaines", "New York"],
          ["<b>Nasdaq</b> (Nasdaq 100)", "100 grandes entreprises américaines, beaucoup de technologie", "New York"],
        ],
      },
      { t: "p", html: "Chez un courtier en ligne, on n'achète le plus souvent ni lingot, ni bitcoin, ni vraie action : on trade un <b>contrat sur leur prix</b>, souvent un CFD. On gagne ou on perd sur le mouvement, à la hausse comme à la baisse (leçons 5 et 15)." },

      { t: "h", texte: "Quand chaque marché est ouvert" },
      { t: "p", html: "Un marché ne se trade que lorsqu'il est ouvert. Et tous n'ont pas les mêmes horaires :" },
      {
        t: "liste",
        items: [
          "<b>Le forex</b> tourne presque <b>24 h sur 24, en semaine</b>, de ville en ville : du dimanche vers 23 h au vendredi vers 23 h, heure de Paris. Chaque grande place a sa <span class=\"mot\">session</span> (Tokyo, Londres, New York, leçon 12).",
          "<b>L'or</b> suit à peu près le forex, avec une courte pause chaque soir vers 23 h.",
          "<b>La crypto</b> ne ferme jamais : <b>24 h sur 24 et 7 jours sur 7</b>, week-end compris.",
          "<b>Les actions et les indices</b> suivent leur bourse : Paris et Francfort de <b>9 h à 17 h 30</b>, New York de <b>15 h 30 à 22 h</b>, heure de Paris.",
        ],
      },
      { t: "p", html: "Le moment le plus actif de la journée ? Quand <b>Londres et New York sont ouverts ensemble</b>, de 14 h à 18 h environ, heure de Paris." },
      {
        t: "outil",
        titre: "Qu'est-ce qui est ouvert ?",
        consigne: "Choisissez un jour et une heure, ou touchez « Maintenant » : chaque bande montre les heures d'ouverture du jour, le trait ambre l'heure choisie.",
        el: <SemaineMarches />,
      },

      { t: "h", texte: "Comment il bouge : la volatilité" },
      { t: "p", html: "La <span class=\"mot\">volatilité</span> (<em>volatility</em>), c'est <b>la force des mouvements</b>. Un marché volatil fait de grands écarts, vite ; un marché peu volatil avance à petits pas. En gros : <b>le forex est plutôt calme, l'or bouge beaucoup, et la crypto encore plus</b>. Les indices sont entre les deux." },
      { t: "p", html: "Attention, un graphique normal trompe : il remplit toujours toute sa hauteur, qu'un marché ait bougé de 0,5 % ou de 10 %. Pour comparer, il faut les mettre <b>sur la même échelle</b>, en pourcentage." },
      {
        t: "outil",
        titre: "Trois marchés, une seule échelle",
        consigne: "Rejouez la semaine et isolez chaque marché : regardez qui fait les plus grands écarts.",
        el: <VolatiliteComparee />,
      },
      { t: "p", html: "Un marché très volatil n'est ni meilleur ni pire : il demande <b>un stop plus large et une taille plus petite</b> pour risquer la même somme. C'est tout le sujet de la gestion du risque (leçon 7)." },

      { t: "h", texte: "Ce que coûte un trade : le spread" },
      { t: "p", html: "À chaque trade, vous payez le <span class=\"mot\">spread</span> : <b>l'écart entre le prix d'achat et le prix de vente</b>. Vous achetez un peu plus cher que le prix du milieu, vous vendez un peu moins cher. Dès l'ouverture, une position commence donc légèrement en perte (la leçon 16 détaille tout)." },
      {
        t: "scenes",
        titre: "Deux prix, pas un seul",
        scenes: [
          { legende: "Le cours affiché, ici 1,1001 à la dernière minute, est un prix « du milieu ».", cfg: { bougies: spreadCours, type: "ligne", unite: "minute" } },
          { legende: "À cet instant, celui qui achète paie le prix d'achat (<em>ask</em>), un peu au-dessus : 1,10013.", cfg: { bougies: spreadCours, type: "ligne", unite: "minute", niveaux: [{ prix: 1.10013, label: "Achat 1,10013", couleur: "var(--cap-up)", pointille: false }] } },
          { legende: "Celui qui vend reçoit le prix de vente (<em>bid</em>), un peu en dessous. L'écart, ici 0,6 pip, c'est le spread.", cfg: { bougies: spreadCours, type: "ligne", unite: "minute", niveaux: [{ prix: 1.10013, label: "Achat 1,10013", couleur: "var(--cap-up)", pointille: false }, { prix: 1.10007, label: "Vente 1,10007", couleur: "var(--cap-down)", pointille: false }] } },
        ],
      },
      { t: "p", html: "Sur les grandes paires de devises, le spread est souvent le plus serré. Sur l'or, il est plus large en dollars ; sur la crypto, il peut l'être encore plus. Et partout, il grandit la nuit et aux annonces (leçons 12 et 13)." },

      { t: "h", texte: "L'effet de levier : il grossit tout" },
      { t: "p", html: "Avec l'<span class=\"mot\">effet de levier</span> (<em>leverage</em>), vous ne déposez qu'une partie de la valeur de la position, la <b>marge</b>, mais vous gagnez ou perdez sur la valeur entière. Il <b>multiplie les gains, et aussi les pertes</b>. En Europe, pour un particulier, il est plafonné :" },
      {
        t: "tableau",
        entetes: ["Marché", "Levier maximum (particulier, Europe)", "Ce que ça veut dire"],
        lignes: [
          ["Grandes paires de devises (EUR/USD…)", "<b>30</b>", "Une marge de 1/30 de la position, environ 3,3 %"],
          ["Or, grands indices (CAC 40, DAX, S&amp;P 500…)", "<b>20</b>", "Une marge de 5 %"],
          ["Actions", "<b>5</b>", "Une marge de 20 %"],
          ["Cryptos", "<b>2</b>", "Une marge de 50 %"],
        ],
        legende: "Les plafonds fixés pour les clients particuliers des courtiers européens. Le levier ne change pas ce que vous risquez sur un trade : c'est la taille de la position qui le fixe.",
      },
      {
        t: "exemple",
        html: "<b>0,10 lot d'euro-dollar</b>, c'est 10 000 €, soit 11 000 $ à 1,1000. Avec un levier de 30, la marge est de 11 000 / 30 ≈ <b>367 $</b>. Un mouvement de 20 pips vaut 20 $.<br/><b>0,10 lot d'or</b>, c'est 10 onces, soit 40 000 $ à 4 000 $ l'once. Avec un levier de 20, la marge est de 40 000 / 20 = <b>2 000 $</b> : tout un compte de 2 000 $ pour une seule position. Un mouvement de 20 $ sur l'once vaut alors 200 $, soit 10 % du compte.",
      },

      { t: "h", texte: "Quel style pour quel marché" },
      { t: "p", html: "Dernière question : combien de temps voulez-vous garder un trade ?" },
      {
        t: "liste",
        items: [
          "Le <span class=\"mot\">scalping</span> : quelques minutes, beaucoup de petits trades. Il demande un spread très serré : on le voit souvent <b>sur le forex</b>.",
          "Le <span class=\"mot\">day trading</span> : dans la journée, tout est fermé le soir. Souvent <b>sur l'or et les indices</b>, pendant leurs heures les plus actives.",
          "Le <span class=\"mot\">swing</span> : plusieurs jours, avec un coup d'œil quotidien. Souvent <b>sur la crypto et les actions</b>.",
        ],
      },
      {
        t: "tableau",
        entetes: ["Marché", "Horaires", "Nervosité", "Style souvent choisi"],
        lignes: [
          ["<b>Forex</b>", "24 h sur 24, du lundi au vendredi", "Plutôt calme", "Scalping, day trading"],
          ["<b>Or</b>", "Presque 24 h sur 24, du lundi au vendredi", "Forte", "Day trading"],
          ["<b>Crypto</b>", "24 h sur 24, 7 jours sur 7", "Très forte", "Swing"],
          ["<b>Actions, indices</b>", "Heures de bourse", "Moyenne", "Day trading, swing"],
        ],
        legende: "Le tableau à garder : vos horaires, la nervosité du marché, votre style.",
      },
      {
        t: "outil",
        titre: "Quel marché pour vous ?",
        consigne: "Répondez aux trois questions : les cinq marchés se classent, avec leurs raisons.",
        el: <ComparateurMarches />,
      },
      { t: "piege", html: "<b>Choisir le marché qui bouge le plus pour gagner plus vite.</b> Un marché nerveux fait gagner vite… et perdre vite. Pour débuter, mieux vaut un marché que vous pouvez suivre <b>à vos heures</b>, avec des mouvements que vous supportez. Et <b>changer de marché à chaque perte</b> empêche d'apprendre : restez sur un ou deux le temps de les connaître." },
      {
        t: "qr", items: [
          { q: "Quel est le meilleur marché ?", r: "Aucun. Le bon marché est celui qui est ouvert quand vous êtes libre, dont les mouvements vous laissent le temps de réfléchir, et que vous prenez le temps de connaître." },
          { q: "Peut-on trader plusieurs marchés ?", r: "Oui, mais pas au début. Chaque marché a ses horaires, ses annonces, ses habitudes. Mieux vaut en connaître un ou deux à fond." },
          { q: "Faut-il beaucoup d'argent ?", r: "Non : les courtiers proposent de petites tailles (0,01 lot). Mais un petit compte n'autorise que de petites positions si vous voulez limiter votre risque à 1 % (leçon 7). Commencez en démo, en argent fictif." },
          { q: "La crypto est-elle plus risquée ?", r: "Elle est plus volatile : ses écarts sont plus grands, et le levier y est limité à 2 pour cette raison. Le risque d'un trade, lui, dépend surtout de la taille et du stop que vous choisissez." },
        ],
      },
      { t: "nimbo", texte: "Le scanner du site passe en revue les marchés que vous choisissez : Europe, États-Unis, crypto, forex, matières premières. Comparez-y leurs mouvements du jour.", humeur: "pointe" },
    ],
  }],
  mots: [
    { terme: "Forex", en: "forex, foreign exchange", def: "Le marché des devises, où l'on échange une monnaie contre une autre." },
    { terme: "Paire", en: "pair (EUR/USD)", def: "Deux monnaies cotées l'une contre l'autre ; EUR/USD donne le prix d'un euro en dollars." },
    { terme: "Or", en: "gold (XAU/USD)", def: "Le prix d'une once d'or, environ 31 grammes, en dollars." },
    { terme: "Crypto", en: "crypto", def: "Les monnaies numériques comme le Bitcoin ou l'Ethereum, cotées 24 h sur 24, 7 jours sur 7." },
    { terme: "Indice", en: "index (CAC 40, DAX, S&P 500, Nasdaq)", def: "Un panier d'actions qui donne la température d'une bourse entière." },
    { terme: "Spread", en: "spread", def: "L'écart entre le prix d'achat et le prix de vente : ce que coûte chaque trade." },
    { terme: "Volatilité", en: "volatility", def: "La force des mouvements du prix." },
    { terme: "Session", en: "session", def: "Les heures de travail d'une grande place financière (Tokyo, Londres, New York)." },
    { terme: "Effet de levier", en: "leverage", def: "Trader une position plus grande que l'argent déposé : les gains et les pertes sont calculés sur la valeur entière." },
  ],
  retenir: [
    "Forex : des <b>paires de monnaies</b> (EUR/USD). Or : le prix d'une <b>once</b> en dollars. Crypto : Bitcoin, Ethereum. Indices : un <b>panier d'actions</b> (CAC 40, Nasdaq).",
    "Le forex et l'or : presque <b>24 h sur 24 en semaine</b>. La crypto : <b>7 jours sur 7</b>. Les actions et les indices : <b>les heures de leur bourse</b>.",
    "La <b>volatilité</b> : le forex plutôt calme, l'or bouge beaucoup, la crypto encore plus.",
    "À chaque trade, vous payez le <b>spread</b>. Le <b>levier</b> multiplie les gains et les pertes (30 sur les grandes paires, 20 sur l'or et les grands indices, 2 sur les cryptos).",
    "Le style : <b>scalping</b> (minutes), <b>day trading</b> (la journée), <b>swing</b> (plusieurs jours).",
    "Pour choisir, regardez trois choses : <b>vos horaires, la nervosité du marché, votre style</b>.",
  ],
  quiz: [
    { question: "L'euro-dollar cote 1,1000. Que signifie ce prix ?", options: ["Un dollar vaut 1,10 euro", "Un euro vaut 1,10 dollar", "L'euro a monté de 1,10 %"], correct: 1, explanation: "Une paire donne le prix de la première monnaie dans la seconde : un euro s'échange contre 1,10 dollar." },
    { question: "Vous n'êtes libre que le samedi. Quel marché est ouvert ?", options: ["Le forex", "Le CAC 40", "La crypto"], correct: 2, explanation: "Le week-end, le forex, l'or et les bourses sont fermés. Seule la crypto cote 7 jours sur 7." },
    { question: "Lequel de ces trois marchés est en général le plus volatil ?", options: ["L'euro-dollar", "L'or", "Le Bitcoin"], correct: 2, explanation: "Le forex est plutôt calme, l'or bouge beaucoup, et la crypto encore plus : ses écarts d'une journée se comptent souvent en pour cent." },
    { question: "Quel est le levier maximum sur l'or pour un particulier en Europe ?", options: ["2", "20", "100"], correct: 1, explanation: "20 sur l'or et les grands indices, 30 sur les grandes paires de devises, 2 sur les cryptos." },
    { question: "Vous voulez garder vos trades plusieurs jours, avec un coup d'œil par jour. Comment s'appelle ce style ?", options: ["Le scalping", "Le day trading", "Le swing"], correct: 2, explanation: "Le swing garde une position plusieurs jours. Le scalping dure quelques minutes, le day trading une journée." },
  ],
  pratique: [
    { texte: "Comparez les mouvements du jour sur plusieurs marchés avec le scanner.", href: "/scanner", bouton: "Ouvrir le scanner" },
    { texte: "Essayez un trade fictif sur l'euro-dollar, puis sur l'or, et comparez la marge demandée.", href: "/trading", bouton: "Ouvrir le trading" },
  ],
};

export default lecon;
