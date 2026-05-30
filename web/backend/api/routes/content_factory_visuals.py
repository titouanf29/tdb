"""
Content Factory Visuals — admin-only endpoints for generating visual assets.
Covers: trading chart (yfinance+matplotlib), screenshot (playwright),
stock photos (Unsplash), AI image (DALL-E 3), screencast stub.
"""
import base64
import io
import os
from typing import Optional

import httpx
import matplotlib
matplotlib.use("Agg")                     # non-interactive backend — must be before any pyplot import
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
import matplotlib.ticker as mticker
from matplotlib.patches import Rectangle
import numpy as np
import pandas as pd

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from ..database import execute_query
from .admin import get_admin_user

router = APIRouter()

# ── Brand palette ─────────────────────────────────────────────────────────────
BG      = "#0A0E1A"
BLUE    = "#638CFF"
GREEN   = "#00D4AA"
RED     = "#FF4757"
YELLOW  = "#FFD700"
MUTED   = "#4A5568"
TEXT    = "#E2E8F0"

# ── Topic → symbol mapping ────────────────────────────────────────────────────
TOPIC_SYMBOLS: dict[str, str] = {
    "RSI":                      "BTC-USD",
    "MACD":                     "BTC-USD",
    "EMA":                      "GC=F",
    "Bollinger Bands":          "ETH-USD",
    "Volume":                   "SPY",
    "Stochastique":             "BTC-USD",
    "ATR":                      "BTC-USD",
    "Ichimoku":                 "EURUSD=X",
    "Support & Résistance":     "EURUSD=X",
    "Chandelier Japonais":      "BTC-USD",
    "Tendance":                 "SPY",
    "Risk Management":          "BTC-USD",
    "Take Profit / Stop Loss":  "GC=F",
    "Scalping":                 "EURUSD=X",
    "Swing Trading":            "SPY",
    "Day Trading":              "EURUSD=X",
}

TOPIC_INDICATOR: dict[str, str] = {
    "RSI":                      "rsi",
    "MACD":                     "macd",
    "EMA":                      "ema",
    "Bollinger Bands":          "bollinger",
    "Volume":                   "volume",
    "Stochastique":             "stochastic",
    "ATR":                      "atr",
    "Ichimoku":                 "ema",
    "Support & Résistance":     "sr",
    "Chandelier Japonais":      "candles",
    "Tendance":                 "ema",
    "Risk Management":          "sr",
    "Take Profit / Stop Loss":  "sr",
    "Scalping":                 "ema",
    "Swing Trading":            "macd",
    "Day Trading":              "rsi",
}

FMT_FIGSIZE: dict[str, tuple[float, float]] = {
    "portrait":  (5.4, 9.6),
    "landscape": (9.6, 5.4),
    "square":    (5.4, 5.4),
}

UNSPLASH_QUERIES: dict[str, str] = {
    "RSI":                      "stock market chart trading screen",
    "MACD":                     "stock market chart trading screen",
    "EMA":                      "stock market chart trading screen",
    "Bollinger Bands":          "stock market chart trading screen",
    "Stochastique":             "stock market chart trading screen",
    "Volume":                   "trading dashboard financial data",
    "ATR":                      "trading dashboard financial data",
    "Ichimoku":                 "financial chart analysis",
    "Chandelier Japonais":      "financial chart analysis",
    "Support & Résistance":     "financial chart analysis",
    "Tendance":                 "financial chart analysis",
    "Risk Management":          "risk management investment",
    "Take Profit / Stop Loss":  "risk management investment",
    "Scalping":                 "day trader multiple monitors",
    "Day Trading":              "day trader multiple monitors",
    "Swing Trading":            "swing trading investment strategy",
}

UNSPLASH_QUERIES_V2: dict[str, list[str]] = {
    "RSI":                  ["RSI oscillator trading screen dark mode", "overbought oversold trading chart", "technical indicator trading monitor"],
    "MACD":                 ["MACD crossover trading chart dark screen", "momentum indicator stock market", "signal line histogram trading"],
    "EMA":                  ["exponential moving average gold chart", "trend following trading screen", "moving average crossover finance"],
    "Bollinger Bands":      ["bollinger bands squeeze trading chart", "volatility breakout trading screen", "band trading cryptocurrency chart"],
    "Volume":               ["volume spike stock market breakout", "trading volume chart financial data", "order flow trading screen monitor"],
    "Stochastique":         ["stochastic oscillator trading screen", "oversold indicator crypto trading", "technical analysis chart dark mode"],
    "ATR":                  ["volatility trading dashboard financial", "risk management trading screen ATR", "stop loss calculation trading chart"],
    "Ichimoku":             ["ichimoku cloud chart forex trading", "japanese trading indicator chart screen", "kumo cloud technical analysis"],
    "Support & Résistance": ["support resistance levels chart trading", "horizontal levels price bouncing chart", "key levels trading technical analysis"],
    "Chandelier Japonais":  ["japanese candlestick patterns chart", "hammer doji engulfing candlestick", "candlestick pattern trading screen dark"],
    "Tendance":             ["uptrend market financial chart growth", "trend trading higher highs chart", "bull market upward trending chart"],
    "Risk Management":      ["risk reward trading calculation screen", "stop loss take profit trading chart", "position sizing trading risk money"],
    "Take Profit / Stop Loss": ["stop loss take profit chart levels", "risk reward ratio trading setup", "exit strategy trading screen chart"],
    "Scalping":             ["day trader multiple monitors trading desk", "scalping 1 minute chart fast trading", "high frequency trading screen charts"],
    "Swing Trading":        ["swing trading chart daily timeframe", "multi-day price movement chart trading", "swing trade setup technical analysis"],
    "Day Trading":          ["day trader professional trading desk setup", "intraday trading screen charts monitors", "active trading workstation financial"],
}

