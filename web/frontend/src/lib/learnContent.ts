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
    color: "from-blue-500/20 to-cyan-500/20 border-blue-500/30",
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
    color: "from-purple-500/20 to-violet-500/20 border-purple-500/30",
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
        content: `80% des traders particuliers perdent de l'argent. La raison principale n'est pas technique — c'est psychologique.

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
Les variations journalières sont souvent très petites (quelques centimes). Pour être rentable, il faut utiliser du levier — ce qui amplifie les risques. Le forex est recommandé pour les traders avec de l'expérience.

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
    color: "from-indigo-500/20 to-blue-500/20 border-indigo-500/30",
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
    color: "from-violet-500/20 to-pink-500/20 border-violet-500/30",
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
              "Un signal de retournement baissier — vendre",
              "Une opportunité d'achat dans la tendance — entrée potentielle",
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
        content: `Il n'existe pas de style de trading supérieur — seulement celui qui correspond à votre personnalité, votre temps disponible et votre capital.

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
              "Scalping — le plus rentable",
              "Day trading — 1 trade par jour",
              "Swing trading — positions sur plusieurs jours",
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
          "Risque par trade réduit à 0.2-0.5% — la discipline est vitale",
        ],
        content: `## Le Scalping : Stratégie de précision extrême

Le scalping consiste à accumuler des dizaines de petits gains journaliers. Un scalper vise 5 à 20 pips sur le forex, ou 0.1 à 0.3% sur les cryptos. Le profit vient du **volume de trades**, pas de la taille de chaque gain.

---

### Configuration indispensable

Avant même d'ouvrir un graphique 1 minute, votre infrastructure doit être irréprochable :

• **Connexion internet** : Fibre optique, < 20ms de latence. Le Wi-Fi est risqué.
• **Broker ECN/STP** : Spread de 0 à 0.5 pip sur EUR/USD. Évitez les market makers avec spread fixe élevé.
• **Plateforme avec DOM** : Le carnet d'ordres profond (Depth of Market) est essentiel pour lire le flux d'ordres.
• **Capital minimum recommandé** : 2 000 à 5 000€ pour une gestion du risque correcte.
• **Écrans** : 2 à 3 écrans recommandés (graphique + DOM + positions).

---

### Les 3 stratégies de scalping éprouvées

**Stratégie 1 — Range Scalping (la plus accessible)**

Sur les marchés calmes (pré-ouverture, nuit crypto), le prix oscille entre un support et une résistance étroits.

- Identifier le range : high et low des 30 dernières minutes
- **Achat** : prix touche le support du range + signal de rebond (pin bar, volume croissant)
- **Stop** : sous le range (-3 à 5 pips)
- **TP** : 50 à 70% du range
- **Règle d'or** : sortir dès que la volatilité augmente — un breakout invalide la stratégie

**Stratégie 2 — Breakout Scalping**

Entrée lors de la cassure d'un niveau clé important (ouverture de session, résistance majeure, chiffre psychologique).

- Attendre la bougie de breakout ET sa clôture au-dessus du niveau
- Entrée à l'ouverture de la bougie suivante
- Stop : sous la bougie de breakout
- TP : amplitude de la consolidation précédente projetée
- **Confirmation obligatoire** : le volume doit augmenter lors du breakout

**Stratégie 3 — Scalping de Momentum (news trading)**

Trading dans les secondes suivant une publication économique surprise (NFP, CPI, décision de taux).

- Calendrier économique vérifié à l'avance
- Entrée ultra-rapide dans la direction de la surprise
- Stops très larges (volatilité extrême) → taille de position très réduite
- ⚠️ **Réservé aux traders avancés** — le slippage peut être très important

---

### Gestion du risque en scalping

La gestion du risque en scalping est différente des autres styles :

| Paramètre | Swing Trading | Scalping |
|-----------|--------------|---------|
| Risque/trade | 1 à 2% | 0.2 à 0.5% |
| Trades/jour | 1 à 3 | 10 à 50 |
| Exposition max | ~2% | ~10% (cumul) |
| Stop mental ? | Jamais | Jamais |

Le stop loss est **obligatoire et non négociable** en scalping. Une seule position tenue sans stop peut effacer une semaine de petits gains.

**Règle de perte journalière** : Si vous perdez 2% du compte dans la journée, arrêtez immédiatement. Le marché vous donne un signal — reprenez demain.

---

### Psychologie du scalper

Le scalping est mentalement épuisant. Voici ce qui vous attend :

- Des séries de 15 à 20 petits gains... annulés par 1 trade non stoppé
- Une fatigue décisionnelle intense après 2 heures de trading
- La tentation du "revenge trading" après une perte (danger absolu)
- L'addiction possible à l'adrénaline des marchés

**Verdict** : Le scalping est recommandé uniquement si vous avez **minimum 12 à 18 mois d'expérience** en trading, une connexion ultra-rapide, et une résistance mentale éprouvée. Pour les débutants : commencez par le swing ou le day trading.

---

### Checklist avant chaque session de scalping

✅ Niveaux clés du jour identifiés sur D1 et 4H
✅ Calendrier économique vérifié (pas de news dans les 30 prochaines minutes)
✅ Spread vérifié sur la plateforme (< 1 pip EUR/USD)
✅ Taille de position calculée pour 0.2-0.5% de risque max
✅ Objectif de gain journalier défini
✅ Règle d'arrêt définie (ex : stop si -1.5% sur la journée)
✅ Pas de distraction (téléphone en silencieux, notifications désactivées)`,
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
            explanation: "6 × 8 pips = +48 pips gagnés. 4 × 5 pips = -20 pips perdus. Brut = +28 pips. Spread : 1 pip × 10 trades = -10 pips. Net = +18 pips. En scalping, les frais de transaction représentent une part majeure — toujours les intégrer dans vos calculs de rentabilité.",
          },
          {
            question: "Vous êtes en scalping sur une paire forex. Vous avez déjà perdu 1.8% de votre compte aujourd'hui. Que faites-vous ?",
            options: [
              "Prendre des positions plus grandes pour récupérer",
              "Changer de paire — celle-ci est contre vous",
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
          "Toutes les positions fermées chaque soir — zéro risque overnight",
          "Sessions optimales : London (9h-12h) et New York (14h30-17h30 Paris)",
          "Stratégie phare : Opening Range Breakout (ORB)",
          "Maximum 3 à 5 trades par jour — qualité absolument prioritaire sur quantité",
        ],
        content: `## Day Trading : Maîtriser le trading intraday

Le day trader ne passe **jamais la nuit avec une position ouverte**. Cette règle fondamentale élimine le risque overnight : gaps d'ouverture, événements macroéconomiques nocturnes, annonces surprises. Vous dormez tranquille.

---

### Les sessions de trading (heures de Paris)

Le marché forex — et les marchés globaux — fonctionnent par sessions. La liquidité et la volatilité varient considérablement selon l'heure.

| Session | Heures Paris | Caractéristiques |
|---------|-------------|-----------------|
| 🌏 Asie (Tokyo) | 01h00 – 10h00 | Calme, peu de volatilité EUR/USD |
| 🏦 Europe (London) | 08h00 – 17h00 | Forte volatilité, meilleure liquidité forex |
| 🗽 New York | 14h30 – 23h00 | Forte volatilité indices, actions US |
| ⚡ Overlap LDN + NY | 14h30 – 17h00 | **MEILLEURE PÉRIODE** — liquidité maximale |

**Règle d'or du day trader** : Tradez pendant les overlaps et les 2 premières heures de chaque session. Évitez le milieu de journée (12h-14h Paris) — peu de volume, faux signaux.

---

### La stratégie ORB (Opening Range Breakout)

L'ORB est LA stratégie phare du day trader. Elle est simple, reproductible, et applicable sur tous les marchés. Voici comment elle fonctionne :

**Les 3 étapes de l'ORB**

**Étape 1 — Définir le range d'ouverture**
Les 15 à 30 premières minutes d'une session définissent l'Opening Range. Identifiez le HIGH et le LOW de cette période. Tracez deux lignes horizontales.

**Étape 2 — Attendre le breakout**
Le prix doit sortir clairement du range avec du volume. Attendez la clôture d'une bougie AU-DESSUS du HIGH (pour un Long) ou EN-DESSOUS du LOW (pour un Short).

**Étape 3 — Entrée et gestion**
- Entrée : à l'ouverture de la bougie suivant le breakout
- Stop Loss : sous le LOW du range (Long) ou au-dessus du HIGH (Short)
- TP1 : amplitude du range projetée dans la direction du breakout
- TP2 : 2× amplitude du range

**Exemple concret — BTC/USD, session London (9h Paris) :**
- 09h00 – 09h30 : Range formé. High = 45 200$, Low = 44 100$ (amplitude = 1 100$)
- 09h35 : BTC casse 45 200$ avec volume x2 → Signal Long
- Entrée : 45 300$
- Stop Loss : 44 050$ (sous le low du range)
- TP1 : 46 300$ (+1 100$, R/R ≈ 0.8:1)
- TP2 : 47 400$ (+2 200$, R/R ≈ 1.7:1)

---

### Autres setups en day trading

**Gap and Go (actions et indices)**
- Le marché ouvre avec un écart (gap) par rapport à la clôture précédente
- Si le gap est dans le sens de la tendance + volume élevé → trade dans la direction du gap
- Commun le matin sur les actions après des annonces pré-marché

**Reversal de milieu de session**
- Après un fort mouvement matinal, le prix consolide
- Formation d'un double bottom/top sur 15m ou 1H
- Entrée sur la cassure de la consolidation dans le sens contraire au mouvement initial
- Stop serré derrière le point de retournement

---

### La règle des 3 stops

Tout day trader professionnel gère ses positions avec 3 niveaux de stop :

**1. Stop Initial** — Placé dès l'entrée. Protège contre le scénario catastrophe. Ne jamais l'élargir.

**2. Stop Break-Even** — Quand le trade atteint +1R de profit, déplacez le stop au point d'entrée. Vous ne pouvez plus perdre sur ce trade.

**3. Trailing Stop** — Suivez le prix avec un stop dynamique. En Long : remontez le stop sous chaque nouveau Higher Low sur 15m. En Short : descendez sous chaque nouveau Lower High.

---

### La règle des 3 pertes consécutives

Si vous perdez 3 trades de suite dans la même journée → **ARRÊT IMMÉDIAT**.

Ce n'est pas une défaite, c'est de la discipline. Les marchés vous envoient un signal : vous n'êtes pas en phase avec eux aujourd'hui. Chaque trader pro a cette règle. Les amateurs continuent et transforment une mauvaise journée en catastrophe.

---

### Le journaling : votre outil d'amélioration n°1

Notez chaque trade dans un journal :
- Date, actif, direction (Long/Short)
- Raison d'entrée (setup identifié)
- Prix d'entrée, stop, TP
- Résultat ($ et %)
- Ce que vous avez ressenti (FOMO, peur, confiance)
- Ce que vous auriez dû faire différemment

Revoyez chaque semaine. Les patterns d'erreurs apparaissent rapidement.

---

### Actifs populaires pour le day trading

| Actif | Heures optimales | Avantages |
|-------|-----------------|-----------|
| EUR/USD | 09h-17h (LDN) / 14h30-17h (NY) | Spread le plus faible (0.1-0.5 pip) |
| GBP/USD | 09h-17h Paris | Très volatile, setups clairs |
| SPX500 | 15h30-21h Paris | Forte liquidité, tendances nettes |
| BTC/USD | 24h/24 | Toujours ouvert, forte volatilité |
| NAS100 | 15h30-21h Paris | Tech — forte tendance |`,
        quiz: [
          {
            question: "Il est 09h45 (Paris). BTC vient de casser le HIGH de l'Opening Range (09h00-09h30) avec un volume x3. La bougie vient de se clôturer au-dessus. Que faites-vous ?",
            options: [
              "Attendre pour voir si c'est un faux breakout",
              "Entrer en Long immédiatement à l'ouverture de la bougie suivante, stop sous le LOW du range",
              "Entrer en Short — le prix est trop haut après une hausse rapide",
              "Ignorer — l'ORB ne fonctionne qu'avec le NYSE",
            ],
            correct: 1,
            explanation: "C'est le setup ORB classique : breakout au-dessus du range d'ouverture avec fort volume. Entrée à l'ouverture de la bougie suivante (confirmation), stop sous le LOW du range. Le volume x3 est une excellente confirmation — les breakouts sur fort volume tendent à continuer. Agissez selon votre plan.",
          },
          {
            question: "Vous êtes en day trading. Votre stop initial est à -100€. Le trade atteint +100€ de profit (+1R). Que faites-vous ?",
            options: [
              "Fermer la position — vous avez atteint votre objectif",
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
          "Timeframes : 4H et Daily — signaux plus clairs, moins de bruit",
          "30 à 60 minutes d'analyse le soir suffisent — idéal pour actifs professionnels",
          "Erreur n°1 : sortir trop tôt — laisser courir les positions gagnantes",
        ],
        content: `## Swing Trading : L'art de capter les grandes vagues

Le swing trader cherche à capturer les grands mouvements intermédiaires — les "swings" du marché. Un seul trade bien placé peut rapporter 5 à 20% en quelques jours sans jamais regarder l'écran en continu.

---

### Pourquoi le swing trading est idéal pour commencer

**1. Temps disponible minimal**
30 à 60 minutes d'analyse le soir après le travail suffisent. Pas besoin d'être cloué devant l'écran.

**2. Signaux plus fiables**
Les timeframes 4H et Daily filtrent le "bruit" des petits mouvements. Chaque signal sur Daily vaut bien plus que 20 signaux sur 1 minute.

**3. Moins d'erreurs émotionnelles**
Avec 2 à 10 trades par mois, vous prenez moins de décisions, donc moins d'erreurs impulsives. Le swing trading laisse le temps de réfléchir.

**4. Frais négligeables**
2 à 10 trades par mois = les frais de transaction ne mangent pas votre rentabilité.

---

### Les 4 phases du marché (Modèle de Weinstein)

Tout marché passe par 4 phases cycliques. Identifier la phase en cours détermine votre stratégie.

**Phase 1 : Accumulation** 🔵
- Après une longue baisse, le prix consolide horizontalement
- Volume faible, cours stable pendant des semaines ou mois
- Les institutionnels accumulent discrètement pendant que les particuliers ont abandonné
- Stratégie : surveiller, pas encore d'entrée

**Phase 2 : Hausse** 🟢 ← LA PLUS RENTABLE
- Le prix sort de l'accumulation avec volume accru
- Série de Higher Highs et Higher Lows
- C'est ici qu'on veut être Long
- Durée : semaines à plusieurs mois

**Phase 3 : Distribution** 🔴
- La hausse s'essoufle, forte volatilité
- Volume élevé mais le prix ne progresse plus
- Les institutionnels vendent aux particuliers euphoriques
- Signe d'alerte : volume fort + prix stagne

**Phase 4 : Baisse** ⬇️
- Distribution confirmée, prix casse le support
- Séquence de Lower Lows et Lower Highs
- Short possible pour traders expérimentés

---

### Le setup de swing idéal : Pull-back sur zone de valeur

C'est le setup n°1 des swing traders professionnels. Simple, fiable, répétable.

**Les 5 étapes**

**1. Analyser le contexte macro (Daily/Weekly)**
Sommes-nous en Phase 2 (tendance haussière) ? En range ? Identifier la direction dominante.

**2. Identifier la zone de valeur**
Ce peut être :
- Un support majeur (niveau testé plusieurs fois)
- Un ancien niveau de résistance devenu support (after breakout)
- Un retracement de Fibonacci (50% ou 61.8% du dernier swing)
- Une zone de demande (gap non comblé, forte bougie haussière passée)

**3. Attendre le test de la zone**
Ne précipitez pas ! Attendez que le prix revienne TESTER la zone. La patience est la principale compétence du swing trader.

**4. Chercher la confirmation d'entrée sur 4H ou 1H**
- Pin bar haussière (longue mèche basse, corps au-dessus)
- Bougie d'engulfing haussier (bougie verte enveloppant la précédente rouge)
- Morning star (3 bougies : rouge, indécise, grande verte)
- Volume qui augmente sur la bougie de confirmation

**5. Entrée, stop et objectifs**
- Entrée : ouverture de la bougie SUIVANT la confirmation
- Stop Loss : sous le point bas de la zone testée (marge de 1 à 2%)
- TP1 : prochaine résistance majeure
- TP2 : extension Fibonacci 127% ou 161.8%

---

### Exemple concret : ETH/USD

**Situation :**
- ETH en tendance haussière claire sur Daily (HH + HL)
- Résistance majeure franchie à 3 200$ il y a 3 semaines
- Pullback actuel : prix revient sur 3 200$ (ancienne résistance = nouveau support)

**Analyse :**
1. Contexte : Phase 2 (tendance haussière confirmée)
2. Zone de valeur : 3 200$ (ex-résistance devenue support)
3. Test : Le prix touche 3 180$ et forme une pin bar sur 4H
4. Confirmation : Pin bar haussière + volume croissant
5. Entrée : 3 220$ (bougie suivante)

**Paramètres :**
- Stop Loss : 3 080$ (sous le support) → Risque = 140$ par ETH
- TP1 : 3 600$ → Gain = 380$ → R/R = 2.7:1 ✅
- TP2 : 3 950$ → Gain = 730$ → R/R = 5.2:1 ✅✅

---

### Gestion de position en swing : la règle des 2 lots

**Divisez systématiquement votre position en 2 lots :**

- **Lot 1 (50%)** : Fermé au TP1 → Sécurisez un premier profit, la transaction est "payée"
- **Lot 2 (50%)** : Laissez courir avec trailing stop sous chaque nouveau Higher Low

Cette méthode garantit que vous capturez une partie du mouvement (lot 1) tout en maximisant le potentiel (lot 2 peut tripler ou quadrupler votre gain initial).

---

### L'erreur n°1 : sortir trop tôt

La majorité des swing traders débutants sortent leurs positions gagnantes trop tôt, poussés par la peur de voir les gains disparaître.

**Si votre stop n'est pas touché et que les Higher Highs / Higher Lows se poursuivent, gardez la position.**

Calcul mental : si vous sortez trop tôt 10 trades de suite en coupant à +3% au lieu de laisser courir jusqu'à +10%, vous perdez 70% de votre potentiel. Sur le long terme, c'est la différence entre un trading rentable et non rentable.

**Remède** : Configurez des alertes de prix et ne regardez pas votre position toutes les 5 minutes. Vérifiez une fois le soir. Faites confiance à votre analyse.

---

### Checklist swing trading

✅ Tendance sur Daily clairement identifiée (Phase 2 ou range)
✅ Zone de valeur tracée et documentée dans le journal
✅ Signal de confirmation sur 4H ou 1H (bougie de retournement)
✅ Stop placé SOUS la zone (pas dedans — laissez de la marge)
✅ R/R calculé : minimum 1:2 pour entrer
✅ Taille de position calculée (1-2% de risque sur compte)
✅ Alerte prix configurée (pour ne pas manquer le mouvement)
✅ TP1 et TP2 définis et ordres placés`,
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
              "Fermer aussi le lot 2 — vous avez déjà bien gagné",
              "Déplacer le stop au break-even et laisser courir vers TP2 avec trailing stop",
              "Ajouter une nouvelle position — la tendance est forte",
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
          "Il n'existe pas de style 'meilleur' — seulement celui adapté à votre profil",
          "4 facteurs clés : temps disponible, capital, personnalité, expérience",
          "Règle d'or : maîtrisez UN style avant d'en ajouter un second",
          "L'évolution naturelle : swing → day trading → scalping (jamais l'inverse)",
        ],
        content: `## Quel style de trading vous correspond ?

Choisir un style inadapté à votre mode de vie et personnalité est la première cause d'abandon chez les traders débutants. Cette décision est aussi importante que le choix de votre stratégie.

---

### Les 4 facteurs déterminants

**1. Temps disponible**

| Disponibilité | Style recommandé |
|--------------|-----------------|
| < 30 min/jour | Position trading |
| 30-60 min le soir | Swing trading ✅ |
| 2-4 heures en journée | Day trading |
| Disponible en continu | Scalping (avec expérience) |

**2. Capital disponible**

| Capital | Style recommandé |
|---------|-----------------|
| < 500€ | Swing crypto (frais < 0.1%) |
| 500€ – 5 000€ | Swing ou Day trading crypto/forex |
| 5 000€ – 25 000€ | Day trading + swing |
| > 25 000€ | Tous les styles |

*Note : Aux États-Unis, la règle PDT (Pattern Day Trader) limite à 3 day trades sur 5 jours avec un capital < 25 000$. Sur crypto ou forex, cette règle ne s'applique pas.*

**3. Personnalité et rapport au risque**

- **Patient, analytique, calme face à l'incertitude** → Swing / Position trading
- **Réactif, décideur rapide, résistant au stress** → Day trading
- **Hyperactif, besoin d'action immédiate, grande résistance** → Scalping (après 1 an+)
- **Anxieux face aux pertes, sensible aux fluctuations** → Swing / Position (moins de décisions)

**4. Expérience trading**

- **Débutant (< 6 mois)** : Swing trading obligatoirement
- **Intermédiaire (6-18 mois)** : Day trading possible avec prudence
- **Expérimenté (> 2 ans)** : Tous les styles accessibles
- **Scalping** : Jamais avant 12 à 18 mois de trading actif régulier

---

### Tableau comparatif complet

| Critère | Scalping | Day Trading | Swing | Position |
|---------|---------|------------|-------|---------|
| Durée / trade | Sec – min | Min – heures | 2 – 14 jours | Sem – mois |
| Trades / mois | 200 – 1000 | 20 – 80 | 5 – 15 | 1 – 4 |
| Temps requis / jour | 6 – 8h | 2 – 4h | 30 – 60 min | 15 min |
| Capital recommandé | 5 000€+ | 1 000€+ | 200€+ | 500€+ |
| Objectif / trade | 0.1 – 0.5% | 0.5 – 2% | 3 – 15% | 20 – 100% |
| Niveau de stress | ★★★★★ | ★★★☆☆ | ★★☆☆☆ | ★☆☆☆☆ |
| Pour débutant | ❌ Non | ⚠️ Attention | ✅ Idéal | ✅ Oui |

---

### L'évolution naturelle du trader

Ne brûlez pas les étapes. Voici la progression recommandée :

**Mois 1-6 : Swing Trading**
Apprenez les bases sur Daily et 4H. Gérez vos émotions. Développez un journal de trading. Objectif : comprendre les marchés, pas gagner de l'argent.

**Mois 6-12 : Swing affiné**
Affinez votre stratégie. Identifiez vos patterns d'erreurs dans le journal. Améliorez le timing d'entrée sur 1H en confirmation.

**Mois 12-18 : Introduction au Day Trading**
Seulement si le swing est maîtrisé. Testez en paper trading d'abord, puis avec petit capital. La discipline est encore plus importante qu'en swing.

**Au-delà de 18 mois : Exploration**
Si et seulement si vous êtes rentable de manière consistante, explorez le scalping sur de petites tailles. Beaucoup de traders professionnels ne font jamais de scalping — ce n'est pas nécessaire.

---

### Peut-on combiner plusieurs styles ?

**Oui — avec une seule règle : maîtrisez UN style avant d'en ajouter un second.**

Combinaisons courantes chez les traders professionnels :

• **Swing + Position** : Gérer quelques swings actifs tout en tenant des positions directionnelles de fond
• **Day trading + Swing** : Chercher les opportunités intraday ET tenir les setups daily qui durent
• ❌ **Scalping + Day trading simultanément** : Trop de décisions, contre-productif pour la plupart

---

### Conclusion : votre style idéal

Rappelez-vous : **Warren Buffett est un investisseur long terme. George Soros est un macro trader (position). Paul Tudor Jones est un trend follower (swing). Des milliards se font à tous les styles.**

Ce qui compte, c'est :
1. Choisir un style adapté à votre vie (pas un style "idéal" sur le papier)
2. Le maîtriser pendant minimum 12 mois avant de juger
3. Être honnête avec vous-même sur vos émotions et votre disponibilité

Le meilleur style est **celui que vous pratiquez avec discipline et régularité**.`,
        quiz: [
          {
            question: "Paul est comptable (35h/semaine), disponible 45 minutes chaque soir, capital de 2 000€, débutant depuis 3 mois. Quel style est le plus adapté ?",
            options: [
              "Scalping — maximise les opportunités avec ses 45 minutes",
              "Day trading — flexible selon ses horaires de bureau",
              "Swing trading — 45 min le soir, capital adapté, signaux clairs pour débutant",
              "Position trading — trop peu de trades pour apprendre rapidement",
            ],
            correct: 2,
            explanation: "Le swing trading coche toutes les cases pour Paul : 30-60 min le soir suffisent (il en a 45), le capital de 2 000€ est compatible, et à 3 mois d'expérience le swing trading sur Daily/4H est le seul style vraiment adapté. Le scalping et le day trading nécessitent plus d'expérience et de disponibilité continue. Le position trading manquerait de feedback pour un débutant qui cherche à apprendre.",
          },
          {
            question: "Après 6 mois de swing trading, vous envisagez de passer au day trading. Quelle est la bonne approche ?",
            options: [
              "Basculer immédiatement — 6 mois c'est suffisant",
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
    case "intermediate": return { label: "Intermédiaire", color: "text-blue-400 bg-blue-500/15 border-blue-500/30" };
    case "advanced": return { label: "Avancé", color: "text-purple-400 bg-purple-500/15 border-purple-500/30" };
    default: return { label: "Tous niveaux", color: "text-white/60 bg-white/10 border-white/20" };
  }
}
