#!/bin/bash
# =============================================================
# TDB - Trading Bot Professionnel
# Script de déploiement Ubuntu VPS (Clouding.io)
# VPS: 187.33.147.172 | 0.5 vCores | 1 GB RAM | 5 GB SSD
# =============================================================

set -e  # Arrêter en cas d'erreur

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log()    { echo -e "${GREEN}[+]${NC} $1"; }
warn()   { echo -e "${YELLOW}[!]${NC} $1"; }
error()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }
section(){ echo -e "\n${BLUE}══════════════════════════════════════${NC}"; echo -e "${BLUE}  $1${NC}"; echo -e "${BLUE}══════════════════════════════════════${NC}"; }

# ─── Variables ─────────────────────────────────────────────
APP_USER="tdb"
APP_DIR="/opt/tdb"
SERVICE_NAME="tdb"
REPO_URL="https://github.com/titouanf29/tdb.git"
BRANCH="master"
PYTHON_MIN="3.10"

# ─── Vérification root ─────────────────────────────────────
if [ "$EUID" -ne 0 ]; then
  error "Ce script doit être lancé en tant que root. Utilise: sudo bash deploy.sh"
fi

section "TDB - Déploiement Ubuntu VPS"
log "IP du serveur: $(hostname -I | awk '{print $1}')"
log "Date: $(date)"

# ─── 1. Supprimer l'ancien projet ──────────────────────────
section "1. Suppression de l'ancien projet"

if systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
    log "Arrêt du service $SERVICE_NAME..."
    systemctl stop "$SERVICE_NAME"
fi

if systemctl is-enabled --quiet "$SERVICE_NAME" 2>/dev/null; then
    log "Désactivation du service $SERVICE_NAME..."
    systemctl disable "$SERVICE_NAME"
fi

if [ -f "/etc/systemd/system/$SERVICE_NAME.service" ]; then
    log "Suppression du service systemd..."
    rm -f "/etc/systemd/system/$SERVICE_NAME.service"
    systemctl daemon-reload
fi

# Tuer tout processus python qui tourne encore
pkill -f "python.*main.py" 2>/dev/null || true
pkill -f "python.*tdb" 2>/dev/null || true

if [ -d "$APP_DIR" ]; then
    warn "Sauvegarde de la base de données existante si présente..."
    if [ -f "$APP_DIR/database/trading_bot.db" ]; then
        cp "$APP_DIR/database/trading_bot.db" "/tmp/trading_bot_backup_$(date +%Y%m%d_%H%M%S).db"
        log "Base de données sauvegardée dans /tmp/"
    fi
    log "Suppression de l'ancien répertoire $APP_DIR..."
    rm -rf "$APP_DIR"
fi

log "Ancien projet supprimé."

# ─── 2. Mise à jour système ────────────────────────────────
section "2. Mise à jour du système"
apt-get update -qq
apt-get upgrade -y -qq
log "Système à jour."

# ─── 3. Installation des dépendances système ───────────────
section "3. Installation des dépendances"
apt-get install -y -qq \
    python3 \
    python3-pip \
    python3-venv \
    python3-dev \
    git \
    curl \
    wget \
    build-essential \
    libssl-dev \
    libffi-dev \
    libxml2-dev \
    libxslt1-dev \
    zlib1g-dev \
    libjpeg-dev \
    libpng-dev \
    fonts-dejavu-core \
    ca-certificates \
    htop \
    nano \
    cron

log "Dépendances système installées."

# ─── 4. Création de l'utilisateur système ──────────────────
section "4. Création de l'utilisateur"
if ! id "$APP_USER" &>/dev/null; then
    useradd --system --create-home --shell /bin/bash "$APP_USER"
    log "Utilisateur '$APP_USER' créé."
else
    log "Utilisateur '$APP_USER' existe déjà."
fi

# ─── 5. Clone du dépôt ─────────────────────────────────────
section "5. Clonage du projet"
mkdir -p "$APP_DIR"
git clone --depth=1 --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
chown -R "$APP_USER:$APP_USER" "$APP_DIR"
log "Projet cloné dans $APP_DIR"

# ─── 6. Environnement virtuel Python ───────────────────────
section "6. Configuration Python"
sudo -u "$APP_USER" python3 -m venv "$APP_DIR/venv"
log "Virtualenv créé."

log "Installation des dépendances Python..."
sudo -u "$APP_USER" "$APP_DIR/venv/bin/pip" install --upgrade pip -q
sudo -u "$APP_USER" "$APP_DIR/venv/bin/pip" install --upgrade setuptools wheel -q
sudo -u "$APP_USER" "$APP_DIR/venv/bin/pip" install -r "$APP_DIR/requirements.txt" -q
log "Dépendances Python installées."

# ─── 7. Configuration .env ─────────────────────────────────
section "7. Configuration des variables d'environnement"

