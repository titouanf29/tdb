#!/bin/bash

# TDB Web - Script de demarrage

echo "=================================="
echo "  TDB - Trading Bot Dashboard"
echo "=================================="
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verifier si on est dans le bon dossier
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo -e "${RED}Erreur: Executez ce script depuis le dossier web/${NC}"
    exit 1
fi

# Backend
echo -e "${YELLOW}[1/3] Installation des dependances backend...${NC}"
cd backend
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install -q -r requirements.txt

# Copier .env si n'existe pas
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo -e "${YELLOW}Fichier .env cree - pensez a le configurer${NC}"
fi

echo -e "${GREEN}Backend pret!${NC}"

# Frontend
echo -e "${YELLOW}[2/3] Installation des dependances frontend...${NC}"
cd ../frontend

# Copier .env.local si n'existe pas
if [ ! -f ".env.local" ]; then
    cp .env.example .env.local
fi

if [ ! -d "node_modules" ]; then
    npm install
fi
echo -e "${GREEN}Frontend pret!${NC}"

# Demarrage
echo ""
echo -e "${YELLOW}[3/3] Demarrage des serveurs...${NC}"
echo ""
echo -e "${GREEN}Backend:${NC}  http://localhost:8000"
echo -e "${GREEN}Frontend:${NC} http://localhost:3000"
echo -e "${GREEN}API Docs:${NC} http://localhost:8000/docs"
echo ""
echo "Appuyez sur Ctrl+C pour arreter"
echo ""

# Demarrer le backend en arriere-plan
cd ../backend
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Demarrer le frontend
cd ../frontend
npm run dev &
FRONTEND_PID=$!

# Attendre les signaux pour arreter proprement
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM

wait
