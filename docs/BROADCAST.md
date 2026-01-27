# 📢 Système de Broadcast - Guide d'utilisation

Le système de broadcast permet de publier automatiquement les messages de mise à jour dans le canal Telegram principal.

## 🔑 Configuration Admin

### 1. Ajouter votre ID Telegram

Éditez le fichier `config.py` et ajoutez votre ID Telegram dans la liste `ADMIN_IDS` :

```python
# Administrateurs du bot (ajouter vos IDs Telegram ici)
ADMIN_IDS = [
    123456789,  # Votre ID Telegram
    987654321,  # Autre admin (optionnel)
]
```

### 2. Trouver votre ID Telegram

Pour trouver votre ID Telegram :
1. Envoyez un message à [@userinfobot](https://t.me/userinfobot)
2. Le bot vous répondra avec votre ID

Ou utilisez [@getmyid_bot](https://t.me/getmyid_bot)

## 📋 Commandes Admin Disponibles

### `/send_update [version]`

Publie les notes de mise à jour formatées dans le canal principal Telegram.

**Usage :**
```
/send_update           # Publie la mise à jour de la version actuelle (2.0.0)
/send_update 2.0.0     # Publie la mise à jour de la version 2.0.0
```

**Exemple de message publié dans le canal :**
```
🎉 NOUVELLE VERSION 2.0.0 DISPONIBLE !

━━━━━━━━━━━━━━━━━━━━━━━━

📰 SYSTÈME D'ACTUALITÉS INTELLIGENT

Le bouton 📰 News est maintenant pleinement fonctionnel !

✅ Actualités en temps réel
✅ Analyse de sentiment automatique
✅ Prédiction de tendance future 📈📉
...
```

### `/broadcast <message>`

Publie un message personnalisé dans le canal principal.

**Usage :**
```
/broadcast Bonjour à tous ! Le bot sera en maintenance ce soir de 22h à 23h.
```

**Cas d'usage :**
- Annonces de maintenance
- Messages importants
- Nouvelles fonctionnalités
- Problèmes connus
- Événements spéciaux

### `/stats`

Affiche les statistiques du bot.

**Usage :**
```
/stats
```

**Affiche :**
- Nombre total d'utilisateurs
- Version actuelle du bot
- (Plus de stats à venir)

## 🔄 Workflow de Mise à Jour

Lorsque vous publiez une nouvelle version :

### Étape 1 : Mettre à jour le CHANGELOG.md

Ajoutez les notes de la nouvelle version dans `CHANGELOG.md`

### Étape 2 : Mettre à jour le message dans broadcast.py

Éditez `services/broadcast.py` et ajoutez le message formaté pour la nouvelle version :

```python
def _format_update_message(self, version: str):
    """Formate le message de mise à jour pour Telegram"""

    if version == "2.1.0":  # Nouvelle version
        return """
🎉 **NOUVELLE VERSION 2.1.0 DISPONIBLE !**

━━━━━━━━━━━━━━━━━━━━━━━━

🚀 **NOUVELLES FONCTIONNALITÉS**

✅ Fonctionnalité 1
✅ Fonctionnalité 2
...
"""
```

**ET** mettez à jour la version actuelle (ligne ~18) :

```python
class BroadcastService:
    def __init__(self, bot: Bot):
        self.bot = bot
        self.current_version = "2.1.0"  # ← CHANGEZ ICI
```

### Étape 3 : Déployer la mise à jour

```bash
git add .
git commit -m "🚀 Release: Version 2.1.0"
git push
```

Redémarrez le bot.

### Étape 4 : Publier dans le canal

```
/send_update
```

**✅ C'est tout !** Le message formaté sera automatiquement publié dans le canal Telegram principal.

**📢 Tous les abonnés du canal verront la mise à jour !**

👉 **Voir le guide complet** : [MISE_A_JOUR_VERSIONS.md](MISE_A_JOUR_VERSIONS.md)

## 📊 Statistiques d'Envoi

Après chaque broadcast, vous recevez un rapport :

```
✅ Broadcast terminé !

📊 Statistiques :
• Réussis : 145/150
• Échoués : 5/150
```

**Raisons d'échec possibles :**
- Utilisateur a bloqué le bot
- Utilisateur a supprimé son compte
- Problème de connexion temporaire

## ⚙️ Configuration Avancée

### Modifier le délai entre les messages

Par défaut : 50ms entre chaque message (20 messages/seconde)

Pour modifier, éditez `services/broadcast.py` :

```python
# Petit délai pour éviter de dépasser les limites Telegram
await asyncio.sleep(0.05)  # 50ms entre chaque message
```

**Limites Telegram :**
- 30 messages/seconde max
- 20 messages/minute vers le même utilisateur

### Modifier la version actuelle

Éditez `services/broadcast.py` :

```python
class BroadcastService:
    def __init__(self, bot: Bot):
        self.bot = bot
        self.current_version = "2.1.0"  # Mettez à jour ici
```

## 🔒 Sécurité

- ✅ Seuls les IDs dans `ADMIN_IDS` peuvent exécuter les commandes
- ✅ Messages envoyés individuellement (pas de broadcast de groupe)
- ✅ Gestion des erreurs pour éviter les interruptions
- ✅ Logs détaillés de chaque envoi

## 📝 Best Practices

### 1. Tester d'abord

Avant d'envoyer à tous les utilisateurs, testez le message :

1. Créez un groupe de test avec quelques comptes
2. Envoyez le message manuellement à ce groupe
3. Vérifiez le formatage et les liens

### 2. Timing

Envoyez les broadcasts à des heures appropriées :
- ✅ Entre 9h et 21h (heure locale des utilisateurs)
- ❌ Évitez la nuit ou très tôt le matin

### 3. Fréquence

- 🟢 Mises à jour majeures : OK
- 🟢 Annonces importantes : OK
- 🟡 Fonctionnalités mineures : Optionnel
- 🔴 Messages marketing : À éviter

### 4. Format du Message

- Utilisez des emojis pour attirer l'attention 🎉
- Structurez avec des lignes de séparation ━━━━━
- Utilisez le **gras** pour les points importants
- Gardez les messages concis (< 500 caractères idéalement)

## 🆘 Dépannage

### Le broadcast ne s'envoie pas

1. Vérifiez que vous êtes admin :
   ```
   /stats  # Si ça fonctionne, vous êtes admin
   ```

2. Vérifiez que le service est initialisé :
   - Regardez les logs au démarrage du bot
   - Cherchez : "✅ Service de broadcast initialisé"

### Certains utilisateurs ne reçoivent pas

C'est normal ! Raisons possibles :
- Ont bloqué le bot
- Ont supprimé leur compte
- Problème de connexion temporaire

Consultez le rapport d'envoi pour voir le taux de succès.

## 📚 Exemples de Messages

### Mise à jour majeure
```
🎉 NOUVELLE VERSION 2.0.0 !

📰 Actualités intelligentes
📊 Analyses détaillées
💡 Recommandations personnalisées

Testez dès maintenant ! 🚀
```

### Maintenance
```
🔧 MAINTENANCE PROGRAMMÉE

Le bot sera indisponible :
📅 Ce soir, 22h-23h

Merci de votre patience ! 🙏
```

### Nouvelle fonctionnalité
```
🆕 NOUVEAU !

📈 Backtesting automatique disponible

Accédez-y via :
💼 Wallet → Statistiques → Backtest

Bon trading ! 📊
```

---

*Pour toute question, consultez les logs ou ouvrez une issue sur GitHub.*
