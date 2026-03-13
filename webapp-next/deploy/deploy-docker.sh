#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/tdb/webapp-next"

cd "$APP_DIR"

if [ ! -f .env ]; then
  echo "Missing .env in $APP_DIR"
  echo "Copy .env.example to .env and set production values first."
  exit 1
fi

docker compose down --remove-orphans || true
docker compose up -d --build --remove-orphans
docker image prune -f