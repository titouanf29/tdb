import { serie } from "../marche";
import type { LeconSerie } from "../types";
import { RisqueShort, SimulateurLongShort } from "@/components/cours/outils/SimulateurLongShort";
import { Situations } from "@/components/cours/outils/ElementsOrdres";

// L'or autour de 4 000 $ l'once (le prix d'exemple commun aux leçons).
const hausse = serie([[0, 4030], [6, 4012], [12, 4000, "bas"], [18, 4016], [24, 4008], [32, 4034], [40, 4046]], { graine: 151, bruit: 0.0012 });
const baisse = serie([[0, 3970], [6, 3988], [12, 4000, "haut"], [18, 3984], [24, 3992], [32, 3966], [40, 3954]], { graine: 152, bruit: 0.0012 });
const toucheTpLong = hausse.findIndex((b, i) => i > 12 && b.h >= 4040);
const toucheTpShort = baisse.findIndex((b, i) => i > 12 && b.l <= 3960);

const tableau = [
  { situation: "Vous êtes <b>long</b> (acheteur) et le prix <b>monte</b>.", options: ["En gain", "En perte"], correct: 0, pourquoi: "Vous avez acheté moins cher que le prix actuel : si vous revendez, vous gagnez la différence." },
  { situation: "Vous êtes <b>long</b> et le prix <b>baisse</b>.", options: ["En gain", "En perte"], correct: 1, pourquoi: "Ce que vous avez acheté vaut moins que ce que vous l'avez payé." },
  { situation: "Vous êtes <b>short</b> (vendeur) et le prix <b>baisse</b>.", options: ["En gain", "En perte"], correct: 0, pourquoi: "Vous avez vendu cher, et vous pouvez racheter moins cher : la différence est votre gain." },
  { situation: "Vous êtes <b>short</b> et le prix <b>monte</b>.", options: ["En gain", "En perte"], correct: 1, pourquoi: "Pour fermer, vous devez racheter plus cher que vous n'avez vendu : vous perdez la différence." },
  { situation: "Vous êtes <b>short</b> à 4 000 $. Où placer le stop loss ?", options: ["À 3 980 $, sous l'entrée", "À 4 020 $, au-dessus de l'entrée"], correct: 1, pourquoi: "Un short perd quand le prix monte : le stop loss se place au-dessus, là où votre idée est fausse. Le take profit, lui, va en dessous." },
];

