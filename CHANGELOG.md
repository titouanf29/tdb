# 📋 Changelog - TDB Trading Bot

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/).

---

## [2.0.0] - 2026-01-26

### ✨ Ajouté

#### 📰 Système d'Actualités Intelligent

**Récupération Multi-Sources**
- Intégration de Yahoo Finance pour les actualités en temps réel
- Scraping Finviz pour sources supplémentaires
- Limite jusqu'à 10 actualités les plus récentes par actif

**Analyse de Sentiment Avancée**
- Détection automatique du sentiment (Positif/Négatif/Neutre)
- 25+ mots-clés positifs (gain, surge, rally, bullish, etc.)
- 25+ mots-clés négatifs (loss, fall, drop, bearish, etc.)
- Support multilingue (français/anglais)
- Scoring de l'intensité du sentiment

**Catégorisation Intelligente**
- Détection de 7 types d'actualités :
  - 📊 Earnings (résultats financiers)
  - 🤝 Acquisitions & Fusions
  - 🤝 Partenariats & Contrats
  - 🚀 Lancements de produits
  - ⚖️ Questions juridiques
  - 👔 Changements de management
  - 📈 Révisions d'analystes
- Identification des actualités à fort impact

**Analyse Complète des Actualités**
- Résumé automatique des points clés
- Statistiques détaillées (répartition pos/neg/neutre)
- Identification des thèmes principaux
- Mise en avant des actualités marquantes

**Prédiction de Tendance Future** 🔮
- Algorithme de prédiction basé sur les actualités
- 5 niveaux de tendance :
  - 📈 HAUSSIÈRE (forte confiance)
  - 📈 LÉGÈREMENT HAUSSIÈRE (confiance modérée)
  - ➡️ NEUTRE/LATÉRALE (confiance faible)
  - 📉 LÉGÈREMENT BAISSIÈRE (confiance modérée)
  - 📉 BAISSIÈRE (forte confiance)
- Score de confiance ajusté selon le type d'actualités
- Recommandations d'action personnalisées

**Affichage Amélioré**
- Section "Sentiment Global" avec emoji et description
- Répartition détaillée des actualités
- Points clés extraits automatiquement
- Résumé textuel intelligent
- Section "Tendance Future Prévue" avec :
  - Direction prédite
  - Niveau de confiance
  - Explication détaillée
  - Recommandation d'action
- Liste des 5 articles les plus récents avec liens cliquables

#### 📢 Système de Broadcast (NOUVEAU!)

**Service de Broadcast**
- Envoi automatique de messages à tous les utilisateurs
- Formatage professionnel des messages de mise à jour
- Gestion intelligente des erreurs et des retry
- Statistiques détaillées d'envoi (réussis/échoués/total)
- Support de messages personnalisés
- Respect des limites Telegram (50ms entre messages)

**Commandes Admin**
- `/send_update [version]` - Envoie les notes de mise à jour formatées
- `/broadcast <message>` - Envoie un message personnalisé à tous
- `/stats` - Affiche les statistiques du bot
- Sécurité par liste d'IDs autorisés (ADMIN_IDS)

**Formatage Automatique**
- Messages de mise à jour pré-formatés pour Telegram
- Emojis et mise en forme professionnelle
- Liens vers le CHANGELOG GitHub
- Messages structurés par version

**Cas d'Usage**
- Notification automatique des nouvelles versions
- Annonces de maintenance
- Messages importants
- Nouvelles fonctionnalités

**Documentation Complète**
- Guide d'utilisation dans `docs/BROADCAST.md`
- Instructions de configuration admin
- Workflow de mise à jour
- Best practices et exemples
- Dépannage

#### 📊 Analyse des Actifs Améliorée

**Explications Pédagogiques**
- Interprétation automatique du RSI (survente/surachat/neutre)
- Analyse contextuelle du volume avec impact sur la fiabilité
- Explication détaillée des tendances (haussière/baissière/neutre)
- Distance au support/résistance avec opportunités identifiées

**Breakdown des Scores Détaillé**
- Chaque catégorie affichée avec son pourcentage
- Évaluation qualitative (Excellent/Bon/Moyen/Faible)
- 6 catégories analysées :
  - 📊 Technique (30%)
  - 📈 Volume (20%)
  - ⚡ Momentum (15%)
  - 📉 Volatilité (10%)
  - 🌐 Contexte Marché (15%)
  - 📰 Actualités (10%)

