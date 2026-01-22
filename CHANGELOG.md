# 📋 CHANGELOG - Trading Bot Telegram

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

## [2.1.0] - 2026-01-22

### ✨ Nouvelles Fonctionnalités
- **Système de News Amélioré** : Ajout de sources d'actualités supplémentaires
  - Reuters - Actualités financières mondiales
  - Bloomberg - Marchés et économie
  - CoinDesk - Actualités crypto spécialisées
  - CryptoCompare - Données et news crypto
  - Investing.com - Actualités multi-actifs
  - CNBC - Actualités financières en temps réel
- **Publication Automatique du Changelog** : Le bot publie automatiquement les mises à jour dans le canal principal au démarrage
- **Filtrage Intelligent des News** : Les actualités sont filtrées par type d'actif (actions, crypto, commodités)

### 🔧 Améliorations
- Optimisation de la fonction `get_news_from_multiple_sources()`
- Meilleure gestion des timeouts pour les sources de news
- Détection automatique du type d'actif pour un filtrage pertinent des sources

### 🐛 Corrections
- Correction des boutons du menu principal
- Amélioration de la stabilité du scraping web

---

## [2.0.0] - 2026-01-20

### ✨ Nouvelles Fonctionnalités
- **Système de Trading Intelligent** : Gestion complète des positions avec Take Profit et Stop Loss
- **Monitoring en Temps Réel** : Surveillance automatique des positions toutes les 60 secondes
- **Alertes Avancées** : Notifications pour TP1, TP2, SL et Knockout
- **Menu Interactif** : Navigation complète via boutons inline

### 🔧 Améliorations
- Analyse technique multi-indicateurs (RSI, MACD, SMA)
- Système de scoring pour identifier les opportunités
- Génération automatique de graphiques

---

## [1.5.0] - 2026-01-15

### ✨ Nouvelles Fonctionnalités
- **Paper Trading** : Simulation de trading avec capital virtuel
- **Watchlist Multi-Marchés** : Support pour US, Europe, Asie, Crypto, Commodités
- **Scans Automatiques** : Détection d'opportunités toutes les 15 minutes

### 🔧 Améliorations
- Base de données SQLite pour la persistence
- Système d'alertes prix programmées
- Rapports quotidiens automatiques

---

## [1.0.0] - 2026-01-01

### ✨ Lancement Initial
- Bot Telegram de base avec analyse de titres
- Intégration Yahoo Finance
- Commandes de base : /start, /analyze, /help
- Support multi-utilisateurs

---

## Légende

- ✨ **Nouvelles Fonctionnalités** : Ajouts de features
- 🔧 **Améliorations** : Optimisations et enhancements
- 🐛 **Corrections** : Bug fixes
- 🔒 **Sécurité** : Mises à jour de sécurité
- 📚 **Documentation** : Améliorations de la documentation
- ⚡ **Performance** : Optimisations de performance
