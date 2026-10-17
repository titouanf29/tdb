export type ModuleExplanation = {
  title: string;
  simple: string;
  standard: string;
  tip: string;
  learnMoreUrl?: string;
};

export const MODULE_EXPLANATIONS: Record<string, ModuleExplanation> = {
  "main-chart": {
    title: "📊 Graphique principal",
    simple: "Chaque bougie = une période (1h, 1 jour...). Verte = prix monte, Rouge = prix descend. La hauteur = l'amplitude du mouvement. Commence par observer la tendance générale.",
    standard: "Chandeliers japonais : corps = écart Open/Close, mèches = High/Low. Analyse la structure des bougies pour détecter des patterns (doji, engulfing, marteau...).",
    tip: "💡 Regarde toujours la tendance sur un timeframe supérieur avant d'analyser en détail.",
  },
  "rsi-panel": {
    title: "📈 RSI, Relative Strength Index",
    simple: "Le RSI mesure la 'fatigue' du marché. Au-dessus de 70 = trop de monde a acheté (suracheté). En-dessous de 30 = trop de monde a vendu (survendu). La correction est souvent proche.",
    standard: "RSI 14 périodes. Oscillateur normalisé 0-100. Cherche surtout les divergences RSI/prix : prix monte mais RSI baisse = signal de faiblesse. Très puissant en tendance latérale.",
    tip: "💡 Ne trade pas uniquement sur le RSI. Combine-le avec un support/résistance ou une EMA.",
    learnMoreUrl: "/learn/glossaire",
  },
  "volume-panel": {
    title: "📊 Volume",
    simple: "Le volume = le nombre de personnes qui ont acheté/vendu. Grand mouvement + gros volume = signal fiable. Grand mouvement + petit volume = méfiance, le mouvement peut être faux.",
    standard: "Confirme la validité des mouvements. Un breakout avec volume élevé = confirmation forte. Divergence prix/volume = signal de retournement potentiel.",
    tip: "💡 Un breakout sans volume c'est comme un feu d'artifice mouillé, attends la confirmation.",
    learnMoreUrl: "/learn/glossaire",
  },
  "asset-selector": {
    title: "🔍 Sélecteur d'actif",
    simple: "Tape ici le nom ou symbole de l'actif que tu veux analyser : 'BTC' pour Bitcoin, 'AAPL' pour Apple, 'EUR/USD' pour la paire euro-dollar.",
    standard: "Accès aux marchés Crypto (BTC, ETH...), Forex (EUR/USD, GBP/USD...) et Actions (AAPL, TSLA...). Utilise les symboles officiels pour une recherche précise.",
    tip: "💡 Commence par 1-2 actifs max. Mieux vaut connaître BTC par cœur que survoler 20 actifs.",
  },
  "timeframe-selector": {
    title: "⏱️ Timeframe",
    simple: "Définit ce que représente chaque bougie. '1D' = chaque bougie = 1 jour complet. '1H' = 1 heure. Plus le timeframe est grand, plus la tendance est fiable et moins il y a de 'bruit'.",
    standard: "Analyse multi-timeframe : commence en 1W/1D pour la tendance directionnelle, puis descends en 4H/1H pour l'entrée. Ne contretrend jamais le timeframe supérieur.",
    tip: "💡 Débutant ? Reste sur le 1D ou 4H. Les petits timeframes (1m, 5m) sont très bruités.",
  },
  "indicators-panel": {
    title: "🧰 Indicateurs techniques",
    simple: "Outils mathématiques qui analysent le prix pour t'aider à décider. RSI, MACD, EMA... Chacun a un rôle précis. Attention : trop d'indicateurs = confusion.",
    standard: "Catégories : tendance (EMA, MACD), momentum (RSI, Stochastique), volatilité (ATR, Bollinger), volume. Utilise max 2-3 indicateurs complémentaires.",
    tip: "💡 Règle d'or : 1 indicateur de tendance + 1 oscillateur. Pas plus pour commencer.",
    learnMoreUrl: "/learn/glossaire",
  },
  "paper-trading-panel": {
    title: "📝 Paper Trading",
    simple: "C'est de l'entraînement avec de l'argent fictif. Tu prends de vraies décisions sur de vrais marchés, sans risquer ton argent. Passe des mois ici avant de trader réellement.",
    standard: "Simulation temps réel sur données live. Teste ta stratégie, valide ton plan de trading, développe ta discipline sans risque financier. Mesure ton win rate et ton R/R.",
    tip: "💡 Traite le paper trading comme si c'était du vrai argent. Sinon tu ne développes pas les bons réflexes.",
    learnMoreUrl: "/wallet",
  },
  "portfolio-panel": {
    title: "💼 Portfolio",
    simple: "Tous tes trades ouverts et fermés, ton capital actuel et tes performances. C'est ton tableau de bord de résultats.",
    standard: "Positions ouvertes, historique des trades, P&L réalisé et latent, statistiques de performance. Analyse ton win rate et ton R/R moyen.",
    tip: "💡 Un win rate de 40% peut être très rentable avec un bon ratio risque/récompense de 1:2.",
    learnMoreUrl: "/wallet",
  },
  "scanner-panel": {
    title: "🔍 Scanner",
    simple: "Le scanner détecte automatiquement les meilleures opportunités du marché selon des critères techniques. Il fait le travail de surveillance pour toi.",
    standard: "Scan multi-indicateurs : RSI, MACD, EMA, Bollinger, Volume, ATR. Filtre par marché, signal et volatilité. Idéal pour ne manquer aucune opportunité.",
    tip: "💡 Configure les filtres selon ta stratégie : ne garde que les actifs qui matchent ton setup.",
    learnMoreUrl: "/scanner",
  },
};
