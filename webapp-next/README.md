# TDB Next.js Website

## Local run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Production modes

### Mode A (recommended): Docker + Caddy

- Multi-stage Docker build
- Reverse proxy with Caddy
- Automatic HTTPS when `SITE_HOST` is a domain
- Container healthcheck on `/api/health`

Commands:

```bash
cp .env.example .env
# edit .env
bash deploy/deploy-docker.sh
```

### Mode B: PM2 monitoring (without Docker)

- Next.js process managed by PM2
- Dedicated health monitor process (`deploy/health-monitor.mjs`)
- PM2 log rotation setup

Commands:

```bash
cp .env.example .env
# edit .env
bash deploy/setup-pm2-monitoring.sh
```

## Environment variables

Required:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_TELEGRAM_URL`
- `NEXT_PUBLIC_DISCORD_URL`
- `SITE_HOST`

Optional:

- `TRACKING_WEBHOOK_URL`
- `ACME_EMAIL`
- `HEALTHCHECK_WEBHOOK_URL`
- `HEALTHCHECK_INTERVAL_MS`
- `HEALTHCHECK_TIMEOUT_MS`

## Security and SEO

- Security headers configured in `next.config.mjs`
- Global + per-page metadata
- `/robots.txt` and `/sitemap.xml`
- CTA tracking endpoint at `/api/track`
- Health endpoint at `/api/health`

## CI/CD

GitHub Actions workflows:

- `.github/workflows/webapp-next-ci.yml`
- `.github/workflows/webapp-next-deploy.yml`

Deployment workflow requires secrets:

- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_KEY`
- `VPS_PORT` (optional, default 22)