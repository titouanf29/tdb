"""Ce que la personne FAIT, comparé à ce qu'elle a DIT.

LE PROBLÈME. Le site personnalisait sur des déclarations : un horizon coché,
un niveau de risque, une perte acceptée, un moment de la journée. Ces
réponses sont sincères, mais ce sont des intentions. Quelqu'un qui se dit
« swing » et ferme tout dans l'heure, ou qui accepte « 2 % » et pose des
stops à 9 %, reçoit des conseils taillés pour la personne qu'il pense être.

CE QUI EST CALCULÉ ICI, à partir de ses positions — et de rien d'autre :

  · la durée réelle de détention, confrontée à l'horizon choisi ;
  · la manière de sortir : objectif, stop, ou à la main — et en particulier
    les gains coupés avant l'objectif ;
  · la part des positions ouvertes sans stop ;
  · le risque réellement pris au stop, en % du capital du moment, confronté
    au niveau de risque des réglages ;
  · le stop en % du montant engagé, confronté à la perte déclarée acceptable ;
  · la taille des pertes comparée à celle des gains ;
  · la concentration sur un actif et sur une classe d'actifs ;
  · le rythme : quand la personne trade vraiment.

RÈGLE TENUE, la même que dans _personnel.py et _trade_review.py : chaque
constat doit être mérité par des chiffres de cette personne, les citer, et
se taire en dessous d'un nombre de trades qui le rendrait anecdotique. Rien
ici ne touche au verdict de l'analyse : ce module change ce qu'on montre et
ce qu'on explique à quelqu'un, pas ce que le marché fait.
"""

from __future__ import annotations

from collections import Counter
from datetime import datetime, timezone
from statistics import median
from typing import Any, Optional
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends

from ..database import execute_query
from .auth import get_current_user
from ._personnel import DISPONIBILITE_MOT, _fr, lire_profil
from ._risque import niveau_risque
from .wallet import capital_de_depart, get_user_id as _wallet_uid

router = APIRouter()

PARIS = ZoneInfo("Europe/Paris")

# Le niveau de risque des réglages, en % du capital perdu au stop. Même table
# que lib/risque.ts côté écran : c'est celle que le calculateur de taille
# applique, donc celle à laquelle on compare.
RISQUE_PCT = {"conservative": 0.5, "moderate": 1.0, "aggressive": 2.0, "very_aggressive": 5.0}
RISQUE_MOT = {"conservative": "prudent", "moderate": "modéré",
              "aggressive": "agressif", "very_aggressive": "très agressif"}

# L'horizon choisi, en minutes de détention : ce qui reste cohérent avec lui.
HORIZONS = {
    "scalp": (0, 120),
    "day":   (0, 1440),
    "swing": (720, 30 * 1440),
    "long":  (7 * 1440, None),
}
HORIZON_MOT = {"scalp": "scalping", "day": "day trading", "swing": "swing", "long": "long terme"}

CLASSE_MOT = {"actions": "actions", "crypto": "crypto", "forex": "devises",
              "matieres": "matières premières", "indices": "indices"}

JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]

# En dessous, un constat dirait quelque chose d'un hasard, pas d'une habitude.
MIN_TRADES = 5

LECONS = {
    "stop": ("risk-management/risk-basics", "Pourquoi un stop"),
    "taille": ("risk-management/position-sizing", "Dimensionner une position"),
}


def _lien_lecon(cle: str) -> dict:
    k, label = LECONS[cle]
    return {"href": f"/learn?lecon={k}", "label": label}


def classe(symbol: str) -> str:
    s = (symbol or "").upper()
    if s.endswith("-USD") or s.endswith("-EUR"):
        return "crypto"
    if s.endswith("=X"):
        return "forex"
    if s.endswith("=F"):
        return "matieres"
    if s.startswith("^"):
        return "indices"
    return "actions"


def _date(v: Any) -> Optional[datetime]:
    if not v:
        return None
    try:
        d = datetime.fromisoformat(str(v).replace("Z", "+00:00"))
    except ValueError:
        return None
    return d if d.tzinfo else d.replace(tzinfo=timezone.utc)


def _f(v: Any) -> Optional[float]:
    try:
        x = float(v)
    except (TypeError, ValueError):
        return None
    return x


