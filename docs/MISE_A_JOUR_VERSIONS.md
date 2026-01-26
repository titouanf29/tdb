# 🔄 Guide: Mise à Jour des Versions

Ce guide explique comment gérer les mises à jour et publier les changements dans le canal Telegram.

## 📋 Workflow Complet de Mise à Jour

### Étape 1: Développer les nouvelles fonctionnalités

Codez vos nouvelles fonctionnalités sur une branche dédiée.

### Étape 2: Mettre à jour le CHANGELOG.md

Ajoutez une nouvelle section pour votre version :

```markdown
## [2.1.0] - 2026-02-15

### ✨ Ajouté

#### 🎯 Nouvelle Fonctionnalité

**Description**
- Point 1
- Point 2
- Point 3

### 🔧 Modifié

- Amélioration X
- Correction Y
```

### Étape 3: Mettre à jour le message de broadcast

**Ouvrez** `/home/user/tdb/services/broadcast.py`

**Localisez** la méthode `_format_update_message()` et ajoutez votre version :

```python
def _format_update_message(self, version: str):
    """Formate le message de mise à jour pour Telegram"""

    if version == "2.1.0":  # ← VOTRE NOUVELLE VERSION
        return """
🎉 **NOUVELLE VERSION 2.1.0 DISPONIBLE !**

━━━━━━━━━━━━━━━━━━━━━━━━

🎯 **NOUVELLE FONCTIONNALITÉ**

✅ Description de la fonctionnalité 1
✅ Description de la fonctionnalité 2
✅ Description de la fonctionnalité 3

━━━━━━━━━━━━━━━━━━━━━━━━

💡 **COMMENT L'UTILISER ?**

1️⃣ Allez dans le menu
2️⃣ Cliquez sur...
3️⃣ Profitez !

━━━━━━━━━━━━━━━━━━━━━━━━

📋 Changelog complet : github.com/titouanf29/tdb

_Bonne utilisation ! 🚀_
"""
    elif version == "2.0.0":  # ← VERSION EXISTANTE
        return """
🎉 **NOUVELLE VERSION 2.0.0 DISPONIBLE !**
...
"""
    else:
        # Template générique
        return f"""
🎉 **NOUVELLE VERSION {version} DISPONIBLE !**

Consultez le changelog pour les détails.
"""
```

### Étape 4: Mettre à jour la version actuelle

Dans le même fichier `services/broadcast.py`, ligne ~18 :

```python
class BroadcastService:
    def __init__(self, bot: Bot):
        self.bot = bot
        self.current_version = "2.1.0"  # ← CHANGEZ ICI
        self.channel_id = config.CHANNEL_ID
```

### Étape 5: Commiter et déployer

```bash
git add .
git commit -m "🚀 Release: Version 2.1.0"
git push
```

Redémarrez le bot :
```bash
python main.py
```

### Étape 6: Publier dans le canal

Envoyez au bot :
```
/send_update
```

Ou pour une version spécifique :
```
/send_update 2.1.0
```

**✅ C'est fait !** Le message sera automatiquement publié dans le canal Telegram principal.

## 📝 Template de Message de Mise à Jour

Utilisez ce template pour vos messages :

```python
return """
🎉 **NOUVELLE VERSION X.X.X DISPONIBLE !**

━━━━━━━━━━━━━━━━━━━━━━━━

[ICÔNE] **TITRE DE LA FONCTIONNALITÉ**

✅ Point clé 1
✅ Point clé 2
✅ Point clé 3

━━━━━━━━━━━━━━━━━━━━━━━━

💡 **COMMENT L'UTILISER ?**

1️⃣ Étape 1
2️⃣ Étape 2
3️⃣ Étape 3

━━━━━━━━━━━━━━━━━━━━━━━━

🎯 **TESTEZ DÈS MAINTENANT !**

[Instructions rapides]

━━━━━━━━━━━━━━━━━━━━━━━━

📋 Voir le changelog : github.com/titouanf29/tdb

_Bonne utilisation ! 🚀_
"""
```

## 🎨 Icônes Recommandées

Pour rendre vos messages plus visuels :

- 📰 Actualités / News
- 📊 Analyses / Statistiques
- 💡 Nouvelles fonctionnalités
- 🔧 Corrections / Améliorations
- 🚀 Lancements
- 📈 Trading / Marché
- 🤖 IA / Intelligence
- 💼 Wallet / Portefeuille
- ⭐ Favoris
- 🔍 Recherche / Scan
- ⚙️ Paramètres
- 📢 Annonces
- 🎯 Objectifs / Cibles
- ✅ Validations
- 🔥 Tendances / Hot

## ⚠️ Important

### Le message sera AUTOMATIQUEMENT formaté

**Vous n'avez qu'à :**
1. Mettre à jour le message dans `_format_update_message()`
2. Changer la version dans `__init__()`
3. Envoyer `/send_update`

**Le bot s'occupe du reste !**

### Où est publié le message ?

Le message est publié dans le **canal Telegram principal** configuré dans `config.py` :

```python
CHANNEL_ID = "-1003160198658"
```

Tous les abonnés du canal verront automatiquement le message.

## 🔄 Pour les Futures Versions

À chaque nouvelle version :

1. ✅ Développez les fonctionnalités
2. ✅ Mettez à jour `CHANGELOG.md`
3. ✅ Ajoutez le message dans `broadcast.py`
4. ✅ Changez `current_version`
5. ✅ Déployez
6. ✅ Envoyez `/send_update`

**C'est tout ! Le texte sera automatiquement le bon.** 🎉

## 📊 Exemple Complet

Supposons que vous voulez publier la version 2.2.0 avec une nouvelle fonctionnalité de backtesting :

**1. Dans `CHANGELOG.md` :**
```markdown
## [2.2.0] - 2026-03-01

### ✨ Ajouté

#### 📊 Backtesting Automatique
- Testez vos stratégies sur données historiques
- Rapports détaillés de performance
- Comparaison de stratégies
```

**2. Dans `services/broadcast.py` :**
```python
def _format_update_message(self, version: str):
    if version == "2.2.0":
        return """
🎉 **NOUVELLE VERSION 2.2.0 DISPONIBLE !**

━━━━━━━━━━━━━━━━━━━━━━━━

📊 **BACKTESTING AUTOMATIQUE**

✅ Testez vos stratégies sur données historiques
✅ Rapports détaillés de performance
✅ Comparaison de stratégies

━━━━━━━━━━━━━━━━━━━━━━━━

💡 **COMMENT L'UTILISER ?**

1️⃣ Allez dans 💼 Wallet
2️⃣ Cliquez sur "📊 Backtesting"
3️⃣ Choisissez votre stratégie
4️⃣ Lancez le test !

━━━━━━━━━━━━━━━━━━━━━━━━

🎯 **TESTEZ DÈS MAINTENANT !**

Optimisez vos stratégies avant de trader en réel !

_Bon backtesting ! 📈_
"""
```

**3. Changez la version :**
```python
self.current_version = "2.2.0"
```

**4. Commandez :**
```
/send_update
```

**Résultat** : Message publié automatiquement dans le canal ! 🎉

---

*Pour toute question, consultez la documentation complète ou ouvrez une issue.*
