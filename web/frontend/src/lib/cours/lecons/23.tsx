import type { LeconSerie } from "../types";
import { CapitalDemo } from "@/components/cours/outils/CapitalDemo";
import { FicheJournal, RelectureJournal } from "@/components/cours/outils/JournalDemo";
import { PretPourLeReel } from "@/components/cours/outils/PretPourLeReel";

const lecon: LeconSerie = {
  numero: 23,
  accroche: "Vous voulez vous entraîner à trader sans risquer votre argent ? Il existe un compte pour ça.",
  promesse: "À la fin de cette leçon, vous saurez régler un compte démo, vous en servir pour apprendre, tenir un journal de trading, connaître ses limites, et savoir quand passer au réel.",
  parties: [{
    titre: "",
    blocs: [
      { t: "h", texte: "Un compte avec de l'argent fictif" },
      { t: "p", html: "Un <span class=\"mot\">compte démo</span> (<em>demo account</em>) est un compte de trading avec de l'argent fictif. C'est <b>la même plateforme, avec les vrais prix</b>, en direct. Vous achetez, vous vendez, vous voyez vos gains et vos pertes… mais ils ne sont pas réels. On parle aussi de <span class=\"mot\">paper trading</span> : trader « sur le papier »." },
      { t: "p", html: "Presque toutes les plateformes en proposent un, gratuitement. C'est l'endroit idéal pour faire vos erreurs : <b>ici, une erreur ne coûte rien</b>." },
      { t: "h", texte: "Le premier réglage : la somme de départ" },
      { t: "p", html: "À l'ouverture, on vous demande souvent avec combien commencer, et la case propose parfois 100 000 $. C'est un piège. Avec une somme que vous n'avez pas, <b>vous prenez de mauvaises habitudes</b> : des positions trop grosses, des pertes qui ne vous font rien. <b>Mettez-y ce que vous déposeriez vraiment</b>, par exemple 2 000 $." },
      {
        t: "outil",
        titre: "Choisissez votre capital de démo",
        consigne: "Même règle partout : 1 % de risque, un stop de 20 pips sur l'euro-dollar. Changez le capital fictif et regardez la taille que vous apprenez à taper, puis ce qu'elle coûterait sur votre vrai compte.",
        el: <CapitalDemo />,
      },
      {
        t: "exemple",
        html: "Avec 100 000 $ fictifs, 1 % font 1 000 $. Avec un stop de 20 pips à 10 $ le pip par lot, la taille est 1 000 ÷ (20 × 10) = <b>5 lots</b>. Vous tapez « 5 » des dizaines de fois. Le jour où vous passez au réel avec 2 000 $, ce même ordre risque 1 000 $ : <b>la moitié du compte</b> sur un seul stop. Avec 2 000 $ en démo, la bonne taille est 20 ÷ 200 = <b>0,10 lot</b> : c'est elle que vos doigts doivent apprendre.",
      },
      { t: "h", texte: "À quoi il sert" },
      { t: "p", html: "D'abord, à <b>apprendre la plateforme</b>. Chaque plateforme range ses boutons à sa façon, et une erreur de bouton en réel coûte cher." },
      {
        t: "liste",
        items: [
          "<b>Acheter et vendre</b> : où sont les deux boutons, et quel prix chacun utilise (leçon 16).",
          "<b>Fermer une position</b> : sans en ouvrir une autre dans l'autre sens par erreur.",
          "<b>Changer la taille</b> : 0,10 lot et non 10 lots, une erreur de virgule qui arrive vraiment.",
        ],
      },
      { t: "p", html: "Ensuite, à <b>essayer ce que vous avez appris</b> : un ordre à cours limité qui attend son prix (leçon 14), un stop posé dès l'entrée (leçon 7), le calcul de votre taille (leçon 19). Vous vous trompez, vous recommencez : rien n'est perdu." },
      { t: "h", texte: "Tenir un journal de trading" },
      { t: "p", html: "Un <span class=\"mot\">journal de trading</span> (<em>trading journal</em>) est un carnet où vous notez chaque position. Pour chacune, quatre choses : <b>pourquoi vous entrez</b>, <b>votre stop</b>, <b>votre taille</b>, et <b>le résultat</b>. Le reste est facultatif." },
      {
        t: "outil",
        titre: "Remplissez une fiche",
        consigne: "Une position, quatre réponses. Le risque se calcule pendant que vous tapez (sur un compte de 2 000 $). Puis relisez la fiche.",
        el: <FicheJournal compte={2000} />,
      },
      { t: "p", html: "Une fiche seule ne dit pas grand-chose. <b>Relisez votre journal chaque semaine</b> : c'est là que vous voyez <b>l'erreur qui revient</b>. Celle que vous ne remarquez pas sur le moment, parce que chaque position a son excuse." },
      {
        t: "outil",
        titre: "Relisez une semaine",
        consigne: "Une semaine de démo sur l'euro-dollar, à 0,10 lot. Trouvez l'erreur qui revient.",
        el: <RelectureJournal />,
      },
      { t: "nimbo", texte: "CaptenTDB est lui-même un compte d'entraînement, en argent virtuel. Dans le Wallet, « Ajuster le solde » vous permet de partir de ce que vous déposeriez vraiment. Et la page Journal est prête : ce que vous attendiez avant d'entrer, ce qui s'est passé, et le résultat.", humeur: "pointe" },
      { t: "h", texte: "Ses limites" },
      { t: "p", html: "Le compte démo apprend beaucoup, mais il ne montre pas tout. Deux choses changent en réel." },
      {
        t: "tableau",
        entetes: ["", "En démo", "En réel"],
        lignes: [
          ["Les émotions", "Vous restez calme : l'argent n'est pas à vous.", "<b>La peur et l'avidité s'en mêlent</b> (leçon 11) : on coupe un gain trop tôt, on recule un stop."],
          ["L'exécution", "Votre ordre passe souvent tout de suite, au prix affiché.", "Il peut passer à un prix un peu moins bon : <b>le slippage</b> (leçon 22), surtout pendant les annonces."],
          ["L'argent", "Une perte de 200 $ est un chiffre.", "Une perte de 200 $ est un vrai manque."],
        ],
        legende: "La technique s'apprend en démo. Le calme, lui, se travaille en réel, petit.",
      },
      { t: "piege", html: "<b>Croire que vos résultats en démo seront vos résultats en réel.</b> Beaucoup de traders gagnent en démo puis perdent en réel : les mêmes règles, mais pas les mêmes mains. Et rien n'est garanti, ni dans un cas ni dans l'autre : <b>la plupart des particuliers perdent de l'argent sur les CFD</b>. Un bon mois en démo n'est pas une preuve." },
      { t: "h", texte: "Quand passer au réel" },
      { t: "p", html: "Pas après un bon trade : un bon trade est souvent de la chance. <b>Quand vous suivez votre plan (leçon 24), sans exception, pendant des semaines</b>. Pertes comprises : c'est quand ça va mal qu'on voit si on suit vraiment ses règles. Votre journal en est la preuve." },
      {
        t: "outil",
        titre: "Suis-je prêt pour le réel ?",
        consigne: "Six questions. Répondez honnêtement : il n'y a personne à convaincre.",
        el: <PretPourLeReel />,
      },
      {
        t: "exemple",
        titre: "Commencer petit",
        html: "Sur votre vrai compte de 2 000 $, commencez par exemple à <b>0,01 lot</b>. Sur l'euro-dollar, un pip vaut alors 0,10 $ : avec un stop de 20 pips, vous risquez <b>2 $</b>, soit <b>0,1 %</b> du compte. Vous découvrez vos émotions pour le prix d'un café. Puis montez doucement, sans jamais dépasser <b>1 % de risque</b> (20 $, avec 0,10 lot).",
      },
      {
        t: "qr",
        items: [
          { q: "Combien de temps rester en démo ?", r: "Il n'y a pas de durée magique. Le repère : plusieurs semaines où vous avez suivi votre plan sur chaque position, et un journal qui le montre." },
          { q: "Un compte démo expire-t-il ?", r: "Chez certaines plateformes, oui, après quelques semaines sans activité. On en rouvre un en quelques minutes." },
          { q: "Je gagne en démo, je peux doubler ma taille en réel ?", r: "Non. En réel, recommencez petit : les émotions changent la façon dont vous appliquez vos règles. Augmentez seulement quand vous suivez votre plan en réel aussi." },
        ],
      },
    ],
  }],
  mots: [
    { terme: "Compte démo", en: "demo account", def: "Un compte en argent fictif, sur la vraie plateforme et aux vrais prix." },
    { terme: "Trading sur le papier", en: "paper trading", def: "S'entraîner sans argent réel, en notant ses positions comme si elles l'étaient." },
    { terme: "Journal de trading", en: "trading journal", def: "Le carnet de vos positions : pourquoi vous entrez, votre stop, votre taille, le résultat." },
    { terme: "Glissement", en: "slippage", def: "L'écart entre le prix demandé et le prix obtenu, qui n'existe presque pas en démo (leçon 22)." },
    { terme: "Capital de départ", en: "starting balance", def: "La somme fictive du compte démo : réglez-la sur ce que vous déposeriez vraiment." },
  ],
  retenir: [
    "Le compte démo, c'est <b>la vraie plateforme, aux vrais prix, avec de l'argent fictif</b>.",
    "Premier réglage : <b>ce que vous déposeriez vraiment</b>, pas 100 000 $, sinon vos tailles seront fausses.",
    "Il sert à <b>apprendre la plateforme</b> et à <b>essayer</b> ordres, stops et calcul de taille : une erreur ne coûte rien.",
    "Tenez un <b>journal</b> (pourquoi, stop, taille, résultat) et <b>relisez-le chaque semaine</b>.",
    "Ses limites : <b>pas de vraies émotions</b>, et une exécution plus facile qu'en réel.",
    "Passez au réel quand vous <b>suivez votre plan depuis des semaines</b>, et <b>commencez petit</b> : 0,01 lot, jamais plus de 1 %.",
  ],
  quiz: [
    { question: "Vous déposeriez 2 000 $ en réel. Quel capital choisir en démo ?", options: ["100 000 $, pour voir grand", "2 000 $", "Le plus petit possible, 100 $"], correct: 1, explanation: "La même somme qu'en réel : vos tailles, vos gains et vos pertes ressemblent à ceux que vous aurez vraiment." },
    { question: "Avec 100 000 $ fictifs, 1 % de risque et un stop de 20 pips (10 $ le pip par lot), quelle taille prenez-vous l'habitude de taper ?", options: ["0,10 lot", "1 lot", "5 lots"], correct: 2, explanation: "1 000 $ ÷ (20 × 10) = 5 lots. Sur un vrai compte de 2 000 $, ce serait 1 000 $ de risque : la moitié du compte." },
    { question: "Que noter dans un journal de trading, au minimum ?", options: ["Seulement le résultat", "Pourquoi vous entrez, votre stop, votre taille et le résultat", "L'heure de votre café"], correct: 1, explanation: "Le résultat seul ne dit pas pourquoi. La raison et le stop permettent de comprendre une perte, et de voir l'erreur qui revient." },
    { question: "Qu'est-ce que le compte démo ne vous apprend pas bien ?", options: ["Où sont les boutons", "Le calcul de la taille", "Vos émotions quand l'argent est réel"], correct: 2, explanation: "En démo, on reste calme. En réel, la peur et l'avidité s'en mêlent, et l'exécution peut glisser (slippage)." },
    { question: "Quand passer au réel ?", options: ["Après un très bon trade", "Quand vous suivez votre plan sans exception depuis des semaines", "Dès la première semaine"], correct: 1, explanation: "Un bon trade peut être de la chance. La preuve, c'est des semaines de plan suivi, pertes comprises. Puis commencez petit, à 0,01 lot." },
  ],
  pratique: [
    { texte: "Réglez le solde de votre compte d'entraînement sur ce que vous déposeriez vraiment.", href: "/wallet", bouton: "Ouvrir le Wallet" },
    { texte: "Notez votre prochaine position d'entraînement dans le journal.", href: "/journal", bouton: "Ouvrir le journal" },
  ],
};

export default lecon;
