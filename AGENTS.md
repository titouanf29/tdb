# Capten : CaptenTDB, CaptenBOT, CaptenStudio

Ce fichier décrit le projet à un agent de code (Codex, Claude Code ou autre).
Il dit ce qu'est le produit, comment le dépôt est organisé, comment le faire
tourner, et les règles à respecter avant de toucher au code. Lisez-le en
entier avant la première modification.

Langue de travail : le français, en vouvoyant l'utilisateur. Le code est
commenté en français (le code plus ancien l'est parfois en anglais : on ne le
retraduit pas, on écrit en français ce qu'on ajoute).

---

## 1. Le produit

**Capten** est une famille de trois marques, créées par une seule personne
(CaptenQwark, titouan.floch01@gmail.com) qui monte une micro-entreprise pour
les exploiter. L'identité visuelle est commune : l'anneau, le chevron (le cap)
et le point ambre, sur bleu nuit. Chaque marque a sa couleur et son signe.

| Marque | Ce que c'est | Où est le code | Couleur |
|---|---|---|---|
| **CaptenTDB** | Le site captentdb.fr : une école de trading en argent fictif, en français. On y analyse de vrais actifs, on prend position avec 10 000 € virtuels, et Nimbo, le guide, explique chaque décision. Un abonnement Premium est prévu (code prêt, ouverture sous contrôle). | `web/` de ce dépôt | Ambre `#E5A83A` |
| **CaptenBOT** | Le bot Telegram d'origine (« TDB »), trading virtuel et analyse IA, qui a précédé le site. Il tourne à part et partage la base `trading_bot.db` en développement. | Racine de ce dépôt : `tdb.py`, `modules/`, `services/`, `ai/`, `config.py` | Sarcelle `#49C3D4` |
| **CaptenStudio** | La production de contenus : les vidéos TikTok qui reprennent les leçons du site, leur programmation et leur publication. C'est un dépôt séparé (« JarvisPC »), sur un VPS. Il parle au site par un pont authentifié (`/api/pont`). | Autre dépôt ; côté site : `web/backend/api/routes/pont_tiktok.py` | Corail rosé `#E8678E` |

Le site est public et vise des débutants. Il ne donne **jamais de conseil en
investissement** : il dit ce que lit un moteur d'analyse, et ce qui s'est
passé en vrai sur des trades comparables. Tout ce qui est montré est en argent
fictif. Il n'envoie aucun e-mail marketing : seulement des e-mails de compte
(confirmation d'adresse, mot de passe, reçu Premium). Ces deux engagements sont
écrits dans les pages légales et ne se négocient pas.

**Nimbo** est le guide du site : un petit nuage qui parle à la première
personne, vouvoie, explique, et ne recommande jamais. Il apparaît dans
l'analyse (« L'avis de Nimbo »), dans l'aide en bas à droite, dans la
Communauté (la note du jour) et dans les notifications.

---

## 2. Le dépôt

```
tdb/
├── tdb.py, modules/, services/, ai/, config.py, backuptdb.py   ← CaptenBOT (Telegram). NE PAS TOUCHER.
├── trading_bot.db          ← base SQLite de développement, partagée. NE JAMAIS COMMITTER ses changements.
├── web/
│   ├── backend/            ← API FastAPI (Python 3.11)
│   │   ├── main.py         ← point d'entrée (lifespan, middlewares, routeurs, boucles de fond)
│   │   ├── api/
│   │   │   ├── database.py     ← SQLite en dev, PostgreSQL en prod (asyncpg), traduction des « ? » en « $n »
│   │   │   ├── email_service.py, legal.py, limite.py, temps.py (heure de Paris), websocket.py
│   │   │   ├── routes/         ← une route par écran ; les fichiers `_xxx.py` sont le moteur d'analyse
│   │   │   └── services/       ← notifications, veilles, bilan, défi, rétention, surveillance, guide du site…
│   │   ├── tests/          ← pytest (environ 90 tests), tournent sous SQLite et sous PostgreSQL
│   │   └── Dockerfile      ← `uvicorn main:app --host 0.0.0.0 --port 8000`
│   ├── frontend/           ← Next.js 15.5 (App Router), React 19, TypeScript, Tailwind 3, framer-motion
│   │   ├── src/app/        ← les pages ; `(auth)/` connexion et inscription, `lecon/[numero]`, `actif/[slug]`, `admin`, …
│   │   ├── src/components/ ← `design-system/` (Panel, Button, Text, Nimbo…), `app/` (cadre connecté), `landing/`, `cours/`, `analysis/`…
│   │   ├── src/lib/        ← `api.ts` (client de l'API, GITIGNORÉ : `git add -f`), contextes, catalogue des leçons
│   │   ├── src/styles/capten.css ← les jetons de couleur et les éléments signature (`.cap`)
│   │   ├── src/fonts/      ← Public Sans (fichiers retouchés : seuls les chiffres sont tabulaires)
│   │   └── Dockerfile      ← build `standalone`, `node server.js`
│   └── docs/
│       ├── identite.md     ← LA CHARTE. À lire avant de toucher à un écran.
│       └── ouvrir-le-premium.md ← la liste de contrôle du jour J du Premium
├── CLAUDE.md               ← consignes pour Claude Code (graphify, charte) ; AGENTS.md les reprend pour Codex
└── docs/, tests/, scripts/ ← documentation et tests du bot
```

Le moteur d'analyse (`web/backend/api/routes/_scoring.py`, `_risque.py`,
`_structure.py`, `_calibrage.py`, `_rejeu.py`…) calcule pour un actif un
score sur 100, une tendance, un plan (stop, objectif) et décide si Nimbo
propose une position. Ses seuils sont **mesurés** (rejeu sur 40 actifs) et
les commentaires citent les mesures : on ne change pas un seuil sans mesurer.

