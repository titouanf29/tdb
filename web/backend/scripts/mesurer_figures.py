"""Les figures chartistes annoncent-elles quelque chose ? La mesure qui en décide.

Ce script produit les chiffres de `STATISTIQUES` dans api/routes/_figures.py.
Il se relance à l'identique : python scripts/mesurer_figures.py

LA MÉTHODE, et chaque choix y est là pour éviter une erreur précise.

  · Chaque figure est prise à `i_connu`, la première bougie où elle était
    réellement visible — jamais à sa cassure si les pivots n'étaient pas
    encore confirmés. (Vérifié par scripts/valider_figures.py : sur une
    marche aléatoire, les figures réussissent 50,4 % du temps, soit le
    hasard exact. La détection ne voit pas l'avenir.)

  · LE REPÈRE DU HASARD EST CALCULÉ SUR LA MÊME PÉRIODE ET PAR SENS. Sur dix
    ans très haussiers, le prix monte 58,8 % du temps à 20 séances : une
    figure haussière doit battre 58,8 %, une baissière 41,2 %. Sans ce repère,
    la simple tendance du marché passe pour du talent.

  · DEUX PÉRIODES SÉPARÉES. L'historique de chaque actif est coupé en deux
    moitiés. Une figure n'est dite « meilleure que le hasard » que si l'écart
    dépasse DEUX ERREURS-TYPES DANS CHACUNE DES DEUX. Avec neuf figures
    testées, une sur vingt franchirait le seuil par chance sur une période
    unique ; l'exiger deux fois de suite protège de ce faux positif.

  · PLUSIEURS RÉGLAGES. La mesure est refaite avec des voisinages de pivots
    différents. Un verdict qui ne tient qu'avec un réglage précis est un
    réglage, pas une découverte.
"""
from __future__ import annotations

import asyncio
import json
import sys
from collections import defaultdict
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from api.routes._prices import fetch_ohlcv  # noqa: E402
from api.routes._figures import detecter  # noqa: E402

PANEL = [
    "AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "TSLA", "JPM", "XOM", "KO",
    "MC.PA", "OR.PA", "TTE.PA", "SAN.PA", "AIR.PA", "SAP.DE", "SIE.DE", "ASML.AS",
    "^GSPC", "^IXIC", "^FCHI", "^GDAXI", "SPY", "QQQ",
    "GC=F", "CL=F", "SI=F", "EURUSD=X", "GBPUSD=X",
    "BTC-USD", "ETH-USD",
]
H = 20
VOISINAGES = [5, 8, 12]
SORTIE = Path(__file__).resolve().parent / "figures_mesure.json"


def barriere(high, low, i, objectif, invalidation, sens, h_max=40):
    if objectif is None or invalidation is None:
        return None
    for j in range(i + 1, min(i + h_max + 1, len(high))):
        if sens == "haussier":
            if low[j] <= invalidation:
                return -1
            if high[j] >= objectif:
                return 1
        else:
            if high[j] >= invalidation:
                return -1
            if low[j] <= objectif:
                return 1
    return 0


def nouvel_acc():
    return {"n": 0, "ok": 0, "gain": [], "barr": defaultdict(int)}


async def charger():
    series = {}
    for sym in PANEL:
        try:
            df = await fetch_ohlcv(sym, period="10y", interval="1d")
        except Exception as e:  # pragma: no cover - réseau
            print(f"  {sym}: indisponible ({str(e)[:40]})")
            continue
        if df is not None and len(df) >= 400:
            series[sym] = df
    return series


def mesurer(series, k):
    """Par (figure, période) : cas, réussites, gains ; et le repère par période."""
    fig = defaultdict(nouvel_acc)            # (cle, periode) -> acc
    repere = defaultdict(lambda: [0, 0])     # periode -> [hausses, total]
    for df in series.values():
        close = df["Close"].to_numpy(float)
        high = df["High"].to_numpy(float)
        low = df["Low"].to_numpy(float)
        milieu = len(close) // 2
        periode = lambda i: "A" if i < milieu else "B"  # noqa: E731
        for i in range(0, len(close) - H - 1, 3):
            r = close[i + H] / close[i] - 1
            repere[periode(i)][0] += r > 0
            repere[periode(i)][1] += 1
        for f in detecter(df, k=k):
            i = f["i_connu"]
            if i + H >= len(close):
                continue
            r = close[i + H] / close[i] - 1
            signe = 1 if f["sens"] == "haussier" else -1
            for cle_p in ((f["cle"], periode(i)), (f["cle"], "T")):
                a = fig[cle_p]
                a["n"] += 1
                a["ok"] += (r * signe) > 0
                a["gain"].append(r * signe)
                b = barriere(high, low, i, f["objectif"], f["invalidation"], f["sens"])
                if b is not None:
                    a["barr"][b] += 1
    repere["T"] = [repere["A"][0] + repere["B"][0], repere["A"][1] + repere["B"][1]]
    return fig, repere