FILMING_GUIDES: dict[str, dict] = {
    "RSI": {
        "concept": "Montre l'oscillateur RSI sortir de la zone de survente sur Bitcoin — le rebond classique",
        "duree_totale": "45 secondes",
        "plans": [
            {"n": 1, "duree": "4s", "emoji": "📱", "type": "ouverture",
             "action": "Ouvre TradingView sur BTC/USDT 1H en mode portrait",
             "conseil": "Active le mode sombre. Laisse le panneau RSI(14) visible en bas. Zoom fort sur 30-40 bougies."},
            {"n": 2, "duree": "6s", "emoji": "🔍", "type": "zoom",
             "action": "Zoom lentement sur la zone RSI < 30 (zone verte surlignée)",
             "conseil": "Glisse le doigt lentement sur l'écran — effet cinématique. Pause 2s sur la zone."},
            {"n": 3, "duree": "8s", "emoji": "📈", "type": "exemple",
             "action": "Scroll sur un exemple récent : RSI < 30 puis rebond du prix (+5% min)",
             "conseil": "Cherche sur les 3 derniers mois de BTC. Il y en a toujours un. Cercle avec ton doigt."},
            {"n": 4, "duree": "5s", "emoji": "🔴", "type": "zoom",
             "action": "Montre la zone RSI > 70 et le prix qui s'essouffle juste après",
             "conseil": "Contraste rouge/vert très fort visuellement. Pointe avec ton doigt ou un stylet."},
            {"n": 5, "duree": "15s", "emoji": "🎙️", "type": "voixoff",
             "action": "Lis le script voix-off pendant que le graphique défile",
             "conseil": "2.5 mots/seconde. Voix IA : ElevenLabs 'Adam' ou 'Rachel'. Pas de musique forte."},
            {"n": 6, "duree": "5s", "emoji": "🔗", "type": "cta",
             "action": "Zoom sur captentdb.fr/indicateurs/rsi affiché sur ton écran",
             "conseil": "Téléphone à 15° d'inclinaison. Lumière venant de la gauche. Effet lifestyle."},
        ],
        "apps": ["TradingView (gratuit)", "captentdb.fr/indicateurs/rsi"],
        "equipement": ["📱 Téléphone portrait 9:16", "💡 Ring light ou fenêtre", "🎙️ Micro-cravate (optionnel)"],
        "ambiance": "Tension → résolution | Musique lo-fi qui monte progressivement",
        "tips": ["Filme un vrai signal RSI < 30 récent sur BTC pour la crédibilité max", "Si pas de signal récent : utilise le backtest TradingView pour rejouer un bon exemple", "Le RSI divergence (prix baisse, RSI monte) = encore plus fort visuellement"],
    },
    "MACD": {
        "concept": "Capture le croisement MACD haussier — le signal d'achat le plus célèbre du trading",
        "duree_totale": "45 secondes",
        "plans": [
            {"n": 1, "duree": "4s", "emoji": "📱", "type": "ouverture",
             "action": "Ouvre TradingView sur BTC/USDT 4H, MACD 12-26-9 visible en bas",
             "conseil": "Active la vue histogramme colorée (vert/rouge). Mode sombre obligatoire."},
            {"n": 2, "duree": "8s", "emoji": "🔀", "type": "zoom",
             "action": "Zoom sur un croisement haussier : ligne MACD passe AU-DESSUS de la signal",
             "conseil": "Cercle le croisement en direct avec ton doigt. Montre que le prix monte juste après."},
            {"n": 3, "duree": "5s", "emoji": "📊", "type": "zoom",
             "action": "Zoom sur l'histogramme qui passe de rouge à vert — changement de momentum",
             "conseil": "Insiste sur les barres qui s'inversent. C'est le moment visuellement le plus fort."},
            {"n": 4, "duree": "5s", "emoji": "❌", "type": "exemple",
             "action": "Montre un faux signal MACD (croisement sans suite en contexte baissier)",
             "conseil": "Essentiel pour crédibilité : montre qu'il faut le contexte haussier pour valider."},
            {"n": 5, "duree": "15s", "emoji": "🎙️", "type": "voixoff",
             "action": "Script avec zooms dynamiques sur les éléments clés",
             "conseil": "Fais des zooms progressifs PENDANT que tu parles — augmente la rétention de 40%."},
            {"n": 6, "duree": "5s", "emoji": "🔗", "type": "cta",
             "action": "Zoom sur captentdb.fr/indicateurs/macd",
             "conseil": "Geste de swipe vers le haut à la fin — suggère visuellement 'lien en bio'."},
        ],
        "apps": ["TradingView (gratuit)", "captentdb.fr/indicateurs/macd"],
        "equipement": ["📱 Téléphone portrait 9:16", "💡 Lumière douce", "🎙️ Micro ou ElevenLabs"],
        "ambiance": "Progression → momentum | Musique hip-hop lo-fi BPM moyen",
        "tips": ["Le MACD 4H sur BTC donne les meilleurs signaux — attend un vrai croisement", "Montre TOUJOURS un faux signal pour crédibiliser ton contenu", "Le Crossover View de TradingView highlight automatiquement les croisements"],
    },
    "EMA": {
        "concept": "Les EMA croisent et le prix suit — montre le Golden Cross en action sur l'Or ou BTC",
        "duree_totale": "45 secondes",
        "plans": [
            {"n": 1, "duree": "4s", "emoji": "📱", "type": "ouverture",
             "action": "Ouvre XAU/USD (Or) ou BTC 1D avec EMA 9 (vert), EMA 21 (bleu), EMA 50 (orange)",
             "conseil": "L'Or est visuellement plus propre que BTC pour les EMA — moins volatile."},
            {"n": 2, "duree": "8s", "emoji": "✨", "type": "zoom",
             "action": "Zoom sur un croisement EMA 9 au-dessus de EMA 21 (Golden Mini-Cross)",
             "conseil": "Montre comment le prix RESTE au-dessus des EMA lors d'une tendance haussière."},
            {"n": 3, "duree": "6s", "emoji": "📉", "type": "exemple",
             "action": "EMA 9 sous EMA 21 = tendance baissière. Montre le contraste visuel fort.",
             "conseil": "Vert puis rouge. L'audience comprend immédiatement sans explication."},
            {"n": 4, "duree": "5s", "emoji": "↩️", "type": "conseil",
             "action": "Montre le prix rebondir sur l'EMA 21 lors d'un pullback — le support dynamique",
             "conseil": "Ce plan est ultra-accrocheur : prix touche l'EMA et repart. Magie visuelle."},
            {"n": 5, "duree": "15s", "emoji": "🎙️", "type": "voixoff",
             "action": "Script pendant que tu scrolles sur l'historique",
             "conseil": "Format 1 règle par plan : 'EMA 9 > EMA 21 = haussier. Simple.'"},
            {"n": 6, "duree": "5s", "emoji": "🔗", "type": "cta",
             "action": "CTA vers captentdb.fr — toutes les stratégies EMA expliquées",
             "conseil": "Montre la page sur mobile en zoomant doucement dessus."},
        ],
        "apps": ["TradingView", "captentdb.fr/indicateurs/ema"],
        "equipement": ["📱 Téléphone 9:16", "💡 Ring light", "🖥️ Second écran visible (bonus)"],
        "ambiance": "Clarté → confiance | Musique instrumentale douce",
        "tips": ["Le Golden Cross EMA 50/200 est LE signal le plus connu — montre-le", "XAU/USD (Or) est visuellement plus propre pour les EMA que BTC", "Ajoute un 'scan' multi-TF en passant de 1H → 4H → 1D pour montrer la confluence"],
    },
    "Bollinger Bands": {
        "concept": "Les bandes se compriment, le prix explose — capture la rupture du Bollinger Squeeze",
        "duree_totale": "45 secondes",
        "plans": [
            {"n": 1, "duree": "4s", "emoji": "📱", "type": "ouverture",
             "action": "Ouvre ETH/USDT 4H avec Bollinger Bands (20, 2) — ETH a plus de squeezes que BTC",
             "conseil": "Bollinger est plus spectaculaire sur ETH — compressions plus fréquentes et visibles."},
            {"n": 2, "duree": "8s", "emoji": "🤏", "type": "zoom",
             "action": "Zoom sur un Bollinger Squeeze — bandes très serrées (calme avant tempête)",
             "conseil": "C'est le moment le plus impactant. Pause 2s sur la compression pour laisser le temps."},
            {"n": 3, "duree": "6s", "emoji": "💥", "type": "zoom",
             "action": "Montre la rupture : prix sort d'un côté, bandes s'écartent violemment",
             "conseil": "Zoom lent puis accélère le scroll à la rupture — effet dramatique cinématique."},
            {"n": 4, "duree": "5s", "emoji": "↕️", "type": "exemple",
             "action": "Montre le prix rebondir entre bande haute et basse en range (range trading)",
             "conseil": "Double valeur éducative : squeeze + range trading. Deux stratégies en 45s."},
            {"n": 5, "duree": "15s", "emoji": "🎙️", "type": "voixoff",
             "action": "Script pendant que les exemples défilent",
             "conseil": "Baisse la voix sur la compression, monte sur la rupture. Dramaturgie vocale."},
            {"n": 6, "duree": "5s", "emoji": "🔗", "type": "cta",
             "action": "CTA vers captentdb.fr",
             "conseil": "Finir avec une animation de swipe pour indiquer le lien en bio."},
        ],
        "apps": ["TradingView", "captentdb.fr/indicateurs/bollinger"],
        "equipement": ["📱 Téléphone 9:16", "💡 Lumière", "🎙️ Micro"],
        "ambiance": "Suspense → explosion | Musique cinématique qui monte",
        "tips": ["Cherche un vrai Squeeze récent sur ETH — ils arrivent toutes les 2-3 semaines", "Montre le % d'expansion après rupture (ex: +8% en 4h) — les chiffres accrochent", "Le Bollinger Width indicator visualise encore mieux la compression"],
    },
    "Volume": {
        "concept": "Un pic de volume annonce un breakout — montre la corrélation volume/prix en live",
        "duree_totale": "45 secondes",
        "plans": [
            {"n": 1, "duree": "4s", "emoji": "📱", "type": "ouverture",
             "action": "Ouvre SPY ou BTC avec barres de volume colorées (vert/rouge) en bas",
             "conseil": "SPY a des volumes ÉNORMES sur les annonces Fed — parfait pour illustrer."},
            {"n": 2, "duree": "8s", "emoji": "📊", "type": "zoom",
             "action": "Zoom sur un pic de volume (3x+ la moyenne) coïncidant avec un breakout",
             "conseil": "Règle d'or : 'Un breakout sans volume = faux signal.' Montre-le visuellement."},
            {"n": 3, "duree": "6s", "emoji": "📉", "type": "exemple",
             "action": "Même cassure de niveau MAIS avec volume faible — le prix retrace",
             "conseil": "Comparaison côte à côte si possible. TradingView permet le split d'écran."},
            {"n": 4, "duree": "5s", "emoji": "📏", "type": "conseil",
             "action": "Affiche la SMA 20 des volumes — montre qu'on doit être AU-DESSUS",
             "conseil": "Ajoute Volume SMA(20) dans TradingView pour la ligne de référence visuelle."},
            {"n": 5, "duree": "15s", "emoji": "🎙️", "type": "voixoff",
             "action": "Script en pointant les barres volumineuses",
             "conseil": "Accentue vocalement sur 'volume FORT' et 'cassure CONFIRMÉE'."},
            {"n": 6, "duree": "5s", "emoji": "🔗", "type": "cta",
             "action": "CTA vers captentdb.fr avec un graphique à 3 pics de volume simultanés",
             "conseil": "Terminer visuellement sur 3 bougies vertes + 3 barres de volume vertes géantes."},
        ],
        "apps": ["TradingView", "captentdb.fr"],
        "equipement": ["📱 Téléphone 9:16", "💡 Lumière", "🎙️ Micro"],
        "ambiance": "Information → révélation | Musique rythmée avec impact sur les beats",
        "tips": ["SPY sur annonce Fed = volumes 5-10x la normale — exemple parfait", "Montre des vrais chiffres : '2.3M contrats vs 800K en moyenne' — concret et crédible", "Le ratio Volume/Average Volume est le meilleur indicateur de conviction"],
    },
    "Stochastique": {
        "concept": "Croisement %K/%D en zone de survente — même principe que RSI mais avec 2 lignes",
        "duree_totale": "45 secondes",
        "plans": [
            {"n": 1, "duree": "4s", "emoji": "📱", "type": "ouverture",
             "action": "Ouvre BTC/USDT 1H avec Stochastique (14,3,3) — zones 80/20 surlignées",
             "conseil": "Configure : zone 80 = surachat rouge, zone 20 = survente verte."},
            {"n": 2, "duree": "8s", "emoji": "✂️", "type": "zoom",
             "action": "Zoom sur le croisement %K au-dessus de %D en zone < 20",
             "conseil": "Le croisement DANS la zone < 20 = signal fort. Pointe les 2 lignes clairement."},
            {"n": 3, "duree": "6s", "emoji": "⚡", "type": "zoom",
             "action": "Montre la divergence haussière : prix fait un nouveau bas, stoch fait un bas plus haut",
             "conseil": "La divergence est encore plus puissante que le simple croisement."},
            {"n": 4, "duree": "5s", "emoji": "⚠️", "type": "conseil",
             "action": "Montre qu'en forte tendance, le stoch reste en zone de surachat longtemps",
             "conseil": "Prévient les débutants contre l'erreur de shorter trop tôt en bull market."},
            {"n": 5, "duree": "15s", "emoji": "🎙️", "type": "voixoff",
             "action": "Script avec zooms dynamiques, compare visuellement avec RSI",
             "conseil": "Montrer les deux côte à côte augmente la compréhension et l'engagement."},
            {"n": 6, "duree": "5s", "emoji": "🔗", "type": "cta",
             "action": "CTA vers captentdb.fr",
             "conseil": "Finir sur 'tous les indicateurs oscillateurs sur captentdb.fr'."},
        ],
        "apps": ["TradingView", "captentdb.fr"],
        "equipement": ["📱 Téléphone 9:16", "💡 Ring light", "🎙️ Micro"],
        "ambiance": "Précision → action | Lo-fi focus music",
        "tips": ["Stoch 5,3,3 est plus réactif que 14,3,3 — utile pour scalping", "Montre le stoch sur 3 timeframes simultanément pour la confluence"],
    },
    "ATR": {
        "concept": "L'ATR mesure la volatilité — montre comment calculer son stop-loss intelligemment",
        "duree_totale": "45 secondes",
        "plans": [
            {"n": 1, "duree": "4s", "emoji": "📱", "type": "ouverture",
             "action": "Ouvre BTC/USDT 4H avec ATR(14) affiché — montre la valeur actuelle",
             "conseil": "L'ATR est une valeur absolue (ex: 1500$). Montre-la clairement en haut de l'indicateur."},
            {"n": 2, "duree": "8s", "emoji": "📐", "type": "zoom",
             "action": "Calcule le SL en direct : prix d'entrée - 2x ATR = zone de protection",
             "conseil": "Exemple concret : BTC à 65 000$, ATR = 1 500$, SL = 65 000 - 3 000 = 62 000$."},
            {"n": 3, "duree": "6s", "emoji": "🌊", "type": "zoom",
             "action": "Montre l'ATR exploser lors d'un krach — volatilité extrême visible",
             "conseil": "ATR élevé = SL plus large obligatoire. ATR bas = SL plus serré possible."},
            {"n": 4, "duree": "5s", "emoji": "📊", "type": "conseil",
             "action": "Compare ATR faible (range calme) vs ATR élevé (tendance forte)",
             "conseil": "Visuel simple : basse mer vs haute mer. Tout le monde comprend."},
            {"n": 5, "duree": "15s", "emoji": "🎙️", "type": "voixoff",
             "action": "Script avec calcul SL en live via annotation TradingView",
             "conseil": "Note les chiffres directement sur le graphique pendant la vidéo."},
            {"n": 6, "duree": "5s", "emoji": "🔗", "type": "cta",
             "action": "CTA vers captentdb.fr — calcule ton SL automatiquement",
             "conseil": "Finir sur 'ne place plus jamais un SL au hasard'."},
        ],
        "apps": ["TradingView", "captentdb.fr"],
        "equipement": ["📱 Téléphone 9:16", "💡 Lumière", "🎙️ Micro"],
        "ambiance": "Technique → pratique | Musique focus neutre",
        "tips": ["Règle : 1.5x ATR = SL conservateur, 2.5x ATR = SL agressif", "L'ATR est INDISPENSABLE pour le position sizing — mentionne ce fait"],
    },
    "Ichimoku": {
        "concept": "Le nuage Ichimoku en une vidéo — prix au-dessus du cloud = haussier, dessous = baissier",
        "duree_totale": "45 secondes",
        "plans": [
            {"n": 1, "duree": "4s", "emoji": "📱", "type": "ouverture",
             "action": "Ouvre EUR/USD journalier avec Ichimoku complet — le forex est plus lisible",
             "conseil": "EUR/USD daily avec Ichimoku = le meilleur cadre pour expliquer cet outil."},
            {"n": 2, "duree": "8s", "emoji": "☁️", "type": "zoom",
             "action": "Zoom sur le nuage (Kumo) — vert = haussier, rouge = baissier",
             "conseil": "Commence par le cloud. C'est le premier élément que les traders regardent."},
            {"n": 3, "duree": "6s", "emoji": "⬆️", "type": "zoom",
             "action": "Montre le prix passer AU-DESSUS du cloud — signal haussier fort",
             "conseil": "TK Cross dans le cloud = signal fort. Cercle-le clairement."},
            {"n": 4, "duree": "5s", "emoji": "⬇️", "type": "exemple",
             "action": "Prix passe EN-DESSOUS du cloud — signal baissier. Nuage rouge après.",
             "conseil": "Contraste nuage vert vs rouge = très impactant visuellement."},
            {"n": 5, "duree": "15s", "emoji": "🎙️", "type": "voixoff",
             "action": "Script en montrant cloud, Tenkan, Kijun",
             "conseil": "Simplifie : focus sur cloud + TK Cross seulement. Ne noie pas l'audience."},
            {"n": 6, "duree": "5s", "emoji": "🔗", "type": "cta",
             "action": "CTA vers captentdb.fr/indicateurs/ichimoku",
             "conseil": "Montre la page complète Ichimoku sur le site — effet encyclopédie."},
        ],
        "apps": ["TradingView", "captentdb.fr"],
        "equipement": ["📱 Téléphone 9:16", "💡 Lumière", "🎙️ Micro"],
        "ambiance": "Sagesse → clarté | Musique douce et zen",
        "tips": ["Cloud épais = support/résistance fort, cloud fin = niveau moins fiable", "L'Ichimoku est complexe — SIMPLIFIE au max dans la vidéo (règle des 3 points)"],
    },
    "Support & Résistance": {
        "concept": "Trace les niveaux qui comptent — 3 rebonds sur le même prix = confirmation absolue",
        "duree_totale": "45 secondes",
        "plans": [
            {"n": 1, "duree": "4s", "emoji": "📱", "type": "ouverture",
             "action": "Ouvre EUR/USD ou BTC 1H — trace un support horizontal qui a tenu 3x",
             "conseil": "Utilise l'outil 'droite horizontale' TradingView. Vert pour support, rouge pour résistance."},
            {"n": 2, "duree": "8s", "emoji": "↩️", "type": "zoom",
             "action": "Zoom sur chaque rebond sur le support — numérote 1, 2, 3 en direct",
             "conseil": "Dessiner les annotations EN DIRECT pendant la vidéo = très engageant."},
            {"n": 3, "duree": "6s", "emoji": "💥", "type": "exemple",
             "action": "Montre la cassure du support et sa transformation en résistance (support flip)",
             "conseil": "Le concept support→résistance est LE concept le plus visuel de l'analyse technique."},
            {"n": 4, "duree": "5s", "emoji": "🎯", "type": "conseil",
             "action": "Entrée classique : rebond sur support + RSI en survente = signal 5 étoiles",
             "conseil": "La confluence d'indicateurs sur un niveau S/R = setup premium à montrer."},
            {"n": 5, "duree": "15s", "emoji": "🎙️", "type": "voixoff",
             "action": "Script avec tracé en direct des niveaux",
             "conseil": "Dessine PENDANT la vidéo. L'audience adore voir tracer en temps réel."},
            {"n": 6, "duree": "5s", "emoji": "🔗", "type": "cta",
             "action": "CTA vers captentdb.fr — apprends à tracer tes niveaux",
             "conseil": "Finir sur 'les niveaux les plus importants de la semaine sur captentdb.fr'."},
        ],
        "apps": ["TradingView", "captentdb.fr"],
        "equipement": ["📱 Téléphone 9:16", "💡 Lumière", "✏️ Apple Pencil ou stylet (bonus)"],
        "ambiance": "Découverte → confiance | Lo-fi beats",
        "tips": ["Utilise un graphique MENSUEL pour trouver les niveaux les plus puissants", "Les niveaux 'ronds' (50 000$, 100$, 1.2000) sont toujours les plus forts", "Montre un exemple sur un actif populaire récent — boost l'engagement"],
    },
    "Chandelier Japonais": {
        "concept": "3 chandeliers qui prédisent un retournement — Doji, Marteau et Engulfing en 45s",
        "duree_totale": "45 secondes",
        "plans": [
            {"n": 1, "duree": "4s", "emoji": "📱", "type": "ouverture",
             "action": "Ouvre BTC 4H — zoom fort pour avoir des bougies LARGES et lisibles (15-20 max)",
             "conseil": "Moins de bougies = bougies plus grosses = plus lisibles. Zoom fort obligatoire."},
            {"n": 2, "duree": "8s", "emoji": "🔨", "type": "zoom",
             "action": "Zoom sur un Marteau (Hammer) : longue mèche basse, corps haut",
             "conseil": "Annote 'Corps', 'Mèche basse' via les outils TradingView. Très pédagogique."},
            {"n": 3, "duree": "6s", "emoji": "⚡", "type": "zoom",
             "action": "Montre un Engulfing Haussier : bougie verte PLUS GRANDE que la rouge précédente",
             "conseil": "C'est visuellement évident. Pas besoin d'explication — montre juste."},
            {"n": 4, "duree": "5s", "emoji": "➕", "type": "zoom",
             "action": "Montre un Doji : corps minuscule, mèches longues = hésitation du marché",
             "conseil": "Le Doji avant annonce majeure (CPI, Fed) est toujours présent. Montre-le."},
            {"n": 5, "duree": "15s", "emoji": "🎙️", "type": "voixoff",
             "action": "Script en passant entre les 3 patterns rapidement",
             "conseil": "Rythme rapide : 1 pattern = 1 règle = 3 secondes. Efficace et dynamique."},
            {"n": 6, "duree": "5s", "emoji": "🔗", "type": "cta",
             "action": "CTA vers captentdb.fr — effet 'encyclopédie' en scrollant rapidement les patterns",
             "conseil": "Montre vite plusieurs chandeliers sur le site. Scroll rapide = effet wow."},
        ],
        "apps": ["TradingView", "captentdb.fr"],
        "equipement": ["📱 Téléphone 9:16", "💡 Lumière", "🎙️ Micro"],
        "ambiance": "Éducatif → actionnable | Musique neutre",
        "tips": ["Les chandeliers fonctionnent MIEUX sur timeframes élevés (4H, 1D)", "Hammer SUR un support = setup parfait à montrer", "L'Engulfing Haussier = pattern le plus connu = meilleur engagement"],
    },
    "Tendance": {
        "concept": "Higher Highs + Higher Lows = tendance haussière — la règle la plus simple du trading",
        "duree_totale": "45 secondes",
        "plans": [
            {"n": 1, "duree": "4s", "emoji": "📱", "type": "ouverture",
             "action": "Ouvre SPY (S&P500) ou BTC en tendance haussière récente (2023-2024 parfait)",
             "conseil": "Choisir une période de tendance CLAIRE. Pas un range. SPY 2023 = exemple parfait."},
            {"n": 2, "duree": "8s", "emoji": "📈", "type": "zoom",
             "action": "Dessine en direct les Higher Highs (HH) et Higher Lows (HL)",
             "conseil": "Annote HH1, HH2, HH3 et HL1, HL2 pendant la vidéo. L'audience ADORE ça."},
            {"n": 3, "duree": "6s", "emoji": "📉", "type": "exemple",
             "action": "Montre la tendance baissière : Lower Lows et Lower Highs — même structure inversée",
             "conseil": "Contraste immédiat. Très pédagogique en 6 secondes."},
            {"n": 4, "duree": "5s", "emoji": "🔄", "type": "conseil",
             "action": "Montre la cassure de structure : un HL devient LL = la tendance change",
             "conseil": "C'est LE signal le plus important. Le moment où tout change."},
            {"n": 5, "duree": "15s", "emoji": "🎙️", "type": "voixoff",
             "action": "Script en dessinant la structure en direct",
             "conseil": "Dessiner PENDANT la vidéo augmente le temps de rétention de 40%."},
            {"n": 6, "duree": "5s", "emoji": "🔗", "type": "cta",
             "action": "CTA vers captentdb.fr",
             "conseil": "Terminer sur 'ne trade jamais contre la tendance'."},
        ],
        "apps": ["TradingView", "captentdb.fr"],
        "equipement": ["📱 Téléphone 9:16", "💡 Lumière", "✏️ Stylet pour annoter"],
        "ambiance": "Clarté → évidence | Musique progressive qui monte",
        "tips": ["La structure de marché (HH/HL) est plus fiable que n'importe quel indicateur", "SPY 2023 en tendance haussière = exemple idéal, tout le monde connait"],
    },
    "Risk Management": {
        "concept": "Un seul trade mal géré peut ruiner un compte — le calcul risk-reward expliqué en 45s",
        "duree_totale": "45 secondes",
        "plans": [
            {"n": 1, "duree": "4s", "emoji": "📱", "type": "ouverture",
             "action": "Ouvre un graphique avec un setup clair + calcul en direct",
             "conseil": "Note en bas de l'écran : capital 1000€, risque 1% = 10€ max de perte par trade."},
            {"n": 2, "duree": "8s", "emoji": "📏", "type": "zoom",
             "action": "Dessine SL (sous le support) et TP (résistance) — ratio minimum 1:2",
             "conseil": "Montre le ratio visuellement : 'SL = 1%, TP = 2%'. Lignes rouge et verte."},
            {"n": 3, "duree": "6s", "emoji": "💸", "type": "exemple",
             "action": "Calcule la taille de position : (capital × risque%) / distance SL = taille",
             "conseil": "Note sur l'écran : (1000 × 1%) / 50 pips = 0.2 lots. Chiffres réels."},
            {"n": 4, "duree": "5s", "emoji": "❌", "type": "conseil",
             "action": "Montre l'erreur classique : SL trop large ou ABSENT — compte qui fond",
             "conseil": "Montre une courbe d'équité qui chute de 50% sans SL. Dramatique = mémorable."},
            {"n": 5, "duree": "15s", "emoji": "🎙️", "type": "voixoff",
             "action": "Script avec les 3 règles du risk management",
             "conseil": "'1% par trade, jamais plus.' — chiffre précis = crédibilité maximale."},
            {"n": 6, "duree": "5s", "emoji": "🔗", "type": "cta",
             "action": "CTA vers captentdb.fr — calcule ton risk management",
             "conseil": "Finir sur 'protège ton capital. captentdb.fr. Lien en bio.'"},
        ],
        "apps": ["TradingView", "captentdb.fr"],
        "equipement": ["📱 Téléphone 9:16", "💡 Lumière", "📝 Tableau blanc ou annotation"],
        "ambiance": "Alerte → protection | Musique sérieuse et posée",
        "tips": ["Utilise l'exemple 'perdre 50% = besoin de 100% pour revenir' — très frappant", "Ce sujet génère beaucoup d'engagement : TOUS les traders ont perdu par mauvais RM", "Montre une vraie courbe d'équité avec vs sans gestion du risque"],
    },
    "Take Profit / Stop Loss": {
        "concept": "Où placer son TP et son SL — les niveaux logiques sur un graphique réel",
        "duree_totale": "45 secondes",
        "plans": [
            {"n": 1, "duree": "4s", "emoji": "📱", "type": "ouverture",
             "action": "Ouvre XAU/USD (Or) ou BTC avec un setup d'entrée récent",
             "conseil": "Trace d'abord l'entrée en bleu, SL en rouge, TP en vert. Ordre important."},
            {"n": 2, "duree": "8s", "emoji": "🟢", "type": "zoom",
             "action": "Montre le TP placé AVANT la prochaine résistance clé — pas dessus",
             "conseil": "'Le TP logique est toujours AVANT la résistance, pas dessus' = règle d'or."},
            {"n": 3, "duree": "6s", "emoji": "🔴", "type": "zoom",
             "action": "Montre le SL placé sous le support — là où le setup est INVALIDE",
             "conseil": "Le SL protège si le setup est faux. Pas si le prix fluctue. Nuance importante."},
            {"n": 4, "duree": "5s", "emoji": "⚖️", "type": "conseil",
             "action": "Montre le ratio TP/SL : distance TP = 2x distance SL minimum",
             "conseil": "Visualise le ratio avec les lignes de couleur sur le graphique. Simple et clair."},
            {"n": 5, "duree": "15s", "emoji": "🎙️", "type": "voixoff",
             "action": "Script avec les règles de placement SL/TP",
             "conseil": "Voix calme et assurée — ce contenu doit inspirer confiance."},
            {"n": 6, "duree": "5s", "emoji": "🔗", "type": "cta",
             "action": "CTA vers captentdb.fr",
             "conseil": "Finir sur 'apprenez à placer vos niveaux sur captentdb.fr'."},
        ],
        "apps": ["TradingView", "captentdb.fr"],
        "equipement": ["📱 Téléphone 9:16", "💡 Lumière", "🎙️ Micro"],
        "ambiance": "Structure → sécurité | Musique posée et professionnelle",
        "tips": ["L'Or (XAU/USD) est visuellement propre pour illustrer les niveaux TP/SL", "Montre un R:R 1:3 en action — l'audience comprend immédiatement la valeur"],
    },
    "Scalping": {
        "concept": "Le scalping en action — 5 trades en 1 minute chacun sur EUR/USD",
        "duree_totale": "45 secondes",
        "plans": [
            {"n": 1, "duree": "3s", "emoji": "⚡", "type": "ouverture",
             "action": "Ouvre EUR/USD 1 minute — flux de prix rapide visible immédiatement",
             "conseil": "Le 1M chart qui défile vite = hook visuel immédiat. Laisse défiler 3 secondes."},
            {"n": 2, "duree": "6s", "emoji": "🎯", "type": "zoom",
             "action": "Zoom sur un setup de scalp : rebond EMA 9 avec RSI < 35",
             "conseil": "Prépare à l'avance sur l'historique. Pas du live obligatoire."},
            {"n": 3, "duree": "5s", "emoji": "⏱️", "type": "exemple",
             "action": "Montre entrée + SL + TP serré (5-10 pips) et sortie en 2-3 minutes",
             "conseil": "Accélère la vidéo x4 pour montrer plusieurs trades rapidement."},
            {"n": 4, "duree": "5s", "emoji": "🧠", "type": "conseil",
             "action": "Montre les conditions NÉCESSAIRES : spread faible, liquidité haute, session active",
             "conseil": "EUR/USD 9h-17h CET = parfait. Crypto 24/7. Évite les actifs illiquides."},
            {"n": 5, "duree": "15s", "emoji": "🎙️", "type": "voixoff",
             "action": "Script pendant que les trades s'enchaînent rapidement",
             "conseil": "Rythme RAPIDE et énergique — colle à l'ambiance scalping."},
            {"n": 6, "duree": "5s", "emoji": "🔗", "type": "cta",
             "action": "CTA vers captentdb.fr — tous les setups de scalping",
             "conseil": "Énergie finale : 'maîtrise le scalping sur captentdb.fr — lien en bio.'"},
        ],
        "apps": ["TradingView", "MT4/MT5 (broker)", "captentdb.fr"],
        "equipement": ["📱 Téléphone 9:16", "💡 Setup bureau visible", "⌨️ Clavier trading visible (bonus)"],
        "ambiance": "Énergie → adrénaline | Musique trap ou EDM rapide",
        "tips": ["Montre ton vrai terminal de trading si possible — bien plus crédible", "Le scalping EUR/USD 9h-17h CET = l'exemple le plus pertinent", "Ajoute un disclaimer : scalping = technique avancée. Crédibilise."],
    },
    "Swing Trading": {
        "concept": "Capturer un swing de 5-10% en 3-5 jours — setup et patience nécessaires",
        "duree_totale": "45 secondes",
        "plans": [
            {"n": 1, "duree": "4s", "emoji": "📱", "type": "ouverture",
             "action": "Ouvre SPY ou BTC en timeframe 4H ou Daily — le swing se fait sur TF élevés",
             "conseil": "Montrer le TF daily/4H clairement dès l'ouverture. Ça distingue du scalping."},
            {"n": 2, "duree": "8s", "emoji": "🏄", "type": "zoom",
             "action": "Identifie une vague de swing : correction Fibonacci 50-61.8% + signal de reprise",
             "conseil": "Correction Fibo + RSI rebond = setup parfait. Montre les 2 ensemble."},
            {"n": 3, "duree": "6s", "emoji": "📅", "type": "conseil",
             "action": "Montre la durée : entrée lundi, sortie vendredi avec +7%",
             "conseil": "Swing trading = moins de stress que scalping. 1 trade par semaine."},
            {"n": 4, "duree": "5s", "emoji": "💰", "type": "exemple",
             "action": "Calcule le gain : 1 000€ × 7% = 70€ en une semaine vs 50 trades de scalp",
             "conseil": "La comparaison chiffrée scalping vs swing = très engageante et partageable."},
            {"n": 5, "duree": "15s", "emoji": "🎙️", "type": "voixoff",
             "action": "Script calme et réfléchi — contraste intentionnel avec le scalping",
             "conseil": "Voix posée et assurée. Le swing trader est 'zen', pas pressé."},
            {"n": 6, "duree": "5s", "emoji": "🔗", "type": "cta",
             "action": "CTA vers captentdb.fr — meilleurs setups de swing cette semaine",
             "conseil": "Finir sur 'les meilleures opportunités de swing cette semaine sur captentdb.fr'."},
        ],
        "apps": ["TradingView", "captentdb.fr"],
        "equipement": ["📱 Téléphone 9:16", "💡 Lumière naturelle", "🎙️ Micro de qualité"],
        "ambiance": "Sérénité → profit | Musique lo-fi douce",
        "tips": ["Montre un vrai trade de la semaine précédente — authenticité = engagement", "La correction Fibonacci est le meilleur outil pour identifier les entrées swing"],
    },
    "Day Trading": {
        "concept": "Une journée de day trading en 45 secondes — de l'ouverture à la fermeture",
        "duree_totale": "45 secondes",
        "plans": [
            {"n": 1, "duree": "4s", "emoji": "🌅", "type": "ouverture",
             "action": "Montre EUR/USD ou SPY à l'ouverture de session (9h CET ou 14h CET)",
             "conseil": "Session London (8h-12h) ou New York (14h-21h) sont les meilleures pour le day trading."},
            {"n": 2, "duree": "8s", "emoji": "📊", "type": "zoom",
             "action": "Zoom sur la première heure — identifie les niveaux clés d'ouverture",
             "conseil": "Les 30 premières minutes d'une session = les plus importantes. Montre-le."},
            {"n": 3, "duree": "6s", "emoji": "⚙️", "type": "conseil",
             "action": "Montre ta routine visuelle : check actualités, niveaux S&R, biais du jour",
             "conseil": "Une checklist visuelle est très engageante et shareable en story."},
            {"n": 4, "duree": "5s", "emoji": "📱", "type": "exemple",
             "action": "Montre 2-3 trades sur la journée avec résultat final (même un jour moyen +1%)",
             "conseil": "L'authenticité prime sur la performance. Un jour moyen honnête = plus crédible."},
            {"n": 5, "duree": "15s", "emoji": "🎙️", "type": "voixoff",
             "action": "Script sur la journée type — mélange technique ET lifestyle",
             "conseil": "Les deux aspects (technique + lifestyle) engagent l'audience en même temps."},
            {"n": 6, "duree": "5s", "emoji": "🔗", "type": "cta",
             "action": "CTA vers captentdb.fr",
             "conseil": "Finir sur 'améliorez vos sessions sur captentdb.fr — lien en bio.'"},
        ],
        "apps": ["TradingView", "MT4/MT5", "captentdb.fr"],
        "equipement": ["📱 Téléphone 9:16", "💡 Setup bureau complet (optionnel)", "🎙️ Micro"],
        "ambiance": "Journée professionnelle | Musique productive neutre",
        "tips": ["Montre TON vrai setup de trading (bureau, écrans) — humanise et engage", "Un jour perdant montré honnêtement = 3x plus d'engagement qu'un jour gagnant", "La règle '3 trades max par jour' = contenu très partagé"],
    },
}

