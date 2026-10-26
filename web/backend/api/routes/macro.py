"""
Le moteur macro, côté écran : l'agenda, la fiche d'une annonce, et ce que les
annonces font à un actif.

Tout est personnalisé de la même façon : les actifs de l'utilisateur (positions
ouvertes, favoris) passent en premier, parce que c'est la question qu'il se
pose — « et pour moi ? » — avant « et pour le marché ? ».
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from slowapi import Limiter
from ..limite import cle_client  # voir limite.py
from slowapi.util import get_remote_address

from ..database import execute_query
from ..services.macro import calendrier, impact
from ..services.macro.familles import FAMILLES
from ..services.macro.libelles import presenter
from ..services.macro.mesure import THERMOMETRE
from .auth import get_current_user
from .market import SYMBOL_NAMES

logger = logging.getLogger(__name__)
router = APIRouter()
limiter = Limiter(key_func=cle_client)

# Les actifs de référence montrés pour chaque banque centrale, en plus de ceux
# de l'utilisateur : de quoi voir d'un coup d'œil qui gagne et qui perd.
REFERENCES = {
    "FED": ["^GSPC", "^IXIC", "AAPL", "NVDA", "JPM", "XLRE", "TLT", "GC=F", "BTC-USD", "EURUSD=X", "TTE.PA", "^FCHI"],
    "BCE": ["EURUSD=X", "^STOXX50E", "^FCHI", "BNP.PA", "GLE.PA", "MC.PA", "AIR.PA", "ENGI.PA", "TTE.PA", "GC=F", "^GSPC"],
    "BOE": ["GBPUSD=X", "^FTSE", "HSBA.L", "EURUSD=X"],
    "BOJ": ["JPY=X", "^N225", "BTC-USD"],
}
NOMS_EXTRA = {
    "^GSPC": "S&P 500", "^IXIC": "Nasdaq", "^FCHI": "CAC 40", "^STOXX50E": "Euro Stoxx 50", "^FTSE": "FTSE 100",
    "^N225": "Nikkei 225", "XLRE": "Immobilier américain (XLRE)", "TLT": "Obligations US à 20 ans (TLT)",
    "EURUSD=X": "Euro / dollar", "GBPUSD=X": "Livre / dollar", "JPY=X": "Dollar / yen", "GC=F": "Or",
    "BTC-USD": "Bitcoin",
}


def _nom(s: str) -> str:
    return NOMS_EXTRA.get(s) or SYMBOL_NAMES.get(s) or s


def _wallet_id(user: dict) -> str:
    if user.get("user_type") == "email":
        return f"web_{user['id']}"
    return str(user.get("telegram_id", user.get("id")))


async def _mes_actifs(user: dict) -> list[dict]:
    """Positions ouvertes d'abord, puis favoris."""
    out, vus = [], set()
    try:
        pos = await execute_query(
            "SELECT symbol, direction FROM positions WHERE user_id = ? AND status = 'open' AND (archived IS NULL OR archived = 0)",
            (_wallet_id(user),)) or []
    except Exception:
        pos = []
    for p in pos:
        s = p["symbol"].upper()
        if s not in vus:
            vus.add(s)
            out.append({"symbole": s, "nom": _nom(s), "position": p.get("direction")})
    try:
        fav = await execute_query("SELECT symbol FROM web_favorites WHERE user_id = ? ORDER BY added_at DESC",
                                  (user["id"],)) or []
    except Exception:
        fav = []
    for f in fav:
        s = f["symbol"].upper()
        if s not in vus:
            vus.add(s)
            out.append({"symbole": s, "nom": _nom(s), "position": None})
    return out[:15]


async def _une(ev_id: int) -> dict | None:
    await calendrier.init()
    rows = await execute_query("SELECT * FROM macro_calendar WHERE id = ?", (ev_id,))
    if not rows:
        return None
    import json
    r = dict(rows[0])
    try:
        r["resultat"] = json.loads(r["resultat"]) if r.get("resultat") else None
    except (ValueError, TypeError):
        r["resultat"] = None
    return r