def ecart(acc, repere_p, sens):
    """Écart au hasard en points, et son erreur-type."""
    if acc["n"] == 0:
        return None, None
    base = repere_p[0] / repere_p[1]
    if sens == "baissier":
        base = 1 - base
    taux = acc["ok"] / acc["n"]
    se = np.sqrt(base * (1 - base) / acc["n"])
    return (taux - base) * 100, se * 100


SENS = {
    "double_sommet": "baissier", "double_creux": "haussier",
    "ete": "baissier", "ete_inversee": "haussier",
    "triangle_ascendant": "haussier", "triangle_descendant": "baissier",
    "triangle_symetrique": None,  # le sens vient de la sortie ; repère mixte
    "drapeau_haussier": "haussier", "drapeau_baissier": "baissier",
}


async def main():
    series = await charger()
    bougies = sum(len(d) for d in series.values())
    print(f"{len(series)} actifs, {bougies:,} bougies\n".replace(",", " "))

    resultats = {}
    for k in VOISINAGES:
        fig, repere = mesurer(series, k)
        resultats[k] = (fig, repere)

    fig, repere = resultats[8]
    base_t = repere["T"][0] / repere["T"][1] * 100
    print(f"Repère : le prix monte {base_t:.1f} % du temps à {H} séances "
          f"(période A {repere['A'][0]/repere['A'][1]*100:.1f} %, "
          f"période B {repere['B'][0]/repere['B'][1]*100:.1f} %)\n")

    tableau = {}
    print(f"{'figure':<22}{'cas':>6}{'sens ok':>9}{'écart':>9}{'  ± 2σ':>8}"
          f"{'  A':>8}{'  B':>8}   {'k=5':>7}{'k=12':>7}   objectif/invalid.   verdict")
    for cle, sens in SENS.items():
        t = fig.get((cle, "T"))
        if not t or t["n"] == 0:
            continue
        # Le triangle symétrique n'a pas de sens a priori : on l'évalue
        # contre le repère haussier ou baissier selon sa sortie, ce qui
        # revient à comparer au hasard pondéré de ses propres sorties.
        s_eff = sens or "haussier"
        e_t, se_t = ecart(t, repere["T"], s_eff)
        e_a, se_a = ecart(fig[(cle, "A")], repere["A"], s_eff)
        e_b, se_b = ecart(fig[(cle, "B")], repere["B"], s_eff)
        e_k5, _ = ecart(resultats[5][0][(cle, "T")], resultats[5][1]["T"], s_eff)
        e_k12, _ = ecart(resultats[12][0][(cle, "T")], resultats[12][1]["T"], s_eff)
        b = t["barr"]
        tot = b[1] + b[-1] + b[0] or 1

        if t["n"] < 100:
            verdict = "trop_peu"
        elif (e_a is not None and e_b is not None and se_a and se_b
              and e_a > 2 * se_a and e_b > 2 * se_b):
            verdict = "favorable"
        elif (e_a is not None and e_b is not None and se_a and se_b
              and e_a < -2 * se_a and e_b < -2 * se_b):
            verdict = "defavorable"
        else:
            verdict = "neutre"

        fmt = lambda v: "   —" if v is None else f"{v:+6.1f}"  # noqa: E731
        print(f"{cle:<22}{t['n']:>6}{t['ok']/t['n']*100:>8.1f}%{fmt(e_t):>9}{2*se_t:>7.1f}"
              f"{fmt(e_a):>8}{fmt(e_b):>8}   {fmt(e_k5):>7}{fmt(e_k12):>7}   "
              f"{b[1]/tot*100:5.1f} / {b[-1]/tot*100:5.1f} %    {verdict}")
        tableau[cle] = {
            "n": t["n"],
            "sens_20": round(t["ok"] / t["n"] * 100, 1),
            "ecart": round(e_t, 1),
            "erreur_type": round(se_t, 1),
            "ecart_A": round(e_a, 1) if e_a is not None else None,
            "ecart_B": round(e_b, 1) if e_b is not None else None,
            "moy_20": round(float(np.mean(t["gain"])) * 100, 2),
            "objectif": round(b[1] / tot * 100, 1),
            "invalide": round(b[-1] / tot * 100, 1),
            "verdict": verdict,
        }

    SORTIE.write_text(json.dumps({
        "actifs": len(series), "bougies": bougies,
        "figures": sum(v["n"] for v in tableau.values()),
        "base_hausse_20": round(base_t, 1),
        "tableau": tableau,
    }, indent=1, ensure_ascii=False))
    print(f"\n→ {SORTIE}")


if __name__ == "__main__":
    asyncio.run(main())
