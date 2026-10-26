#!/usr/bin/env python3
"""Vérifie chaque correspondance TradingView contre leur résolveur public.

À lancer après toute modification de web/frontend/src/lib/tradingViewSymbol.ts.

Pourquoi ce script existe : le widget TradingView ne signale pas un symbole
inconnu. Il charge silencieusement son actif par défaut — en pratique Apple.
Une correspondance fausse ne casse donc rien de visible : elle affiche le
graphique d'un AUTRE actif à côté de notre analyse, ce qu'aucun utilisateur ne
peut détecter. La table a été écrite de mémoire une première fois : 14 des 30
entrées étaient fausses, dont toutes les matières premières.

    python3 scripts/verify-tradingview.py

Sortie : une ligne par correspondance, puis la liste des échecs. Le script ne
corrige rien — il dit seulement ce que TradingView accepte.
"""
import json, subprocess, urllib.parse, re, sys, time

def search(text, exchange=""):
    url = ("https://symbol-search.tradingview.com/symbol_search/?text="
           + urllib.parse.quote(text) + "&exchange=" + urllib.parse.quote(exchange) + "&type=")
    try:
        out = subprocess.run(["curl","-s","--max-time","25",url,
                              "-H","Origin: https://www.tradingview.com"],
                             capture_output=True, text=True, timeout=35).stdout
        return json.loads(out)
    except Exception:
        return []

def clean(s): return re.sub(r"</?em>", "", s or "")

def resolves(full):
    """Vrai si TradingView connaît exactement ce BOURSE:SYMBOLE."""
    if ":" in full:
        ex, sym = full.split(":", 1)
    else:
        ex, sym = "", full
    for r in search(sym, ex):
        if clean(r.get("symbol","")).upper() != sym.upper():
            continue
        prefix = (r.get("prefix") or "").upper()
        exch = (r.get("exchange") or "").upper()
        if not ex:
            return True, f"{exch}:{sym}"
        if ex.upper() in (prefix, exch) or exch.startswith(ex.upper()):
            return True, full
    return False, None

# Toutes les correspondances déclarées dans le fichier source.
import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(ROOT, "web/frontend/src/lib/tradingViewSymbol.ts")).read()
pairs = re.findall(r'"([^"]+)":\s*"([A-Z0-9_]+:[A-Z0-9!.]+)"', src)
print(f"{len(pairs)} correspondances declarees\n")
bad = []
for yahoo, tv in pairs:
    ok, canon = resolves(tv)
    flag = "OK   " if ok else "ECHEC"
    print(f"  {flag} {yahoo:12} -> {tv}")
    if not ok: bad.append((yahoo, tv))
    time.sleep(0.15)
print(f"\n{len(bad)} en echec :", [b[1] for b in bad])