DALLE_DESCS: dict[str, str] = {
    "RSI":                      "an RSI oscillator with glowing cyan overbought and oversold zones",
    "MACD":                     "MACD signal lines crossing with green and red histogram bars",
    "EMA":                      "multiple exponential moving average lines on a gold price chart",
    "Bollinger Bands":          "Bollinger Bands with price bouncing between the upper and lower bands",
    "Volume":                   "volume bars beneath a candlestick chart with highlighted spikes",
    "Stochastique":             "a stochastic oscillator with glowing K and D lines crossing",
    "ATR":                      "an ATR volatility indicator with glowing signal lines",
    "Ichimoku":                 "an Ichimoku cloud chart with colourful cloud and signal lines",
    "Support & Résistance":     "horizontal support and resistance lines with price bouncing off them",
    "Chandelier Japonais":      "Japanese candlestick patterns — doji, hammer, engulfing — on a dark chart",
    "Tendance":                 "an upward trending market with a clean cyan trend channel",
    "Risk Management":          "a trading risk-reward dashboard showing stop loss and take-profit levels",
    "Take Profit / Stop Loss":  "price chart with green take-profit and red stop-loss horizontal lines",
    "Scalping":                 "a 1-minute scalping chart with rapid price movements and entry signals",
    "Swing Trading":            "a daily swing trading chart with multi-day price swings highlighted",
    "Day Trading":              "a day trading monitor showing intraday price action and indicators",
}


