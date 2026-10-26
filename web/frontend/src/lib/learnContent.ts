import { MODULE_FIGURES } from "./learnFigures";

export type QuizQuestion = {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
};

export type Lesson = {
  id: string;
  title: string;
  duration: string; // e.g. "5 min"
  content: string; // markdown-like rich text (HTML subset)
  keyPoints: string[];
  quiz?: QuizQuestion[];
};

export type Module = {
  id: string;
  title: string;
  description: string;
  icon: string; // emoji
  color: string; // tailwind gradient classes
  level: "beginner" | "intermediate" | "advanced" | "all";
  lessons: Lesson[];
};

export const LEARN_MODULES: Module[] = [
  // ── MODULE 1 ──────────────────────────────────────────────────────────
  {
    id: "trading-basics",
    title: "Les bases du trading",
    description: "Comprendre ce qu'est le trading, les marchés financiers et comment fonctionne l'économie mondiale.",
    icon: "📚",
    color: "from-primary/20 to-neon-cyan/20 border-primary/30",
    level: "beginner",
    lessons: [
      {
        id: "what-is-trading",
        title: "Qu'est-ce que le trading ?",
        duration: "4 min",
        keyPoints: [
          "Le trading consiste à acheter et vendre des actifs financiers",
          "L'objectif est de réaliser un profit sur la différence de prix",
          "Il existe différents types de marchés : actions, forex, crypto, matières premières",
          "Le trading ≠ investissement à long terme",
        ],
        content: `Le trading est l'acte d'acheter et de vendre des instruments financiers dans le but de réaliser un profit. Contrairement à l'investissement à long terme, le trader cherche à profiter des fluctuations de prix à court ou moyen terme.

Les marchés financiers sont des lieux (physiques ou virtuels) où acheteurs et vendeurs échangent des actifs. Parmi les principaux marchés :

• **Actions** : Parts d'entreprises cotées en bourse (ex: Apple, TotalEnergies)
• **Forex** : Marché des devises (EUR/USD, GBP/JPY...)
• **Crypto-monnaies** : Actifs numériques décentralisés (Bitcoin, Ethereum)
• **Matières premières** : Or, pétrole, blé...
• **Indices** : Panier d'actions représentant une économie (CAC 40, S&P 500)

Le prix d'un actif est déterminé par la loi de l'offre et de la demande. Quand plus de personnes veulent acheter que vendre, le prix monte. L'inverse fait baisser le prix.`,
        quiz: [
          {
            question: "Quelle est la principale différence entre trading et investissement à long terme ?",
            options: [
              "Le trading est toujours plus rentable",
              "Le trader cherche à profiter des fluctuations à court/moyen terme",
              "L'investisseur utilise plus de levier",
              "Le trading ne concerne que les actions",
            ],
            correct: 1,
            explanation: "Le trading vise à profiter des mouvements de prix à court ou moyen terme, tandis que l'investisseur à long terme cherche la croissance sur des années.",
          },
          {
            question: "Qu'est-ce qui détermine le prix d'un actif ?",
            options: [
              "Les banques centrales exclusivement",
              "La loi de l'offre et de la demande",
              "Le gouvernement du pays d'origine",
              "La valeur comptable de l'entreprise",
            ],
            correct: 1,
            explanation: "Le prix est déterminé par l'offre et la demande : quand les acheteurs sont plus nombreux que les vendeurs, le prix monte.",
          },
        ],
      },
      {
        id: "market-participants",
        title: "Les acteurs des marchés",
        duration: "3 min",
        keyPoints: [
          "Les banques centrales influencent les taux d'intérêt",
          "Les institutionnels (fonds, banques) représentent 70%+ des volumes",
          "Les traders particuliers sont les 'retail traders'",
          "Les market makers assurent la liquidité",
        ],
        content: `Les marchés financiers ne sont pas uniquement peuplés de traders individuels. Comprendre qui y opère est essentiel.

**Les banques centrales** (BCE, FED...)
Elles fixent les taux d'intérêt et contrôlent la masse monétaire. Leurs décisions ont un impact massif sur tous les marchés.

**Les investisseurs institutionnels**
Fonds d'investissement, hedge funds, compagnies d'assurance, fonds de pension. Ils gèrent des milliards et représentent la majorité des volumes échangés.

**Les banques commerciales**
Elles tradent pour leur propre compte et pour leurs clients. Elles jouent souvent le rôle de market maker.

**Les market makers**
Ils s'engagent à acheter et vendre en permanence pour assurer la liquidité du marché. Ils gagnent sur le spread (différence entre prix d'achat et de vente).

**Les traders particuliers (retail)**
C'est vous ! Même si individuellement petit, collectivement les retail traders influencent les marchés, surtout en crypto.`,
        quiz: [
          {
            question: "Qui assure la liquidité permanente d'un marché ?",
            options: ["Les traders particuliers", "Les banques centrales", "Les market makers", "Les régulateurs"],
            correct: 2,
            explanation: "Les market makers s'engagent à acheter et vendre en permanence, assurant ainsi qu'il y a toujours une contrepartie disponible.",
          },
        ],
      },
      {
        id: "order-types",
        title: "Les types d'ordres",
        duration: "5 min",
        keyPoints: [
          "Ordre au marché : exécution immédiate au prix actuel",
          "Ordre limite : exécution seulement à un prix précis",
          "Stop Loss : coupe les pertes automatiquement",
          "Take Profit : sécurise les gains automatiquement",
        ],
        content: `Maîtriser les types d'ordres est fondamental pour gérer vos trades correctement.

**Ordre au marché (Market Order)**
Exécution immédiate au meilleur prix disponible. Idéal quand on veut entrer ou sortir rapidement, mais le prix obtenu peut légèrement différer du prix affiché (slippage).

**Ordre limite (Limit Order)**
Vous définissez un prix précis. L'ordre n'est exécuté que si le marché atteint ce prix. Utile pour entrer sur une correction ou sortir à un objectif précis.

**Stop Loss**
Un ordre de vente automatique qui se déclenche si le prix descend en dessous d'un seuil que vous définissez. Il limite vos pertes. TOUJOURS utiliser un stop loss !

**Take Profit**
L'inverse du stop loss : l'ordre se déclenche quand le prix atteint votre objectif de gain. Permet de sécuriser les bénéfices sans surveiller le marché en permanence.

**Stop suiveur (Trailing Stop)**
Un stop loss dynamique qui suit le prix à la hausse. Si le prix monte, le stop monte avec lui. Si le prix baisse, le stop reste en place.`,
        quiz: [
          {
            question: "Vous achetez BTC à 50 000€ et voulez limiter votre perte à 5%. Quel ordre placer ?",
            options: [
              "Un take profit à 47 500€",
              "Un stop loss à 47 500€",
              "Un ordre limite à 52 500€",
              "Un ordre au marché",
            ],
            correct: 1,
            explanation: "Un stop loss à 47 500€ (50 000 × 0.95) coupe automatiquement la position si le prix baisse de 5%, limitant vos pertes.",
          },
          {
            question: "Quelle est la principale différence entre un ordre au marché et un ordre limite ?",
            options: [
              "L'ordre au marché est plus risqué",
              "L'ordre limite garantit l'exécution immédiate",
              "L'ordre au marché s'exécute immédiatement, le limite seulement à un prix précis",
              "L'ordre limite coûte moins cher en frais",
            ],
            correct: 2,
            explanation: "L'ordre au marché s'exécute immédiatement au prix disponible. L'ordre limite attend que le marché atteigne votre prix cible.",
          },
        ],
      },
    ],
  },

  // ── MODULE 2 ──────────────────────────────────────────────────────────
  {
    id: "technical-analysis",
    title: "Analyse technique",
    description: "Lire les graphiques, identifier les tendances et utiliser les indicateurs pour prendre de meilleures décisions.",
    icon: "📊",
    color: "from-neon-purple/20 to-neon-purple/20 border-neon-purple/30",
    level: "beginner",
    lessons: [
      {
        id: "reading-charts",
        title: "Lire un graphique",
        duration: "5 min",
        keyPoints: [
          "Chandelier japonais = OHLC (Open, High, Low, Close)",
          "Bougie verte = clôture > ouverture (hausse)",
          "Bougie rouge = clôture < ouverture (baisse)",
          "Le volume confirme la force d'un mouvement",
        ],
        content: `Le graphique en chandeliers japonais (candlestick) est l'outil de base de tout trader.

**Anatomie d'un chandelier**
Chaque bougie représente une période (1 min, 1h, 1 jour...) et contient 4 informations :
• **Open (O)** : Prix d'ouverture de la période
• **High (H)** : Prix le plus haut atteint
• **Low (L)** : Prix le plus bas atteint
• **Close (C)** : Prix de clôture

**Bougie haussière (verte)**
Le prix de clôture est supérieur au prix d'ouverture. Les acheteurs ont dominé.

**Bougie baissière (rouge)**
Le prix de clôture est inférieur au prix d'ouverture. Les vendeurs ont dominé.

**Les mèches (shadows)**
Les lignes fines au-dessus et en dessous du corps représentent les extrêmes atteints pendant la période. Une longue mèche haute indique que les vendeurs ont repoussé les acheteurs.

**Le volume**
Affiché en bas du graphique, le volume indique combien d'unités ont été échangées. Un mouvement de prix avec un fort volume est plus fiable qu'un mouvement avec peu de volume.`,
        quiz: [
          {
            question: "Une bougie avec un corps vert long et des mèches courtes indique :",
            options: [
              "Une forte pression vendeuse",
              "De l'incertitude sur le marché",
              "Une forte pression acheteuse sur toute la période",
              "Un retournement imminent",
            ],
            correct: 2,
            explanation: "Un corps vert long avec peu de mèches signifie que les acheteurs ont dominé du début à la fin de la période, sans que les vendeurs aient pu reprendre le contrôle.",
          },
        ],
      },
      {
        id: "support-resistance",
        title: "Supports et Résistances",
        duration: "6 min",
        keyPoints: [
          "Support = zone où le prix rebondit à la hausse",
          "Résistance = zone où le prix rebondit à la baisse",
          "Un support cassé devient une résistance et vice versa",
          "Plus une zone est testée, plus elle est significative",
        ],
        content: `Les supports et résistances sont les niveaux clés de tout graphique. Comprendre ces zones change radicalement la façon de trader.

**Le support**
C'est une zone de prix où la demande (acheteurs) est suffisamment forte pour stopper une baisse et potentiellement inverser la tendance. Les traders placent souvent des ordres d'achat à ces niveaux.

Visuellement : le prix "rebondit" plusieurs fois sur cette zone sans la casser.

**La résistance**
C'est l'inverse : une zone où l'offre (vendeurs) stoppe la hausse. Les traders placent leurs prises de profit et ordres de vente à ces niveaux.

**Le principe de polarité**
Quand un support est cassé à la baisse, il devient une résistance. Quand une résistance est cassée à la hausse, elle devient un support. C'est l'un des concepts les plus puissants en analyse technique.

**Comment identifier ces zones ?**
1. Cherchez les zones de congestion (où le prix a consolidé)
2. Repérez les plus hauts et bas significatifs
3. Les niveaux ronds (100, 1000, 50 000...) ont souvent un rôle psychologique
4. Plus une zone a été testée et maintenue, plus elle est forte`,
        quiz: [
          {
            question: "Le prix casse à la baisse un support à 100€. Que devient ce niveau ?",
            options: [
              "Il reste un support",
              "Il devient une résistance",
              "Il n'a plus aucune importance",
              "Il devient un nouveau point d'entrée haussier",
            ],
            correct: 1,
            explanation: "Selon le principe de polarité, un support cassé à la baisse devient une résistance. Les anciens acheteurs piégés vendent dès que le prix remonte à leur niveau d'achat.",
          },
          {
            question: "Qu'est-ce qui rend un niveau de support/résistance plus fiable ?",
            options: [
              "Qu'il soit situé sur un nombre rond",
              "Qu'il ait été testé plusieurs fois sans être cassé",
              "Qu'il soit récent (moins d'une semaine)",
              "Qu'il corresponde à un Fibonacci",
            ],
            correct: 1,
            explanation: "Plus un niveau a été testé et tenu, plus il y a d'ordres accumulés à ce prix, le rendant plus difficile à casser.",
          },
        ],
      },
      {
        id: "trend-indicators",
        title: "Les indicateurs de tendance",
        duration: "7 min",
        keyPoints: [
          "Moyennes mobiles (MA, EMA) lissent le prix",
          "RSI mesure la force d'un mouvement (0-100)",
          "MACD signale les croisements de tendance",
          "Ne jamais utiliser un seul indicateur seul",
        ],
        content: `Les indicateurs techniques sont des outils mathématiques calculés à partir du prix et du volume. Ils aident à identifier la tendance et les zones d'entrée/sortie.

**Moyennes Mobiles (MA / EMA)**
La moyenne mobile calcule le prix moyen sur une période donnée. Elle "lisse" le graphique et révèle la tendance.
• MA 20 : tendance court terme
• MA 50 : tendance moyen terme
• MA 200 : tendance long terme

Quand le prix est au-dessus de sa MA 200, on est en tendance haussière long terme.

**RSI (Relative Strength Index)**
Oscillateur entre 0 et 100 qui mesure la force du mouvement récent.
• RSI > 70 : Zone de surachat (attention à un retournement baissier)
• RSI < 30 : Zone de survente (attention à un rebond haussier)
• RSI = 50 : Neutre

**MACD (Moving Average Convergence Divergence)**
Composé de deux lignes (MACD et signal) et d'un histogramme. Quand la ligne MACD croise la ligne signal à la hausse, c'est un signal d'achat potentiel.

**Attention aux pièges !**
Les indicateurs sont des outils de confirmation, pas de prédiction. Utiliser plusieurs indicateurs qui confirment le même signal augmente la fiabilité.`,
        quiz: [
          {
            question: "Un RSI à 75 signifie :",
            options: [
              "Le prix va forcément monter encore",
              "L'actif est en zone de surachat, un retournement est possible",
              "L'actif est en zone de survente, un rebond est probable",
              "Le volume est insuffisant pour trader",
            ],
            correct: 1,
            explanation: "RSI > 70 indique une zone de surachat, ce qui signifie que le mouvement haussier a peut-être été excessif et qu'un retournement ou une correction est possible.",
          },
        ],
      },
    ],
  },

  // ── MODULE 3 ──────────────────────────────────────────────────────────
  {
    id: "risk-management",
    title: "Gestion du risque",
    description: "La règle n°1 du trading : protéger son capital. Apprenez à dimensionner vos positions et gérer vos pertes.",
    icon: "🛡️",
    color: "from-red-500/20 to-orange-500/20 border-red-500/30",
    level: "beginner",
    lessons: [
      {
        id: "risk-basics",
        title: "Pourquoi la gestion du risque est primordiale",
        duration: "4 min",
        keyPoints: [
          "Perdre 50% nécessite de gagner 100% pour récupérer",
          "La règle des 1-2% : ne jamais risquer plus de 2% du capital par trade",
          "Survivre sur le marché est la priorité absolue",
          "Les pros gagnent en limitant les pertes, pas en devinant les hausse",
        ],
        content: `La gestion du risque est ce qui sépare les traders professionnels des amateurs. La plupart des débutants se concentrent sur les profits potentiels. Les pros se concentrent sur les pertes potentielles.

**La mathématique impitoyable des pertes**
Si vous perdez 10% de votre capital, vous devez gagner 11% pour récupérer.
Si vous perdez 25%, vous devez gagner 33%.
Si vous perdez 50%, vous devez gagner 100% !

C'est pourquoi limiter les pertes est plus important que maximiser les gains.

**La règle des 1-2%**
Ne risquez jamais plus de 1 à 2% de votre capital total sur un seul trade.

Exemple : Capital de 10 000€
• Risque max par trade (2%) = 200€
• Si votre stop loss est à 5% de votre entrée, position max = 200 / 0.05 = 4 000€

**Le ratio Risque/Récompense (R/R)**
Avant chaque trade, calculez votre R/R potentiel.
• R/R de 1:2 = vous risquez 100€ pour potentiellement gagner 200€
• Ne tradez que les opportunités avec un R/R minimum de 1:1.5

**La diversification**
Ne mettez jamais tout votre capital sur un seul actif. Diversifier réduit l'impact d'un mauvais trade.`,
        quiz: [
          {
            question: "Vous avez 5 000€ de capital. Quel est le risque maximum sur un trade (règle des 2%) ?",
            options: ["500€", "100€", "200€", "1 000€"],
            correct: 1,
            explanation: "2% de 5 000€ = 100€. Ne jamais risquer plus de 100€ sur un seul trade avec ce capital.",
          },
          {
            question: "Vous perdez 50% de votre capital. De combien faut-il gagner pour récupérer ?",
            options: ["50%", "75%", "100%", "150%"],
            correct: 2,
            explanation: "Si vous avez 1 000€ et perdez 50% (= 500€ restants), il vous faut gagner 100% sur ces 500€ pour revenir à 1 000€.",
          },
        ],
      },
      {
        id: "position-sizing",
        title: "Dimensionner ses positions",
        duration: "5 min",
        keyPoints: [
          "La taille de position doit être calculée, pas intuitive",
          "Formule : Taille = (Capital × % risque) / Distance stop loss",
          "Le levier amplifie gains ET pertes",
          "Commencer avec levier ×1 en paper trading",
        ],
        content: `Savoir quelle taille de position prendre est une compétence critique. Beaucoup de traders perdent non pas parce qu'ils ont tort sur la direction, mais parce que leur position est trop grosse.

**La formule de dimensionnement**
Taille de position = (Capital × Risque%) ÷ (Prix d'entrée × Distance stop%)

Exemple concret :
• Capital : 10 000€
• Risque par trade : 1% = 100€
• Entrée sur BTC : 50 000€
• Stop loss : 48 500€ (soit 3% sous l'entrée)
• Taille = 100 / (50 000 × 0.03) = 100 / 1 500 = 0.067 BTC

**Le levier : ami ou ennemi ?**
Le levier vous permet de contrôler une position plus grande que votre capital réel.
• Levier ×10 : Chaque mouvement de 1% devient 10%
• Gain potential ×10 → Perte potentielle ×10

Sans stop loss et avec levier, vous pouvez perdre tout votre capital sur un seul trade. Le levier est un outil réservé aux traders expérimentés.

**Conseil pour les débutants**
Commencez toujours avec levier ×1. Maîtrisez la gestion du risque sans levier avant de l'augmenter.`,
        quiz: [
          {
            question: "Votre capital est de 2 000€, risque de 1%, entrée à 100€, stop loss à 95€ (5%). Quelle taille de position ?",
            options: ["400€ (4 actions)", "200€ (2 actions)", "100€ (1 action)", "1 000€ (10 actions)"],
            correct: 0,
            explanation: "Risque max = 2 000 × 1% = 20€. Taille = 20€ ÷ (100 × 5%) = 20 ÷ 5 = 4 actions × 100€ = 400€ de position.",
          },
        ],
      },
    ],
  },

  // ── MODULE 4 ──────────────────────────────────────────────────────────
  {
    id: "market-psychology",
    title: "Psychologie du trading",
    description: "Comprendre et maîtriser vos émotions est aussi important que la technique. La psychologie fait ou défait les traders.",
    icon: "🧠",
    color: "from-yellow-500/20 to-amber-500/20 border-yellow-500/30",
    level: "intermediate",
    lessons: [
      {
        id: "emotions-trading",
        title: "Les émotions en trading",
        duration: "5 min",
        keyPoints: [
          "La peur et la cupidité sont les deux ennemis du trader",
          "FOMO = Fear Of Missing Out (entrer trop tard)",
          "Le revenge trading mène à des pertes catastrophiques",
          "Un plan de trading écrit neutralise les décisions émotionnelles",
        ],
        content: `80% des traders particuliers perdent de l'argent. La raison principale n'est pas technique, c'est psychologique.

**La peur**
La peur de perdre pousse à :
• Couper ses gagnants trop tôt (peur de voir les gains disparaître)
• Tenir ses perdants trop longtemps (peur de matérialiser la perte)
• Ne pas entrer sur de bonnes opportunités

**La cupidité**
L'excès de confiance ou l'appât du gain pousse à :
• Surexposer son capital sur un trade
• Déplacer son stop loss vers le bas pour "laisser le trade respirer"
• Rester en position trop longtemps au lieu de prendre ses profits

**Le FOMO (Fear Of Missing Out)**
Voir un actif monter fortement et entrer précipitamment, souvent au pire moment. Le trade FOMO est rarement rentable car vous êtes le dernier à entrer.

**Le revenge trading**
Après une perte, vouloir "se venger" du marché en prenant un trade immédiat et plus large. C'est la recette pour perdre encore plus.

**La solution : le plan de trading**
Définissez AVANT le trade :
1. Point d'entrée
2. Stop loss
3. Take profit
4. Taille de position

Et respectez-le. Un trade qui respecte votre plan est un bon trade, même s'il perd.`,
        quiz: [
          {
            question: "Vous venez de perdre 300€ sur un trade. Que faites-vous ?",
            options: [
              "Prenez un trade plus gros immédiatement pour récupérer",
              "Faites une pause, analysez ce qui s'est passé, respectez votre plan",
              "Doublez votre taille de position sur le prochain trade",
              "Arrêtez de trader pour toujours",
            ],
            correct: 1,
            explanation: "Après une perte, prenez du recul. Le 'revenge trading' est l'une des erreurs les plus coûteuses. Analysez objectivement le trade perdu et revenez avec un plan clair.",
          },
        ],
      },
      {
        id: "trading-plan",
        title: "Créer son plan de trading",
        duration: "6 min",
        keyPoints: [
          "Un plan de trading définit des règles claires avant chaque trade",
          "Inclure : setup, entrée, stop, objectif, taille",
          "Tenir un journal de trading améliore progressivement les performances",
          "Backtester sa stratégie avant de risquer de l'argent",
        ],
        content: `Un plan de trading est votre règlement intérieur. Il transforme le trading de gambling en activité structurée.

**Les éléments d'un bon plan de trading**

1. **Votre setup** : Quelle configuration vous permet d'entrer ?
   Ex: "Je trade les cassures de résistance avec volume élevé"

2. **Critères d'entrée** : Conditions précises pour entrer
   Ex: "Le prix clôture au-dessus de la résistance + RSI > 50"

3. **Stop loss** : Où est votre invalidation ?
   Ex: "Stop sous le dernier bas significatif"

4. **Objectif (take profit)** : Où sortir ?
   Ex: "Prochaine résistance majeure, R/R minimum 1:2"

5. **Taille de position** : Calculée selon la règle des 2%

6. **Conditions d'invalidation** : Quand NE PAS trader ?
   Ex: "Pas de trade pendant les annonces économiques majeures"

**Le journal de trading**
Notez chaque trade : entrée, sortie, raison, résultat, et ce que vous auriez pu faire mieux. Après 50-100 trades, vous verrez clairement vos patterns gagnants et perdants.

**Le backtesting**
Testez votre stratégie sur des données historiques avant de risquer de l'argent réel. CaptenTDB vous permet de simuler avec du paper trading.`,
      },
    ],
  },

  // ── MODULE 5 ──────────────────────────────────────────────────────────
  {
    id: "asset-classes",
    title: "Comprendre les actifs",
    description: "Actions, crypto, forex, matières premières... Chaque actif a ses caractéristiques, risques et opportunités.",
    icon: "🌍",
    color: "from-green-500/20 to-emerald-500/20 border-green-500/30",
    level: "beginner",
    lessons: [
      {
        id: "stocks",
        title: "Les actions (stocks)",
        duration: "5 min",
        keyPoints: [
          "Une action = une part de propriété d'une entreprise",
          "Le prix reflète les perspectives de croissance et profits",
          "Dividendes = partage des bénéfices avec les actionnaires",
          "Les indices groupent des actions (CAC40, S&P500, NASDAQ)",
        ],
        content: `Les actions sont les actifs les plus connus. Acheter une action, c'est devenir copropriétaire d'une entreprise.

**Comment le prix d'une action est-il fixé ?**
Le prix reflète l'anticipation des profits futurs de l'entreprise. Plus les investisseurs s'attendent à une forte croissance, plus ils sont prêts à payer cher.

**Les facteurs qui influencent le prix**
• Résultats financiers trimestriels (revenus, bénéfices)
• Actualités de l'entreprise (nouveaux produits, acquisitions)
• Secteur économique et contexte macro
• Sentiment général du marché

**Les dividendes**
Certaines entreprises distribuent une partie de leurs bénéfices aux actionnaires. C'est un revenu passif mais qui réduit mécaniquement le prix de l'action le jour du versement.

**Les indices boursiers**
• CAC 40 : 40 plus grandes entreprises françaises
• S&P 500 : 500 plus grandes entreprises américaines
• NASDAQ 100 : 100 plus grandes entreprises tech américaines
• DAX 40 : Allemagne

Un indice monte quand ses composantes montent en moyenne.

**Les horaires de trading**
• Paris (Euronext) : 9h00 - 17h30
• New York (NYSE/NASDAQ) : 15h30 - 22h00 (heure française)`,
        quiz: [
          {
            question: "Qu'est-ce que le CAC 40 ?",
            options: [
              "Un indicateur technique inventé en 1940",
              "Les 40 plus grandes entreprises françaises cotées en bourse",
              "Le cours de l'or à Paris",
              "Un taux d'intérêt fixé par la BCE",
            ],
            correct: 1,
            explanation: "Le CAC 40 (Cotation Assistée en Continu) est l'indice de référence de la bourse de Paris, regroupant les 40 entreprises françaises les plus grandes par capitalisation boursière.",
          },
        ],
      },
      {
        id: "crypto",
        title: "Les crypto-monnaies",
        duration: "5 min",
        keyPoints: [
          "Bitcoin = première crypto, réserve de valeur numérique",
          "Ethereum = plateforme de contrats intelligents",
          "Marché 24h/24, 7j/7, très volatil",
          "Capitalisation boursière = prix × nombre de tokens en circulation",
        ],
        content: `Les crypto-monnaies sont des actifs numériques décentralisés basés sur la technologie blockchain.

**Bitcoin (BTC)**
Créé en 2009 par Satoshi Nakamoto. Première crypto et toujours la plus grande par capitalisation. Surnommé "l'or numérique", il est souvent utilisé comme réserve de valeur. Supply limitée à 21 millions de BTC.

**Ethereum (ETH)**
La deuxième plus grande crypto. Sa force : la plateforme de "smart contracts" (contrats intelligents) qui permettent de créer des applications décentralisées (DeFi, NFT...).

**Les altcoins**
Toutes les crypto autres que Bitcoin. Certains sont des projets sérieux, d'autres sont des spéculations pures (memecoins).

**Caractéristiques uniques des crypto**
• Marchés ouverts 24h/24, 7j/7 (y compris Noël !)
• Très haute volatilité (hausse ou baisse de 20% en une journée est possible)
• Pas de régulateur central
• Custody : si vous perdez votre clé privée, vous perdez vos cryptos

**La dominance Bitcoin**
Quand la dominance BTC monte, les altcoins baissent généralement (les investisseurs se refugient vers BTC). Quand elle baisse, les altcoins ont tendance à surperformer (altseason).`,
        quiz: [
          {
            question: "Quel est le nombre maximum de Bitcoins qui pourront jamais exister ?",
            options: ["1 million", "10 millions", "21 millions", "Illimité"],
            correct: 2,
            explanation: "Le protocole Bitcoin limite l'offre totale à 21 millions de BTC. Cette rareté programmée est l'un des arguments pour sa valeur comme réserve de valeur.",
          },
        ],
      },
      {
        id: "forex",
        title: "Le marché des devises (Forex)",
        duration: "4 min",
        keyPoints: [
          "Forex = marché des devises, le plus grand du monde",
          "Les paires : EUR/USD = euros en dollars",
          "Pip = plus petite unité de variation",
          "Très liquide mais nécessite du levier pour être rentable",
        ],
        content: `Le Forex (Foreign Exchange) est le marché des devises. C'est le marché financier le plus grand et le plus liquide au monde, avec plus de 7 000 milliards de dollars échangés chaque jour.

**Comment fonctionnent les paires de devises ?**
On achète toujours une devise et on en vend une autre.

EUR/USD = 1.1000 signifie que 1 euro vaut 1.10 dollar.

**Les paires majeures**
• EUR/USD : Euro / Dollar américain
• GBP/USD : Livre sterling / Dollar (le "Cable")
• USD/JPY : Dollar / Yen japonais
• USD/CHF : Dollar / Franc suisse

**Le Pip**
La plus petite unité de variation de prix. Pour EUR/USD, un pip = 0.0001.

**Pourquoi le forex est-il si complexe ?**
Les variations journalières sont souvent très petites (quelques centimes). Pour être rentable, il faut utiliser du levier, ce qui amplifie les risques. Le forex est recommandé pour les traders avec de l'expérience.

**Les horaires du forex**
Contrairement aux bourses, le forex est ouvert 24h/24 du dimanche soir (ouverture Sydney) au vendredi soir (fermeture New York). Il n'y a pas de pause sauf le week-end.`,
        quiz: [
          {
            question: "EUR/USD = 1.0850. Que signifie ce chiffre ?",
            options: [
              "1 dollar américain vaut 1.0850 euros",
              "1 euro vaut 1.0850 dollars américains",
              "Le forex est à 1.0850% de hausse",
              "Il faut 1.0850 pips pour acheter un euro",
            ],
            correct: 1,
            explanation: "EUR/USD = 1.0850 signifie que 1 euro vaut 1.0850 dollars américains. La première devise de la paire est toujours la devise de base.",
          },
        ],
      },
    ],
  },

  // ── MODULE 6 ──────────────────────────────────────────────────────────
  {
    id: "advanced-strategies",
    title: "Stratégies avancées",
    description: "Swing trading, cassures, divergences RSI... Des stratégies testées et éprouvées pour progresser.",
    icon: "⚡",
    color: "from-neon-purple/20 to-primary/20 border-neon-purple/30",
    level: "intermediate",
    lessons: [
      {
        id: "swing-trading-strategy",
        title: "La stratégie de swing trading",
        duration: "8 min",
        keyPoints: [
          "Entrer sur les retracements dans une tendance établie",
          "Utiliser les EMA 20 et 50 comme zones de support dynamique",
          "Confirmer avec le RSI et le volume",
          "Stop sous le dernier bas/haut significatif",
        ],
        content: `Le swing trading consiste à capturer des mouvements intermédiaires (2 à 10 jours) dans une tendance établie.

**Setup de base : le pullback sur EMA**

1. Identifier une tendance haussière (prix > EMA 50, EMA 20 > EMA 50)
2. Attendre un retracement vers l'EMA 20 ou EMA 50
3. Chercher un signal de reprise haussière (bougie de retournement)
4. Confirmer avec RSI > 50 et volume en hausse
5. Entrer au-dessus du plus haut de la bougie de signal
6. Stop sous le plus bas du retracement
7. Objectif : prochain niveau de résistance ou R/R de 1:2 minimum

**La gestion partielle**
Un truc de pro : sortir 50% de la position au premier objectif (R/R 1:1) et laisser courir le reste avec un trailing stop. Vous sécurisez des profits tout en laissant la chance au trade de donner plus.

**Les meilleures conditions**
• Tendance clairement établie sur le daily
• Retracement peu profond (moins de 50% du mouvement précédent)
• Faible volume sur le retracement (les vendeurs sont peu présents)
• Forte reprise du volume à la reprise haussière`,
      },
      {
        id: "rsi-divergence",
        title: "Les divergences RSI",
        duration: "6 min",
        keyPoints: [
          "Divergence haussière : prix fait un plus bas, RSI fait un plus haut",
          "Divergence baissière : prix fait un plus haut, RSI fait un plus bas",
          "Signal de retournement puissant mais à confirmer",
          "Plus fiable sur les timeframes élevés (4H, Daily)",
        ],
        content: `Les divergences entre le prix et le RSI sont parmi les signaux les plus puissants de l'analyse technique.

**Divergence haussière (bullish divergence)**
Le prix fait un nouveau plus bas, mais le RSI fait un plus bas moins bas que le précédent. Interprétation : la pression vendeuse s'affaiblit malgré la baisse des prix. Signal de retournement potentiel à la hausse.

**Divergence baissière (bearish divergence)**
Le prix fait un nouveau plus haut, mais le RSI fait un plus haut moins haut que le précédent. Interprétation : la pression acheteuse s'affaiblit malgré la hausse des prix. Signal de retournement potentiel à la baisse.

**Comment trader les divergences ?**
1. Identifier la divergence sur un timeframe élevé (4H ou Daily)
2. Descendre sur un timeframe plus bas (1H) pour l'entrée précise
3. Attendre un signal de retournement (bougie d'englobement, pin bar)
4. Confirmer avec d'autres éléments (support/résistance, volume)
5. Stop au-delà du dernier extrême de prix

**Attention !**
Les divergences peuvent durer longtemps. Ne vous positionnez pas à contre-tendance uniquement sur une divergence. Attendez la confirmation du retournement.`,
        quiz: [
          {
            question: "Le prix fait un nouveau plus bas à 1 000€, mais le RSI est à 35 contre 25 lors du précédent plus bas. C'est :",
            options: [
              "Une divergence baissière, signal de continuation baissière",
              "Une divergence haussière, signal de retournement potentiel à la hausse",
              "Un signal neutre sans signification",
              "Un surachat du RSI",
            ],
            correct: 1,
            explanation: "C'est une divergence haussière : le prix fait un nouveau plus bas mais le RSI est plus haut (35 > 25). La pression vendeuse s'affaiblit, ce qui peut précéder un retournement haussier.",
          },
        ],
      },
    ],
  },
  // ── MODULE 7 ──────────────────────────────────────────────────────────
  {
    id: "orders-and-markets",
    title: "Types d'ordres & marchés",
    description: "Maîtriser les ordres limit, marché et stop, comprendre le carnet d'ordres et éviter les pièges du slippage.",
    icon: "📋",
    color: "from-emerald-500/20 to-teal-500/20 border-emerald-500/30",
    level: "beginner",
    lessons: [
      {
        id: "market-vs-limit",
        title: "Ordre au marché vs ordre limité",
        duration: "6 min",
        keyPoints: [
          "Ordre au marché : exécution immédiate au meilleur prix disponible",
          "Ordre limité : exécution uniquement au prix fixé ou mieux",
          "Le slippage peut coûter cher sur les actifs peu liquides",
          "Utiliser les ordres limités pour les entrées, marché pour les urgences",
        ],
        content: `Chaque transaction sur les marchés financiers passe par un type d'ordre. Choisir le bon type est essentiel pour contrôler vos coûts et votre exécution.

**L'ordre au marché (Market Order)**
Exécution immédiate au meilleur prix disponible. Vous êtes sûr d'être exécuté, mais pas au prix exact que vous voyez. En période de forte volatilité ou sur des actifs peu liquides, le prix réel peut différer significativement.

**L'ordre limité (Limit Order)**
Vous fixez le prix maximum (achat) ou minimum (vente) d'exécution. Avantage : contrôle total du prix. Inconvénient : pas garanti de se remplir si le prix n'atteint pas votre niveau.

**L'ordre stop (Stop Market)**
Déclenché automatiquement quand le prix atteint un seuil. Utilisé principalement comme stop loss. Attention au slippage lors des gaps de marché (ouverture du lendemain, news).

**Le slippage — ce coût invisible**
Le slippage est la différence entre le prix attendu et le prix réel d'exécution. Exemple : vous souhaitez acheter à 44 900$ mais êtes exécuté à 44 950$ → 50$ de coût supplémentaire immédiat.

• **Actifs liquides** (BTC, ETH, S&P 500) : slippage généralement < 0,1%
• **Actifs peu liquides** (small caps, altcoins) : slippage peut dépasser 1–2%

**Quelle stratégie adopter ?**
• Entrées : ordres limités sous/sur le niveau cible
• Stop loss : stop market pour la protection automatique
• Take profit : ordres limités aux niveaux de résistance
• Sortie urgente : ordre marché acceptable`,
        quiz: [
          {
            question: "Vous voulez acheter Bitcoin à 45 000$ exactement, sans risque de payer plus. Quel ordre utilisez-vous ?",
            options: [
              "Ordre au marché",
              "Ordre limité à 45 000$",
              "Ordre stop à 45 000$",
              "Pas d'ordre, vous attendez",
            ],
            correct: 1,
            explanation: "L'ordre limité garantit que vous n'achetez pas au-dessus de 45 000$. Si le prix est actuellement au-dessus, l'ordre attend que le prix redescende à ce niveau.",
          },
        ],
      },
      {
        id: "order-book-deep",
        title: "Lire le carnet d'ordres",
        duration: "8 min",
        keyPoints: [
          "Le carnet d'ordres liste tous les ordres limités en attente",
          "Bid = acheteurs en attente, Ask = vendeurs en attente",
          "Le spread bid/ask représente le coût immédiat d'une transaction",
          "Les 'murs' d'ordres révèlent les zones de support/résistance dynamiques",
        ],
        content: `Le carnet d'ordres (order book) est la radiographie en temps réel du marché. Il révèle exactement où se trouve la liquidité et où le prix peut s'arrêter ou accélérer.

**Structure du carnet**
Le carnet est divisé en deux colonnes :
• **Bids (Acheteurs)** : ordres d'achat en attente, côté vert. Le meilleur bid est le prix le plus haut qu'un acheteur accepte de payer.
• **Asks (Vendeurs)** : ordres de vente en attente, côté rouge. Le meilleur ask est le prix le plus bas qu'un vendeur accepte.

**Le spread**
La différence entre le meilleur ask et le meilleur bid est le spread. C'est le coût immédiat que vous payez pour entrer ou sortir d'une position. Un spread serré = actif liquide = coûts réduits.

**Les murs d'ordres (Order Walls)**
Un volume anormalement élevé à un niveau de prix crée un "mur". Ces murs peuvent :
• Stopper temporairement le prix (le prix rebondit dessus)
• Être absorbés rapidement lors d'un breakout fort (le prix les franchit)

**Liquidité et market impact**
Si vous passez un gros ordre sur un actif peu liquide, votre propre ordre déplace le prix (market impact). C'est pourquoi les traders institutionnels divisent leurs ordres ou utilisent des algorithmes.

• **Haute liquidité** (BTC, AAPL, EUR/USD) : spread < 0,05%, impact minimal
• **Faible liquidité** (altcoins, penny stocks) : spread > 1%, impact fort

**Lire l'imbalance**
Si le côté bid est 3× plus volumineux que le côté ask, il y a un déséquilibre en faveur des acheteurs → pression à la hausse possible.`,
      },
    ],
  },

  // ── MODULE 8 ──────────────────────────────────────────────────────────
  {
    id: "trading-styles",
    title: "Styles & stratégies de trading",
    description: "Scalping, day trading, swing trading, trend following : comprenez chaque approche et trouvez celle qui correspond à votre profil.",
    icon: "⚡",
    color: "from-neon-purple/20 to-neon-cyan/20 border-neon-purple/30",
    level: "beginner",
    lessons: [
      {
        id: "trend-following",
        title: "Le trading de tendance (Trend Following)",
        duration: "9 min",
        keyPoints: [
          "Une tendance haussière = série de plus-hauts et plus-bas croissants",
          "3 types d'entrées : pull-back, breakout, re-test du breakout",
          "Ne jamais trader contre la tendance sans confirmation solide",
          "Ratio R/R cible minimum de 1:2 en trend following",
        ],
        content: `Le trading de tendance est l'une des stratégies les plus éprouvées. Son principe : la tendance a plus de chances de continuer que de se retourner.

**Identifier une tendance**
Une tendance haussière se définit par une succession de **plus-hauts croissants (Higher Highs)** et de **plus-bas croissants (Higher Lows)**. La tendance baissière est l'inverse : plus-hauts et plus-bas décroissants.

**Les 3 types d'entrées en tendance**

1. **Pull-back sur support dynamique**
La meilleure entrée. Le prix reteste une moyenne mobile (EMA 20, EMA 50) ou un ancien niveau de résistance devenu support. R/R excellent, risque limité.

2. **Breakout de résistance**
Le prix franchit un niveau clé avec volume. Entrée plus agressive. Attendre la clôture de bougie au-dessus pour éviter les faux breakouts.

3. **Re-test du breakout**
Après le franchissement, le prix revient tester l'ancien niveau (maintenant support). Entrée conservatrice avec confirmation.

**La règle d'or du trend following**
• Tendance haussière → chercher des achats sur les pull-backs
• Tendance baissière → chercher des ventes sur les rebonds
• En range (consolidation) → réduire l'activité ou jouer les extrêmes

**Gestion de position en tendance**
Ne fermez pas trop tôt ! En tendance forte, laissez courir avec un trailing stop qui remonte sous chaque nouveau plus-bas. Les meilleures tendances peuvent durer des semaines ou mois.

• Entrée sur pull-back → Stop sous le plus-bas du pull-back
• Objectif minimum : 2× le risque (R/R 1:2)
• Trailing stop : déplacer le stop sous chaque nouveau Higher Low`,
        quiz: [
          {
            question: "Vous identifiez une tendance haussière sur BTC. Le prix vient de faire un pull-back sur l'EMA 50. C'est :",
            options: [
              "Un signal de retournement baissier, vendre",
              "Une opportunité d'achat dans la tendance, entrée potentielle",
              "Un signal neutre à ignorer",
              "Un faux signal car l'EMA 50 n'est pas fiable",
            ],
            correct: 1,
            explanation: "Un pull-back sur l'EMA 50 en tendance haussière est une opportunité d'achat classique. La tendance reste intacte, et le pull-back offre un meilleur prix d'entrée avec un stop bien défini sous le plus-bas du retracement.",
          },
        ],
      },
      {
        id: "trading-styles-comparison",
        title: "Scalping, day trading et swing trading",
        duration: "8 min",
        keyPoints: [
          "Scalping : trades de secondes à minutes, très stressant, requiert concentration totale",
          "Day trading : positions fermées chaque soir, 1–5 trades par jour",
          "Swing trading : positions de jours à semaines, idéal pour les débutants",
          "Choisir son style selon son temps disponible, capital et personnalité",
        ],
        content: `Il n'existe pas de style de trading supérieur, seulement celui qui correspond à votre personnalité, votre temps disponible et votre capital.

**Le Scalping**
• Durée : secondes à quelques minutes
• Timeframes : 1m, 5m, tick
• Fréquence : 10 à 50+ trades par jour
• Objectif par trade : 0,1 à 0,5%
• Niveau de stress : très élevé
• Requis : plateforme ultra-rapide, écrans multiples, concentration totale

Le scalping est le style le plus exigeant. Les frais de transaction s'accumulent rapidement. Réservé aux traders très expérimentés avec une infrastructure dédiée.

**Le Day Trading**
• Durée : minutes à quelques heures
• Timeframes : 5m, 15m, 1H
• Fréquence : 1 à 5 trades par jour
• Objectif par trade : 0,5 à 2%
• Niveau de stress : modéré à élevé
• Requis : 2 à 4 heures de disponibilité quotidienne

Toutes les positions sont clôturées en fin de journée : pas de risque overnight. Bon compromis entre activité et gestion du stress.

**Le Swing Trading**
• Durée : 2 à 10 jours
• Timeframes : 4H, Daily
• Fréquence : 2 à 10 trades par mois
• Objectif par trade : 3 à 15%
• Niveau de stress : faible
• Requis : 30 min d'analyse le soir

**Le style idéal pour débuter**. Les signaux sur les timeframes élevés sont plus clairs, moins bruités. Vous avez le temps de réfléchir avant d'agir. Les frais sont négligeables (peu de trades).

**Comment choisir ?**
• Peu de temps disponible → Swing trading
• 2–4 heures par jour → Day trading
• Disponible en continu + expérimenté → Scalping éventuellement`,
        quiz: [
          {
            question: "Vous travaillez à plein temps et pouvez analyser les marchés 30 min le soir. Quel style vous convient le mieux ?",
            options: [
              "Scalping, le plus rentable",
              "Day trading, 1 trade par jour",
              "Swing trading, positions sur plusieurs jours",
              "Tous les styles conviennent également",
            ],
            correct: 2,
            explanation: "Le swing trading est idéal : 30 minutes d'analyse le soir suffisent pour identifier des setups sur les timeframes 4H/Daily. Les positions durent plusieurs jours, donc pas besoin de surveiller en continu. C'est le style recommandé pour les débutants et les personnes ayant une activité principale.",
          },
        ],
      },
      {
        id: "scalping-complet",
        title: "Scalping : Le guide complet",
        duration: "12 min",
        keyPoints: [
          "Scalping = capturer des micro-mouvements de 0.1 à 0.5% par trade",
          "10 à 50 trades par jour sur timeframes 1m / 5m",
          "Requis : spread ultra-faible, connexion rapide, concentration totale",
          "Risque par trade réduit à 0.2-0.5%, la discipline est vitale",
        ],
        content: `Le scalping, c'est le style que tout le monde fantasme avant de comprendre ce que c'est vraiment. On voit le trader avec ses 3 écrans, 30 trades dans la journée, et on imagine des milliers d'euros qui tombent en quelques heures. La réalité ? C'est l'activité la plus épuisante et la plus destructrice pour les débutants qui existent en trading.

Voilà ce qu'on ne vous dit pas assez clairement : **95% des gens qui essaient le scalping perdent de l'argent**. Pas parce que la stratégie ne fonctionne pas. Parce qu'ils n'ont pas la psychologie, l'infrastructure ou l'expérience pour l'exécuter correctement.

Ceci dit, bien fait, le scalping est une machine à cash. Voici comment ça marche vraiment.

---

**Ce que le scalping signifie concrètement**

Vous cherchez à gagner 5 à 15 pips sur le forex, ou 0.1 à 0.3% sur la crypto, plusieurs dizaines de fois par jour. Chaque trade dure de quelques secondes à quelques minutes maximum. Votre journée de trading ressemble à ça : arrivée aux marchés à 9h, analyse des niveaux clés, sessions de trading intense de 9h30 à 11h30 environ, puis fin. Deux heures de concentration absolue. Après ça vous êtes mentalement vidé.

Le profit vient du volume, pas de la taille de chaque gain. Un bon scalper avec 40 trades à +8 pips et 20 trades à -5 pips fait +220 pips bruts dans la journée. Après spreads et commissions, peut-être +180 nets. C'est la réalité du métier.

---

**L'infrastructure, c'est pas optionnel**

Si vous tradez en 4G ou en Wi-Fi partagé, oubliez le scalping. Vous perdez des ordres, vous avez du slippage, vous êtes à 200ms de latence quand les algo sont à 2ms. Le marché ne vous fera aucun cadeau là-dessus.

Ce qu'il faut minimum : une connexion fibre stable, un broker ECN avec spread variable (0 à 1 pip sur EUR/USD, pas 3 pips fixes), et une plateforme qui permet de passer un ordre en un raccourci clavier. Beaucoup de scalpers ont 2 à 3 écrans, mais ce n'est pas obligatoire, par contre, avoir votre graphique et votre book d'ordres simultanément, c'est quasi indispensable.

---

**Les deux setups qui marchent vraiment**

Le **range scalping** est le plus accessible. Le marché est calme (typiquement avant 9h ou la nuit sur crypto), le prix bounce entre un support et une résistance clairs depuis 30 minutes. Vous achetez sur le support avec un stop juste dessous, vous prenez votre profit sur 60-70% du range. Simple. Quand la volatilité revient et que la bougie explose hors du range, vous sortez, vous ne restez pas dedans.

Le **breakout scalping** demande plus d'expérience. Vous identifiez un niveau clé, ouverture de session, résistance majeure, et vous entrez quand le prix le franchit avec du volume. La clé : attendre que la bougie se clôture au-dessus, pas pendant. Les faux breakouts tueront votre compte si vous entrez trop tôt.

Le news trading (entrer après un NFP ou un CPI), c'est pour les traders très avancés avec une infrastructure dédiée. Le slippage peut être de 20-30 pips sur certaines publications. Ne commencez pas par là.

---

**Le risque en scalping, c'est mathématique**

En swing, vous risquez 1-2% par trade sur 2-3 trades par jour. En scalping, vous faites 30-40 trades, donc même avec 0.3% de risque par trade, votre exposition journalière cumulée est réelle. Une mauvaise série de 8 trades perdants consécutifs à 0.5% de risque = -4% dans la journée.

**Règle absolue** : définissez une perte max journalière (1.5 à 2% du compte) et respectez-la religieusement. Quand vous l'atteignez, fermez la plateforme. C'est non négociable. Les pires journées des scalpers professionnels sont celles où ils ont ignoré cette règle et ont fait du revenge trading à 15h après une mauvaise matinée.

---

**Ce que personne ne vous dit sur la psychologie**

Après 20 trades dans la journée, votre cerveau est fatigué. La qualité de vos décisions baisse. Vous commencez à prendre des trades que vous n'auriez pas pris à 9h30. C'est la fatigue décisionnelle, et elle coûte cher.

Les meilleurs scalpers tradent 2 heures, pas 8. Ils ont des règles strictes sur le nombre de trades max par session. Quand la journée commence à se dérouler dans le sens contraire de ce qu'ils avaient prévu, ils arrêtent. Le marché sera encore là demain.

**Ce style est fait pour vous si** : vous avez au moins 12 à 18 mois de trading actif derrière vous, vous pouvez être disponible 2 à 3 heures consécutives le matin, et vous êtes psychologiquement capable de prendre une perte sans chercher à la récupérer immédiatement. Sinon — swing trading d'abord.`,
        quiz: [
          {
            question: "Vous scalpez EUR/USD avec un stop de 5 pips et un TP de 8 pips. Sur 10 trades, vous gagnez 6 et perdez 4. Quel est votre résultat NET (spread inclus, 1 pip) ?",
            options: [
              "+28 pips (calcul brut sans frais)",
              "+18 pips (après déduction des 10 pips de spread)",
              "-2 pips (les frais mangent tout)",
              "+22 pips",
            ],
            correct: 1,
            explanation: "6 × 8 pips = +48 pips gagnés. 4 × 5 pips = -20 pips perdus. Brut = +28 pips. Spread : 1 pip × 10 trades = -10 pips. Net = +18 pips. En scalping, les frais de transaction représentent une part majeure, toujours les intégrer dans vos calculs de rentabilité.",
          },
          {
            question: "Vous êtes en scalping sur une paire forex. Vous avez déjà perdu 1.8% de votre compte aujourd'hui. Que faites-vous ?",
            options: [
              "Prendre des positions plus grandes pour récupérer",
              "Changer de paire, celle-ci est contre vous",
              "Fermer la plateforme. Règle de perte journalière : arrêt à 2%",
              "Passer sur un timeframe plus petit pour plus d'opportunités",
            ],
            correct: 2,
            explanation: "La règle de perte journalière est sacrée. À 1.8% de perte, vous êtes à la limite de votre seuil d'arrêt (2%). Continuer avec un état d'esprit dégradé par les pertes mène au revenge trading et aux erreurs. Fermez, reposez-vous, reprenez demain avec un esprit frais.",
          },
        ],
      },
      {
        id: "day-trading-complet",
        title: "Day Trading : Maîtriser le trading intraday",
        duration: "13 min",
        keyPoints: [
          "Toutes les positions fermées chaque soir, zéro risque overnight",
          "Sessions optimales : London (9h-12h) et New York (14h30-17h30 Paris)",
          "Stratégie phare : Opening Range Breakout (ORB)",
          "Maximum 3 à 5 trades par jour, qualité absolument prioritaire sur quantité",
        ],
        content: `Le day trading, c'est le seul style où vous fermez tout avant de dormir. Chaque soir, position à zéro. Pas de cauchemar à 3h du matin parce que Trump a tweeté quelque chose. Pas de gap d'ouverture qui efface votre semaine. C'est à la fois sa grande force et sa grande contrainte : vous devez être là, disponible, aux bonnes heures.

Et les bonnes heures, c'est vraiment important de comprendre ça.

---

Le marché, ça dort. Pas complètement, il y a toujours un prix, mais la grande majorité des mouvements interessants se produisent sur deux fenêtres précises. L'ouverture de Londres autour de 9h (heure de Paris), et l'ouverture de New York autour de 14h30. La période entre 14h30 et 17h30 où les deux sessions se chevauchent, c'est le moment le plus actif de la journée. Les volumes explosent. Les tendances s'accélèrent. Les breakouts tiennent.

Entre 12h et 14h30 par contre ? Le marché baille. Les Américains dorment encore, les Européens déjeunent. On voit beaucoup de faux mouvements, des algos qui s'ennuient, des ranges qui vont nulle part. La plupart des day traders expérimentés ne tradent tout simplement pas pendant cette période.

---

La stratégie de base qui fonctionne vraiment, c'est l'Opening Range Breakout, l'ORB. L'idée est simple à comprendre, difficile à exécuter avec discipline.

En début de session, le marché "tâtonne". Les premiers 15 à 30 minutes, il définit une zone : un plus haut et un plus bas que vous tracez sur votre graphique. C'est l'Opening Range. La vraie question c'est : dans quelle direction va-t-il sortir de cette zone ?

Quand le prix casse franchement au-dessus du plus haut avec du volume, c'est votre signal Long. Quand il casse en dessous du plus bas avec du volume, c'est votre signal Short. Vous entrez à l'ouverture de la bougie suivante. Votre stop va sous le bas du range (si vous êtes Long) ou au-dessus du haut du range (si vous êtes Short). Votre premier objectif de profit correspond à l'amplitude du range projeté dans la direction du mouvement.

Exemple concret : BTC un matin de session London. Entre 9h00 et 9h30, le marché forme un range entre 44 100$ et 45 200$, donc 1 100$ d'amplitude. À 9h35, le prix casse à 45 300$ avec volume doublé. Entrée Long à 45 300$. Stop à 44 050$ (sous le bas du range). Premier objectif à 46 300$ (+1 100$). Deuxième objectif à 47 400$ (+2 200$). Net, propre, reproductible.

---

Ce qui sépare vraiment les day traders qui durent de ceux qui grillent leurs comptes en 3 mois, c'est la gestion des stops.

Dès l'entrée, votre stop initial est placé et ne bouge jamais vers le bas (jamais vous n'élargissez un stop pour "laisser le trade respirer", c'est comme ça qu'on ruine des comptes). Quand le trade atteint +1R de profit, vous déplacez le stop au point d'entrée. Vous ne pouvez plus perdre. Ensuite vous suivez le mouvement avec un trailing stop sous chaque nouveau creux (sur un Long) jusqu'à être sorti.

La règle des 3 pertes consécutives est tout aussi importante. Si vous perdez 3 trades dans la même journée, vous arrêtez. Complètement. Vous fermez la plateforme. Les jours où vous n'êtes pas en phase avec le marché existent, les émotions se dégradent trade après trade, les décisions deviennent irrationnelles, et les amateurs continuent pendant que les pros prennent un café et reprennent le lendemain. Une mauvaise journée ne devient jamais une catastrophe quand on a cette règle.

---

Sur quoi trader ? EUR/USD sur la session London (9h-17h) pour les spreads les plus serrés. GBP/USD si vous voulez plus de volatilité. SPX500 et NAS100 dès 15h30 pour l'ouverture américaine, forte liquidité, tendances nettes. BTC fonctionne 24h/24 mais les meilleures sessions correspondent quand même à London et New York.

Le journal de trading n'est pas facultatif. Chaque trade noté : l'actif, la direction, le prix d'entrée et de sortie, la raison d'entrer, et surtout ce que vous ressentiez au moment de la décision. Peur ? FOMO ? Confiance ? Les patterns d'erreurs émotionnelles deviennent visibles après quelques semaines. C'est là que le vrai progrès commence.`,
        quiz: [
          {
            question: "Il est 09h45 (Paris). BTC vient de casser le HIGH de l'Opening Range (09h00-09h30) avec un volume x3. La bougie vient de se clôturer au-dessus. Que faites-vous ?",
            options: [
              "Attendre pour voir si c'est un faux breakout",
              "Entrer en Long immédiatement à l'ouverture de la bougie suivante, stop sous le LOW du range",
              "Entrer en Short, le prix est trop haut après une hausse rapide",
              "Ignorer, l'ORB ne fonctionne qu'avec le NYSE",
            ],
            correct: 1,
            explanation: "C'est le setup ORB classique : breakout au-dessus du range d'ouverture avec fort volume. Entrée à l'ouverture de la bougie suivante (confirmation), stop sous le LOW du range. Le volume x3 est une excellente confirmation, les breakouts sur fort volume tendent à continuer. Agissez selon votre plan.",
          },
          {
            question: "Vous êtes en day trading. Votre stop initial est à -100€. Le trade atteint +100€ de profit (+1R). Que faites-vous ?",
            options: [
              "Fermer la position, vous avez atteint votre objectif",
              "Déplacer le stop au break-even (0€ de P&L) et laisser courir vers TP2",
              "Ajouter à la position pour maximiser",
              "Garder le stop initial, rien ne change",
            ],
            correct: 1,
            explanation: "La règle des 3 stops : à +1R, déplacez le stop au break-even. Vous ne pouvez plus perdre sur ce trade. Ensuite laissez courir vers TP2 avec un trailing stop. Cette gestion permet d'avoir un trade gratuit qui peut générer 2R, 3R ou plus.",
          },
        ],
      },
      {
        id: "swing-complet",
        title: "Swing Trading : Capter les grandes vagues",
        duration: "14 min",
        keyPoints: [
          "Swing = capturer les oscillations du marché sur 2 à 14 jours",
          "Timeframes : 4H et Daily, signaux plus clairs, moins de bruit",
          "30 à 60 minutes d'analyse le soir suffisent, idéal pour actifs professionnels",
          "Erreur n°1 : sortir trop tôt, laisser courir les positions gagnantes",
        ],
        content: `Si vous avez un travail, une vie, et pas envie de passer vos journées à regarder un graphique clignoter, le swing trading est fait pour vous. Sérieusement. 30 à 60 minutes le soir, c'est suffisant pour analyser, placer vos ordres, et reprendre votre vie normale. Le lendemain matin vous vérifiez, éventuellement vous ajustez. C'est tout.

L'idée, c'est de capturer les grandes vagues du marché. Pas les petites oscillations à la minute, les vraies tendances sur plusieurs jours ou plusieurs semaines. Un trade bien placé peut vous rapporter 5, 10, parfois 20% en quelques jours. Et pendant que la position court, vous faites autre chose.

---

Pour comprendre le swing trading, il faut comprendre comment les marchés bougent. Ça n'est pas aléatoire. Les prix suivent des cycles. D'abord une longue période calme, quasi horizontale, où le marché accumule, les gros acteurs achètent discrètement pendant que les petits ont abandonné. Puis la cassure : le prix sort vers le haut avec du volume, et là commence la phase de hausse. C'est la phase où vous voulez être dedans. Elle peut durer des semaines ou des mois. Après vient la distribution, le volume reste fort mais le prix n'avance plus, les institutionnels revendent à ceux qui arrivent en retard euphoriques. Puis la baisse.

Identifier dans quelle phase se trouve un actif, et ne trader que pendant la phase de hausse en Long, c'est 80% du travail du swing trader. Si vous tradez dans la bonne direction de la bonne phase, les probabilités jouent pour vous.

---

Le setup que presque tous les swing traders professionnels utilisent, c'est le pullback sur zone de valeur. Voilà comment ça marche concrètement.

Vous avez identifié un actif en tendance haussière claire sur le graphique journalier. Le prix monte, fait des plus hauts et des plus bas plus élevés successivement. Puis il recule, normal, aucun marché monte en ligne droite. Il revient tester une zone importante : un ancien niveau de résistance franchi qui devient maintenant support, un niveau de retracement de Fibonacci entre 50% et 61.8% du dernier swing, ou simplement un support majeur testé plusieurs fois. C'est votre zone.

Vous attendez. La patience ici n'est pas optionnelle, c'est la compétence principale. Vous attendez que le prix arrive sur cette zone et montre un signal de retournement : une pin bar (longue mèche basse qui signifie que les vendeurs ont essayé et ont été repoussés), une bougie d'engulfing haussier, n'importe quelle formation qui montre que les acheteurs reprennent le dessus. Avec du volume croissant, c'est encore mieux.

À l'ouverture de la bougie suivante, vous entrez. Stop sous le bas de la zone testée, pas au niveau exact du support, mais un peu en dessous pour donner de la marge. Premier objectif : la prochaine résistance majeure. Deuxième objectif : plus loin si le mouvement est fort.

---

Prenons ETH comme exemple. L'actif a franchi une résistance majeure à 3 200$ il y a trois semaines et continue de monter. Maintenant il pullback et revient tester les 3 200$, ancienne résistance devenue support. Le prix touche 3 180$ et forme une pin bar claire sur le graphique 4 heures, avec un volume qui augmente sur la bougie de confirmation.

Entrée : 3 220$ (bougie suivante). Stop : 3 080$ (sous la zone, avec marge). C'est 140$ de risque par ETH. Premier objectif à 3 600$, soit 380$ de gain et un ratio risque/récompense de 2.7. Deuxième objectif à 3 950$, soit 730$ de gain et un ratio de 5.2. Un seul de ces trades bien joué compense plusieurs petites erreurs.

---

La technique des deux lots est simple mais efficace. Vous divisez votre position en deux moitiés égales. La première moitié, vous la fermez au premier objectif, vous encaissez, le trade est "payé". La deuxième moitié, vous déplacez le stop au point d'entrée et vous laissez courir avec un trailing stop sous chaque nouveau creux sur le graphique journalier. Cette demi-position peut faire ×2, ×3, ×4 si le mouvement est fort. Vous maximisez sans vous mettre en risque.

L'erreur que fait absolument tout le monde au début : sortir trop tôt. Vous êtes à +3%, ça commence à trembler, vous fermez. Et le trade va ensuite chercher +15%. Ça arrive, encore et encore, jusqu'à ce qu'on comprenne que couper ses positions gagnantes trop tôt est aussi destructeur que laisser courir ses pertes. Si votre stop n'est pas touché et que la structure haussière continue (nouveaux plus hauts, nouveaux plus bas plus élevés), vous n'avez aucune raison de sortir. Configurez une alerte de prix. Vérifiez une fois le soir. Faites confiance à ce que vous avez analysé et à la position que vous avez construite.`,
        quiz: [
          {
            question: "ETH est en Phase 2 (tendance haussière). Le prix pull-back sur un support majeur à 2 800€. Où placez-vous votre stop loss ?",
            options: [
              "À 2 800€ exactement sur le support",
              "À 2 830€ (au-dessus du support pour plus de sécurité)",
              "À 2 730€ (sous le support avec une marge de 2.5%)",
              "À 2 500€ (très large pour ne pas être sorti)",
            ],
            correct: 2,
            explanation: "Le stop doit être placé SOUS le support avec une légère marge. À 2 800€ exactement, vous seriez sorti au moindre test du support. À 2 730€, vous donnez de la respiration au marché tout en ayant un invalidation claire : si le prix casse vraiment 2 730€, votre thèse est invalide et il faut sortir. Trop large (2 500€) augmente votre risque et force à réduire la taille de position.",
          },
          {
            question: "Vous êtes en swing trading. Votre TP1 vient d'être atteint avec le lot 1. Le lot 2 est toujours ouvert. La tendance continue (nouveaux Higher Highs). Que faites-vous avec le lot 2 ?",
            options: [
              "Fermer aussi le lot 2, vous avez déjà bien gagné",
              "Déplacer le stop au break-even et laisser courir vers TP2 avec trailing stop",
              "Ajouter une nouvelle position, la tendance est forte",
              "Fermer et réentrer sur le prochain pull-back",
            ],
            correct: 1,
            explanation: "Le lot 2 est là pour capturer les grands mouvements. Puisque le TP1 est atteint (lot 1 fermé = trade 'gratuit'), déplacez le stop du lot 2 au break-even et utilisez un trailing stop sous chaque nouveau Higher Low. Vous ne pouvez plus perdre sur ce trade, et vous laissez la possibilité d'atteindre TP2 ou plus.",
          },
        ],
      },
      {
        id: "choose-your-style",
        title: "Quel style de trading vous correspond ?",
        duration: "8 min",
        keyPoints: [
          "Il n'existe pas de style 'meilleur', seulement celui adapté à votre profil",
          "4 facteurs clés : temps disponible, capital, personnalité, expérience",
          "Règle d'or : maîtrisez UN style avant d'en ajouter un second",
          "L'évolution naturelle : swing → day trading → scalping (jamais l'inverse)",
        ],
        content: `Avant de répondre à la question "quel style est le plus rentable", posez-vous celle qui compte vraiment : quel style allez-vous réussir à tenir sur la durée ? Parce que le style "idéal sur le papier" que vous abandonnez après 2 mois vaut exactement zéro. Le style "moyennement optimal" que vous pratiquez avec discipline pendant 2 ans, c'est là que les comptes grossissent.

Voilà comment choisir honnêtement.

---

La première question, c'est votre temps. Pas le temps que vous aimeriez avoir, le temps que vous avez vraiment, structurellement, semaine après semaine. Si vous êtes salarié avec des journées chargées et que vous avez 30 à 60 minutes calmes le soir, le swing trading est votre seule vraie option raisonnable. Le day trading nécessite 2 à 4 heures de disponibilité continue pendant les heures de marché, si vous avez des réunions ou des imprévus professionnels, vous allez rater des entrées, mal gérer des positions ouvertes, et prendre de mauvaises décisions sous pression. Le scalping demande 6 à 8 heures de concentration sans interruption, pendant lesquelles vous ne pouvez littéralement rien faire d'autre.

La deuxième question, c'est votre capital. Avec moins de 500€, le swing trading sur crypto est la seule chose qui a du sens, les frais de transaction sur d'autres marchés mangeraient vos gains. Entre 500€ et 5 000€, vous pouvez envisager le swing ou le day trading sur crypto ou forex. Le scalping en dessous de 5 000€ est mathématiquement peu intéressant : les gains par trade sont si petits qu'il faut un volume de trades considérable pour que ça représente quelque chose.

---

Mais la vraie variable, celle que personne n'aime regarder en face, c'est la personnalité.

Si vous êtes du genre à vérifier vos positions toutes les heures quand vous avez un trade ouvert, si une perte de 2% vous ruine la journée émotionnellement, si vous avez du mal à "ne rien faire" quand vous êtes devant votre écran, le scalping va vous détruire. Pas parce que le style est mauvais, mais parce qu'il amplifie exactement ces traits. Des dizaines de micro-décisions par heure, des pertes fréquentes qui font partie du plan, une discipline de fer nécessaire à chaque instant. Les traders qui réussissent en scalping ont quelque chose qui ressemble à un détachement émotionnel presque clinique vis-à-vis de leurs trades.

À l'inverse, si vous êtes quelqu'un de patient, analytique, qui aime prendre le temps de comprendre avant d'agir, le swing trading va vous correspondre naturellement. Vous analysez le soir, vous posez vos ordres, et vous laissez le marché travailler. Les décisions se prennent à tête reposée, sans pression.

---

En termes de progression, ne brûlez pas les étapes. Ce n'est pas une question d'ambition, c'est une question de mécanique d'apprentissage.

Les 6 premiers mois, le swing trading est obligatoire. Pas parce que c'est le style "pour les débutants", mais parce que les timeframes longs vous donnent le temps d'apprendre. Chaque signal sur le graphique journalier laisse des heures pour réfléchir, analyser, comprendre pourquoi vous avez tort ou raison. Sur le scalping, vous avez 10 secondes. Vous ne pouvez pas apprendre à cette vitesse quand vous ne maîtrisez pas encore les bases.

Entre 6 et 18 mois, si votre swing trading est cohérent et rentable, vous pouvez commencer à explorer le day trading, d'abord en paper trading (sans argent réel) pendant un ou deux mois pour valider votre approche intraday, puis avec un capital réduit. Le scalping ? Après 18 mois minimum de trading actif régulier, et seulement si vous savez déjà gagner de manière consistante en swing. Beaucoup de traders professionnels ne font jamais de scalping. Ce n'est pas une étape obligatoire.

---

Warren Buffett est un investisseur long terme. George Soros est un macro trader. Paul Tudor Jones est un trend follower swing. Des milliards de dollars générés à chaque style. Ce qui compte, ce n'est pas le style que vous choisissez, c'est que vous le pratiquez avec discipline, que vous l'analysez honnêtement, et que vous l'améliorez régulièrement.

Un style mal adapté à votre vie, c'est la première cause d'abandon. Et l'abandon garantit les pertes.`,
        quiz: [
          {
            question: "Paul est comptable (35h/semaine), disponible 45 minutes chaque soir, capital de 2 000€, débutant depuis 3 mois. Quel style est le plus adapté ?",
            options: [
              "Scalping, maximise les opportunités avec ses 45 minutes",
              "Day trading, flexible selon ses horaires de bureau",
              "Swing trading, 45 min le soir, capital adapté, signaux clairs pour débutant",
              "Position trading, trop peu de trades pour apprendre rapidement",
            ],
            correct: 2,
            explanation: "Le swing trading coche toutes les cases pour Paul : 30-60 min le soir suffisent (il en a 45), le capital de 2 000€ est compatible, et à 3 mois d'expérience le swing trading sur Daily/4H est le seul style vraiment adapté. Le scalping et le day trading nécessitent plus d'expérience et de disponibilité continue. Le position trading manquerait de feedback pour un débutant qui cherche à apprendre.",
          },
          {
            question: "Après 6 mois de swing trading, vous envisagez de passer au day trading. Quelle est la bonne approche ?",
            options: [
              "Basculer immédiatement, 6 mois c'est suffisant",
              "Tester en paper trading 1 à 2 mois, puis avec très petit capital si résultats positifs",
              "Day trader ET swing trader simultanément pour ne rien rater",
              "Attendre 5 ans de swing trading avant d'essayer",
            ],
            correct: 1,
            explanation: "La transition se fait progressivement : paper trading d'abord (sans risque réel) pour tester votre stratégie intraday et votre gestion émotionnelle. Si les résultats sont positifs après 1-2 mois, introduire du capital réel en petite quantité. Ne jamais changer de style avec tout le capital d'un coup, et ne jamais mélanger les deux styles tant que le nouveau n'est pas stabilisé.",
          },
        ],
      },
    ],
  },
  // Le cours sur les figures chartistes vit dans son propre fichier : ses
  // chiffres sont lus sur le serveur, et il fait six leçons à lui seul.
  MODULE_FIGURES,
];

export function getModulesForLevel(level: string | null | undefined): Module[] {
  if (!level || level === "expert") return LEARN_MODULES;
  if (level === "intermediate") return LEARN_MODULES.filter((m) => m.level !== "advanced");
  // beginner: all modules but focus on beginner first
  return LEARN_MODULES;
}

export function getLevelBadge(level: string): { label: string; color: string } {
  switch (level) {
    case "beginner": return { label: "Débutant", color: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30" };
    case "intermediate": return { label: "Intermédiaire", color: "text-primary bg-primary/15 border-primary/30" };
    case "advanced": return { label: "Avancé", color: "text-neon-purple bg-neon-purple/15 border-neon-purple/30" };
    default: return { label: "Tous niveaux", color: "text-white/60 bg-white/10 border-white/20" };
  }
}
