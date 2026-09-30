"""Analyse de la mesure du moteur de structure (voir mesurer_structure.py).

    python scripts/analyser_structure.py structure_1d.pkl [structure_1w.pkl …]

Trois périodes successives (40 % / 30 % / 30 % de l'historique de chaque
actif). Aucun réglage n'a été choisi sur les données : les périodes 2 et 3
sont donc toutes deux hors échantillon. Un effet n'est retenu que s'il garde
son signe ET dépasse deux erreurs-types sur les périodes 2 ET 3.

CHEVAUCHEMENT. Les dates rejouées se suivent de près (tous les `pas`
bougies) alors que l'horizon mesuré en couvre `k` : deux observations
voisines partagent presque tout leur avenir. L'erreur-type naïve est donc
trop petite ; elle est multipliée par √(k / pas) — sans cette correction,
des effets de hasard passaient le seuil.

    python scripts/analyser_structure.py structure_1d.pkl:2 structure_1w.pkl:1 …
"""
import sys
import numpy as np
import pandas as pd

PER = [("P1", 0, .4), ("P2", .4, .7), ("P3", .7, 1.01)]


def classe(s):
    s = s.upper()
    if s.endswith("-USD"): return "crypto"
    if s.endswith("=X"): return "fx"
    if s.endswith("=F"): return "matieres"
    if s.startswith("^") or s in ("SPY", "QQQ"): return "indices"
    return "actions"


PAS, HZ = 1, 20      # fixés par fichier


def gonfle(col):
    """√(horizon / pas) : le facteur de chevauchement de la colonne."""
    k = int(col[3:]) if col.startswith("fwd") else HZ
    return np.sqrt(max(1.0, k / PAS))


def stats(x, col="R"):
    v = x[col].dropna()
    if len(v) < 20: return None
    return v.mean(), v.std() / np.sqrt(len(v)) * gonfle(col), len(v)


def ligne(nom, d, m, col="R", extra=True):
    out = f"  {nom:46s}"
    for p, a, b in PER:
        x = d[m & (d.frac >= a) & (d.frac < b)]
        st = stats(x, col)
        if not st: out += f" | {p}:   —   "; continue
        mu, se, n = st
        out += f" | {p}: {mu:+.3f}±{se:.3f} n={n:5d}"
        if extra and col == "R":
            out += f" pertes {(x.R < 0).mean()*100:3.0f}% MAE {x.mae.mean():.2f}"
    print(out)


def ecart(nom, d, m1, m0, col):
    """Différence (groupe − reste) par période, et verdict."""
    out, signes = f"  {nom:46s}", []
    for p, a, b in PER:
        per = (d.frac >= a) & (d.frac < b)
        x1, x0 = d[m1 & per][col].dropna(), d[m0 & per][col].dropna()
        if len(x1) < 20 or len(x0) < 20: out += f" | {p}:   —   "; signes.append(0); continue
        diff = x1.mean() - x0.mean(); se = np.sqrt(x1.var() / len(x1) + x0.var() / len(x0)) * gonfle(col)
        out += f" | {p}: {diff:+.3f}±{se:.3f} (n={len(x1)})"
        signes.append(np.sign(diff) if abs(diff) > 2 * se else 0)
    tient = signes[1] != 0 and signes[1] == signes[2]
    print(out + ("   ✅ tient (P2 et P3)" if tient else "   ✗"))


HORIZON_PLAN = {"1d": 20, "3d": 20, "1w": 40, "1mo": 40}
for arg in sys.argv[1:]:
    f, _, pas = arg.partition(":")
    PAS = int(pas or 1)
    HZ = next((v for k, v in HORIZON_PLAN.items() if f"_{k}." in f), 10)
    d = pd.read_pickle(f)
    d["classe"] = d.sym.map(classe)
    print(f"\n════ {f} : {len(d)} dates, {d.sym.nunique()} actifs ════")
    base = (d.score >= 60) & (d.rr_obst >= 1.2)
    fib = (d.jambe == "hausse") & (d.phase == "correction") & d.zone_repli
    print("\n① A/B sur les achats du moteur (R par trade, frais compris)")
    ligne("BASE — moteur actuel", d, base)
    ligne("BASE + FIB (dans une zone de repli)", d, base & fib)
    ligne("BASE hors zone de repli", d, base & ~fib)
    ligne("BASE + CONFLUENCE (situations A ou D)", d, base & d.situation.isin(["A", "D"]))
    ligne("BASE + FIB + CONTEXTE (sans B ni E)", d, base & ~d.situation.isin(["B", "E"]))
    ligne("BASE dont la structure est rompue/contraire", d, base & (d.f_STRUCTURE == -1))
    print("\n② Ce que le nouveau moteur ajoute AUX ACHATS DU MOTEUR (écart de R, groupe − reste)")
    ecart("zone de repli vs hors zone", d, base & fib, base & ~fib, "R")
    ecart("situations A/D vs autres", d, base & d.situation.isin(["A", "D"]), base & ~d.situation.isin(["A", "D"]), "R")
    ecart("structure contraire vs non", d, base & (d.f_STRUCTURE == -1), base & (d.f_STRUCTURE != -1), "R")
    ecart("≥ 3 familles alignées vs moins", d, base & (d.n_align >= 3), base & (d.n_align < 3), "R")
    ecart("situation E (bruité) vs autres", d, base & (d.situation == "E"), base & (d.situation != "E"), "R")

    print("\n③ Réaction aux zones, SANS le moteur (rendement futur en ATR, zone − même période hors zone)")
    corr_h = (d.jambe == "hausse") & (d.phase == "correction")
    for k in (5, 10, 20, 50):
        ecart(f"repli d'une jambe haussière, +{k} bougies", d, corr_h & fib, corr_h & ~fib, f"fwd{k}")
    for r in ("38.2", "50", "61.8", "78.6"):
        ecart(f"dans la zone {r} % (confluence), +20", d, corr_h & (d.ratio == r), corr_h & ~fib, "fwd20")
    print("\n④ Selon le contexte (zone de repli − hors zone, +20 bougies, en ATR)")
    for nom, m in [("structure intacte", d.f_STRUCTURE == 1), ("structure rompue", d.f_STRUCTURE == -1),
                   ("marché de réf. haussier", d.regime == "BULL"), ("marché de réf. baissier", d.regime == "BEAR"),
                   ("volatilité basse (<30e c.)", d.vol_pct < 30), ("volatilité haute (>70e c.)", d.vol_pct > 70),
                   ("tendance forte (ADX>25)", d.adx > 25), ("tendance faible (ADX<20)", d.adx < 20)]:
        ecart(nom, d, corr_h & fib & m, corr_h & ~fib & m, "fwd20")
    for c in sorted(d.classe.unique()):
        ecart(f"classe : {c}", d, corr_h & fib & (d.classe == c), corr_h & ~fib & (d.classe == c), "fwd20")
    print("\n⑤ Information indépendante du score : zone − hors zone, À SCORE ÉGAL (+20, ATR)")
    for lo, hi in ((0, 40), (40, 50), (50, 60), (60, 101)):
        m = (d.score >= lo) & (d.score < hi)
        ecart(f"score {lo}–{hi - 1 if hi < 101 else 100}", d, corr_h & fib & m, corr_h & ~fib & m, "fwd20")
