#!/bin/bash
# Script d'installation automatique pour le Bot de Trading Telegram
# Usage: ./install.sh [optimized|minimal|dev]

set -e  # Arrêter en cas d'erreur

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction d'affichage
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Bannière
echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════╗"
echo "║   BOT DE TRADING TELEGRAM - INSTALLATION    ║"
echo "╚══════════════════════════════════════════════╝"
echo -e "${NC}"

# Vérifier Python
print_info "Vérification de Python..."
if ! command -v python3 &> /dev/null; then
    print_error "Python 3 n'est pas installé"
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
print_success "Python $PYTHON_VERSION détecté"

# Vérifier la version minimale (3.9+)
MIN_VERSION="3.9"
if [ "$(printf '%s\n' "$MIN_VERSION" "$PYTHON_VERSION" | sort -V | head -n1)" != "$MIN_VERSION" ]; then
    print_error "Python 3.9+ requis (vous avez $PYTHON_VERSION)"
    exit 1
fi

# Vérifier pip
print_info "Vérification de pip..."
if ! command -v pip3 &> /dev/null; then
    print_error "pip n'est pas installé"
    exit 1
fi
print_success "pip détecté"

# Choisir le fichier requirements
REQUIREMENTS_FILE="requirements-optimized.txt"
if [ "$1" == "minimal" ]; then
    REQUIREMENTS_FILE="requirements-minimal.txt"
    print_info "Installation MINIMALE sélectionnée (~100MB)"
elif [ "$1" == "dev" ]; then
    REQUIREMENTS_FILE="requirements-dev.txt"
    print_info "Installation DÉVELOPPEMENT sélectionnée (~350MB)"
else
    print_info "Installation OPTIMISÉE sélectionnée (~250MB)"
fi

# Vérifier si le fichier existe
if [ ! -f "$REQUIREMENTS_FILE" ]; then
    print_error "Fichier $REQUIREMENTS_FILE non trouvé"
    exit 1
fi

# Proposer environnement virtuel
if [ ! -d "venv" ]; then
    print_warning "Aucun environnement virtuel détecté"
    read -p "Créer un environnement virtuel ? (recommandé) [O/n]: " CREATE_VENV
    if [ "$CREATE_VENV" != "n" ] && [ "$CREATE_VENV" != "N" ]; then
        print_info "Création de l'environnement virtuel..."
        python3 -m venv venv
        print_success "Environnement virtuel créé"

        print_info "Activation de l'environnement virtuel..."
        source venv/bin/activate
        print_success "Environnement virtuel activé"
    fi
else
    print_success "Environnement virtuel détecté"
    print_info "Activation de l'environnement virtuel..."
    source venv/bin/activate
fi

# Mettre à jour pip
print_info "Mise à jour de pip..."
pip install --upgrade pip --quiet
print_success "pip mis à jour"

# Installer les dépendances
print_info "Installation des dépendances..."
echo -e "${YELLOW}Cela peut prendre plusieurs minutes...${NC}"

if pip install -r "$REQUIREMENTS_FILE" --quiet; then
    print_success "Dépendances installées avec succès"
else
    print_error "Erreur lors de l'installation des dépendances"
    exit 1
fi

# Vérifier les packages critiques
print_info "Vérification des packages critiques..."
PACKAGES=("yfinance" "pandas" "numpy" "telegram")
ALL_OK=true

for package in "${PACKAGES[@]}"; do
    if python3 -c "import $package" 2>/dev/null; then
        print_success "$package installé"
    else
        print_error "$package manquant"
        ALL_OK=false
    fi
done

if [ "$ALL_OK" = false ]; then
    print_error "Certains packages critiques sont manquants"
    exit 1
fi

# Afficher les packages installés
print_info "Packages installés:"
pip list | grep -E "(yfinance|pandas|numpy|telegram|matplotlib|beautifulsoup4)" || true

# Audit de sécurité (optionnel)
read -p "Lancer un audit de sécurité ? [o/N]: " RUN_AUDIT
if [ "$RUN_AUDIT" == "o" ] || [ "$RUN_AUDIT" == "O" ]; then
    print_info "Installation de pip-audit..."
    pip install pip-audit --quiet

    print_info "Audit de sécurité en cours..."
    if pip-audit; then
        print_success "Aucune vulnérabilité détectée"
    else
        print_warning "Des vulnérabilités ont été détectées"
        print_info "Consultez le rapport ci-dessus"
    fi
fi

# Résumé
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         INSTALLATION TERMINÉE ! ✅           ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
echo ""
print_info "Pour activer l'environnement virtuel:"
echo -e "  ${YELLOW}source venv/bin/activate${NC}"
echo ""
print_info "Pour lancer le bot:"
echo -e "  ${YELLOW}python3 tdb.py${NC}"
echo ""
print_info "Pour plus d'informations:"
echo -e "  ${YELLOW}cat INSTALLATION.md${NC}"
echo -e "  ${YELLOW}cat AUDIT_DEPENDANCES.md${NC}"
echo ""

# Sauvegarder les versions installées
print_info "Sauvegarde des versions installées..."
pip freeze > requirements-installed-$(date +%Y%m%d).txt
print_success "Versions sauvegardées dans requirements-installed-$(date +%Y%m%d).txt"

exit 0
