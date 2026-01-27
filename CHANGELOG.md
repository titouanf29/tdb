# 📋 Changelog - TDB Trading Bot

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/).

---

## [2.1.1] - 2026-01-27

### 🔄 Modifié

**Migration de l'Assistant IA : Google Gemini → Groq**

- ⚡ **Performance ultra-rapide** : Réponses en <1 seconde (au lieu de 2-5s)
- 🌍 **Disponibilité mondiale** : Groq disponible partout, y compris en France
- 🆓 **Limite augmentée** : 6000 requêtes/jour gratuites (au lieu de 1500)
- 🤖 **Modèle puissant** : Llama 3 70B pour des réponses de qualité
- 🔑 **Configuration simplifiée** : Clé API Groq plus facile à obtenir

**Modifications techniques**
- Remplacement de `google-generativeai` par `groq` dans requirements.txt
- Mise à jour de `services/ai_assistant.py` pour utiliser l'API Groq
- Changement de `GEMINI_API_KEY` en `GROQ_API_KEY` dans config.py
- Documentation mise à jour (README, AI_ASSISTANT.md, .env.example)
- Logs de démarrage mis à jour

**Migration utilisateur**
1. Obtenir une clé Groq sur https://console.groq.com/
2. Remplacer `GEMINI_API_KEY` par `GROQ_API_KEY` dans `.env`
3. Installer la nouvelle dépendance : `pip install groq`

---

## [2.1.0] - 2026-01-27

### ✨ Ajouté

#### 🤖 Assistant IA Trading Conversationnel

**Chat Intelligent avec Google Gemini**
- Intégration de Google Gemini 1.5 Flash (API gratuite)
- Mode chat conversationnel activable via `/ai_assistant`
- Réponses en français, claires et pédagogiques
- Support d'emojis pour une meilleure visualisation

**Fonctionnalités de l'Assistant**
- 💬 Réponses aux questions sur le trading et la finance
- 📊 Explications détaillées des indicateurs techniques (RSI, MACD, Bollinger Bands, etc.)
- 📈 Analyse d'actifs avec contexte en temps réel (prix, RSI, actualités)
- 💡 Suggestions de stratégies adaptées aux différents marchés
- 🎓 Éducation sur les concepts de trading et les bougies japonaises

**Contexte et Historique**
- Maintien d'un historique de conversation (5 derniers messages)
- Détection automatique d'actifs mentionnés dans les questions
- Enrichissement automatique avec analyse en temps réel
- Contexte persistant pour des conversations naturelles

**Limites et Sécurité**
- 🔒 Limite gratuite : 20 messages/jour par utilisateur
- ⚠️ Aucun conseil financier personnalisé
- ✅ Avertissements systématiques "DYOR - Do Your Own Research"
- 🔄 Reset automatique quotidien des compteurs

**Interface et Commandes**
- Bouton 🤖 Assistant IA dans le menu principal
- `/ai_assistant` - Active le mode chat
- `/stop_ai` - Désactive le mode chat
- Bouton "❌ Arrêter le chat" pour sortir du mode
- Bouton "🗑️ Effacer l'historique" pour repartir sur une conversation fraîche
- Compteur de messages restants affiché après chaque réponse

**Base de Données**
- Nouvelle table `ai_chat_history` pour l'historique des conversations
- Nouvelle table `ai_usage_stats` pour les compteurs journaliers
- Index optimisés pour les performances

**Configuration**
- Variable d'environnement `GEMINI_API_KEY` dans `.env`
- Configuration `MAX_AI_MESSAGES_PER_DAY = 20` dans `config.py`
- Documentation complète dans `docs/AI_ASSISTANT.md`

**Documentation**
- Guide complet d'utilisation (`docs/AI_ASSISTANT.md`)
- Exemples de questions et réponses
- Architecture technique détaillée
- Guide de dépannage
- Section dans le README principal

### ⚡ Optimisé

**Performance des Scans de Marché**
- Les actualités ne sont plus récupérées pendant les scans de marché
- Gain de performance : 5-10x plus rapide
- Nouveau paramètre `fetch_news=False` pour les scans rapides
- Les actualités restent disponibles lors de l'analyse détaillée d'un actif
- Score neutre (0.5) utilisé pour les news lors des scans

**Impact Performance**
- Scan de 20 actifs : ~60-90s → ~10-15s
- Temps par actif : ~3-4s → ~0.5-0.75s

### 🔧 Modifié

**Analyzer (`ai/analyzer.py`)**
- Ajout du paramètre `fetch_news=True` à la méthode `analyze_asset()`
- Récupération conditionnelle des actualités selon le contexte
- Documentation améliorée avec description des paramètres

**Auto Scanner (`services/auto_scanner.py`)**
- Utilise maintenant `fetch_news=False` pour les scans automatiques
- Commentaires explicatifs sur l'optimisation

**Module Market (`modules/market.py`)**
- Scans de marché : `fetch_news=False` (rapide)
- Analyses détaillées : `fetch_news=True` (complet)

**Configuration (`config.py`)**
- Ajout de `GEMINI_API_KEY` pour l'API Google Gemini
- Ajout de `MAX_AI_MESSAGES_PER_DAY = 20` pour la limite journalière

**Requirements (`requirements.txt`)**
- Ajout de `google-generativeai>=0.3.0`

**Menu Principal (`modules/menu.py`)**
- Ajout du bouton "🤖 Assistant IA"
- Intégration du module AI assistant
- Description mise à jour

**Main (`main.py`)**
- Chargement et enregistrement du module AI assistant
- Handlers pour les messages texte et callbacks
- Logs de démarrage mis à jour

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
