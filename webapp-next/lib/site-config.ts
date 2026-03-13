export const siteConfig = {
  name: 'TDB',
  tagline: 'Analyse IA des marches financiers, en temps reel.',
  description:
    'TDB est un assistant IA pedagogique qui detecte les opportunites de trading, evalue les risques et accompagne votre progression via Telegram.',
  url: 'https://tdb.capten.ai',
  telegramUrl: 'https://t.me/tdbcapten_bot',
  discordUrl: 'https://discord.gg/tdbcapten',
  contactEmail: 'contact@tdb.capten.ai',
};

export const navLinks = [
  { href: '/fonctionnalites', label: 'Fonctionnalites' },
  { href: '/comment-ca-marche', label: 'Comment ca marche' },
  { href: '/education', label: 'Education' },
  { href: '/communaute', label: 'Communaute' },
  { href: '/faq', label: 'FAQ' },
];

export const featureCards = [
  {
    title: 'Analyse IA multi-marches',
    body: 'Detection automatique des opportunites sur crypto, forex et indices avec un score de 0 a 100.',
  },
  {
    title: 'Scan en temps reel',
    body: 'Surveillance continue des marches et alertes instantanees sur Telegram des qu un setup se forme.',
  },
  {
    title: 'Indicateurs avances',
    body: 'SMA200, Ichimoku, VIX, momentum et volume analyses simultanement pour une vision complete.',
  },
  {
    title: 'Paper trading',
    body: 'Wallet virtuel de 10 000$ pour pratiquer sans risque et mesurer sa progression.',
  },
  {
    title: 'Gestion du risque',
    body: 'Calcul automatique du position sizing, niveaux d invalidation et ratio risque/rendement.',
  },
  {
    title: 'Tableau de bord',
    body: 'Suivi du PnL, win rate, historique des trades et statistiques de performance.',
  },
];

export const educationCards = [
  {
    title: 'Bases du trading',
    body: 'Structure de marche, tendances, niveaux cles et principes d execution.',
  },
  {
    title: 'Indicateurs expliques',
    body: 'Comprendre et utiliser SMA200, Ichimoku, VIX, momentum et volume.',
  },
  {
    title: 'Gestion du risque',
    body: 'Position sizing, placement des stops et maitrise du drawdown.',
  },
  {
    title: 'Psychologie du trading',
    body: 'Discipline, routine quotidienne et gestion des biais comportementaux.',
  },
  {
    title: 'Lecture des signaux',
    body: 'Interpreter les alertes TDB, valider un setup et decider sans emotion.',
  },
  {
    title: 'Analyse de marche',
    body: 'Methodologie top-down, contexte macro et selection des actifs a surveiller.',
  },
];

export const faqItems = [
  {
    q: 'TDB fournit-il des conseils financiers ?',
    a: 'Non. TDB est un outil educatif. Les analyses et alertes sont des indications pedagogiques, pas des conseils d investissement.',
  },
  {
    q: 'Sur quels marches le bot analyse-t-il ?',
    a: 'Crypto (BTC, ETH, altcoins majeurs), forex (paires principales) et indices (SP500, Nasdaq, CAC40).',
  },
  {
    q: 'Comment fonctionne le paper trading ?',
    a: 'Chaque utilisateur dispose d un wallet virtuel de 10 000$. Les trades sont simules en temps reel sans argent reel.',
  },
  {
    q: 'Le bot est-il disponible 24h/24 ?',
    a: 'Oui. Le scan automatique tourne en continu et les alertes sont envoyees des qu un signal est detecte.',
  },
  {
    q: 'Faut-il des connaissances en trading pour commencer ?',
    a: 'Non. La section education et les explications integrees au bot sont concues pour les debutants comme pour les confirmes.',
  },
  {
    q: 'Comment rejoindre la communaute ?',
    a: 'Via le lien Discord disponible sur le site et dans le bot Telegram. L acces est gratuit.',
  },
];
