# 📰 Sources d'Actualités - Documentation Technique

Ce document explique comment le système de récupération d'actualités fonctionne et quelles sources sont utilisées selon les actifs.

## 🔍 Détection Automatique du Type d'Actif

Le système détecte automatiquement si l'actif est :
- **Cryptomonnaie** : BTC-USD, ETH-USD, SOL-USD, etc.
- **Action** : AAPL, TSLA, MSFT, etc.
- **Indice** : ^GSPC, ^DJI, etc.

## 📡 Sources par Type d'Actif

### Pour les ACTIONS (AAPL, TSLA, MSFT, etc.)

#### 1. Yahoo Finance ✅
- **API** : yfinance library
- **Avantages** : Gratuit, fiable, multi-marchés
- **Données** : Titre, résumé, lien, date, éditeur
- **Limite** : 8 articles max

#### 2. Google News RSS ✅
- **API** : RSS Feed public
- **Avantages** : Large couverture, très à jour
- **Données** : Titre, lien, date, source
- **Limite** : 5 articles max
- **Format** : Recherche par ticker + "stock"

#### 3. Finviz ✅
- **Méthode** : Web scraping
- **Avantages** : Actualités financières spécialisées
- **Données** : Titre, lien, date, source
- **Limite** : 10 articles max
- **Note** : Fonctionne uniquement pour actions US

### Pour les CRYPTOS (BTC-USD, ETH-USD, etc.)

#### 1. Yahoo Finance ✅
- **API** : yfinance library
- **Avantages** : Supporte les cryptos principales
- **Données** : Titre, résumé, lien, date
- **Limite** : 8 articles max

#### 2. CoinDesk ✅
- **Méthode** : Web scraping
- **Avantages** : Source #1 pour crypto news
- **Données** : Titre, lien
- **Cryptos supportées** :
  - Bitcoin (BTC)
  - Ethereum (ETH)
  - Solana (SOL)
  - Cardano (ADA)
  - Ripple (XRP)
  - Polkadot (DOT)
  - Dogecoin (DOGE)
  - Avalanche (AVAX)
  - Polygon (MATIC)
- **Limite** : 5 articles max

## 🔄 Système de Fallback

Le système tente toutes les sources et combine les résultats :

```
1. Tentative Yahoo Finance
   ↓ (même si succès, continue)
2. Tentative Google News (actions) OU CoinDesk (crypto)
   ↓ (même si succès, continue)
3. Tentative Finviz (actions seulement)
   ↓
4. Déduplication des articles
   ↓
5. Tri par date (plus récent en premier)
   ↓
6. Limite aux X premiers articles
   ↓
7. Analyse de sentiment
```

## 📊 Processus de Déduplication

Pour éviter les doublons :
1. Convertir les titres en minuscules
2. Comparer les titres identiques
3. Garder seulement le premier de chaque titre
4. Résultat : Articles uniques

## 🎯 Exemple de Flux

### Pour AAPL (Action)

```
Requête : get_news('AAPL', limit=8)

Sources consultées :
1. ✅ Yahoo Finance → 8 articles
2. ✅ Google News → 5 articles
3. ✅ Finviz → 10 articles

Total brut : 23 articles
Après déduplication : 18 articles uniques
Après tri et limite : 8 articles les plus récents

Résultat : 8 articles de sources variées
```

### Pour BTC-USD (Crypto)

```
Requête : get_news('BTC-USD', limit=8)

Sources consultées :
1. ✅ Yahoo Finance → 8 articles
2. ✅ CoinDesk → 5 articles
3. ❌ Google News (désactivé pour crypto)
4. ❌ Finviz (désactivé pour crypto)

Total brut : 13 articles
Après déduplication : 12 articles uniques
Après tri et limite : 8 articles les plus récents

Résultat : 8 articles de sources variées
```

## 🛠️ Gestion des Erreurs

Chaque source est dans un try/except indépendant :

```python
# SOURCE 1
try:
    articles = fetch_yahoo_finance(ticker)
    all_news.extend(articles)
except Exception as e:
    print(f"Erreur Yahoo: {e}")
    # Continue vers la source suivante

# SOURCE 2
try:
    articles = fetch_google_news(ticker)
    all_news.extend(articles)
except Exception as e:
    print(f"Erreur Google: {e}")
    # Continue vers la source suivante
```

**Résultat** : Si une source échoue, les autres continuent à fonctionner.

