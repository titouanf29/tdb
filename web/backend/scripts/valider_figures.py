"""Le détecteur de figures est-il fiable ? Trois tests, dans cet ordre.

1. LE RAPPEL. On fabrique des séries où chaque figure est dessinée
   volontairement, puis noyée dans un bruit croissant. Le détecteur doit la
   retrouver — et ne pas annoncer la figure de sens contraire.

2. LA FUITE. Sur une marche aléatoire SANS tendance, aucune figure ne peut
   prédire quoi que ce soit : l'avenir d'une marche aléatoire est indépendant
   de son passé. Si une figure y « réussit » nettement plus d'une fois sur
   deux, c'est que la détection regarde des bougies qu'elle n'aurait pas pu
   voir au moment où elle prétend avoir vu la figure. C'est le test qui
   protège de la faute la plus courante — et la plus flatteuse — en analyse
   technique automatisée.

3. LE TAUX DE FAUSSES ALERTES. Combien de figures une marche aléatoire
   produit-elle, comparé aux vraies données ? Si c'est autant, les figures
   « trouvées » sur les marchés sont en grande partie celles que le hasard
   dessine tout seul.

Usage : python scripts/valider_figures.py
"""
from __future__ import annotations

import sys
from collections import Counter, defaultdict
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from api.routes._figures import MESURE, detecter  # noqa: E402

RNG = np.random.default_rng(20260924)


def serie(squelette: list[tuple[int, float]], bruit: float, apres: int = 30) -> pd.DataFrame:
    """Une série qui passe par les points donnés, avec du bruit.

    Le bruit est multiplicatif et AUTOCORRÉLÉ (une petite marche aléatoire
    autour du squelette) : un bruit blanc bougie par bougie produit des
    dents de scie qui n'existent sur aucun marché et faciliteraient trop la
    tâche au détecteur.
    """
    xs = [x for x, _ in squelette]
    ys = [y for _, y in squelette]
    n = xs[-1] + 1
    base = np.interp(np.arange(n), xs, ys)
    # prolongation dans la direction du dernier segment
    pente = (ys[-1] - ys[-2]) / max(1, xs[-1] - xs[-2])
    base = np.concatenate([base, ys[-1] + pente * 0.3 * np.arange(1, apres + 1)])
    marche = np.cumsum(RNG.normal(0, bruit * 0.5, len(base)))
    marche -= np.convolve(marche, np.ones(9) / 9, mode="same")  # sans dérive propre
    close = base * (1 + marche + RNG.normal(0, bruit * 0.4, len(base)))
    amp = np.abs(RNG.normal(0, bruit * 0.6, len(base))) + bruit * 0.2
    return pd.DataFrame({"High": close * (1 + amp), "Low": close * (1 - amp), "Close": close})


def miroir(sq: list[tuple[int, float]]) -> list[tuple[int, float]]:
    return [(x, 220 - y) for x, y in sq]


# (clé attendue, sens attendu, squelette, bougie de cassure approximative)
CAS = {
    "double_sommet": ("baissier", [(0, 100), (30, 120), (46, 108), (62, 120), (95, 92)]),
    "ete": ("baissier", [(0, 100), (22, 113), (36, 104), (54, 124), (72, 104), (90, 113),
                         (104, 104), (130, 88)]),
    "triangle_ascendant": ("haussier", [(0, 100), (14, 120), (28, 104), (42, 120), (56, 110),
                                        (70, 120), (82, 115), (92, 120), (110, 134)]),
    "triangle_symetrique": ("haussier", [(0, 100), (14, 126), (28, 104), (42, 121), (56, 108),
                                         (70, 117), (82, 111), (92, 115), (110, 130)]),
    "drapeau_haussier": ("haussier", [(0, 100), (20, 100), (28, 116), (38, 113), (48, 126)]),
}
CAS["double_creux"] = ("haussier", miroir(CAS["double_sommet"][1]))
CAS["ete_inversee"] = ("haussier", miroir(CAS["ete"][1]))
CAS["triangle_descendant"] = ("baissier", miroir(CAS["triangle_ascendant"][1]))
CAS["drapeau_baissier"] = ("baissier", miroir(CAS["drapeau_haussier"][1]))