# ── Indicator maths ────────────────────────────────────────────────────────────

def _rsi(closes: np.ndarray, period: int = 14) -> np.ndarray:
    delta = np.diff(closes.astype(float))
    gains  = np.where(delta > 0, delta, 0.0)
    losses = np.where(delta < 0, -delta, 0.0)
    rsi = np.full(len(closes), np.nan)
    if len(closes) <= period:
        return rsi
    ag = np.mean(gains[:period])
    al = np.mean(losses[:period])
    for i in range(period, len(closes) - 1):
        ag = (ag * (period - 1) + gains[i]) / period
        al = (al * (period - 1) + losses[i]) / period
        rs = ag / al if al > 0 else np.inf
        rsi[i + 1] = 100.0 - (100.0 / (1.0 + rs))
    return rsi


def _ema(closes: np.ndarray, span: int) -> np.ndarray:
    return pd.Series(closes.astype(float)).ewm(span=span, adjust=False).mean().values


def _macd(closes: np.ndarray, fast=12, slow=26, signal=9):
    line   = _ema(closes, fast) - _ema(closes, slow)
    sig    = pd.Series(line).ewm(span=signal, adjust=False).mean().values
    hist   = line - sig
    return line, sig, hist


def _bollinger(closes: np.ndarray, period=20, k=2.0):
    s   = pd.Series(closes.astype(float))
    mid = s.rolling(period).mean().values
    std = s.rolling(period).std().values
    return mid + k * std, mid, mid - k * std


