#!/usr/bin/env bash
set -euo pipefail

cd /var/www/tdb/webapp-next

if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

npm run build

pm2 start ecosystem.config.cjs --update-env
pm2 save

pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 14
pm2 set pm2-logrotate:compress true
pm2 set pm2-logrotate:workerInterval 30

pm2 status