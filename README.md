# 🤖 TDB - Trading Bot Professionnel

Bot Telegram de trading virtuel avancé avec analyse IA complète.

## 🌟 Fonctionnalités

### 📊 Marchés Disponibles
- 🇪🇺 **EUROPE** (CAC40, DAX, STOXX50, etc.)
- 🇺🇸 **USA** (AAPL, TSLA, NVDA, META, etc.)
- 🌏 **ASIA** (Nikkei, HSI, etc.)
- 🪙 **CRYPTO** (BTC, ETH, SOL, etc.)
- 🛢️ **MATIÈRES PREMIÈRES** (Pétrole, Gaz, etc.)
- 🥇 **GOLD** (Or, Argent)

### 🧠 Algorithme d'Analyse IA

L'algorithme analyse **plusieurs dizaines de paramètres** :

#### Analyse Technique
- Tendances multi-timeframes (5m, 15m, 1h, 4h, 1d)
- Structure de marché (HH, HL, LH, LL)
- Supports et résistances
- Cassures et retests

#### Indicateurs Techniques
- RSI (Relative Strength Index)
- MACD (Moving Average Convergence Divergence)
- EMA (Exponential Moving Averages)
- Bollinger Bands
- ATR (Average True Range)
- VWAP
- Volume Profile
- OBV (On Balance Volume)

#### Analyse Avancée
- Volume (accumulation/distribution)
- Volatilité (compression/expansion)
- Momentum
- Contexte marché global
- Corrélation avec les indices

### 🎯 Système de Scoring Intelligent

Chaque actif reçoit un **score de 0 à 100** basé sur :

| Critère | Pondération |
|---------|-------------|
| Technique | 30% |
| Volume | 20% |
| Momentum | 15% |
| Volatilité | 10% |
| Contexte marché | 15% |
| Actualités | 10% |

**Interprétation des scores :**
- 🔴 0-40 : À ignorer
- 🟠 40-60 : Surveillance
- 🟢 60-75 : Opportunité possible
- 🔥 75-100 : Opportunité forte

### 💼 Paper Trading Réaliste

- Wallet virtuel avec solde personnalisable
- Positions LONG et SHORT
- Gestion du levier (1x à 10x)
- Take Profit et Stop Loss automatiques
- Suivi en temps réel des positions
- Historique complet des trades

### 🤖 Trading Compagnon IA

Assistant conversationnel intelligent qui vous accompagne :

1. **Définir le montant** à investir
2. **Choisir la direction** (LONG/SHORT)
3. **Paramétrer le levier**
4. **Calcul automatique** des TP et SL
5. **Génération d'un ticket** de position unique

### ⭐ Favoris & Watchlist

- Ajouter vos actifs préférés
- Résumés quotidiens automatiques
- Surveillance prioritaire
- Notifications intelligentes

### 🔍 Scan Automatique

- Scanner en continu les marchés
- Détection automatique d'opportunités
- Filtrage par score minimum
- Notifications temps réel

### ⚙️ Paramètres Personnalisables

- Style de trading (scalp, day, swing)
- Gestion du risque
- Notifications personnalisées
- Configuration IA
- Interface

## 🚀 Installation

### Prérequis