@router.get("/agenda")
@limiter.limit("30/minute")
async def agenda(
    request: Request,
    jours: int = Query(default=21, ge=1, le=120),
    passe: int = Query(default=3, ge=0, le=30),
    importance: str = Query(default="Medium", pattern="^(Low|Medium|High)$"),
    toutes: bool = False,
    current_user: dict = Depends(get_current_user),
):
    """Les annonces à venir (et celles des derniers jours), avec l'effet sur les actifs de l'utilisateur."""
    maintenant = datetime.now(timezone.utc)
    # Les devises qui concernent l'utilisateur : celles de ses marchés
    # déclarés, plus le dollar et l'euro, qui font bouger tout le monde.
    devises = {"USD", "EUR"}
    if not toutes:
        try:
            from .semaine import DEVISES_AGENDA, _profil
            for m in (await _profil(current_user)).get("markets") or []:
                devises |= DEVISES_AGENDA.get(m, set())
        except Exception:
            pass
    evs = await calendrier.evenements(maintenant - timedelta(days=passe), maintenant + timedelta(days=jours),
                                      importance_min=importance, devises=None if toutes else devises)
    evs = [e for e in evs if e.get("importance") != "Holiday"]
    mes = await _mes_actifs(current_user)

    cache: dict[tuple, dict] = {}
    out = []
    for e in evs:
        v = presenter(e)
        banque = e.get("banque")
        concernes = []
        if banque and mes:
            lecture = (e.get("resultat") or {}).get("lecture", {}).get("sens")
            for a in mes:
                k = (banque, a["symbole"])
                if k not in cache:
                    cache[k] = await impact.pour_actif(banque, a["symbole"], nom=a["nom"], cache_seul=True)
                imp = cache[k]
                if imp["sens_si_restrictive"]:
                    concernes.append({
                        "symbole": a["symbole"], "nom": a["nom"], "position": a["position"],
                        "sens_si_restrictive": imp["sens_si_restrictive"],
                        "sens_effectif": imp["sens_si_restrictive"] * lecture if lecture else None,
                        "mesure": imp["source"] == "mesure",
                    })
        v["vos_actifs"] = concernes
        out.append(v)
    return {"evenements": out, "mes_actifs": mes, "devises": sorted(devises) if not toutes else None,
            "maintenant": maintenant.isoformat()}


@router.get("/evenement/{ev_id}")
@limiter.limit("30/minute")
async def evenement(request: Request, ev_id: int, current_user: dict = Depends(get_current_user)):
    """La fiche complète d'une annonce : ce que c'est, ce qui a été décidé, et l'effet actif par actif."""
    e = await _une(ev_id)
    if not e:
        raise HTTPException(status_code=404, detail="Annonce introuvable.")
    v = presenter(e)
    fam = FAMILLES.get(e.get("famille") or "", {})
    v["explication"] = fam.get("explication")
    v["restrictive"] = fam.get("restrictive")
    v["type"] = fam.get("type")
    res = e.get("resultat")
    v["resultat"] = res

    banque = e.get("banque")
    impacts_vous, impacts_ref = [], []
    if banque:
        lecture = (res or {}).get("lecture", {}).get("sens") if res else None
        mouvement = (res or {}).get("lecture", {}).get("mouvement") if res else None
        th = (res or {}).get("lecture", {}).get("thermometre") if res else None
        # Le mouvement du thermomètre ne sert à chiffrer l'effet que s'il est
        # celui sur lequel la sensibilité a été mesurée.
        if th != THERMOMETRE.get(banque, {}).get("symbole"):
            mouvement = None
        mes = await _mes_actifs(current_user)
        vus = set()
        for a in mes:
            vus.add(a["symbole"])
            imp = await impact.pour_actif(banque, a["symbole"], nom=a["nom"], lecture=lecture,
                                          mouvement_thermo=mouvement, famille=e.get("famille"))
            imp["position"] = a["position"]
            impacts_vous.append(imp)
        for s in REFERENCES.get(banque, []):
            if s in vus:
                continue
            imp = await impact.pour_actif(banque, s, nom=_nom(s), lecture=lecture,
                                          mouvement_thermo=mouvement, famille=e.get("famille"))
            impacts_ref.append(imp)

        def rang(x):
            fiab = (x.get("mesure") or {}).get("fiabilite")
            return (0 if x["sens_si_restrictive"] else 1, 0 if fiab == "fiable" else 1 if x["source"] else 2)
        impacts_ref.sort(key=rang)
    v["impacts_vous"] = impacts_vous
    v["impacts_reference"] = impacts_ref
    v["thermometre"] = THERMOMETRE.get(banque, {}).get("nom") if banque else None
    return v


@router.get("/actif/{symbol}")
@limiter.limit("30/minute")
async def pour_un_actif(request: Request, symbol: str, current_user: dict = Depends(get_current_user)):
    """Ce que les banques centrales font à cet actif, et les prochaines annonces qui le concernent."""
    s = symbol.upper()
    nom = _nom(s)
    sensibilites = {}
    for banque in ("FED", "BCE"):
        sensibilites[banque] = await impact.pour_actif(banque, s, nom=nom)

    maintenant = datetime.now(timezone.utc)
    evs = await calendrier.evenements(maintenant - timedelta(hours=12), maintenant + timedelta(days=45),
                                      importance_min="High")
    prochaines = []
    for e in evs:
        b = e.get("banque")
        if not b or e.get("importance") == "Holiday":
            continue
        base = sensibilites.get(b) or await impact.pour_actif(b, s, nom=nom, cache_seul=True)
        if not base["sens_si_restrictive"]:
            continue
        v = presenter(e)
        v["sens_si_restrictive"] = base["sens_si_restrictive"]
        prochaines.append(v)
        if len(prochaines) >= 6:
            break
    return {"symbole": s, "nom": nom, "sensibilites": sensibilites, "prochaines": prochaines}
