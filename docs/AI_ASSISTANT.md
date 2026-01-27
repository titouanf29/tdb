# 🤖 Assistant IA Trading

## Description

L'Assistant IA Trading est un chatbot conversationnel intégré au TDB Bot qui permet aux utilisateurs de poser des questions sur le trading, les indicateurs techniques, les stratégies d'investissement et d'obtenir des explications détaillées.

## 🎯 Fonctionnalités

### ✅ Ce que l'Assistant peut faire

- ✨ **Répondre aux questions** sur le trading, la finance, les marchés
- 📊 **Expliquer les indicateurs techniques** (RSI, MACD, Bollinger Bands, etc.)
- 📈 **Analyser des actifs** avec contexte en temps réel (prix, RSI, actualités)
- 💡 **Proposer des stratégies** de trading adaptées aux différents marchés
- 🎓 **Éduquer** sur les concepts financiers et le trading
- 💬 **Maintenir un historique** de conversation pour un contexte continu

### ⛔ Ce que l'Assistant NE fait PAS

- ❌ Ne donne **JAMAIS** de conseils financiers personnalisés
- ❌ Ne dit **JAMAIS** "achète X" ou "vends Y"
- ❌ Ne garantit **AUCUN** rendement
- ⚠️ Rappelle toujours : "DYOR - Do Your Own Research"

## 🚀 Utilisation

### Activer le mode chat

**Depuis le menu principal :**
1. Envoyez `/menu`
2. Cliquez sur 🤖 **Assistant IA**

**Ou directement :**
```
/ai_assistant
```

### Poser des questions

Une fois le mode chat activé, envoyez simplement vos questions :

```
C'est quoi un RSI ?
```

```
Comment trader en marché baissier ?
```

```
Analyse AAPL pour moi
```

```
Explique-moi les chandeliers japonais
```

### Désactiver le mode chat

**Bouton :** Cliquez sur ❌ **Arrêter le chat**

**Ou commande :**
```
/stop_ai
```

### Effacer l'historique

Cliquez sur 🗑️ **Effacer l'historique** pour repartir sur une conversation fraîche.

## 📊 Limites d'utilisation

### Limite gratuite

- **20 messages par jour par utilisateur**
- Reset automatique à minuit (UTC)
- Compteur affiché après chaque réponse

### Dépassement de la limite

Si vous atteignez la limite :
```
⚠️ Limite journalière atteinte

Vous avez utilisé 20/20 messages aujourd'hui.

La limite sera réinitialisée demain. 🔄
```

Le mode chat est automatiquement désactivé.

## 🔧 Configuration (pour administrateurs)

### 1. Obtenir une clé API Google Gemini

1. Allez sur https://makersuite.google.com/app/apikey
2. Connectez-vous avec un compte Google
3. Cliquez sur **Create API Key**
4. Copiez la clé générée

### 2. Configurer le bot

Ajoutez la clé dans votre fichier `.env` :

```env
GEMINI_API_KEY=votre_cle_api_ici
```

### 3. Modifier les limites (optionnel)

Dans `config.py`, modifiez :

```python
MAX_AI_MESSAGES_PER_DAY = 20  # Changez selon vos besoins
```

## 💡 Exemples d'utilisation

### 📚 Questions éducatives

```
User: C'est quoi un RSI ?

Bot: 📊 Le RSI (Relative Strength Index) est un indicateur de momentum
qui mesure la force d'un actif en comparant les gains et les pertes
récentes sur une période donnée (généralement 14 jours).

📈 Interprétation :
• RSI > 70 : Zone de surachat (possiblement suracheté)
• RSI < 30 : Zone de survente (possiblement sous-évalué)
• RSI = 50 : Équilibre entre acheteurs et vendeurs

💡 Utilisation : Le RSI aide à identifier les retournements potentiels
et les moments d'entrée/sortie.

⚠️ Ceci n'est pas un conseil financier. Fais toujours tes propres recherches (DYOR).
```

### 📊 Analyse d'actifs

```
User: Analyse AAPL pour moi

Bot: 📊 Analyse de AAPL (Apple Inc.)

Prix actuel: $185.23
Score d'analyse: 78/100
Direction: LONG 📈
RSI: 58.4

📰 Actualités récentes:
🟢 Sentiment: POSITIF | Impact: MODÉRÉ | 5 articles récents

📈 Résumé technique:
Tendance haussière | Volume élevé

💡 L'actif présente des signaux positifs avec un momentum favorable.
Le RSI en zone neutre laisse de la marge pour une continuation.

⚠️ Ceci n'est pas un conseil financier. Fais toujours tes propres recherches (DYOR).
```

### 💡 Stratégies de trading

```
User: Quelle stratégie pour un marché baissier ?

Bot: 📉 Stratégies en marché baissier :

1. **Position Cash** 💵
   Rester liquide et attendre de meilleures opportunités

2. **Short Selling** 📉
   Vendre à découvert pour profiter de la baisse
   (Risque élevé, réservé aux traders expérimentés)

3. **ETF Inverses** 🔄
   Investir dans des produits qui montent quand le marché baisse

4. **Secteurs défensifs** 🛡️
   Privilégier santé, utilities, biens de consommation

5. **DCA (Dollar Cost Averaging)** 📊
   Acheter progressivement pour moyenner le prix d'entrée

⚠️ Ceci n'est pas un conseil financier. Adaptez votre stratégie à votre profil de risque.
```

