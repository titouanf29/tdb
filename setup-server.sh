#!/usr/bin/env bash
# Setup du site web TDB sur le serveur
# Équivalent de la procédure locale (npm install + npm run dev)
set -euo pipefail

WEBAPP_DIR="$(cd "$(dirname "$0")/webapp-next" && pwd)"

echo "==> Répertoire : $WEBAPP_DIR"

# 1. Fichier .env
if [ ! -f "$WEBAPP_DIR/.env" ]; then
    echo "==> Création de .env depuis .env.example"
    cp "$WEBAPP_DIR/.env.example" "$WEBAPP_DIR/.env"
    echo "    ⚠  Éditez $WEBAPP_DIR/.env avant de continuer"
    echo "    Relancez ce script quand c'est fait."
    exit 0
fi

# 2. Dépendances Node
echo "==> Installation des dépendances (npm ci)"
cd "$WEBAPP_DIR"
npm ci

# 3. Build production
echo "==> Build Next.js"
npm run build

# 4. PM2
if command -v pm2 &>/dev/null; then
    echo "==> Démarrage / rechargement PM2"
    pm2 start ecosystem.config.cjs --update-env 2>/dev/null || pm2 reload ecosystem.config.cjs --update-env
    pm2 save
else
    echo "==> PM2 non trouvé — installation..."
    npm install -g pm2
    pm2 start ecosystem.config.cjs --update-env
    pm2 save
    pm2 startup | tail -1 | bash   # enregistre le démarrage auto
fi

# 5. Nginx
NGINX_CONF="/etc/nginx/sites-enabled/default"
DEPLOY_CONF="$WEBAPP_DIR/deploy/nginx.tdb.conf"
if [ -f "$DEPLOY_CONF" ]; then
    echo "==> Mise à jour de la config nginx"
    sudo cp "$DEPLOY_CONF" "$NGINX_CONF"
    sudo nginx -t && sudo systemctl reload nginx
fi

echo ""
echo "✓ Site démarré sur http://127.0.0.1:3001 (ou la valeur de PORT)"
echo "  Vérifier : pm2 status"
