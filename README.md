# Promotion Bot — captentdb.fr

Bot autonome qui scanne Reddit 24h/24 et détecte les discussions pertinentes
pour promouvoir **captentdb.fr**.

## Déploiement Railway

1. Dans Railway → **New Service** → **GitHub Repo** → sélectionne ce repo
2. Dans **Settings** → **Branch** → choisis `railway/promotion-bot`
3. Configure les variables d'environnement (voir `.env.promotion.example`)
4. Deploy

## Variables d'environnement

| Variable | Obligatoire | Description |
|---|---|---|
| `ADMIN_TELEGRAM_TOKEN` | ✅ | Token du bot Telegram |
| `ADMIN_CHAT_ID` | ✅ | Ton ID Telegram (ou ID groupe) |
| `DRY_RUN` | — | `true` pour tester sans poster |
| `AUTO_POST_MODE` | — | `true` pour poster auto sur Reddit |
| `REDDIT_USERNAME` | Mode auto | Compte Reddit |
| `REDDIT_PASSWORD` | Mode auto | Mot de passe Reddit |
| `SCAN_INTERVAL_SECONDS` | — | Intervalle scan (défaut: 600) |

## Modes

- **Mode ALERTE** (défaut) : t'envoie les posts pertinents sur Telegram avec le message à copier-coller
- **Mode AUTO** : poste automatiquement (nécessite compte Reddit avec karma)

## Commandes Telegram (admin uniquement)

- `/promo_stats` — Statistiques en temps réel
- `/promo_pause` — Mettre en pause
- `/promo_resume` — Reprendre
- `/promo_help` — Aide
