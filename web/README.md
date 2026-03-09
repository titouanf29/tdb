# TDB Web - Interface Web du Trading Bot

Interface web ultra stylée pour le bot TDB, synchronisée avec le bot Telegram.

## Architecture

```
web/
├── backend/          # API FastAPI (Python)
│   ├── api/          # Routes API
│   │   ├── routes/   # Endpoints (auth, market, wallet, analysis, users)
│   │   ├── database.py
│   │   └── websocket.py
│   ├── main.py       # Point d'entrée
│   └── requirements.txt
│
└── frontend/         # Next.js 14 (React)
    ├── src/
    │   ├── app/      # Pages (Dashboard, Markets, Trading, Wallet, Analysis)
    │   ├── components/
    │   │   ├── layout/   # Sidebar, Header
    │   │   ├── ui/       # Composants réutilisables
    │   │   └── trading/  # Composants trading
    │   ├── lib/      # Utilitaires
    │   ├── hooks/    # Custom hooks
    │   └── store/    # État global (Zustand)
    └── package.json
```

## Fonctionnalités

- Dashboard temps réel avec positions et opportunités
- Marchés avec analyse IA et scores
- Trading companion (ouverture de positions)
- Wallet synchronisé avec le bot Telegram
- Analyse technique complète
- WebSocket pour mises à jour temps réel
- Design glassmorphism ultra moderne
- Animations Framer Motion

## Installation

### Backend

```bash
cd web/backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou: venv\Scripts\activate  # Windows
pip install -r requirements.txt
cp .env.example .env
# Éditer .env avec vos clés
python main.py
```

### Frontend

```bash
cd web/frontend
npm install
cp .env.example .env.local
# Éditer .env.local
npm run dev
```

## Déploiement sur VPS

### Avec Docker (recommandé)

```bash
cd web
docker-compose up -d
```

### Sans Docker

1. **Backend (uvicorn + nginx)**
```bash
cd web/backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

2. **Frontend (build + nginx)**
```bash
cd web/frontend
npm run build
npm run start
# ou servir avec nginx
```

### Configuration Nginx

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # API Backend
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## Synchronisation Bot/Web

Le site web et le bot Telegram partagent la même base de données SQLite.
Toutes les modifications (positions, wallet, favoris) sont synchronisées automatiquement.

### Connexion

Les utilisateurs se connectent via le widget Telegram Login.
Cela lie leur compte Telegram au site web avec le même wallet et les mêmes positions.

## Stack Technique

- **Frontend**: Next.js 14, React, Tailwind CSS, Framer Motion, shadcn/ui
- **Backend**: FastAPI, Python, aiosqlite
- **Charts**: Lightweight Charts (TradingView)
- **State**: Zustand, SWR
- **WebSocket**: Pour les mises à jour temps réel