def _stoch(closes: np.ndarray, period=14):
    kline = np.full(len(closes), np.nan)
    for i in range(period - 1, len(closes)):
        lo = closes[i - period + 1: i + 1].min()
        hi = closes[i - period + 1: i + 1].max()
        kline[i] = 100.0 * (closes[i] - lo) / (hi - lo) if hi > lo else 50.0
    dline = pd.Series(kline).rolling(3).mean().values
    return kline, dline


# ── Matplotlib helpers ─────────────────────────────────────────────────────────

def _style(ax):
    ax.set_facecolor(BG)
    ax.tick_params(colors=TEXT, labelsize=7)
    for sp in ax.spines.values():
        sp.set_edgecolor(MUTED)
    ax.yaxis.tick_right()
    ax.yaxis.set_label_position("right")


def _candlesticks(ax, df: pd.DataFrame):
    o = df["Open"].values
    h = df["High"].values
    l = df["Low"].values
    c = df["Close"].values
    n = len(df)
    x = np.arange(n)
    w = 0.6
    for i in range(n):
        col = GREEN if c[i] >= o[i] else RED
        ax.plot([x[i], x[i]], [l[i], h[i]], color=col, lw=0.8)
        bh = max(abs(c[i] - o[i]), (h[i] - l[i]) * 0.005)
        rect = Rectangle((x[i] - w/2, min(o[i], c[i])), w, bh,
                          fc=col, ec=col, alpha=0.88)
        ax.add_patch(rect)
    ax.set_xlim(-1, n)
    ax.set_ylim(l.min() * 0.998, h.max() * 1.002)