- Python 3.9 ou supérieur
- Un token Telegram Bot (via [@BotFather](https://t.me/BotFather))

### Installation des dépendances

```bash
pip install -r requirements.txt
```

### Configuration

1. Copier le fichier `.env.example` en `.env` :
```bash
cp .env.example .env
```

2. Éditer `.env` et ajouter votre token Telegram :
```env
TELEGRAM_TOKEN=votre_token_ici
```

## ▶️ Lancement

```bash
python main.py
```

Le bot démarrera et affichera :
```
🤖 TDB Bot démarré avec succès !
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Modules actifs:
  • Menu Principal
  • Marché
  • Wallet (Paper Trading)
  • Favoris
  • Scan Automatique
  • Paramètres
  • Trading Compagnon IA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Le bot est prêt à recevoir des commandes
```

## 📱 Utilisation

### Commandes de base

- `/start` - Démarrer le bot
- `/menu` - Afficher le menu principal

### Navigation

Tout se fait via des **boutons** - aucune commande compliquée à mémoriser !

Le `/menu` est le **hub central** :

```
🤖 TDB - MENU PRINCIPAL

📊 Marché      → Analyser les marchés
💼 Wallet      → Gérer votre portefeuille
⭐ Favoris     → Vos actifs préférés
🔍 Scan Auto   → Scanner automatique
⚙️ Paramètres  → Configuration
```

### Workflow typique

1. **Analyser un marché** 📊
   - Sélectionner un marché (USA, CRYPTO, etc.)
   - Le bot scanne tous les actifs
   - Résultats classés par score

2. **Analyser un actif** 🔍
   - Cliquer sur un actif
   - Analyse IA complète
   - Score, tendance, niveaux clés

3. **Ouvrir une position** 🤖
   - Utiliser le Trading Compagnon
   - Définir montant, direction, levier
   - Confirmation et ouverture

4. **Suivre ses positions** 💼
   - Module Wallet
   - Positions ouvertes en temps réel
   - Fermeture manuelle possible

## 🏗️ Architecture

```
tdb/
├── main.py                 # Point d'entrée
├── config.py               # Configuration
├── requirements.txt        # Dépendances
│
├── database/               # Système BDD
│   ├── schema.sql
│   └── manager.py
│
├── modules/                # Modules fonctionnels
│   ├── menu.py
│   ├── market.py
│   ├── wallet.py
│   ├── favorites.py
│   ├── scan_auto.py
│   └── settings.py
│
├── ai/                     # Intelligence artificielle
│   ├── analyzer.py         # Algorithme d'analyse
│   └── trading_companion.py
│
├── services/               # Services
│   ├── market_data.py      # Données marché
│   ├── charts.py           # Graphiques
│   └── notifications.py    # Notifications
│
└── utils/                  # Utilitaires
    ├── helpers.py
    ├── validators.py
    └── constants.py
```

## 📊 Base de Données

Le bot utilise **SQLite** avec les tables suivantes :

- `users` - Utilisateurs
- `user_settings` - Paramètres
- `wallet` - Portefeuilles
- `positions` - Positions ouvertes
- `position_history` - Historique
- `favorites` - Favoris
- `scan_results` - Résultats scans
- `notifications` - Notifications
- `conversation_states` - États conversations

## 🔒 Sécurité

- Aucune donnée sensible stockée
- Paper trading uniquement (argent virtuel)
- Base de données locale
- Aucune connexion à des brokers réels

## ⚠️ Disclaimer

Ce bot est un **outil pédagogique** et de **simulation**.

- Argent virtuel uniquement
- Ne constitue pas un conseil en investissement
- Les performances passées ne préjugent pas des performances futures
- Tradez toujours de manière responsable

## 🛠️ Développement

### Technologies utilisées

- **python-telegram-bot** - Interface Telegram
- **yfinance** - Données de marché
- **pandas** - Traitement données
- **numpy** - Calculs
- **matplotlib** - Graphiques
- **aiosqlite** - Base de données
- **APScheduler** - Tâches planifiées

### Structure modulaire

Chaque module est **indépendant** et peut être modifié sans affecter les autres.

## 🆕 Nouveautés Version 2.0.0

### 📰 Système d'Actualités Intelligent (NOUVEAU!)
- ✅ Récupération multi-sources (Yahoo Finance, Finviz)
- ✅ Analyse de sentiment automatique
- ✅ Catégorisation des actualités (earnings, acquisitions, etc.)
- ✅ **Prédiction de tendance future basée sur les news**
- ✅ Recommandations d'action personnalisées
- ✅ Résumé intelligent avec points clés

### 📊 Analyse Améliorée (NOUVEAU!)
- ✅ Explications pédagogiques pour chaque indicateur
- ✅ Breakdown détaillé des scores par catégorie
- ✅ Système de recommandations intelligent
- ✅ Détection des divergences et alertes
- ✅ Conseils de gestion du risque

👉 **Voir [CHANGELOG.md](CHANGELOG.md) pour les détails complets**

## 📝 TODO / Améliorations futures

- [ ] Machine Learning pour prédictions avancées
- [ ] Backtesting automatique
- [ ] Statistiques avancées et rapports
- [ ] Export des données (CSV, JSON)
- [ ] Support multi-langues
- [ ] Interface web complémentaire
- [ ] Alertes SMS/Email

## 🤝 Contribution

Les contributions sont les bienvenues !

## 📄 Licence

MIT License

---

**Développé avec ❤️ pour la communauté du trading**

*TDB Bot - Votre assistant trading personnel dans Telegram*