def test_rappel(repetitions: int = 40) -> None:
    print("══ 1. RAPPEL — la figure dessinée est-elle retrouvée ? ══")
    print(f"   {repetitions} tirages par figure et par niveau de bruit\n")
    bruits = [0.004, 0.008, 0.015]
    print(f"   {'figure':<22}" + "".join(f"bruit {b*100:.1f} %".rjust(16) for b in bruits)
          + "    sens contraire")
    for cle, (sens, sq) in CAS.items():
        ligne, contraire = f"   {cle:<22}", 0
        for b in bruits:
            trouve = 0
            for _ in range(repetitions):
                figs = detecter(serie(sq, b))
                if any(f["cle"] == cle for f in figs):
                    trouve += 1
                # une figure de sens contraire achevée APRÈS le squelette
                # principal serait une contradiction franche
                fin = sq[-1][0]
                if any(f["sens"] != sens and f["i_fin"] >= fin - 5 for f in figs):
                    contraire += 1
            ligne += f"{trouve/repetitions*100:13.0f} %  "
        ligne += f"{contraire/(repetitions*len(bruits))*100:10.0f} %"
        print(ligne)


def marche_aleatoire(n: int, vol: float = 0.015) -> pd.DataFrame:
    r = RNG.normal(0, vol, n)
    close = 100 * np.exp(np.cumsum(r))
    amp = np.abs(RNG.normal(0, vol * 0.6, n)) + vol * 0.2
    return pd.DataFrame({"High": close * (1 + amp), "Low": close * (1 - amp), "Close": close})


def test_fuite(series: int = 120, n: int = 2500, h: int = 20) -> None:
    print("\n══ 2. FUITE — sur une marche aléatoire sans tendance ══")
    print(f"   {series} séries de {n} bougies · horizon {h} bougies")
    print("   Attendu : ~50 % partout. Un écart net signalerait que la détection voit l'avenir.\n")
    comptes = defaultdict(lambda: [0, 0])  # cle -> [dans le sens, total]
    total_fig, total_bougies = 0, 0
    for _ in range(series):
        df = marche_aleatoire(n)
        close = df["Close"].to_numpy()
        total_bougies += n
        for f in detecter(df):
            i = f["i_connu"]
            if i + h >= n:
                continue
            total_fig += 1
            r = close[i + h] / close[i] - 1
            ok = r > 0 if f["sens"] == "haussier" else r < 0
            comptes[f["cle"]][0] += ok
            comptes[f["cle"]][1] += 1
    tout_ok = sum(v[0] for v in comptes.values())
    tout_n = sum(v[1] for v in comptes.values())
    for cle, (ok, tot) in sorted(comptes.items(), key=lambda kv: -kv[1][1]):
        taux = ok / tot * 100
        se = 100 * np.sqrt(0.25 / tot)
        alerte = "  ⚠" if abs(taux - 50) > 3 * se else ""
        print(f"   {cle:<22} {taux:5.1f} %  (n={tot:>4}, ±{2*se:4.1f} pt){alerte}")
    se = 100 * np.sqrt(0.25 / tout_n)
    print(f"   {'TOUTES':<22} {tout_ok/tout_n*100:5.1f} %  (n={tout_n}, ±{2*se:.1f} pt)")
    print(f"\n══ 3. FAUSSES ALERTES ══")
    print(f"   Marche aléatoire : {total_fig/total_bougies*1000:.1f} figures pour 1 000 bougies")
    reel = MESURE["figures"] / MESURE["bougies"] * 1000
    print(f"   Vrais marchés    : {reel:.1f} figures pour 1 000 bougies "
          f"({MESURE['figures']} sur {MESURE['bougies']}, voir mesurer_figures.py)")


if __name__ == "__main__":
    test_rappel()
    test_fuite()
