"""Le moteur de structure / Fibonacci / confluence apporte-t-il quelque chose ?

    python scripts/mesurer_structure.py <unite> <fichier_cache.pkl> <sl_atr> <tp_atr> [pas] [sortie.pkl]

Le cache est un dict {symbole: DataFrame OHLCV} (le panel de 40 actifs du
moteur). Chaque date est rejouée avec l'historique TRONQUÉ à cette date :
compute_score, les portes, le plan de l'écran et contexte_technique — les
fonctions de production, rien d'autre. Aucun ZigZag rétrospectif.

Par date, on enregistre : le score final (portes comprises), la décision du
moteur (achat proposé ou non), le résultat du plan en R (frais compris), les
excursions favorable et défavorable (MFE/MAE, en R), les rendements futurs à
+5/+10/+20/+50 bougies en ATR, et toutes les sorties du nouveau moteur
(phase, retracement, zone, familles, situation). L'analyse est faite par
scripts/analyser_structure.py sur trois périodes successives.
"""
from __future__ import annotations

import pickle
import sys
import warnings
from pathlib import Path

import numpy as np
import pandas as pd

warnings.filterwarnings("ignore")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from api.routes._scoring import (compute_score, jours_par_bougie, extension_validee, plan_structurel,  # noqa: E402
                                 objectif_plafonne, NIVEAUX_FENETRE, horizon_rejeu, htf_from_primary,
                                 htf_trend, apply_htf_gate)
from api.routes._market_context import benchmark_for, compute_market_context, apply_context_gate  # noqa: E402
from api.routes._backtest import _walk_barriers  # noqa: E402
from api.routes._confluence import contexte_technique, FAMILLES  # noqa: E402
from api.routes._structure import PRIMAIRE  # noqa: E402

HORIZONS = (5, 10, 20, 50)


def rejouer(tf: str, cache: str, sl: float, tp: float, pas: int = 1, bench: dict | None = None) -> pd.DataFrame:
    H = pickle.load(open(cache, "rb"))
    HZ = horizon_rejeu(tf); ext = extension_validee(tf); plafonner = objectif_plafonne(tf)
    rows = []
    for s, h in H.items():
        h = h.dropna(subset=["High", "Low", "Close"])
        jpb = jours_par_bougie(h, tf); n = len(h)
        hi, lo, cl, op = (h[c].to_numpy(float) for c in ("High", "Low", "Close", "Open"))
        bn = benchmark_for(s); bc = (bench or {}).get(bn, {}).get("Close") if bench else None
        for t in range(220, n - max(HZ, max(HORIZONS)), pas):
            w = h.iloc[max(0, t - 800):t]; e = cl[t - 1]
            try:
                S = compute_score(w.High, w.Low, w.Close, w.Volume, current_price=e, extension=ext, jours_par_bougie=jpb)
            except Exception:
                continue
            atr = float(S["atr"] or 0)
            if not atr > 0:
                continue
            sc = float(S["final_score"]); regime = None
            try:
                x = htf_from_primary(w, tf)
                if x: sc = apply_htf_gate(sc, htf_trend(x[1]), x[0])[0]
            except Exception:
                pass
            if bc is not None:
                try:
                    ctx = compute_market_context(w["Close"], bc[bc.index <= w.index[-1]], bn)
                    regime = ctx.get("regime"); sc = apply_context_gate(sc, ctx)[0]
                except Exception:
                    pass
            sup = float(w.Low.tail(NIVEAUX_FENETRE).min()); res = float(w.High.tail(NIVEAUX_FENETRE).max())
            p = plan_structurel(e, atr, sup, res, False, sl, tp, plafonner=plafonner)
            risk = e - p["sl"]
            if risk <= 0:
                continue
            _, px, _ = _walk_barriers(hi, lo, cl, t, HZ, e, p["sl"], p["tp"], True, op)
            fen = slice(t, min(n, t + HZ))
            r = dict(sym=s, frac=t / n, score=sc, rr_obst=(p["tp_structure"] - e) / risk,
                     R=(px - e) / risk - 2 * 0.001 * e / risk,
                     mfe=(hi[fen].max() - e) / risk, mae=(e - lo[fen].min()) / risk,
                     regime=regime, vol_pct=S.get("vol_percentile"), adx=S.get("adx_val"))
            for k in HORIZONS:
                r[f"fwd{k}"] = (cl[t - 1 + k] - e) / atr
            try:
                c = contexte_technique(w, S, tf, e, {"support": sup, "resistance": res,
                                                   "moyenne 50": float(S["ema50"].iloc[-1]),
                                                   "moyenne 200": float(S["ema200"].iloc[-1])})
            except Exception:
                c = None
            j = ((c or {}).get("fibonacci") or {}).get("primaire")
            k_ = (c or {}).get("confluence") or {}
            r.update(
                jambe=j["sens"] if j else None, phase=j["phase"] if j else None,
                retrace=j["retracement"] if j else None, zone_repli=bool(j and j["zone_repli"]),
                ratio=k_.get("ratio"), confiance=j["confiance"] if j else None,
                bruite=((c or {}).get("fibonacci") or {}).get("bruite"),
                situation=k_.get("situation"), force=k_.get("force"),
                n_align=len(k_.get("alignees") or []), n_contra=len(k_.get("contraires") or []),
            )
            for fam in FAMILLES:
                r[f"f_{fam}"] = ((k_.get("familles") or {}).get(fam) or {}).get("vote")
            rows.append(r)
        print(s, len(rows), flush=True)
    return pd.DataFrame(rows)


if __name__ == "__main__":
    tf, cache, sl, tp = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4])
    pas = int(sys.argv[5]) if len(sys.argv) > 5 else 1
    sortie = sys.argv[6] if len(sys.argv) > 6 else f"structure_{tf}.pkl"
    bench = None
    bpath = Path(cache).with_name(f"bench_{tf}.pkl")
    if bpath.exists():
        bench = pickle.load(open(bpath, "rb"))
    rejouer(tf, cache, sl, tp, pas, bench).to_pickle(sortie)
