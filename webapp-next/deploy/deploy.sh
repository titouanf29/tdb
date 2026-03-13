#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/tdb/webapp-next"

sudo mkdir -p /var/www/tdb
sudo chown -R "$USER":"$USER" /var/www/tdb

cd "$APP_DIR"
npm ci
npm run build

pm2 start ecosystem.config.cjs --update-env
pm2 save
sudo systemctl restart nginx