**Système de Recommandations Intelligent**
- Recommandation principale basée sur le score global
- Validation ou alerte RSI
- Confirmation par le volume
- Alignement avec la tendance
- Détection des signaux contre-tendance (risque élevé)
- Conseils de gestion du risque personnalisés

**Exemples de Recommandations**
```
🟢 SIGNAL FORT D'ACHAT - Tous les indicateurs sont alignés favorablement
✅ RSI en survente confirme l'opportunité d'achat
✅ Volume élevé confirme la force du mouvement
✅ Tendance haussière alignée avec le signal d'achat
✅ Risque faible : Conditions favorables pour une entrée
```

Ou en cas de divergence :
```
⚠️ Signal modéré - Attendre des confirmations supplémentaires
⚠️ Attention : RSI en surachat, risque de correction à court terme
⚠️ Volume faible : attendre une confirmation avec plus d'activité
⚠️ Signal d'achat contre-tendance : attendre retournement confirmé
🛑 RISQUE ÉLEVÉ : Réduire la taille de position ou attendre de meilleures conditions
```

**Interface Restructurée**
- Affichage plus clair et structuré
- Explications en langage naturel pour chaque métrique
- Emojis contextuels pour faciliter la lecture
- Section dédiée aux recommandations
- Format éducatif pour comprendre l'analyse

### 🔧 Modifié

**Service News (`services/news.py`)**
- Ajout de la méthode `categorize_news()`
- Ajout de la méthode `analyze_news_comprehensive()`
- Ajout de la méthode `_predict_future_trend()`
- Ajout de la méthode `_generate_summary_text()`
- Extension des listes de mots-clés positifs/négatifs
- Ajout du dictionnaire de catégories

**Analyzer AI (`ai/analyzer.py`)**
- Intégration du service news
- Ajout de la méthode `_analyze_news()`
- Ajout de la méthode `_get_news_summary()`
- Ajout de la méthode `_generate_explanations()`
- Ajout de la méthode `_generate_recommendations()`
- Inclusion du score news dans le scoring final
- Ajout de `news_summary`, `explanations` et `recommendations` dans le retour

**Module Marché (`modules/market.py`)**
- Import du service news et datetime
- Refonte complète de `show_news()` pour l'analyse intelligente
- Refonte de `show_asset_detail()` pour afficher les explications
- Ajout de l'affichage du breakdown des scores
- Ajout de la section recommandations
- Message de chargement pendant l'analyse des news

### 📈 Améliorations

**Performance**
- Analyse des actualités en temps réel
- Cache implicite via les requêtes API
- Limitation à 10 articles pour optimiser la vitesse

**UX/UI**
- Messages de chargement pour les opérations longues
- Formatage amélioré avec emojis contextuels
- Liens cliquables vers les articles
- Informations hiérarchisées par importance

**Pédagogie**
- Explications en langage naturel
- Contexte pour chaque indicateur
- Recommandations actionnables
- Alertes de divergence

### 🐛 Corrections

- Correction du placeholder "Fonctionnalité en développement" dans les news
- Ajout de la gestion des erreurs pour l'analyse des actualités
- Validation des timestamps d'articles
- Gestion des titres et résumés vides

---

## [1.0.0] - 2026-01-22

### ✨ Version Initiale

- Système d'analyse technique multi-timeframes
- Paper trading avec gestion des positions
- Scan automatique des marchés
- Trading Compagnon IA
- Gestion des favoris
- Support de 6 marchés (USA, Europe, Asie, Crypto, Matières premières, Or)
- Interface Telegram complète

---

## 📊 Statistiques

### Version 2.0.0
- **Lignes ajoutées** : 1500+
- **Fichiers modifiés** : 6 (services/news.py, services/broadcast.py, ai/analyzer.py, modules/market.py, modules/admin.py, database/manager.py, config.py, main.py)
- **Nouveaux fichiers** : 4 (services/broadcast.py, modules/admin.py, docs/BROADCAST.md, CHANGELOG.md)
- **Nouvelles fonctionnalités** : 15+
- **Commits** : 6

### Impact sur l'utilisateur
- ✅ Actualités maintenant fonctionnelles (vs placeholder)
- ✅ Prédiction de tendance basée sur les news
- ✅ Analyse 10x plus détaillée avec explications
- ✅ Recommandations personnalisées intelligentes
- ✅ Interface pédagogique pour apprendre en tradant
- ✅ **Notifications automatiques des mises à jour**
- ✅ **Communication directe avec tous les utilisateurs**

---

*Pour toute question sur les mises à jour, consultez les commits ou ouvrez une issue.*
