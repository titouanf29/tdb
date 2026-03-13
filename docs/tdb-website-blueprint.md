# TDB Website Blueprint

## 1) Positionnement produit
TDB est un assistant IA de trading pedagogique, accessible principalement via Telegram, avec une communaute Discord. Le site sert a convertir des visiteurs en utilisateurs actifs du bot.

Promesse centrale:
"Analyse de marche IA, alertes intelligentes et entrainement sans risque."

## 2) Objectif conversion
Objectif principal: clic vers Telegram.
Objectifs secondaires:
- rejoindre Discord
- consulter les contenus education
- creer de la confiance (FAQ + legal + transparence)

## 3) Architecture du site (Sitemap)
- `/` Landing page (conversion)
- `/fonctionnalites` Details des modules IA
- `/comment-ca-marche` Parcours utilisateur en 4 etapes
- `/apercu-bot` Captures / mockups Telegram
- `/education` Hub pedagogique
- `/communaute` Discord + social proof
- `/faq` Questions frequentes
- `/legal/disclaimer` Disclaimer legal
- `/legal/mentions-legales`
- `/legal/confidentialite`

Pages bonus:
- `/roadmap`
- `/dashboard` (futur espace utilisateur)
- `/parrainage`

## 4) Structure UX recommandee
### Hero
- Titre fort
- Sous-titre simple
- CTA primaire Telegram
- CTA secondaire "Decouvrir les fonctionnalites"
- Bloc preuve: 25+ indicateurs, score 0-100, paper trading 10 000$

### Blocs de confiance
- Comment fonctionne l'analyse (SMA200, VIX, force relative, Ichimoku, order blocks)
- FAQ transparente
- Disclaimer legal visible

### Parcours conversion
1. Decouverte proposition de valeur
2. Preuve methode / fonctionnalites
3. Projection usage reel (mockups)
4. Activation Telegram

## 5) Copy marketing (tonalite)
- Clair, pedagogique, non-prometteur
- Pas de "gains garantis"
- Lexique recommande: "assistant", "analyse", "opportunite", "gestion du risque", "simulation"

Exemple CTA principal:
- "Rejoindre le bot Telegram"

Exemple microcopy risque:
- "TDB est un outil educatif. Il ne constitue pas un conseil en investissement."

## 6) Design system (fintech moderne)
Direction visuelle:
- fond sombre (noir/bleu/violet)
- accent vert pour score/opportunite
- cartes contrastes + bordures subtiles
- typo forte pour titres, lisible pour contenu

Tokens UI minimaux:
- Background: #05070C
- Surface: #121B2D
- Primary: #2D7CFF
- Accent: #29E17C
- Text: #EAF2FF
- Muted: #9DB0D0

## 7) Stack technique cible
Frontend:
- Next.js (App Router)
- TypeScript
- Tailwind CSS ou CSS Modules
- Framer Motion (animations utiles uniquement)

Backend:
- Node.js (API routes Next.js ou service Express dedie)

Base de donnees:
- PostgreSQL

Infra:
- Vercel (frontend)
- Cloudflare (DNS/WAF/CDN)

Outils produit:
- PostHog ou Plausible (analytics)
- Sentry (erreurs)
- Crisp/Intercom (support)

## 8) Modele de donnees (v1)
Tables recommandees:
- `leads` (id, source, created_at)
- `telegram_click_events` (id, campaign, page, ts)
- `education_articles` (id, slug, title, category, content)
- `faq_items` (id, question, answer, order_index)
- `roadmap_items` (id, title, status, eta)

## 9) KPI de conversion
- CTR hero -> Telegram
- taux scroll jusqu'a "Comment ca marche"
- clic Discord
- consultation FAQ
- conversion visite -> clic Telegram

## 10) Plan d'implementation
1. V1 landing conversion (deja livree en statique dans `webapp/static`)
2. Migration Next.js multi-pages
3. Brancher analytics + event tracking CTA
4. Ajouter hub education dynamique
5. Ouvrir roadmap + parrainage

## 11) Contenu legal minimum
- Disclaimer legal visible sur la landing
- Mentions legales page dediee
- Politique de confidentialite (cookies, analytics, contact)

Texte legal minimum:
"Le bot TDB ne fournit pas de conseils financiers. Les analyses, alertes et simulations sont purement educatives."