def _proche(a: Any, b: Any) -> bool:
    a, b = _f(a), _f(b)
    if a is None or b is None:
        return False
    return abs(a - b) <= max(1e-9, abs(b) * 0.0005)


def _duree(minutes: float) -> str:
    if minutes < 60:
        return f"{round(minutes)} min"
    if minutes < 1440:
        h = round(minutes / 60)
        return f"{h} heure" + ("s" if h > 1 else "")
    j = round(minutes / 1440)
    return f"{j} jour" + ("s" if j > 1 else "")


def _pct(x: float) -> str:
    return f"{_fr(x * 100, 0)} %"


def observer(positions: list[dict], declare: dict, reglages: dict, capital: float) -> dict:
    """Le profil observé et ses écarts avec le profil déclaré.

    Fonction pure : les lignes de `positions`, les réponses du profil, les
    réglages et le capital de départ entrent, un dictionnaire sort. Aucune
    requête ici, pour qu'on puisse la vérifier sur des trades inventés.
    """
    fermees = sorted([p for p in positions if p.get("status") == "closed"],
                     key=lambda p: str(p.get("closed_at") or ""))
    ouvertes = [p for p in positions if p.get("status") == "open"]
    toutes = fermees + ouvertes
    style = reglages.get("trading_style") if reglages.get("trading_style") in HORIZONS else "day"
    niveau = niveau_risque(reglages.get("risk_level"))

    out: dict[str, Any] = {
        "trades_fermes": len(fermees),
        "positions_ouvertes": len(ouvertes),
        "assez": len(fermees) >= MIN_TRADES,
        "min_trades": MIN_TRADES,
        "declare": {
            "style": style, "style_mot": HORIZON_MOT[style],
            "risque": niveau, "risque_mot": RISQUE_MOT[niveau], "risque_pct": RISQUE_PCT[niveau],
            "perte_max_pct": declare.get("perte_max_pct"),
            "disponibilite": declare.get("disponibilite"),
        },
        "mesures": {},
        "constats": [],
    }
    if not toutes:
        return out

    m = out["mesures"]
    constats = out["constats"]
    assez = len(fermees) >= MIN_TRADES

    # ── Durée de détention ────────────────────────────────────────────────
    durees = []
    for p in fermees:
        a, b = _date(p.get("created_at")), _date(p.get("closed_at"))
        if a and b and b >= a:
            durees.append((b - a).total_seconds() / 60)
    if durees:
        med = median(durees)
        bas, haut = HORIZONS[style]
        dans = sum(1 for d in durees if d >= bas and (haut is None or d <= haut)) / len(durees)
        m["detention"] = {"mediane_min": round(med), "mediane_mot": _duree(med),
                          "dans_horizon": round(dans, 2)}
        if assez and dans < 0.5:
            trop_court = med < bas
            constats.append({
                "cle": "horizon",
                "ton": "attention",
                "titre": (f"Vous gardez vos positions {_duree(med)}, votre horizon est le {HORIZON_MOT[style]}"),
                "phrase": (
                    f"La moitié de vos trades dure moins de {_duree(med)}"
                    if trop_court else f"La moitié de vos trades dure plus de {_duree(med)}"
                ) + f" ; {_pct(1 - dans)} sortent de la durée d'un trade {HORIZON_MOT[style]}. "
                    "Les stops et objectifs que Nimbo propose dépendent de cet horizon : réglés pour "
                    "une durée que vous ne tenez pas, ils sont trop loin ou trop près.",
                "conseil": ("Choisissez l'horizon qui correspond à ce que vous faites, ou laissez vos "
                            "positions aller jusqu'à leur objectif."),
                "lien": {"href": "/settings", "label": "Changer d'horizon"},
            })

    # ── Les sorties ───────────────────────────────────────────────────────
    issues = Counter()
    coupes, gagnants_tp = 0, 0
    gains, pertes, rs = [], [], []
    for p in fermees:
        pnl = _f(p.get("realized_pnl")) or 0.0
        tp, sl = p.get("take_profit"), p.get("stop_loss")
        if tp and _proche(p.get("exit_price"), tp):
            issue = "objectif"
        elif sl and _proche(p.get("exit_price"), sl):
            issue = "stop"
        else:
            issue = "manuelle"
        issues[issue] += 1
        if pnl > 0:
            gains.append(pnl)
        elif pnl < 0:
            pertes.append(pnl)
        entree, qte, sortie = _f(p.get("entry_price")), _f(p.get("quantity")), _f(p.get("exit_price"))
        if (p.get("instrument") or "cfd") != "turbo" and sl and entree and qte:
            risque = abs(entree - float(sl)) * qte
            if risque > 0:
                r = pnl / risque
                rs.append(r)
                # Un gain coupé : sorti à la main, gagnant, alors qu'un
                # objectif plus loin existait, et avant d'avoir rapporté 1 R.
                if pnl > 0 and tp:
                    gagnants_tp += 1
                    if issue == "manuelle" and r < 1 and sortie is not None:
                        coupes += 1
    if fermees:
        m["sorties"] = {k: issues.get(k, 0) for k in ("objectif", "stop", "manuelle")}
        m["taux_gagnants"] = round(len(gains) / len(fermees), 2)
    if rs:
        m["r_moyen"] = round(sum(rs) / len(rs), 2)
    if assez and gagnants_tp >= 3 and coupes / gagnants_tp >= 0.4:
        constats.append({
            "cle": "gains_coupes",
            "ton": "attention",
            "titre": f"Vous coupez {_pct(coupes / gagnants_tp)} de vos gains avant l'objectif",
            "phrase": (f"Sur {gagnants_tp} trades gagnants qui avaient un objectif, {coupes} ont été "
                       "fermés à la main avant d'avoir rapporté ce que le stop risquait. Gagner peu "
                       "quand on a raison et perdre tout le stop quand on a tort : c'est ainsi qu'un "
                       "taux de réussite correct finit par perdre."),
            "conseil": "Laissez l'objectif travailler, ou remontez le stop au prix d'entrée plutôt que de fermer.",
            "lien": _lien_lecon("stop"),
        })
    if assez and len(gains) >= 3 and len(pertes) >= 3:
        g = sum(gains) / len(gains)
        p_ = abs(sum(pertes) / len(pertes))
        m["perte_sur_gain"] = round(p_ / g, 2) if g > 0 else None
        if g > 0 and p_ / g >= 1.6:
            constats.append({
                "cle": "pertes_longues",
                "ton": "attention",
                "titre": f"Une perte moyenne vaut {_fr(p_ / g)} gains moyens",
                "phrase": (f"Vos gains font en moyenne {_fr(g, 2)} €, vos pertes {_fr(p_, 2)} €. "
                           f"Avec ce rapport, il faut gagner plus de {_pct(p_ / (p_ + g))} des trades "
                           "pour ne pas perdre d'argent."),
                "conseil": "Un stop posé à l'ouverture, et jamais reculé, borne la perte avant qu'elle grandisse.",
                "lien": _lien_lecon("stop"),
            })

    # ── Les stops ─────────────────────────────────────────────────────────
    sans_stop = [p for p in toutes if not p.get("stop_loss")]
    m["sans_stop"] = round(len(sans_stop) / len(toutes), 2)
    if len(toutes) >= MIN_TRADES and len(sans_stop) / len(toutes) >= 0.3:
        constats.append({
            "cle": "sans_stop",
            "ton": "attention",
            "titre": f"{_pct(len(sans_stop) / len(toutes))} de vos positions n'ont pas de stop",
            "phrase": (f"{len(sans_stop)} positions sur {len(toutes)} ont été ouvertes sans stop. Sans "
                       "lui, rien ne dit ce que la position peut coûter, et aucune taille ne peut être "
                       "calculée : le risque n'est pas petit, il est inconnu."),
            "conseil": "Posez le stop de l'analyse avant d'ouvrir ; le calculateur en déduit la taille.",
            "lien": _lien_lecon("stop"),
        })

    # ── Le risque réellement pris ─────────────────────────────────────────
    # Rapporté au capital du moment : celui de départ, plus ce que les trades
    # déjà fermés avaient rapporté. Et le stop en % du montant engagé, pour
    # la comparaison avec la perte déclarée acceptable.
    cumul_par_date: list[tuple[str, float]] = []
    cumul = 0.0
    for p in fermees:
        cumul += _f(p.get("realized_pnl")) or 0.0
        cumul_par_date.append((str(p.get("closed_at") or ""), cumul))

    def capital_au(date: str) -> float:
        acquis = 0.0
        for d, v in cumul_par_date:
            if d <= date:
                acquis = v
            else:
                break
        return capital + acquis

    risques_capital, stops_montant = [], []
    for p in toutes:
        entree, qte, sl = _f(p.get("entry_price")), _f(p.get("quantity")), _f(p.get("stop_loss"))
        if (p.get("instrument") or "cfd") == "turbo" or not (entree and qte and sl):
            continue
        perte = abs(entree - sl) * qte
        cap = capital_au(str(p.get("created_at") or ""))
        if cap > 0:
            risques_capital.append(perte / cap * 100)
        montant = _f(p.get("amount"))
        if montant and montant > 0:
            stops_montant.append(perte / montant * 100)

    cible = RISQUE_PCT[niveau]
    if risques_capital:
        med = median(risques_capital)
        m["risque_capital_pct"] = round(med, 2)
        if len(risques_capital) >= MIN_TRADES and med > cible * 1.5:
            constats.append({
                "cle": "risque_trop_fort",
                "ton": "attention",
                "titre": f"Vous risquez {_fr(med)} % du capital par trade, votre réglage dit {_fr(cible)} %",
                "phrase": (f"Au stop, un trade typique vous coûte {_fr(med)} % du capital. Vous avez "
                           f"choisi le niveau {RISQUE_MOT[niveau]}, qui en accepte {_fr(cible)} %. "
                           f"À ce rythme, {round(20 / med) if med else 0} pertes d'affilée retirent "
                           "20 % du compte."),
                "conseil": "Ouvrez des positions plus petites : le calculateur de l'analyse donne la taille de votre niveau.",
                "lien": _lien_lecon("taille"),
            })
        elif len(risques_capital) >= MIN_TRADES and med < cible * 0.4:
            constats.append({
                "cle": "risque_tres_faible",
                "ton": "neutre",
                "titre": f"Vous risquez moins que votre réglage : {_fr(med)} % au lieu de {_fr(cible)} %",
                "phrase": ("Vos positions sont nettement plus petites que celles de votre niveau de "
                           "risque. Ce n'est pas une erreur, mais vos résultats seront plus lents que ce "
                           "que vous avez choisi."),
                "conseil": "Si c'est voulu, un niveau plus prudent dans les réglages accordera les tailles proposées.",
                "lien": {"href": "/settings", "label": "Voir le niveau de risque"},
            })
    accepte = declare.get("perte_max_pct")
    if accepte and len(stops_montant) >= MIN_TRADES:
        med = median(stops_montant)
        m["stop_montant_pct"] = round(med, 2)
        if med > accepte * 1.3:
            constats.append({
                "cle": "stop_contre_perte_declaree",
                "ton": "attention",
                "titre": f"Vos stops sont à {_fr(med)} % du montant, vous en acceptez {accepte} %",
                "phrase": ("Vous avez dit ne pas vouloir perdre plus de "
                           f"{accepte} % sur une position ; vos stops en demandent typiquement {_fr(med)} %. "
                           "C'est le moment où l'on recule un stop, et une perte prévue devient une perte subie."),
                "conseil": ("Gardez le stop de l'analyse, il suit la volatilité, et réduisez le montant "
                            "pour que la perte au stop reste dans ce que vous acceptez."),
                "lien": _lien_lecon("taille"),
            })

    # ── Ce sur quoi la personne trade ─────────────────────────────────────
    symboles = Counter(p.get("symbol") for p in toutes if p.get("symbol"))
    classes = Counter(classe(s) for s in symboles.elements())
    m["actifs"] = [{"symbol": s, "n": n} for s, n in symboles.most_common(5)]
    m["classes"] = [{"classe": k, "mot": CLASSE_MOT[k], "part": round(n / len(toutes), 2)}
                    for k, n in classes.most_common()]
    if len(toutes) >= 8:
        top, n = symboles.most_common(1)[0]
        if n / len(toutes) >= 0.5:
            constats.append({
                "cle": "concentration",
                "ton": "neutre",
                "titre": f"{_pct(n / len(toutes))} de vos trades portent sur {top}",
                "phrase": ("Connaître un actif par cœur est un avantage. Mais vos résultats disent "
                           f"surtout comment {top} s'est comporté, et peu de chose de votre méthode."),
                "conseil": "Le scanner propose des actifs au signal comparable dans d'autres marchés.",
                "lien": {"href": "/scanner", "label": "Ouvrir le scanner"},
            })

    # ── Le rythme ─────────────────────────────────────────────────────────
    heures, jours = Counter(), Counter()
    for p in toutes:
        d = _date(p.get("created_at"))
        if d:
            loc = d.astimezone(PARIS)
            heures[loc.hour] += 1
            jours[loc.weekday()] += 1
    if heures:
        h, _ = heures.most_common(1)[0]
        j, _ = jours.most_common(1)[0]
        soir = sum(n for hh, n in heures.items() if hh >= 18 or hh < 8) / sum(heures.values())
        weekend = (jours.get(5, 0) + jours.get(6, 0)) / sum(jours.values())
        m["rythme"] = {"heure": h, "jour": JOURS[j], "part_soir": round(soir, 2),
                       "part_weekend": round(weekend, 2)}
        dispo = declare.get("disponibilite")
        # Un écart entre le moment déclaré et le moment réel compte quand
        # l'horizon suppose de surveiller : un day trade ouvert à 22 h sur
        # une action américaine se gère sur un marché qui ferme.
        if assez and dispo == "continu" and soir >= 0.6:
            constats.append({
                "cle": "moment",
                "ton": "neutre",
                "titre": f"Vous tradez surtout le soir, vers {h} h",
                "phrase": (f"Vous avez dit être {DISPONIBILITE_MOT['continu']}, mais {_pct(soir)} de vos "
                           "positions s'ouvrent après 18 h ou avant 8 h. À ces heures, les marchés "
                           "européens sont fermés et l'horizon court est difficile à suivre."),
                "conseil": "Indiquez le soir comme moment disponible : Nimbo signalera les plans qui demandent un écran en journée.",
                "lien": {"href": "/settings", "label": "Mettre à jour mon profil"},
            })

    # ── Ce qui va bien mérite aussi d'être dit ────────────────────────────
    if assez and not any(c["ton"] == "attention" for c in constats):
        r = m.get("r_moyen")
        constats.append({
            "cle": "discipline",
            "ton": "bien",
            "titre": "Vos trades suivent votre plan",
            "phrase": ("Stops posés, risque dans votre réglage, durée cohérente avec votre horizon"
                       + (f", et un résultat moyen de {_fr(r, 2)} R par trade." if r is not None else ".")
                       + " C'est la base sur laquelle un résultat se construit."),
            "conseil": "Écrivez dans le journal ce qui a marché, pour savoir le refaire.",
            "lien": {"href": "/journal", "label": "Ouvrir le journal"},
        })

    ordre = {"attention": 0, "neutre": 1, "bien": 2}
    constats.sort(key=lambda c: ordre[c["ton"]])
    return out


@router.get("/profil")
async def profil_observe(current_user: dict = Depends(get_current_user)):
    """La façon de trader de la personne connectée, mesurée sur ses positions."""
    uid = _wallet_uid(current_user)
    positions = await execute_query(
        """SELECT symbol, direction, entry_price, exit_price, quantity, amount, stop_loss,
                  take_profit, realized_pnl, status, created_at, closed_at, instrument
           FROM positions WHERE user_id = ? AND (archived IS NULL OR archived = 0)""",
        (uid,),
    ) or []
    reglages: dict = {}
    declare: dict = {}
    if current_user.get("user_type") == "email":
        try:
            rows = await execute_query(
                "SELECT trading_style, risk_level FROM web_user_settings WHERE user_id = ?",
                (current_user.get("id"),),
            )
            reglages = rows[0] if rows else {}
        except Exception:
            reglages = {}
        declare = await lire_profil(current_user.get("id"))
    return observer(positions, declare, reglages, await capital_de_depart())