---

## 3. Faire tourner le projet

Prérequis : Python 3.11, Node 20, et pour le site public un accès réseau
(les cours viennent de Yahoo Finance via `yfinance`).

```bash
# Backend (depuis web/backend)
pip install -r requirements.txt
python -m uvicorn main:app --port 8000          # SQLite ../../trading_bot.db par défaut
python -m pytest -q                              # les tests, sous SQLite
DATABASE_URL=postgresql://user:pass@127.0.0.1:5432/tdb python -m pytest -q   # les mêmes, sous PostgreSQL

# Frontend (depuis web/frontend)
npm install
npm run dev                                      # http://localhost:3000, l'API via le proxy du middleware
npx tsc --noEmit -p .                            # contrôle des types (à passer avant tout commit)
npm run build && npx next start -p 3000          # comme en production
```

Le frontend parle à l'API par des URL relatives (`/api/...`) que le middleware
Next (`src/middleware.ts`) relaie vers `BACKEND_URL` (défaut
`http://localhost:8000`). Les pages rendues côté serveur lisent
`BACKEND_URL` ou `NEXT_PUBLIC_API_URL`.

Un lancement local avec `python main.py` écoute sur 127.0.0.1 ; la production
démarre par le Dockerfile.

### Variables d'environnement

Les noms sont dans `web/backend/.env.example` et `web/frontend/.env.example`.
Les valeurs vivent dans Railway, jamais dans le dépôt ni dans une
conversation. Les principales : `JWT_SECRET`, `DATABASE_URL` (PostgreSQL),
`FRONTEND_URL` (`https://captentdb.fr`, première adresse d'une liste CORS),
`API_PUBLIC_URL`, `STRIPE_*`, `GROQ_API_KEY` ou `MISTRAL_API_KEY` (un seul
fournisseur d'IA), `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUJET`
(notifications push), `ADMIN_EMAILS`, `EDITEUR_*` (mentions légales),
`PONT_TIKTOK_CLE` (clé partagée avec CaptenStudio), `BREVO_API_KEY` ou SMTP
pour les e-mails. Sans fournisseur d'e-mail configuré, les comptes sont
vérifiés d'office (développement).

### Production

Railway, trois services : `web/backend` (Docker), `web/frontend` (Docker) et
PostgreSQL. Le domaine est captentdb.fr. Une pull request vers `main`
déclenche l'analyse SonarCloud (quality gate : notes A exigées sur le nouveau
code en sécurité, fiabilité et maintenabilité) ; la fusion déclenche le
déploiement.

---

## 4. Les règles avant de toucher au code

1. **Ne jamais modifier le bot** : `tdb.py`, `backuptdb.py`, `config.py` à la
   racine, `modules/`, `services/` à la racine, `ai/`. Tout le travail se fait
   dans `web/`.
2. **Ne jamais committer `trading_bot.db`** ni `web/frontend/next-env.d.ts`.
   Avant chaque commit : `git checkout -- trading_bot.db web/frontend/next-env.d.ts`.
   Les serveurs locaux et les tests écrivent dans cette base.
3. **`web/frontend/src/lib/api.ts` est gitignoré** : il se commit avec
   `git add -f web/frontend/src/lib/api.ts`.
4. **PostgreSQL d'abord.** La production est sous PostgreSQL ; SQLite ne sert
   qu'en développement. Donc : jamais `AUTOINCREMENT` en dur (utiliser
   `"SERIAL PRIMARY KEY" if USE_POSTGRES else "INTEGER PRIMARY KEY AUTOINCREMENT"`),
   jamais `datetime('now')` ni une autre fonction propre à SQLite dans une
   requête, toutes les colonnes sélectionnées dans un `GROUP BY`, et un `?`
   dans un texte entre apostrophes ne compte pas comme paramètre. Faire tourner
   les tests sous les deux bases quand une requête change.