if [ ! -f "$APP_DIR/.env" ]; then
    warn "Aucun fichier .env trouvé. Création depuis le modèle..."
    cp "$APP_DIR/.env.example" "$APP_DIR/.env"
    warn "IMPORTANT: Edite le fichier .env avant de démarrer le bot!"
    warn "  nano $APP_DIR/.env"
    NEED_ENV_CONFIG=true
else
    log "Fichier .env existant conservé."
    NEED_ENV_CONFIG=false
fi

chown "$APP_USER:$APP_USER" "$APP_DIR/.env"
chmod 600 "$APP_DIR/.env"

# ─── 8. Initialisation de la base de données ───────────────
section "8. Initialisation de la base de données"
mkdir -p "$APP_DIR/database"
chown -R "$APP_USER:$APP_USER" "$APP_DIR/database"

# Restaurer la sauvegarde si elle existe
BACKUP_DB=$(ls -t /tmp/trading_bot_backup_*.db 2>/dev/null | head -1)
if [ -n "$BACKUP_DB" ] && [ "$NEED_ENV_CONFIG" = "false" ]; then
    log "Restauration de la base de données depuis $BACKUP_DB..."
    cp "$BACKUP_DB" "$APP_DIR/database/trading_bot.db"
    chown "$APP_USER:$APP_USER" "$APP_DIR/database/trading_bot.db"
fi

# ─── 9. Service systemd ────────────────────────────────────
section "9. Configuration du service systemd"

cat > "/etc/systemd/system/$SERVICE_NAME.service" << EOF
[Unit]
Description=TDB - Trading Bot Professionnel
After=network.target network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$APP_DIR
Environment=PYTHONUNBUFFERED=1
Environment=PYTHONDONTWRITEBYTECODE=1
ExecStart=$APP_DIR/venv/bin/python main.py
Restart=always
RestartSec=10
StartLimitInterval=60
StartLimitBurst=3

# Limites mémoire (adapté pour 1 GB RAM)
MemoryMax=700M
MemorySwapMax=200M

# Logs
StandardOutput=journal
StandardError=journal
SyslogIdentifier=tdb-bot

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
log "Service systemd configuré et activé."

# ─── 10. Configuration logrotate ───────────────────────────
section "10. Configuration des logs"

cat > "/etc/logrotate.d/tdb" << EOF
/opt/tdb/tdb_bot.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 644 $APP_USER $APP_USER
    postrotate
        systemctl reload $SERVICE_NAME 2>/dev/null || true
    endscript
}
EOF

log "Logrotate configuré."

# ─── 11. Swap (important pour 1GB RAM) ─────────────────────
section "11. Configuration du Swap"

if [ ! -f /swapfile ]; then
    log "Création d'un fichier swap de 512 MB..."
    fallocate -l 512M /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    log "Swap de 512 MB activé."
else
    log "Swap déjà configuré."
fi

# Optimisation mémoire pour petit VPS
cat > /etc/sysctl.d/99-tdb-vps.conf << EOF
vm.swappiness=10
vm.vfs_cache_pressure=50
EOF
sysctl -p /etc/sysctl.d/99-tdb-vps.conf -q

# ─── 12. Démarrage ─────────────────────────────────────────
section "12. Démarrage du bot"

if [ "$NEED_ENV_CONFIG" = "true" ]; then
    warn "Le bot n'a pas été démarré car le fichier .env n'est pas configuré."
    warn ""
    warn "Etapes suivantes :"
    warn "  1. nano $APP_DIR/.env"
    warn "  2. Remplacer TELEGRAM_TOKEN et GROQ_API_KEY"
    warn "  3. sudo systemctl start $SERVICE_NAME"
    warn "  4. sudo journalctl -u $SERVICE_NAME -f"
else
    systemctl start "$SERVICE_NAME"
    sleep 3
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        log "Bot TDB démarré avec succès!"
        systemctl status "$SERVICE_NAME" --no-pager -l
    else
        error "Echec du démarrage. Vérifie: journalctl -u $SERVICE_NAME -n 50"
    fi
fi

# ─── Résumé ────────────────────────────────────────────────
section "Déploiement terminé"
echo ""
log "Répertoire du projet : $APP_DIR"
log "Fichier de config   : $APP_DIR/.env"
log "Logs en temps réel  : journalctl -u $SERVICE_NAME -f"
log "Statut du service   : systemctl status $SERVICE_NAME"
log "Redémarrer le bot   : systemctl restart $SERVICE_NAME"
log "Arrêter le bot      : systemctl stop $SERVICE_NAME"
echo ""
if [ "$NEED_ENV_CONFIG" = "true" ]; then
    warn "N'oublie pas de configurer $APP_DIR/.env avant de démarrer!"
fi