const lecon: LeconSerie = {
  numero: 15,
  accroche: "Acheter quand ça monte, d'accord. Mais vendre quelque chose que vous n'avez pas ?",
  promesse: "À la fin de cette leçon, vous saurez ce que veulent dire long et short, comment on gagne à la baisse, où placer le stop dans les deux cas, et pourquoi la vente demande encore plus de prudence.",
  parties: [{
    titre: "",
    blocs: [
      { t: "p", html: "En trading, on peut gagner quand le prix monte, et aussi quand il baisse. Tout dépend du <b>sens</b> de votre position. Les traders disent <b>long</b> pour l'achat et <b>short</b> pour la vente. Nos exemples portent sur l'or, à <b>4 000 $ l'once</b>, avec une seule once pour que les calculs restent simples : quand l'or bouge de 1 $, vous gagnez ou perdez 1 $." },

      { t: "h", texte: "Acheter, c'est être long" },
      { t: "p", html: "Être <span class=\"mot\">long</span>, ou <em>go long</em> en anglais, c'est <b>acheter maintenant pour revendre plus tard, plus haut</b>. C'est le sens le plus naturel : celui de tout le monde qui achète une maison ou une action." },
      { t: "p", html: "Si le prix monte, votre position est <b>en gain</b>. S'il baisse, elle est <b>en perte</b>." },
      {
        t: "scenes",
        titre: "Un achat sur l'or, élément par élément",
        scenes: [
          { legende: "L'or revient sur 4 000 $ et rebondit : vous <b>achetez</b>. Vous êtes long.", cfg: { bougies: hausse, jusqua: 12, marques: [{ i: 12, type: "achat", label: "Achat" }], unite: "heure" } },
          { legende: "Le <b>stop loss</b> se place <b>sous</b> l'entrée, à 3 980 $ : si le prix y descend, votre idée était fausse.", cfg: { bougies: hausse, jusqua: 12, marques: [{ i: 12, type: "achat", label: "Achat" }], niveaux: [{ prix: 3980, label: "Stop loss 3 980", couleur: "var(--cap-down)" }], unite: "heure" } },
          { legende: "Le <b>take profit</b> se place <b>au-dessus</b>, à 4 040 $ : c'est votre objectif.", cfg: { bougies: hausse, jusqua: 12, marques: [{ i: 12, type: "achat", label: "Achat" }], niveaux: [{ prix: 3980, label: "Stop loss 3 980", couleur: "var(--cap-down)" }, { prix: 4040, label: "Take profit 4 040", couleur: "var(--cap-up)" }], unite: "heure" } },
          { legende: "Le prix monte et touche 4 040 $ : la position est fermée avec <b>40 $ de gain</b>. Il aurait pu descendre au stop : 20 $ de perte.", cfg: { bougies: hausse, marques: [{ i: 12, type: "achat" }, { i: toucheTpLong, type: "point", prix: 4040 }], niveaux: [{ prix: 3980, label: "Stop loss 3 980", couleur: "var(--cap-down)" }, { prix: 4040, label: "Take profit 4 040", couleur: "var(--cap-up)" }], unite: "heure" } },
        ],
      },

      { t: "h", texte: "Vendre, c'est être short" },
      { t: "p", html: "Être <span class=\"mot\">short</span>, ou <em>go short</em>, c'est l'inverse : <b>vous vendez d'abord, et vous rachetez plus tard</b>, si possible moins cher. Vous vendez à 4 000 $ ; si l'or tombe à 3 960 $, vous rachetez, et les 40 $ d'écart sont pour vous." },
      { t: "p", html: "Mais comment vendre ce qu'on n'a pas ? Avec un <span class=\"mot\">CFD</span> (<em>contract for difference</em>, contrat sur la différence). Un CFD est un <b>contrat sur le prix</b> : vous ne possédez pas d'or, vous échangez avec le courtier <b>la différence</b> entre le prix d'ouverture et le prix de fermeture. Vendre ou acheter, c'est simplement choisir dans quel sens cette différence vous paie." },
      { t: "qr", items: [
        { q: "Si je vends de l'or sans en avoir, à qui je le vends ?", r: "À personne, au sens physique. Avec un CFD, aucun lingot ne change de main : c'est un contrat avec votre courtier, réglé en argent. Vendre à 4 000 $ puis racheter à 3 960 $ vous rapporte 40 $ par once ; racheter à 4 040 $ vous en coûte 40." },
        { q: "Le short, c'est réservé aux professionnels ?", r: "Non : sur une plateforme de CFD, il suffit de cliquer sur « Vendre » au lieu d'« Acheter ». C'est justement pourquoi il faut comprendre ce qui change, à commencer par le stop." },
        { q: "Est-ce que vendre à découvert fait baisser le prix ?", r: "Une petite position ne change rien au prix. Le short sert à exprimer une idée : « je pense que ça va baisser ». Il ne la rend pas vraie." },
      ] },

      { t: "h", texte: "Pour un short, tout s'inverse" },
      {
        t: "tableau",
        entetes: ["", "Le prix monte", "Le prix baisse"],
        lignes: [
          ["<b>Long</b> (acheteur)", "<b style=\"color:var(--cap-up)\">En gain</b>", "<b style=\"color:var(--cap-down)\">En perte</b>"],
          ["<b>Short</b> (vendeur)", "<b style=\"color:var(--cap-down)\">En perte</b>", "<b style=\"color:var(--cap-up)\">En gain</b>"],
        ],
        legende: "Le même mouvement de prix fait gagner l'un et perdre l'autre.",
      },
      {
        t: "outil",
        titre: "Remplissez le tableau",
        consigne: "Pour chaque cas, dites si la position est en gain ou en perte.",
        el: <Situations items={tableau} titreFin="Le tableau est complet." />,
      },

      { t: "h", texte: "Le stop et l'objectif changent de côté" },
      { t: "p", html: "Le <span class=\"mot\">stop loss</span> se place toujours <b>du côté où vous perdez</b>, le <span class=\"mot\">take profit</span> du côté où vous gagnez. Pour un long, le stop loss est sous l'entrée et le take profit au-dessus. Pour un short, c'est l'inverse : <b>le stop loss au-dessus, le take profit en dessous</b>." },
      {
        t: "scenes",
        titre: "Une vente sur l'or, élément par élément",
        scenes: [
          { legende: "L'or bute sur 4 000 $ et repart vers le bas : vous <b>vendez</b>. Vous êtes short.", cfg: { bougies: baisse, jusqua: 12, marques: [{ i: 12, type: "vente", label: "Vente" }], unite: "heure" } },
          { legende: "Le stop loss va <b>au-dessus</b>, à 4 020 $ : si le prix y monte, votre idée était fausse.", cfg: { bougies: baisse, jusqua: 12, marques: [{ i: 12, type: "vente", label: "Vente" }], niveaux: [{ prix: 4020, label: "Stop loss 4 020", couleur: "var(--cap-down)" }], unite: "heure" } },
          { legende: "Le take profit va <b>en dessous</b>, à 3 960 $.", cfg: { bougies: baisse, jusqua: 12, marques: [{ i: 12, type: "vente", label: "Vente" }], niveaux: [{ prix: 4020, label: "Stop loss 4 020", couleur: "var(--cap-down)" }, { prix: 3960, label: "Take profit 3 960", couleur: "var(--cap-up)" }], unite: "heure" } },
          { legende: "Le prix baisse jusqu'à 3 960 $ : vous rachetez <b>40 $ moins cher</b> que vous n'avez vendu. Gain : 40 $.", cfg: { bougies: baisse, marques: [{ i: 12, type: "vente" }, { i: toucheTpShort, type: "point", prix: 3960 }], niveaux: [{ prix: 4020, label: "Stop loss 4 020", couleur: "var(--cap-down)" }, { prix: 3960, label: "Take profit 3 960", couleur: "var(--cap-up)" }], unite: "heure" } },
        ],
      },
      { t: "p", html: "Côté ordres (leçon 14), tout se retourne aussi : le stop loss d'un short est un <em>buy stop</em> (il rachète si le prix monte jusqu'à lui), son take profit un <em>buy limit</em> (il rachète plus bas)." },
      {
        t: "outil",
        titre: "Long ou short : faites bouger le prix",
        consigne: "Choisissez un sens, puis déplacez le prix. Regardez le gain ou la perte, et où passent le stop loss et le take profit quand vous changez de sens.",
        el: <SimulateurLongShort />,
      },
      { t: "exemple", html: "Un compte de <b>2 000 $</b>. Vous vendez une once d'or à <b>4 000 $</b>, stop loss à <b>4 020 $</b>, take profit à <b>3 960 $</b>. Si le prix monte au stop : perte de <b>20 $, 1 % du compte</b>. S'il baisse à l'objectif : gain de <b>40 $</b>. Les chiffres sont les mêmes qu'à l'achat, seulement dans l'autre sens." },

      { t: "h", texte: "Le risque n'est pas le même dans les deux sens" },
      { t: "p", html: "Quand vous achetez, le pire qui puisse arriver, c'est que le prix tombe <b>à zéro</b>. Il ne peut pas aller plus bas : la perte a une limite (4 000 $ pour une once achetée à 4 000 $)." },
      { t: "p", html: "Quand vous vendez, le prix peut <b>monter sans limite</b> : 5 000, 8 000, 12 000 $… Chaque dollar de hausse est un dollar de perte. C'est ce qu'on appelle un <span class=\"mot\">risque illimité</span> (<em>unlimited risk</em>). Ces extrêmes sont rares, mais un prix peut faire un bond brutal, sur une annonce ou une nouvelle inattendue." },
      {
        t: "outil",
        titre: "Sans stop, jusqu'où peut aller la perte ?",
        consigne: "Faites aller le prix de l'or de zéro à 12 000 $. Comparez la perte de l'acheteur et celle du vendeur.",
        el: <RisqueShort />,
      },
      { t: "piege", html: "<b>Vendre sans stop loss, en se disant que « ça finira par baisser ».</b> Le prix peut monter plus longtemps que votre compte ne peut tenir. Sur un short, le stop loss compte encore plus : posez-le avant d'ouvrir, au-dessus de l'entrée. Rien n'est garanti dans un sens comme dans l'autre." },
      { t: "p", html: "Une précision : à l'achat comme à la vente, il y a deux prix sur la plateforme, et l'écart entre eux vous coûte quelque chose à chaque trade. C'est le spread, et c'est la leçon 16." },
      { t: "nimbo", texte: "Sur la page Trading, vous choisissez Long ou Short avant d'ouvrir une position fictive. Essayez un short avec un stop au-dessus de l'entrée, et regardez-le vivre.", humeur: "pointe" },
    ],
  }],
  mots: [
    { terme: "Long", en: "long", def: "Une position acheteuse : elle gagne quand le prix monte." },
    { terme: "Short", en: "short", def: "Une position vendeuse : elle gagne quand le prix baisse." },
    { terme: "Acheter, prendre une position longue", en: "go long", def: "Acheter maintenant pour revendre plus tard, plus haut." },
    { terme: "Vendre à découvert", en: "go short", def: "Vendre d'abord pour racheter plus tard, si possible moins cher." },
    { terme: "CFD", en: "contract for difference", def: "Un contrat sur le prix : on échange la différence entre l'ouverture et la fermeture, sans rien posséder." },
    { terme: "Stop loss", en: "stop loss", def: "La sortie qui coupe la perte : sous l'entrée pour un long, au-dessus pour un short." },
    { terme: "Take profit", en: "take profit", def: "La sortie à l'objectif : au-dessus pour un long, en dessous pour un short." },
    { terme: "Risque illimité", en: "unlimited risk", def: "Le risque d'un short sans stop : le prix peut monter sans fin, la perte aussi." },
  ],
  retenir: [
    "<b>Long</b> : vous achetez, et vous voulez que le prix monte. <b>Short</b> : vous vendez, et vous voulez qu'il baisse.",
    "Avec un <b>CFD</b>, on peut vendre sans rien posséder : c'est un contrat sur la différence de prix.",
    "Pour un short, <b>tout s'inverse</b> : la hausse fait perdre, la baisse fait gagner.",
    "Long : stop loss <b>sous</b> l'entrée, take profit au-dessus. Short : stop loss <b>au-dessus</b>, take profit en dessous.",
    "À l'achat, la perte s'arrête à zéro ; à la vente, le prix peut monter <b>sans limite</b>.",
    "Sur un short, le stop loss compte encore plus : posez-le avant d'ouvrir.",
  ],
  quiz: [
    { question: "Vous êtes short sur l'or à 4 000 $. Le prix monte à 4 030 $. Où en êtes-vous (1 once) ?", options: ["En gain de 30 $", "En perte de 30 $", "À zéro"], correct: 1, explanation: "Un short gagne à la baisse. Pour fermer, il faut racheter à 4 030 $ ce que vous avez vendu 4 000 $ : 30 $ de perte." },
    { question: "Où se place le stop loss d'un short ?", options: ["Sous le prix d'entrée", "Au-dessus du prix d'entrée", "Au même prix que l'entrée"], correct: 1, explanation: "Un short perd quand le prix monte : le stop loss se place au-dessus, là où l'idée de baisse devient fausse." },
    { question: "Qu'est-ce qu'un CFD ?", options: ["Un lingot d'or qu'on achète", "Un contrat sur la différence de prix, sans rien posséder", "Une action d'une banque"], correct: 1, explanation: "Avec un CFD, on échange la différence entre le prix d'ouverture et le prix de fermeture. C'est ce qui permet de vendre ce qu'on n'a pas." },
    { question: "Pourquoi dit-on que le risque d'un short sans stop est illimité ?", options: ["Parce que le prix peut monter sans limite", "Parce que le prix peut descendre sous zéro", "Parce que le courtier l'interdit"], correct: 0, explanation: "À l'achat, la perte s'arrête quand le prix touche zéro. À la vente, chaque dollar de hausse est un dollar de perte, sans plafond." },
    { question: "Être long, c'est :", options: ["Garder une position longtemps", "Acheter pour revendre plus haut", "Vendre pour racheter plus bas"], correct: 1, explanation: "Long ne parle pas de durée mais de sens : c'est une position acheteuse, qui gagne quand le prix monte." },
  ],
  pratique: [
    { texte: "Ouvrez un short fictif, avec le stop loss au-dessus de l'entrée et le take profit en dessous.", href: "/trading", bouton: "Prendre position" },
    { texte: "Regardez l'analyse d'un actif : la tendance vous dit plutôt long, ou plutôt short ?", href: "/analysis", bouton: "Ouvrir l'analyse" },
  ],
};

export default lecon;