5. **Lire `web/docs/identite.md` avant de toucher à un écran.** En résumé :
   Public Sans partout, sans italique ; l'ambre sert seulement à marquer ;
   vert et rouge seulement pour une hausse ou une baisse ; panneaux opaques,
   aucun texte sous 0,82 rem, contraste 4,5:1 ; ligne datée, sommaire,
   questions-réponses ; pas de badges, de grilles d'icônes, d'accordéons, ni
   d'allure de modèle de site ; aucun emoji dans l'interface.
6. **Le français du site** : vouvoiement, phrases courtes, pas de tiret
   cadratin (virgule, deux-points ou point), nombres à la française
   (`10 000 €`, `1,42 %`, vrai signe moins `−`). L'aide `_fr.py` /
   `nombre_fr()` côté serveur, `toLocaleString("fr-FR")` côté client.
7. **Jamais de conseil, jamais de newsletter, jamais de traceur tiers.** Le
   site n'a ni analytics ni bandeau cookies parce qu'il n'en a pas besoin : ne
   pas ajouter de script tiers. Tout chargement depuis un tiers (TradingView)
   se fait sur demande explicite de la personne, et figure dans la politique
   de confidentialité.
8. **Secrets** : ne jamais demander une clé ou un mot de passe dans la
   conversation, ne jamais en générer un ; dire à l'utilisateur de la poser
   dans Railway.
9. **Vérifier avant de livrer** : `npx tsc --noEmit`, `python -m pytest -q`,
   et un passage dans un navigateur (Playwright est disponible) sur
   téléphone (390 px) et sur ordinateur. Les écrans principaux passent
   axe-core sans erreur : ne pas régresser.
10. **Commits** : un message clair en anglais ou en français, sans
    identifiant de modèle ; chaque groupe vérifié est poussé sur la branche de
    travail. Les pull requests décrivent ce qui change pour l'utilisateur.

---

## 5. Ce que le site sait faire (pour se repérer)

- **Analyse** (`/analysis`) : un actif, un horizon (scalp, day, swing, long),
  le verdict en trois temps (ce que dit Nimbo, le plan, pourquoi), le
  graphique commenté, les compléments repliés. Route `GET /api/analysis/{symbol}`.
- **Scanner, Ma stratégie, Marchés, Agenda macro, Wallet, Journal, Favoris,
  Portefeuille réel, Parcours (37 leçons avec graphiques animés et quiz),
  Missions et série de jours, Communauté (note du jour, défi de la semaine,
  signalements), Assistant IA, Aide de Nimbo (`/api/aide/question`), Premium.**
- **Pages publiques, rendues côté serveur pour Google** : l'accueil avec une
  démo sur les vrais cours (`/api/demo`), les leçons (`/lecon/[numero]`,
  `/cours`), les analyses du jour de 31 actifs (`/actif/[slug]`, `/actifs`),
  les pages légales. `robots.ts`, `sitemap.ts`, images Open Graph par page,
  JSON-LD.
- **Notifications** : une passerelle unique `services/notifications.notifier`
  (catégories, heures calmes, dédoublonnage, push VAPID), des boucles de fond
  dans le `lifespan` de `main.py` (alertes de prix et stops toutes les 3 min,
  stratégies toutes les 2 h, bilan du vendredi 22 h 30 Paris, note du jour,
  défi, macro).
- **Administration** (`/admin`) : comptes, support, modération, positions,
  rétention (entonnoir inscription → e-mail confirmé → première analyse →
  premier ordre → J1 → J7), exploitation (erreurs serveur, réglages,
  maintenance), communication.
- **Surveillance** : cinq erreurs serveur en dix minutes préviennent les
  administrateurs (`services/surveillance.py`).

---

## 6. Le pont avec CaptenStudio

CaptenStudio envoie au site la liste des leçons publiées sur TikTok et le
plan de la série (`POST /api/pont/...`, clé `PONT_TIKTOK_CLE`). Le site s'en
sert pour que l'onglet Apprendre couvre ce qui a été vu en vidéo, et pour
qu'un visiteur venu d'une vidéo retrouve sa leçon. Rien de TikTok ne
s'affiche sur le site. Les visuels de contenu suivent la même charte que le
site (voir « Charte graphique CaptenTDB pour Instagram », un document à part).

---

## 7. En cas de doute

- Un seuil du moteur, un texte légal, une mention obligatoire, la police, le
  ton : on ne change pas sans demander.
- Une page qui doit être lue par Google : rendue côté serveur, titre et
  description dans `<head>`, pas de « Chargement… » comme seul contenu.
- Un ajout qui envoie des données à un tiers : d'abord la politique de
  confidentialité, ensuite le code, et jamais sans l'accord explicite de la
  personne dans l'interface.