def _watermark(fig):
    fig.text(0.98, 0.01, "captentdb.fr", ha="right", va="bottom",
             color="white", alpha=0.18, fontsize=8, fontstyle="italic")


def _fig_to_b64(fig, dpi=100) -> str:
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=dpi, bbox_inches="tight", facecolor=BG)
    plt.close(fig)
    buf.seek(0)
    return "data:image/png;base64," + base64.b64encode(buf.read()).decode()


def _demo(topic: str, fmt: str) -> str:
    """Synthetic sine-wave chart when real data is unavailable."""
    figsize = FMT_FIGSIZE.get(fmt, FMT_FIGSIZE["portrait"])
    fig, ax = plt.subplots(figsize=figsize, facecolor=BG)
    _style(ax)
    t = np.linspace(0, 4 * np.pi, 120)
    p = 100 + 10 * np.sin(t) + np.cumsum(np.random.randn(120) * 0.3)
    ax.plot(p, color=BLUE, lw=1.5)
    ax.set_title(f"{topic} — démo (données indisponibles)", color=TEXT, fontsize=9, pad=6, loc="left")
    _watermark(fig)
    return _fig_to_b64(fig)


# ── Core chart generator (importable by content_factory.py for ZIP) ────────────

async def generate_chart_b64(topic: str, fmt: str = "portrait", dpi: int = 100) -> tuple[str, str]:
    """Return (base64_png_data_url, source_label)."""
    import yfinance as yf

    symbol    = TOPIC_SYMBOLS.get(topic, "BTC-USD")
    indicator = TOPIC_INDICATOR.get(topic, "rsi")
    figsize   = FMT_FIGSIZE.get(fmt, FMT_FIGSIZE["portrait"])

    try:
        df = yf.Ticker(symbol).history(period="1mo", interval="1d")
        if df.empty or len(df) < 15:
            raise ValueError("too little data")
    except Exception:
        return _demo(topic, fmt), "demo"

    closes = df["Close"].values
    n      = len(df)
    x      = np.arange(n)

    try:
        fig = plt.figure(figsize=figsize, facecolor=BG)
        sym_label = symbol.replace("-USD", "").replace("=X", "").replace("=F", "")

        if indicator in ("rsi", "default"):
            gs   = gridspec.GridSpec(3, 1, height_ratios=[3, 1.5, .05], hspace=0.1, figure=fig)
            ax_p = fig.add_subplot(gs[0])
            ax_r = fig.add_subplot(gs[1], sharex=ax_p)
            _candlesticks(ax_p, df)
            _style(ax_p)
            plt.setp(ax_p.get_xticklabels(), visible=False)
            rsi_v = _rsi(closes)
            ax_r.plot(x, rsi_v, color=GREEN, lw=1.5)
            ax_r.axhline(70, color=RED,   ls="--", alpha=0.7, lw=1)
            ax_r.axhline(30, color=GREEN, ls="--", alpha=0.7, lw=1)
            ax_r.fill_between(x, rsi_v, 70, where=(rsi_v > 70),  alpha=0.15, color=RED)
            ax_r.fill_between(x, rsi_v, 30, where=(rsi_v < 30),  alpha=0.15, color=GREEN)
            _style(ax_r)
            ax_r.set_ylim(0, 100)
            ax_r.set_yticks([30, 50, 70])
            ax_r.set_ylabel("RSI(14)", color=TEXT, fontsize=7)

        elif indicator == "macd":
            gs   = gridspec.GridSpec(3, 1, height_ratios=[3, 1.5, .05], hspace=0.1, figure=fig)
            ax_p = fig.add_subplot(gs[0])
            ax_m = fig.add_subplot(gs[1], sharex=ax_p)
            _candlesticks(ax_p, df)
            _style(ax_p)
            plt.setp(ax_p.get_xticklabels(), visible=False)
            ml, sl, hl = _macd(closes)
            ax_m.plot(x, ml, color=BLUE,   lw=1.3, label="MACD")
            ax_m.plot(x, sl, color=YELLOW, lw=1.3, label="Signal")
            bar_c = [GREEN if h >= 0 else RED for h in hl]
            ax_m.bar(x, hl, color=bar_c, alpha=0.75, width=0.8)
            ax_m.axhline(0, color=MUTED, lw=0.8)
            _style(ax_m)
            ax_m.set_ylabel("MACD", color=TEXT, fontsize=7)

        elif indicator == "bollinger":
            gs   = gridspec.GridSpec(2, 1, height_ratios=[4, .05], hspace=0.05, figure=fig)
            ax_p = fig.add_subplot(gs[0])
            _candlesticks(ax_p, df)
            _style(ax_p)
            up, mid, lo = _bollinger(closes)
            ax_p.plot(x, up,  color=BLUE,   lw=1.2, ls="--", alpha=0.85)
            ax_p.plot(x, mid, color=YELLOW, lw=1.2, alpha=0.85)
            ax_p.plot(x, lo,  color=BLUE,   lw=1.2, ls="--", alpha=0.85)
            ax_p.fill_between(x, up, lo, alpha=0.06, color=BLUE)

        elif indicator == "ema":
            gs   = gridspec.GridSpec(2, 1, height_ratios=[4, .05], hspace=0.05, figure=fig)
            ax_p = fig.add_subplot(gs[0])
            _candlesticks(ax_p, df)
            _style(ax_p)
            ax_p.plot(x, _ema(closes, 9),  color=GREEN,  lw=1.5, label="EMA 9")
            ax_p.plot(x, _ema(closes, 21), color=BLUE,   lw=1.5, label="EMA 21")
            if n >= 50:
                ax_p.plot(x, _ema(closes, 50), color=YELLOW, lw=1.5, label="EMA 50")
            ax_p.legend(fontsize=6, loc="upper left", facecolor=BG, labelcolor=TEXT,
                        framealpha=0.7, edgecolor=MUTED)

        elif indicator == "stochastic":
            gs   = gridspec.GridSpec(3, 1, height_ratios=[3, 1.5, .05], hspace=0.1, figure=fig)
            ax_p = fig.add_subplot(gs[0])
            ax_s = fig.add_subplot(gs[1], sharex=ax_p)
            _candlesticks(ax_p, df)
            _style(ax_p)
            plt.setp(ax_p.get_xticklabels(), visible=False)
            k, d = _stoch(closes)
            ax_s.plot(x, k, color=BLUE,   lw=1.3, label="%K")
            ax_s.plot(x, d, color=YELLOW, lw=1.3, label="%D")
            ax_s.axhline(80, color=RED,   ls="--", alpha=0.7, lw=1)
            ax_s.axhline(20, color=GREEN, ls="--", alpha=0.7, lw=1)
            _style(ax_s)
            ax_s.set_ylim(0, 100)
            ax_s.set_ylabel("Stoch", color=TEXT, fontsize=7)

        elif indicator == "volume":
            gs   = gridspec.GridSpec(3, 1, height_ratios=[3, 1.5, .05], hspace=0.1, figure=fig)
            ax_p = fig.add_subplot(gs[0])
            ax_v = fig.add_subplot(gs[1], sharex=ax_p)
            _candlesticks(ax_p, df)
            _style(ax_p)
            plt.setp(ax_p.get_xticklabels(), visible=False)
            vols  = df["Volume"].values
            vcols = [GREEN if df["Close"].values[i] >= df["Open"].values[i] else RED for i in range(n)]
            ax_v.bar(x, vols, color=vcols, alpha=0.75, width=0.8)
            _style(ax_v)
            ax_v.set_ylabel("Volume", color=TEXT, fontsize=7)
            ax_v.yaxis.set_major_formatter(
                mticker.FuncFormatter(lambda v, _: f"{v/1e6:.1f}M" if v >= 1e6 else f"{v/1e3:.0f}K")
            )

        elif indicator == "atr":
            gs   = gridspec.GridSpec(3, 1, height_ratios=[3, 1.5, .05], hspace=0.1, figure=fig)
            ax_p = fig.add_subplot(gs[0])
            ax_a = fig.add_subplot(gs[1], sharex=ax_p)
            _candlesticks(ax_p, df)
            _style(ax_p)
            plt.setp(ax_p.get_xticklabels(), visible=False)
            h  = df["High"].values
            l  = df["Low"].values
            c  = df["Close"].values
            tr = np.maximum(h - l, np.maximum(abs(h - np.roll(c, 1)), abs(l - np.roll(c, 1))))
            tr[0] = h[0] - l[0]
            atr = pd.Series(tr).rolling(14).mean().values
            ax_a.plot(x, atr, color=YELLOW, lw=1.5)
            _style(ax_a)
            ax_a.set_ylabel("ATR(14)", color=TEXT, fontsize=7)

        elif indicator == "sr":
            gs   = gridspec.GridSpec(2, 1, height_ratios=[4, .05], hspace=0.05, figure=fig)
            ax_p = fig.add_subplot(gs[0])
            _candlesticks(ax_p, df)
            _style(ax_p)
            period = max(5, n // 4)
            res    = pd.Series(df["High"].values).rolling(period).max().iloc[-1]
            sup    = pd.Series(df["Low"].values).rolling(period).min().iloc[-1]
            ax_p.axhline(res, color=RED,   ls="--", lw=1.8, alpha=0.85, label="Résistance")
            ax_p.axhline(sup, color=GREEN, ls="--", lw=1.8, alpha=0.85, label="Support")
            ax_p.legend(fontsize=7, loc="upper left", facecolor=BG, labelcolor=TEXT,
                        framealpha=0.7, edgecolor=MUTED)

        else:  # candles / generic — just price
            gs   = gridspec.GridSpec(2, 1, height_ratios=[4, .05], hspace=0.05, figure=fig)
            ax_p = fig.add_subplot(gs[0])
            _candlesticks(ax_p, df)
            _style(ax_p)

        # Title on first axes
        first_ax = fig.axes[0]
        first_ax.set_title(f"{topic} — {sym_label} (30j)", color=TEXT, fontsize=9, pad=6, loc="left")
        _watermark(fig)

        buf = io.BytesIO()
        fig.savefig(buf, format="png", dpi=dpi, bbox_inches="tight", facecolor=BG)
        plt.close(fig)
        buf.seek(0)
        return "data:image/png;base64," + base64.b64encode(buf.read()).decode(), "yfinance+matplotlib"

    except Exception as exc:
        print(f"[Visuals] chart error for {topic}: {exc}")
        plt.close("all")
        return _demo(topic, fmt), "demo"


# ── Animated GIF helper (also importable) ─────────────────────────────────────

async def generate_animated_gif_b64(topic: str, fmt: str = "portrait") -> tuple[str | None, str]:
    """Progressive-reveal animated GIF of the static chart (Pillow-based, fast)."""
    try:
        from PIL import Image as PILImage, ImageDraw as PILDraw
    except ImportError:
        return None, "unavailable"

    data_url, source = await generate_chart_b64(topic, fmt, dpi=72)
    if not data_url or not data_url.startswith("data:image/"):
        return None, "error"

    raw = base64.b64decode(data_url.split(",", 1)[1])
    img = PILImage.open(io.BytesIO(raw)).convert("RGB")
    w, h = img.size

    bg_np     = np.array([10, 14, 26],   dtype=np.float32)   # #0A0E1A
    accent    = (99, 140, 255)                                 # #638CFF cursor

    n_reveal   = 22
    hold_extra = 8
    frames: list[PILImage.Image] = []

    img_arr = np.array(img, dtype=np.float32)

    for i in range(n_reveal):
        progress  = 0.15 + 0.85 * (i / (n_reveal - 1))
        reveal_x  = int(w * progress)
        frame_arr = img_arr.copy()

        if reveal_x < w:
            # Darken unrevealed region
            frame_arr[:, reveal_x:, :] = (
                frame_arr[:, reveal_x:, :] * 0.12 + bg_np * 0.88
            )
            frame = PILImage.fromarray(frame_arr.astype(np.uint8))
            # Glowing cursor line
            draw = PILDraw.Draw(frame)
            cx   = min(reveal_x, w - 1)
            draw.line([(cx, 0), (cx, h)], fill=accent, width=2)
        else:
            frame = PILImage.fromarray(frame_arr.astype(np.uint8))

        frames.append(frame)

    for _ in range(hold_extra):
        frames.append(frames[-1])

    buf = io.BytesIO()
    frames[0].save(
        buf, format="GIF", save_all=True, append_images=frames[1:],
        duration=80, loop=0, optimize=False,
    )
    buf.seek(0)
    return "data:image/gif;base64," + base64.b64encode(buf.read()).decode(), source + "+animated"


# ── Screenshot helper (also importable) ───────────────────────────────────────

async def take_screenshot_b64(page_slug: str, fmt: str = "portrait") -> tuple[str | None, str, str | None]:
    """Return (base64_png_or_None, source, error_or_None)."""
    dims = {"portrait": (1080, 1920), "landscape": (1920, 1080), "square": (1080, 1080)}
    w, h = dims.get(fmt, dims["portrait"])
    url  = "https://captentdb.fr" + (page_slug or "/")
    preview_token = os.getenv("PREVIEW_TOKEN", "")
    try:
        from playwright.async_api import async_playwright
        async with async_playwright() as p:
            browser = await p.chromium.launch(args=["--no-sandbox", "--disable-setuid-sandbox"])
            page    = await browser.new_page()
            await page.set_viewport_size({"width": w, "height": h})
            if preview_token:
                await page.context.add_cookies([{
                    "name": "cf_preview_token", "value": preview_token,
                    "domain": "captentdb.fr", "path": "/",
                }])
            try:
                await page.goto(url, timeout=15_000, wait_until="networkidle")
            except Exception:
                await page.goto(url, timeout=15_000, wait_until="load")
            raw = await page.screenshot(full_page=False, type="png")
            await browser.close()
        return "data:image/png;base64," + base64.b64encode(raw).decode(), "playwright", None
    except ImportError:
        return None, "unavailable", "Playwright non installé. Exécutez : pip install playwright && playwright install chromium"
    except Exception as exc:
        return None, "unavailable", str(exc)


# ── AI image helper (also importable) ─────────────────────────────────────────

async def generate_ai_image_b64(topic: str) -> tuple[str | None, str, str]:
    """Return (base64_png_or_None, prompt, source)."""
    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        return None, "", "unavailable"
    desc   = DALLE_DESCS.get(topic, f"professional trading chart about {topic}")
    prompt = (
        f"Dark fintech aesthetic, vertical format 9:16. "
        f"Professional trading dashboard showing {desc}. "
        f"Deep navy blue background (#0A0E1A), glowing cyan and purple neon accents. "
        f"Clean modern UI with financial charts, no text, no watermarks. "
        f"Cinematic lighting, ultra-sharp professional fintech screenshot aesthetic."
    )
    try:
        import openai as _openai
        client   = _openai.AsyncOpenAI(api_key=api_key)
        response = await client.images.generate(
            model="dall-e-3", prompt=prompt,
            size="1024x1792", quality="hd", style="natural", n=1,
        )
        img_url = response.data[0].url
        async with httpx.AsyncClient(timeout=30.0) as http:
            raw = await http.get(img_url)
        return "data:image/png;base64," + base64.b64encode(raw.content).decode(), prompt, "dall-e-3"
    except Exception:
        return None, prompt, "unavailable"


# ── Pydantic ──────────────────────────────────────────────────────────────────

class VisualBody(BaseModel):
    topic:    Optional[str] = None
    category: Optional[str] = None


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/pieces/{piece_id}/chart")
async def endpoint_chart(
    piece_id: str,
    body: VisualBody,
    format: str = Query("portrait", pattern="^(portrait|landscape|square)$"),
    animated: bool = Query(False),
    current_user: dict = Depends(get_admin_user),
):
    topic = body.topic
    if not topic and piece_id != "preview":
        rows = await execute_query("SELECT topic FROM content_pieces WHERE id = ?", (piece_id,))
        if rows:
            topic = rows[0]["topic"]
    t = topic or "RSI"
    if animated:
        image, source = await generate_animated_gif_b64(t, format)
        return {"image": image, "source": source, "animated": True}
    image, source = await generate_chart_b64(t, format)
    return {"image": image, "source": source, "animated": False}


@router.post("/pieces/{piece_id}/screenshot")
async def endpoint_screenshot(
    piece_id: str,
    body: VisualBody,
    format: str = Query("portrait", pattern="^(portrait|landscape|square)$"),
    current_user: dict = Depends(get_admin_user),
):
    page_slug = "/"
    if piece_id != "preview":
        rows = await execute_query(
            "SELECT site_page_url FROM content_pieces WHERE id = ?", (piece_id,)
        )
        if rows and rows[0].get("site_page_url"):
            page_slug = rows[0]["site_page_url"]
    image, source, error = await take_screenshot_b64(page_slug, format)
    resp: dict = {"image": image, "source": source}
    if error:
        resp["error"] = error
    return resp


@router.get("/pieces/{piece_id}/stock-photos")
async def endpoint_stock_photos(
    piece_id: str,
    current_user: dict = Depends(get_admin_user),
):
    topic = None
    if piece_id != "preview":
        rows = await execute_query("SELECT topic FROM content_pieces WHERE id = ?", (piece_id,))
        if rows:
            topic = rows[0]["topic"]
    # Use V2 multi-query for more relevant results (up to 2 queries, deduplicated)
    queries_v2  = UNSPLASH_QUERIES_V2.get(topic or "", ["fintech financial technology trading"])
    query_main  = queries_v2[0]
    query_extra = queries_v2[1] if len(queries_v2) > 1 else None
    api_key     = os.getenv("UNSPLASH_ACCESS_KEY", "")
    if not api_key:
        return {"photos": [], "error": "UNSPLASH_ACCESS_KEY non configuré", "query": query_main}
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp1 = await client.get(
                "https://api.unsplash.com/search/photos",
                params={"query": query_main, "orientation": "portrait", "per_page": 6},
                headers={"Authorization": f"Client-ID {api_key}"},
            )
            results: list[dict] = []
            if resp1.status_code == 200:
                results += resp1.json().get("results", [])
            # Second targeted query if available and we have quota
            if query_extra and len(results) < 9:
                resp2 = await client.get(
                    "https://api.unsplash.com/search/photos",
                    params={"query": query_extra, "orientation": "portrait", "per_page": 6},
                    headers={"Authorization": f"Client-ID {api_key}"},
                )
                if resp2.status_code == 200:
                    seen_ids = {r["id"] for r in results}
                    results += [r for r in resp2.json().get("results", []) if r["id"] not in seen_ids]

        photos = [
            {
                "id":         p["id"],
                "url":        p["urls"]["regular"],
                "thumb":      p["urls"]["thumb"],
                "credit":     p["user"]["name"],
                "credit_url": p["user"]["links"]["html"],
            }
            for p in results[:12]
        ]
        return {"photos": photos, "query": query_main}
    except Exception as exc:
        return {"photos": [], "error": str(exc)}


@router.post("/pieces/{piece_id}/ai-image")
async def endpoint_ai_image(
    piece_id: str,
    body: VisualBody,
    current_user: dict = Depends(get_admin_user),
):
    topic = body.topic
    if not topic and piece_id != "preview":
        rows = await execute_query("SELECT topic FROM content_pieces WHERE id = ?", (piece_id,))
        if rows:
            topic = rows[0]["topic"]
    if not topic:
        topic = "RSI"

    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        return {"image": None, "source": "unavailable", "error": "OPENAI_API_KEY non configuré"}

    desc   = DALLE_DESCS.get(topic, f"professional trading chart about {topic}")
    prompt = (
        f"Dark fintech aesthetic, vertical format 9:16. "
        f"Professional trading dashboard showing {desc}. "
        f"Deep navy blue background (#0A0E1A), glowing cyan and purple neon accents. "
        f"Clean modern UI with financial charts, no text, no watermarks. "
        f"Cinematic lighting, ultra-sharp professional fintech screenshot aesthetic."
    )
    try:
        import openai as _openai
        client   = _openai.AsyncOpenAI(api_key=api_key)
        response = await client.images.generate(
            model="dall-e-3", prompt=prompt,
            size="1024x1792", quality="hd", style="natural", n=1,
        )
        img_url = response.data[0].url
        async with httpx.AsyncClient(timeout=30.0) as http:
            raw = await http.get(img_url)
        image = "data:image/png;base64," + base64.b64encode(raw.content).decode()
        return {"image": image, "source": "dall-e-3", "prompt": prompt}
    except ImportError:
        return {"image": None, "source": "unavailable", "error": "Package openai non installé"}
    except Exception as exc:
        return {"image": None, "source": "unavailable", "error": str(exc)}


@router.post("/pieces/{piece_id}/screencast")
async def endpoint_screencast(
    piece_id: str,
    body: VisualBody,
    current_user: dict = Depends(get_admin_user),
):
    return {
        "video": None,
        "source": "unavailable",
        "error": "Le screencast nécessite ffmpeg + Chromium. Disponible prochainement.",
    }


_DEFAULT_GUIDE: dict = {
    "concept": "Tournage d'une vidéo pédagogique sur le trading",
    "duree_totale": "45 secondes",
    "plans": [
        {"n": 1, "duree": "5s", "emoji": "📱", "type": "ouverture",
         "action": "Ouvre TradingView sur le graphique du sous-jacent en mode portrait",
         "conseil": "Mode sombre, orientation 9:16"},
        {"n": 2, "duree": "10s", "emoji": "🔍", "type": "zoom",
         "action": "Zoom sur la zone d'intérêt du graphique",
         "conseil": "Montre clairement l'indicateur en action"},
        {"n": 3, "duree": "15s", "emoji": "💡", "type": "explication",
         "action": "Pointe le signal clé avec ton doigt ou un stylet",
         "conseil": "Explique la signification du signal"},
        {"n": 4, "duree": "10s", "emoji": "✅", "type": "conclusion",
         "action": "Montre le résultat ou la décision de trading",
         "conseil": "Conclure avec un call-to-action clair"},
    ],
    "apps": ["TradingView (gratuit)", "captentdb.fr"],
    "equipement": ["📱 Téléphone portrait 9:16", "💡 Bonne lumière naturelle ou ring light"],
    "ambiance": "Professionnel et pédagogique | Musique lo-fi douce",
    "tips": [
        "Utilise un vrai signal récent pour plus de crédibilité",
        "Active les sous-titres automatiques dans TikTok/Reels",
    ],
}


@router.get("/pieces/{piece_id}/filming-guide")
async def endpoint_filming_guide(
    piece_id: str,
    topic: Optional[str] = Query(None),
    current_user: dict = Depends(get_admin_user),
):
    if not topic and piece_id != "preview":
        rows = await execute_query("SELECT topic FROM content_pieces WHERE id = ?", (piece_id,))
        if rows:
            topic = rows[0]["topic"]
    resolved_topic = topic or "RSI"
    guide = FILMING_GUIDES.get(resolved_topic, _DEFAULT_GUIDE)
    return {"topic": resolved_topic, "guide": guide}