## 🎓 Architecture technique

### API utilisée

- **Google Gemini 1.5 Flash**
- Gratuit jusqu'à 1500 requêtes/jour
- Rapide et performant
- Support multilingue

### Base de données

Deux tables gèrent l'assistant :

#### `ai_chat_history`
Stocke l'historique de conversation :
```sql
CREATE TABLE ai_chat_history (
    id INTEGER PRIMARY KEY,
    telegram_id INTEGER,
    role TEXT,  -- 'user' ou 'assistant'
    content TEXT,
    timestamp TIMESTAMP,
    tokens_used INTEGER
);
```

#### `ai_usage_stats`
Compteurs d'utilisation journaliers :
```sql
CREATE TABLE ai_usage_stats (
    telegram_id INTEGER,
    date DATE,
    message_count INTEGER,
    tokens_used INTEGER,
    PRIMARY KEY (telegram_id, date)
);
```

### Flux de traitement

1. **User envoie message** → Vérifie limite journalière
2. **Récupère historique** → Contexte des 5 derniers messages
3. **Détecte actif mentionné** → Enrichit avec analyse en temps réel
4. **Envoie à Gemini** → Génère réponse contextuelle
5. **Sauvegarde historique** → Incrémente compteur
6. **Affiche réponse** → Avec compteur restant

## 🔐 Sécurité et éthique

### Garde-fous implémentés

✅ **Pas de conseils financiers personnalisés**
- Le système prompt interdit explicitement les recommandations d'achat/vente

✅ **Avertissements systématiques**
- Chaque réponse inclut "Ceci n'est pas un conseil financier"

✅ **Limites d'usage**
- 20 messages/jour pour éviter les abus

✅ **Contexte éducatif**
- Focus sur l'éducation et l'explication, pas la prédiction

### Données utilisateur

- ✅ Historique stocké localement (SQLite)
- ✅ Pas de partage avec des tiers
- ✅ Effaçable à tout moment par l'utilisateur

## 📈 Statistiques

Pour voir vos statistiques d'utilisation :
```python
# Dans le code (pour admins)
usage = await db_manager.get_ai_daily_usage(telegram_id)
print(f"Messages: {usage['message_count']}/20")
print(f"Tokens: {usage['tokens_used']}")
```

## 🐛 Dépannage

### Erreur "GEMINI_API_KEY n'est pas configuré"

**Solution :** Ajoutez votre clé API dans `.env`
```env
GEMINI_API_KEY=votre_cle_ici
```

### Limite atteinte trop rapidement

**Solution :** Augmentez la limite dans `config.py`
```python
MAX_AI_MESSAGES_PER_DAY = 50  # Au lieu de 20
```

### Réponses lentes

**Causes possibles :**
- Connexion internet lente
- API Gemini temporairement surchargée
- Historique de conversation trop long

**Solutions :**
- Effacer l'historique
- Réessayer dans quelques minutes

### Module ne se charge pas

**Vérifiez :**
1. Installation de `google-generativeai` :
   ```bash
   pip install google-generativeai
   ```
2. Clé API valide dans `.env`
3. Logs du bot pour détails d'erreur

## 📝 Notes de version

### v1.0.0 - Initial Release

✨ **Fonctionnalités** :
- Chat conversationnel avec Gemini 1.5 Flash
- Historique de conversation (5 derniers messages)
- Détection automatique d'actifs mentionnés
- Enrichissement avec analyse en temps réel
- Limite journalière (20 messages/jour)
- Commandes /ai_assistant et /stop_ai
- Interface avec boutons interactifs

🔒 **Sécurité** :
- Pas de conseils financiers personnalisés
- Avertissements systématiques
- Limites d'usage

📊 **Performance** :
- Réponses en 2-5 secondes
- Stockage local (SQLite)
- Support jusqu'à 1500 requêtes/jour (limite Gemini gratuite)

## 🚀 Évolutions futures

Idées pour améliorer l'assistant :

- [ ] Support d'images (graphiques, patterns)
- [ ] Analyse de portefeuille personnalisée
- [ ] Recommandations de lectures/ressources
- [ ] Mode "expert" vs "débutant"
- [ ] Intégration avec TradingView
- [ ] Alertes personnalisées basées sur conversations

## 📞 Support

Pour toute question ou problème :
- Ouvrir une issue sur GitHub
- Consulter les logs du bot
- Vérifier la documentation Gemini : https://ai.google.dev/

---

**⚠️ Avertissement légal**

L'Assistant IA Trading est un outil éducatif. Il ne constitue en aucun cas un conseil en investissement financier. Les marchés financiers comportent des risques de perte en capital. Toute décision d'investissement relève de votre seule responsabilité. Faites toujours vos propres recherches (DYOR).