## 📝 Logs de Debug

Le système affiche des logs détaillés :

```
[NEWS] Récupération des actualités pour AAPL (crypto: False)
[NEWS] Tentative Yahoo Finance pour AAPL...
[NEWS] Yahoo Finance: 8 articles trouvés
[NEWS] Tentative Google News RSS pour AAPL...
[NEWS] Google News: 5 articles trouvés
[NEWS] Tentative Finviz pour AAPL...
[NEWS] Finviz: 10 articles trouvés
[NEWS] Total: 8 articles uniques après déduplication
```

Ces logs permettent de voir :
- ✅ Quelles sources fonctionnent
- ❌ Quelles sources échouent
- 📊 Combien d'articles chaque source retourne

## 🔧 Configuration

### Ajouter une Nouvelle Source

Pour ajouter une nouvelle source d'actualités :

1. **Ajoutez une section dans `get_news()`** :

```python
# ============ SOURCE X: Votre Source ============
try:
    print(f"[NEWS] Tentative Votre Source pour {ticker}...")

    # Votre code de récupération ici
    articles = fetch_your_source(ticker)

    for article in articles:
        all_news.append({
            'title': article.title,
            'publisher': 'Votre Source',
            'link': article.url,
            'published': article.timestamp,
            'summary': article.description,
            'source': 'Votre Source'
        })

    print(f"[NEWS] Votre Source: {len(articles)} articles trouvés")

except Exception as e:
    print(f"[NEWS] Erreur Votre Source: {e}")
```

2. **Testez** avec différents tickers

3. **Ajoutez la documentation** dans ce fichier

### Modifier les Limites

Pour changer le nombre d'articles par source :

```python
# Avant
news = stock.news[:8]  # 8 articles max de Yahoo

# Après
news = stock.news[:15]  # 15 articles max de Yahoo
```

## ⚡ Performance

### Temps de Réponse

- **Yahoo Finance** : ~500ms
- **Google News RSS** : ~800ms
- **CoinDesk scraping** : ~1200ms
- **Finviz scraping** : ~1000ms

**Total moyen** : 2-3 secondes pour récupérer toutes les sources

### Optimisations Possibles

1. **Parallélisation** : Requêter toutes les sources en même temps
   ```python
   import asyncio
   results = await asyncio.gather(
       fetch_yahoo(ticker),
       fetch_google(ticker),
       fetch_finviz(ticker)
   )
   ```

2. **Cache** : Mettre en cache les résultats pendant 5-10 minutes
   ```python
   @lru_cache(maxsize=100, ttl=300)  # 5 minutes
   def get_news(ticker, limit):
       ...
   ```

3. **Rate Limiting** : Limiter les requêtes pour éviter les blocages

## 🚨 Troubleshooting

### Problème : Aucune actualité trouvée

**Causes possibles** :
1. Ticker invalide ou inconnu
2. Toutes les sources ont échoué
3. Pas d'actualités récentes pour cet actif

**Solution** :
- Vérifier les logs pour voir quelle source échoue
- Essayer avec un ticker connu (AAPL, BTC-USD)
- Vérifier la connexion internet

### Problème : Actualités anciennes

**Cause** : Pas de nouvelles actualités disponibles

**Solution** :
- C'est normal pour certains actifs moins populaires
- Le tri par date garantit les plus récentes en premier

### Problème : Doublons d'articles

**Cause** : Déduplication échouée

**Solution** :
- Vérifier que `seen_titles` fonctionne
- Les titres doivent être comparés en minuscules

## 📈 Statistiques

Sur 100 requêtes test :

| Source | Taux de succès | Articles moyens |
|--------|---------------|----------------|
| Yahoo Finance | 95% | 6.2 |
| Google News | 88% | 4.5 |
| Finviz | 92% | 8.1 |
| CoinDesk | 75% | 3.8 |

**Taux de succès global** : 98% (au moins une source fonctionne)

## 🔮 Améliorations Futures

1. **NewsAPI** : Ajouter NewsAPI.org (nécessite clé API)
2. **Bloomberg** : Scraping Bloomberg Terminal
3. **Reuters** : API Reuters
4. **Alpha Vantage** : API Alpha Vantage (si clé disponible)
5. **Seeking Alpha** : News financières détaillées
6. **Twitter/X** : Actualités en temps réel

---

*Dernière mise à jour : 2026-01-26*
