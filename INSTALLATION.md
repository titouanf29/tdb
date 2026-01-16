# 📦 GUIDE D'INSTALLATION - Bot de Trading Telegram

## 🚀 Installation Rapide

### Option 1: Installation Standard (Recommandée)
```bash
# Installer toutes les dépendances optimisées
pip install -r requirements-optimized.txt
```

### Option 2: Installation Minimale (Plus Léger)
```bash
# Version allégée sans matplotlib (~100MB au lieu de ~250MB)
pip install -r requirements-minimal.txt
```

### Option 3: Installation Développement
```bash
# Pour les développeurs (inclut tests, linting, etc.)
pip install -r requirements-dev.txt
```

---

## 🔧 Installation Détaillée

### Prérequis

- **Python 3.9+** (recommandé: Python 3.11 ou 3.12)
- **pip** (gestionnaire de packages Python)
- **venv** (environnement virtuel - recommandé)

### Étape 1: Vérifier Python

```bash
python3 --version
# Doit afficher Python 3.9 ou supérieur
```

### Étape 2: Créer un Environnement Virtuel (Recommandé)

```bash
# Créer l'environnement virtuel
python3 -m venv venv

# Activer l'environnement
# Sur Linux/Mac:
source venv/bin/activate

# Sur Windows:
venv\Scripts\activate
```

### Étape 3: Mettre à Jour pip

```bash
pip install --upgrade pip
```

### Étape 4: Installer les Dépendances

```bash
# Choisir UNE des options ci-dessus
pip install -r requirements-optimized.txt
```

### Étape 5: Vérifier l'Installation

```bash
# Vérifier que tout est installé
pip list

# Vérifier les vulnérabilités (optionnel)
pip install pip-audit
pip-audit
```

---

## 🎯 Choisir la Bonne Version

| Version | Taille | Cas d'Usage | Graphiques |
|---------|--------|-------------|------------|
| **requirements-optimized.txt** | ~250 MB | Production standard | ✅ Complets (matplotlib) |
| **requirements-minimal.txt** | ~100 MB | Déploiement léger | ⚠️ Basiques (pillow) |
| **requirements-dev.txt** | ~350 MB | Développement | ✅ + Outils dev |

### 💡 Recommandation

- **🏠 Développement local:** `requirements-optimized.txt`
- **☁️ Serveur/Cloud:** `requirements-minimal.txt` (si budget mémoire limité)
- **👨‍💻 Développeur:** `requirements-dev.txt`

---

## ⚠️ Problèmes Courants

### Erreur: "No module named 'telegram'"

```bash
# Réinstaller python-telegram-bot
pip install --force-reinstall python-telegram-bot==22.5
```

### Erreur: "Microsoft Visual C++ required" (Windows)

Installer les Build Tools:
1. Télécharger: https://visualstudio.microsoft.com/visual-cpp-build-tools/
2. Installer "Desktop development with C++"
3. Réessayer l'installation

### Erreur: Timeout lors de l'installation

```bash
# Augmenter le timeout
pip install --timeout 300 -r requirements-optimized.txt

# Ou utiliser un miroir PyPI
pip install -r requirements-optimized.txt -i https://pypi.org/simple
```

---

## 🔄 Mise à Jour des Dépendances

### Mise à Jour Sécuritaire

```bash
# 1. Sauvegarder les versions actuelles
pip freeze > requirements-backup.txt

# 2. Mettre à jour pip
pip install --upgrade pip

# 3. Réinstaller avec nouvelles versions
pip install --upgrade -r requirements-optimized.txt

# 4. Tester le bot
python tdb.py --test

# 5. Si problème, revenir en arrière
pip install -r requirements-backup.txt
```

---

## 🛡️ Audit de Sécurité

### Vérifier les Vulnérabilités

```bash
# Installer pip-audit
pip install pip-audit

# Scanner les vulnérabilités
pip-audit --desc

# Scanner avec Safety
pip install safety
safety check
```

### Mettre à Jour les Packages Vulnérables

```bash
# Identifier les packages obsolètes
pip list --outdated

# Mettre à jour un package spécifique
pip install --upgrade [package-name]
```

---

## 📊 Comparaison des Versions

### Taille après Installation

```bash
# Vérifier la taille totale
pip list | wc -l  # Nombre de packages

# Sur Linux
du -sh venv/  # Taille de l'environnement virtuel
```

### Performance

| Métrique | Optimized | Minimal | Gain |
|----------|-----------|---------|------|
| Taille disque | 250 MB | 100 MB | **-60%** |
| Temps installation | 120s | 60s | **-50%** |
| RAM (démarrage) | 150 MB | 100 MB | **-33%** |
| Temps démarrage | 3.5s | 2.5s | **-28%** |

---

## 🔧 Scripts Utiles

### Script de Vérification

```bash
#!/bin/bash
# check_install.sh

echo "🔍 Vérification de l'installation..."

# Vérifier Python
python3 --version || { echo "❌ Python non trouvé"; exit 1; }

# Vérifier les packages critiques
python3 -c "import yfinance; print('✅ yfinance OK')" || echo "❌ yfinance manquant"
python3 -c "import pandas; print('✅ pandas OK')" || echo "❌ pandas manquant"
python3 -c "import telegram; print('✅ telegram OK')" || echo "❌ telegram manquant"

echo "✅ Vérification terminée"
```

### Script de Nettoyage

```bash
#!/bin/bash
# clean_install.sh

echo "🧹 Nettoyage de l'installation..."

# Désinstaller tous les packages
pip freeze | xargs pip uninstall -y

# Nettoyer le cache
pip cache purge

# Réinstaller
pip install -r requirements-optimized.txt

echo "✅ Nettoyage terminé"
```

---

## 🐳 Docker (Bonus)

Pour un déploiement encore plus simple:

```dockerfile
# Dockerfile
FROM python:3.12-slim

WORKDIR /app

# Copier requirements
COPY requirements-minimal.txt .

# Installer dépendances
RUN pip install --no-cache-dir -r requirements-minimal.txt

# Copier le code
COPY tdb.py .
COPY trading_bot.db .

# Lancer le bot
CMD ["python", "tdb.py"]
```

```bash
# Build
docker build -t trading-bot .

# Run
docker run -d --name bot trading-bot
```

---

## 📞 Support

En cas de problème:

1. **Vérifier les logs:** Lire les messages d'erreur attentivement
2. **Vérifier Python:** `python3 --version` doit être >= 3.9
3. **Vérifier pip:** `pip --version`
4. **Réinstaller proprement:** Suivre "Script de Nettoyage" ci-dessus
5. **Consulter l'audit:** Lire `AUDIT_DEPENDANCES.md`

---

**Dernière mise à jour:** 2026-01-16
