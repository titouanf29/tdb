# Deploiement production durcie - VPS Clouding 187.33.147.172

Ce guide couvre:
- Docker + Caddy (HTTPS auto si domaine)
- CI/CD GitHub Actions (deploy SSH)
- Monitoring PM2 (mode alternatif sans Docker)

## 1) Preparation VPS

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl gnupg git

# Docker Engine + Compose plugin
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# PM2 (option monitoring non-docker)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

## 2) Cloner le repo

```bash
sudo mkdir -p /var/www
sudo chown -R $USER:$USER /var/www
cd /var/www
git clone <URL_DU_REPO> tdb
cd /var/www/tdb/webapp-next
cp .env.example .env
```

## 3) Configurer `.env`

### Cas actuel (IP seule)

```env
NEXT_PUBLIC_SITE_URL=http://187.33.147.172
SITE_HOST=187.33.147.172
ACME_EMAIL=ops@example.com
```

### Cas recommande (domaine)

```env
NEXT_PUBLIC_SITE_URL=https://ton-domaine.com
SITE_HOST=ton-domaine.com
ACME_EMAIL=ops@ton-domaine.com
```

Notes:
- HTTPS automatique requiert un domaine DNS pointant vers `187.33.147.172`.
- Avec l'IP seule, le site fonctionne en HTTP.

## 4) Lancer en Docker (recommande)

```bash
cd /var/www/tdb/webapp-next
bash deploy/deploy-docker.sh
docker compose ps
```

Verifier:

```bash
curl http://127.0.0.1:3000/api/health
curl http://187.33.147.172
```

## 5) Configurer CI/CD GitHub Actions

Ajouter ces secrets dans le repo GitHub:

- `VPS_HOST`: `187.33.147.172`
- `VPS_USER`: utilisateur SSH
- `VPS_SSH_KEY`: cle privee SSH
- `VPS_PORT`: `22` (ou port custom)

Workflow deploy: `.github/workflows/webapp-next-deploy.yml`

Comportement:
- trigger sur push branche `main`
- SSH vers VPS
- `git pull`
- `bash deploy/deploy-docker.sh`

## 6) Monitoring PM2 (option sans Docker)

Si tu veux une execution host sans Docker:

```bash
cd /var/www/tdb/webapp-next
bash deploy/setup-pm2-monitoring.sh
pm2 monit
```

Processus PM2:
- `tdb-webapp-next`
- `tdb-health-monitor`

## 7) Hardening reseau VPS

```bash
sudo apt install -y ufw fail2ban
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo systemctl enable --now fail2ban
```

## 8) Operations courantes

Mettre a jour:

```bash
cd /var/www/tdb
git pull
cd webapp-next
bash deploy/deploy-docker.sh
```

Voir les logs:

```bash
docker compose logs -f app
docker compose logs -f caddy
```

Rollback rapide:

```bash
cd /var/www/tdb
git checkout <commit_stable>
cd webapp-next
bash deploy/deploy-docker.sh
```