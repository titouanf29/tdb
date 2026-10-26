import type { LeconSerie } from "../types";
import { CalculFrais } from "@/components/cours/outils/CalculFrais";
import { CompareComptes } from "@/components/cours/outils/CompareComptes";

const lecon: LeconSerie = {
  numero: 21,
  accroche: "Le spread n'est pas votre seul coût. Deux autres frais se cachent sur votre ticket.",
  promesse: "À la fin de cette leçon, vous saurez lire la commission et le swap, compter les nuits d'un trade, et calculer ce que coûte vraiment une position gardée plusieurs jours.",
  parties: [{
    titre: "",
    blocs: [
      { t: "h", texte: "Trois frais, pas un seul" },
      { t: "p", html: "Vous connaissez déjà le spread, l'écart entre le prix d'achat et le prix de vente, payé à chaque trade (leçon 16). Mais sur le relevé d'une position, deux autres lignes apparaissent souvent : la <b>commission</b> et le <b>swap</b>. Pris un par un, ce sont de petits montants. Additionnés, sur un trade de plusieurs jours, ils peuvent manger une bonne part de ce que vous risquez." },
      {
        t: "tableau",
        entetes: ["Le frais", "Quand on le paie", "Sur 0,10 lot, dans nos exemples"],
        lignes: [
          ["Le spread", "Une fois, à l'entrée", "0,30 $ (0,3 pip)"],
          ["La commission", "À l'entrée et à la sortie, sur certains comptes", "0,70 $ (7 $ par lot)"],
          ["Le swap", "Chaque nuit où la position reste ouverte", "0,80 $ par nuit"],
        ],
        legende: "Chiffres d'exemple pour l'euro-dollar, avec un compte en dollars. Chaque courtier a les siens.",
      },

      { t: "h", texte: "La commission" },
      { t: "p", html: "La <span class=\"mot\">commission</span> est un montant fixe prélevé à chaque trade, en plus du spread. Tous les comptes n'en ont pas. Ceux qui en prennent offrent en échange <b>un spread plus serré</b>. C'est une autre façon de faire payer le même service." },
      {
        t: "exemple",
        html: "Une commission de <b>7 $ par lot</b>, aller-retour : la moitié en entrant (3,50 $), la moitié en sortant (3,50 $). Sur <b>0,10 lot</b>, un dixième : 0,35 $ à l'entrée, 0,35 $ à la sortie, <b>0,70 $</b> par trade.",
      },
      { t: "p", html: "Alors, quel compte choisir ? Ça dépend des chiffres. L'astuce : <b>convertissez la commission en pips</b>. Sur l'euro-dollar, un lot gagne ou perd 10 $ par pip : 7 $ par lot, c'est donc 0,7 pip. Un compte à 0,3 pip de spread plus 7 $ de commission coûte comme un spread de 1 pip." },
      {
        t: "outil",
        titre: "Standard ou à commission ?",
        consigne: "Changez le spread du compte standard et votre nombre de trades par mois, et regardez lequel coûte le moins.",
        el: <CompareComptes />,
      },

      { t: "h", texte: "Le swap, le prix d'une nuit" },
      { t: "p", html: "Le <span class=\"mot\">swap</span> (on dit aussi frais de financement) tombe la nuit. Si votre position est encore ouverte vers <b>23 h</b>, heure de Paris, au moment où le marché passe d'une journée à la suivante, vous payez une nuit de swap. Une position gardée ainsi d'un jour à l'autre est une position <span class=\"mot\">overnight</span>. Une position ouverte et fermée dans la journée ne paie aucun swap." },
      { t: "p", html: "D'où vient-il ? De l'écart entre les <b>taux d'intérêt</b> des deux monnaies. Acheter l'euro-dollar, c'est en quelque sorte détenir des euros financés par des dollars empruntés : vous touchez le taux de l'euro, vous payez celui du dollar. Si le taux du dollar est plus haut, la différence vous coûte chaque nuit. À la vente, c'est l'inverse." },
      { t: "p", html: "Selon le sens de votre trade, le swap est donc <b>un coût, ou parfois un petit gain</b>. Parfois seulement : le courtier garde aussi sa marge sur le swap, si bien que le sens qui reçoit reçoit peu, et que souvent les deux sens paient. Votre plateforme affiche les deux valeurs, swap acheteur et swap vendeur, dans la fiche de chaque actif. Elles changent avec les taux." },

      { t: "h", texte: "Le mercredi, trois nuits d'un coup" },
      { t: "p", html: "Sur le forex, le swap du mercredi soir compte souvent <b>trois fois</b> : c'est le <span class=\"mot\">triple swap</span>. La raison est technique : les échanges de devises se règlent deux jours ouvrés plus tard. Une position gardée le mercredi soir se règle le lundi suivant, par-dessus le week-end : trois jours d'intérêts. Le week-end est donc payé le mercredi, et une semaine entière compte <b>sept nuits</b> de swap pour cinq soirs. D'autres marchés (certains indices, par exemple) le comptent plutôt le vendredi : vérifiez sur votre plateforme." },
      {
        t: "tableau",
        entetes: ["Le soir du…", "Nuits de swap comptées"],
        lignes: [["Lundi", "1"], ["Mardi", "1"], ["Mercredi", "<b>3</b>"], ["Jeudi", "1"], ["Vendredi", "1"]],
        legende: "Une semaine complète : 7 nuits de swap.",
      },

      { t: "h", texte: "Un exemple complet" },
      {
        t: "exemple",
        html: "Vous achetez <b>0,10 lot</b> d'euro-dollar le lundi, et vous fermez le jeudi.<br/>Le spread : 0,3 pip × 1 $ = <b>0,30 $</b>.<br/>La commission : <b>0,70 $</b>.<br/>Le swap : les soirs du lundi (1 nuit), du mardi (1) et du mercredi (3), soit <b>cinq nuits</b> à 0,80 $ : <b>4 $</b>.<br/>Total : 0,30 + 0,70 + 4 = <b>5 $</b>. Sur un risque de 20 $ (1 % de 2 000 $), c'est <b>un quart</b>.",
      },
      { t: "p", html: "Un quart du risque, c'est beaucoup : un trade qui atteint un objectif de 20 $ ne rapporte plus que 15 $, et un trade perdant coûte 25 $ au lieu de 20 $. Ici, ce sont surtout les nuits qui pèsent : fermé le lundi soir avant 23 h, le même trade n'aurait coûté qu'un dollar." },
      {
        t: "outil",
        titre: "Ce que coûte vraiment votre trade",
        consigne: "Réglez la taille, les frais, le sens, le jour d'ouverture et celui de fermeture. Regardez les nuits s'additionner, et la part du risque que les frais emportent.",
        el: <CalculFrais />,
      },

      { t: "h", texte: "Le bon réflexe" },
      {
        t: "liste",
        items: [
          "<b>Avant de choisir un compte</b>, comparez ses frais : le spread moyen, la commission convertie en pips, les swaps des actifs que vous tradez.",
          "<b>Pour un trade de plusieurs jours</b>, comptez les nuits, sans oublier le mercredi, et ajoutez le swap au coût du trade.",
          "<b>Comparez les frais à votre risque</b> : s'ils en mangent une grosse part, l'objectif doit être plus loin, ou le trade plus court.",
        ],
      },
      { t: "piege", html: "<b>Oublier le swap sur un trade qui dure.</b> 0,80 $ par nuit semble négligeable. Sur trois semaines, c'est 21 nuits : 16,80 $, presque tout le risque de 20 $. Une position qui « attend que ça remonte » pendant des semaines coûte, même quand le prix ne bouge pas. Et méfiez-vous des comptes présentés comme « sans frais » : les frais sont souvent ailleurs, dans un spread plus large ou des frais fixes." },
      {
        t: "qr", items: [
          { q: "Les frais changent-ils le calcul de la taille ?", r: "Un peu. La taille se calcule sur le stop (leçon 19). Pour un trade de quelques heures, les frais restent petits. Pour un trade de plusieurs jours, gardez une marge : retirez du risque les frais que vous prévoyez, puis divisez." },
          { q: "Le swap existe-t-il sur l'or et la crypto ?", r: "Sur les CFD, oui : toute position à levier gardée la nuit paie des frais de financement, qu'ils s'appellent swap ou autrement. Sur l'or, le swap acheteur est souvent un coût. Le montant figure dans la fiche de l'actif." },
          { q: "Pourquoi 23 h ?", r: "C'est l'heure, à Paris, où le marché des devises passe d'une journée de règlement à la suivante (17 h à New York). Elle bouge d'une heure quelques semaines par an, quand l'Europe et les États-Unis ne changent pas d'heure le même jour." },
        ],
      },
      { t: "nimbo", texte: "Sur la page Wallet, chaque position clôturée affiche les frais payés. Comparez-les à ce que vous aviez risqué : c'est souvent une surprise.", humeur: "reflechit" },
    ],
  }],
  mots: [
    { terme: "Commission", en: "commission", def: "Un montant fixe prélevé à chaque trade, en entrant et en sortant, sur certains comptes, contre un spread plus serré." },
    { terme: "Swap", en: "swap, rollover fee", def: "Les frais (ou le petit gain) d'une nuit de position ouverte, tirés de l'écart de taux d'intérêt entre les deux monnaies." },
    { terme: "Position overnight", en: "overnight", def: "Une position encore ouverte au passage de 23 h : elle paie une nuit de swap." },
    { terme: "Triple swap", en: "triple swap", def: "Le swap du mercredi soir, compté trois fois parce qu'il couvre le week-end." },
    { terme: "Taux d'intérêt", en: "interest rate", def: "Le prix de l'argent dans une monnaie, fixé en partie par sa banque centrale. L'écart entre deux taux fait le swap." },
    { terme: "Frais de financement", en: "financing cost", def: "Le nom général du coût de garder une position à levier ouverte la nuit, sur tous les CFD." },
  ],
  retenir: [
    "Un trade paie le <b>spread</b>, parfois une <b>commission</b>, et un <b>swap</b> par nuit.",
    "La commission se paie à l'entrée et à la sortie : 7 $ par lot, c'est <b>0,70 $ sur 0,10 lot</b>, soit 0,7 pip.",
    "Le swap tombe vers <b>23 h</b> et vient de l'écart de taux d'intérêt : un coût, ou parfois un petit gain, selon le sens.",
    "Le <b>mercredi</b>, il compte souvent <b>trois fois</b> : le week-end est payé ce jour-là.",
    "0,10 lot du lundi au jeudi : 0,30 + 0,70 + 4 = <b>5 $</b>, un quart d'un risque de 20 $.",
    "Comparez les frais <b>avant de choisir un compte</b>, et comptez les nuits d'un trade de plusieurs jours.",
  ],
  quiz: [
    { question: "Une commission de 7 $ par lot, aller-retour. Combien payez-vous sur 0,10 lot ?", options: ["0,70 $", "7 $", "0,07 $"], correct: 0, explanation: "0,10 lot, c'est un dixième de lot : 7 $ ÷ 10 = 0,70 $, la moitié à l'entrée, la moitié à la sortie." },
    { question: "Votre position est fermée à 18 h, le jour même de son ouverture. Combien de nuits de swap ?", options: ["Aucune", "Une", "Trois"], correct: 0, explanation: "Le swap tombe vers 23 h. Une position fermée avant ne paie pas de swap." },
    { question: "D'où vient le swap ?", options: ["D'une taxe de l'État", "De l'écart entre les taux d'intérêt des deux monnaies", "Du spread de la veille"], correct: 1, explanation: "Garder une paire la nuit revient à détenir une monnaie financée par l'autre : l'écart de taux, plus la marge du courtier, fait le swap." },
    { question: "Ouvert le lundi, fermé le jeudi. Combien de nuits de swap sont comptées ?", options: ["Trois", "Quatre", "Cinq"], correct: 2, explanation: "Lundi soir 1, mardi soir 1, mercredi soir 3 : cinq nuits. Le mercredi paie le week-end." },
    { question: "Spread 0,30 $, commission 0,70 $, swap 4 $ : quelle part d'un risque de 20 $ ?", options: ["Un dixième", "Un quart", "La moitié"], correct: 1, explanation: "0,30 + 0,70 + 4 = 5 $. 5 sur 20, c'est un quart du risque." },
  ],
  pratique: [
    { texte: "Regardez les frais payés sur vos positions clôturées.", href: "/wallet", bouton: "Ouvrir le Wallet" },
    { texte: "Notez dans votre journal le coût de chaque trade gardé plusieurs jours.", href: "/journal", bouton: "Ouvrir le journal" },
  ],
};

export default lecon;
