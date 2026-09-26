"""
La préparation de la semaine — l'espace du week-end.

POURQUOI UN ESPACE À PART. En semaine, l'accueil répond à « qu'est-ce que je
fais aujourd'hui » : une position à revoir, un actif qui bouge. Le week-end,
les marchés sont fermés et cette question n'a plus de réponse — « il fait
−1,47 % aujourd'hui » parle d'une séance qui n'existe pas. La bonne question
devient : « qu'est-ce que je dois avoir en tête lundi à 9 h ? »

CE QUI EST MONTRÉ, ET D'OÙ ÇA VIENT. Rien n'est inventé :

  · la semaine de l'utilisateur        ses trades, ses positions, son journal ;
  · ses actifs sur la semaine          les cours de clôture réels ;
  · l'actualité                        le moteur de presse (intel), qui garde
                                       en base les sujets vus dans la semaine ;
  · l'agenda macro                     le calendrier économique publié par
                                       ForexFactory, mis en cache en base ;
  · ce qu'il faut penser               des règles, appliquées à tout ce qui
                                       précède et au profil déclaré.

L'ancien « briefing hebdo » demandait à un modèle de langage d'écrire des
niveaux de prix et des rendez-vous « à partir de ses données
d'entraînement » : des chiffres d'apparence précise que rien ne garantissait.
Ici, un modèle ne sert au mieux qu'à rédiger une synthèse DES FAITS
CI-DESSUS, et la page dit qu'il l'a rédigée.

LA FENÊTRE. Du vendredi 22 h 30 (Paris), après la clôture de Wall Street,
jusqu'au lundi 9 h, ouverture des places européennes. Hors fenêtre, l'espace
est fermé : il n'aurait rien à dire de mieux que l'accueil.
"""
from __future__ import annotations

import asyncio
import json
import logging
import math
import time
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from ..database import USE_POSTGRES, execute_query, execute_write
from .auth import get_current_user
from .market import SYMBOL_NAMES
from ._fr import nombre_fr

logger = logging.getLogger(__name__)
router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

PARIS = ZoneInfo("Europe/Paris")
NEW_YORK = ZoneInfo("America/New_York")
JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]
MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août",
        "septembre", "octobre", "novembre", "décembre"]


# ── La fenêtre ────────────────────────────────────────────────────────────


def fenetre(maintenant: datetime | None = None) -> dict:
    """Ouvert du vendredi 22 h 30 au lundi 9 h, heure de Paris."""
    n = (maintenant or datetime.now(timezone.utc)).astimezone(PARIS)
    wd, h = n.weekday(), n.hour + n.minute / 60
    ouvert = (wd == 4 and h >= 22.5) or wd in (5, 6) or (wd == 0 and h < 9)

    # Le lundi qui ouvre la semaine à préparer.
    if wd == 0 and h < 9:
        lundi = n.date()
    else:
        lundi = n.date() + timedelta(days=(7 - wd) % 7 or 7)
    # La semaine écoulée : du lundi précédent au vendredi.
    lundi_ecoule = lundi - timedelta(days=7)

    if ouvert:
        prochaine = None
    else:
        vendredi = n.date() + timedelta(days=(4 - wd) % 7)
        prochaine = datetime(vendredi.year, vendredi.month, vendredi.day, 22, 30, tzinfo=PARIS)
        if prochaine <= n:
            prochaine += timedelta(days=7)

    return {
        "ouvert": ouvert,
        "lundi": lundi.isoformat(),
        "lundi_ecoule": lundi_ecoule.isoformat(),
        "libelle": f"semaine du {lundi.day}{'er' if lundi.day == 1 else ''} {MOIS[lundi.month - 1]}",
        "prochaine_ouverture": prochaine.isoformat() if prochaine else None,
        "fermeture": datetime(lundi.year, lundi.month, lundi.day, 9, 0, tzinfo=PARIS).isoformat(),
    }


# ── Qui est l'utilisateur ─────────────────────────────────────────────────

# Les repères de chaque marché déclaré au profil. Les indices servent à situer
# la semaine de l'utilisateur dans celle du marché — pas à la juger.
REPERES = {
    "europe":   ["^FCHI", "^STOXX50E"],
    "usa":      ["^GSPC", "^IXIC"],
    "crypto":   ["BTC-USD", "ETH-USD"],
    "devises":  ["EURUSD=X", "USDJPY=X"],
    "matieres": ["GC=F", "CL=F"],
}
REPERES_DEFAUT = ["^FCHI", "^GSPC", "EURUSD=X", "GC=F", "BTC-USD"]
NOMS_REPERES = {
    "^FCHI": "CAC 40", "^STOXX50E": "Euro Stoxx 50", "^GSPC": "S&P 500",
    "^IXIC": "Nasdaq", "BTC-USD": "Bitcoin", "ETH-USD": "Ether",
    "EURUSD=X": "Euro / dollar", "USDJPY=X": "Dollar / yen",
    "GC=F": "Or", "CL=F": "Pétrole WTI",
}

# Les devises dont l'agenda concerne chaque marché. L'euro et le dollar
# touchent tout le monde : la BCE et la Fed font bouger tous les marchés.
DEVISES_AGENDA = {
    "europe": {"EUR", "USD", "GBP"},
    "usa": {"USD"},
    "crypto": {"USD"},
    "devises": {"EUR", "USD", "GBP", "JPY", "CHF", "CAD", "AUD"},
    "matieres": {"USD", "CNY"},
}


def _nom(symbole: str) -> str:
    return NOMS_REPERES.get(symbole) or SYMBOL_NAMES.get(symbole) or symbole


def _crypto(symbole: str) -> bool:
    return symbole.endswith("-USD") or symbole.endswith("-EUR")


def _a_dt(v) -> datetime | None:
    if not v:
        return None
    try:
        d = datetime.fromisoformat(str(v).replace("Z", "+00:00"))
    except ValueError:
        return None
    return d if d.tzinfo else d.replace(tzinfo=timezone.utc)


async def _profil(user: dict) -> dict:
    uid = user["id"]
    out = {"goal": None, "markets": [], "weekly_time": None, "style": "day",
           "risk": "moderate", "perte_max_pct": None, "disponibilite": None}
    try:
        rows = await execute_query(
            "SELECT goal, markets, weekly_time FROM user_profile WHERE user_id = ?", (uid,))
        if rows:
            out["goal"] = rows[0].get("goal")
            out["weekly_time"] = rows[0].get("weekly_time")
            try:
                out["markets"] = [m for m in json.loads(rows[0].get("markets") or "[]") if m in REPERES]
            except (ValueError, TypeError):
                pass
    except Exception:
        pass
    try:
        rows = await execute_query(
            "SELECT trading_style, risk_level FROM web_user_settings WHERE user_id = ?", (uid,))
        if rows:
            out["style"] = rows[0].get("trading_style") or "day"
            out["risk"] = rows[0].get("risk_level") or "moderate"
    except Exception:
        pass
    try:
        from ._personnel import lire_profil
        p = await lire_profil(uid)
        out["perte_max_pct"] = p.get("perte_max_pct")
        out["disponibilite"] = p.get("disponibilite")
    except Exception:
        pass
    return out


def _wallet_id(user: dict) -> str:
    if user.get("user_type") == "email":
        return f"web_{user['id']}"
    return str(user.get("telegram_id", user.get("id")))


# ── 1. La semaine de l'utilisateur ────────────────────────────────────────


async def _ma_semaine(user: dict, debut: datetime, fin: datetime) -> dict:
    wid = _wallet_id(user)
    fermees = await execute_query(
        """SELECT symbol, direction, realized_pnl, stop_loss, amount, instrument,
                  exit_price, barriere, created_at, closed_at, frais_payes
           FROM positions WHERE user_id = ? AND status = 'closed'
           AND (archived IS NULL OR archived = 0)""",
        (wid,),
    ) or []
    fermees = [p for p in fermees if (d := _a_dt(p.get("closed_at"))) and debut <= d < fin]
    ouvertes = await execute_query(
        """SELECT * FROM positions WHERE user_id = ? AND status = 'open'
           AND (archived IS NULL OR archived = 0)""",
        (wid,),
    ) or []

    pnls = [float(p.get("realized_pnl") or 0) for p in fermees]
    gagnants = [x for x in pnls if x > 0]
    perdants = [x for x in pnls if x < 0]
    sans_stop = sum(1 for p in fermees if p.get("stop_loss") is None)
    # Liquidation ou barrière : la perte a pris toute la mise.
    forcees = sum(1 for p in fermees
                  if float(p.get("amount") or 0) > 0
                  and float(p.get("realized_pnl") or 0) <= -0.98 * float(p["amount"]))

    meilleur = max(fermees, key=lambda p: float(p.get("realized_pnl") or 0), default=None)
    pire = min(fermees, key=lambda p: float(p.get("realized_pnl") or 0), default=None)

    try:
        j = await execute_query(
            "SELECT created_at FROM trading_journal WHERE user_id = ?", (wid,)) or []
        journal = sum(1 for r in j if (d := _a_dt(r.get("created_at"))) and debut <= d < fin)
    except Exception:
        journal = 0

    solde = None
    try:
        w = await execute_query("SELECT balance FROM wallet WHERE user_id = ?", (wid,))
        solde = float(w[0]["balance"]) if w else None
    except Exception:
        pass

    def court(p):
        return None if not p else {
            "symbole": p["symbol"], "nom": _nom(p["symbol"]),
            "resultat": round(float(p.get("realized_pnl") or 0), 2),
        }

    return {
        "trades": len(fermees),
        "resultat": round(sum(pnls), 2),
        "gagnants": len(gagnants),
        "perdants": len(perdants),
        "taux_reussite": round(len(gagnants) / len(pnls) * 100) if pnls else None,
        "sans_stop": sans_stop,
        "fermetures_forcees": forcees,
        "frais": round(sum(float(p.get("frais_payes") or 0) for p in fermees), 2),
        "meilleur": court(meilleur) if meilleur and float(meilleur.get("realized_pnl") or 0) > 0 else None,
        "pire": court(pire) if pire and float(pire.get("realized_pnl") or 0) < 0 else None,
        "journal": journal,
        "solde": round(solde, 2) if solde is not None else None,
        "_ouvertes": ouvertes,
    }


# ── 2. Les actifs sur la semaine ──────────────────────────────────────────


async def _symboles_suivis(user: dict, ouvertes: list) -> list[str]:
    syms: list[str] = []
    for p in ouvertes:
        syms.append(p["symbol"])
    try:
        fav = await execute_query(
            "SELECT symbol FROM web_favorites WHERE user_id = ? ORDER BY added_at DESC",
            (user["id"],)) or []
        syms += [f["symbol"] for f in fav]
    except Exception:
        pass
    try:
        reel = await execute_query(
            "SELECT symbol FROM real_positions WHERE user_id = ? AND status = 'open'",
            (_wallet_id(user),)) or []
        syms += [r["symbol"] for r in reel]
    except Exception:
        pass
    vus, out = set(), []
    for s in syms:
        s = (s or "").upper()
        if s and s not in vus:
            vus.add(s)
            out.append(s)
    return out[:10]


def _perf(df, lundi_ecoule: date) -> dict | None:
    """La semaine d'un actif : clôture de vendredi contre celle d'avant lundi."""
    if df is None or getattr(df, "empty", True) or "Close" not in df:
        return None
    close = df["Close"].dropna()
    if len(close) < 3:
        return None
    jours = [ts.date() if hasattr(ts, "date") else ts for ts in close.index]
    avant = [i for i, d in enumerate(jours) if d < lundi_ecoule]
    pendant = [i for i, d in enumerate(jours) if d >= lundi_ecoule]
    if not avant or not pendant:
        return None
    ref = float(close.iloc[avant[-1]])
    der = float(close.iloc[-1])
    semaine = close.iloc[pendant]
    haut = df["High"].iloc[pendant].max() if "High" in df else semaine.max()
    bas = df["Low"].iloc[pendant].min() if "Low" in df else semaine.min()
    premier = float(close.iloc[0])
    if not ref or math.isnan(ref) or math.isnan(der):
        return None
    return {
        "dernier": round(der, 6),
        "semaine_pct": round((der / ref - 1) * 100, 2),
        "mois_pct": round((der / premier - 1) * 100, 2) if premier else None,
        "haut": round(float(haut), 6),
        "bas": round(float(bas), 6),
        "amplitude_pct": round((float(haut) / float(bas) - 1) * 100, 2) if bas else None,
    }


async def _actifs(suivis: list[str], reperes: list[str], lundi_ecoule: date) -> dict:
    from ._prices import prewarm_ohlcv, fetch_ohlcv
    tous = list(dict.fromkeys(suivis + reperes))
    frames = await prewarm_ohlcv(tous, period="1mo", interval="1d")
    manquants = [s for s in tous if s not in frames]
    if manquants:
        res = await asyncio.gather(*[fetch_ohlcv(s, "1mo", "1d") for s in manquants],
                                   return_exceptions=True)
        for s, df in zip(manquants, res):
            if not isinstance(df, Exception) and df is not None:
                frames[s] = df

    def ligne(s):
        p = _perf(frames.get(s), lundi_ecoule)
        return {"symbole": s, "nom": _nom(s), "crypto": _crypto(s), **(p or {}), "disponible": p is not None}

    return {"suivis": [ligne(s) for s in suivis], "reperes": [ligne(s) for s in reperes]}


# ── 3. L'actualité ────────────────────────────────────────────────────────

_TRADUCTIONS: dict[str, str] = {}


def _deja_francais(t: str) -> bool:
    mots = set(t.lower().replace("’", " ").replace("'", " ").split())
    return len(mots & {"le", "la", "les", "des", "du", "une", "est", "pour", "dans", "sur", "et"}) >= 2


def _traduire(titres: list[str]) -> list[str]:
    """En français, une fois par titre. Un échec n'est PAS mémorisé : le
    service de traduction limite son débit, et un refus passager ne doit pas
    laisser le titre en anglais jusqu'au redémarrage du serveur."""
    a_faire = [t for t in titres if t and t not in _TRADUCTIONS and not _deja_francais(t)]
    if a_faire:
        try:
            from deep_translator import GoogleTranslator
            tr = GoogleTranslator(source="auto", target="fr")
            for t in a_faire:
                try:
                    fr = tr.translate(t)
                    if fr:
                        _TRADUCTIONS[t] = fr
                except Exception:
                    break
        except Exception:
            pass
    return [_TRADUCTIONS.get(t, t) for t in titres]


async def _actualite(suivis: list[str]) -> dict:
    from ..services.intel import context, exposure, store, transmission

    # On relit la presse du moment, ce qui alimente aussi la mémoire des
    # sujets de la semaine.
    try:
        await context._dossiers()
    except Exception:
        pass

    try:
        recents = await store.actifs_recents(heures=24 * 7, minimum_voix=1)
    except Exception:
        recents = []

    sujets = []
    for r in recents:
        ents = set(r.get("entites") or [])
        concerne = []
        try:
            t = transmission.analyser(ents, r.get("titre") or "")
            if not t.get("indetermine"):
                for cible in t.get("exposes", {}):
                    for s in suivis:
                        if s in exposure.actifs_pour(cible) and s not in concerne:
                            concerne.append(s)
        except Exception:
            pass
        poids = float(r.get("confiance") or 0) * math.log1p(int(r.get("voix") or 1)) \
            * (1 + 0.5 * math.log1p(int(r.get("vues") or 1)))
        sujets.append({
            "titre": r.get("titre") or "",
            "voix": int(r.get("voix") or 0),
            "articles": int(r.get("articles") or 0),
            "confiance": round(float(r.get("confiance") or 0), 2),
            "niveau": r.get("niveau"),
            "premiere_vue": r.get("premiere_vue"),
            "vos_actifs": [{"symbole": s, "nom": _nom(s)} for s in concerne],
            "_poids": poids + (1.0 if concerne else 0.0),
        })

    sujets.sort(key=lambda x: x["_poids"], reverse=True)
    garde = sujets[:7]
    for s, fr in zip(garde, _traduire([s["titre"] for s in garde])):
        s["titre_fr"] = fr
        s.pop("_poids", None)

    # Ce que le moteur dit, aujourd'hui, des actifs de l'utilisateur.
    par_actif = []
    for s in suivis[:6]:
        try:
            c = await context.pour_symbole(s)
        except Exception:
            continue
        if c.get("couvert"):
            ev = c["evenements"][0]
            par_actif.append({
                "symbole": s, "nom": _nom(s), "resume": c["resume"],
                "titre": ev.get("titre"), "effet": ev.get("effet"),
                "sens": ev.get("sens"), "a_surveiller": ev.get("a_surveiller"),
            })
    for p, fr in zip(par_actif, _traduire([p["titre"] or "" for p in par_actif])):
        p["titre_fr"] = fr

    return {"sujets": garde, "vos_actifs": par_actif, "veille": context.veille()}


# ── 4. L'agenda macro ─────────────────────────────────────────────────────

CALENDRIER_URL = "https://nfs.faireconomy.media/ff_calendar_thisweek.json"
_CAL_CACHE: dict = {"at": None}
_CAL_TTL = 3 * 3600
_cal_pret = False

# Les annonces qui reviennent chaque mois, en clair. Le titre d'origine reste
# affiché à côté : il est celui qu'on retrouve dans la presse.
LIBELLES = [
    ("Non-Farm Employment Change", "Créations d'emplois américaines (NFP)",
     "Le chiffre qui fait le plus bouger le dollar et les indices US : il dit si l'économie embauche, donc si la Fed peut baisser ses taux."),
    ("Unemployment Rate", "Taux de chômage",
     "Un chômage qui monte pousse la banque centrale vers des baisses de taux."),
    ("Core CPI", "Inflation sous-jacente (hors énergie et alimentation)",
     "La mesure que les banques centrales surveillent le plus : une surprise à la hausse éloigne les baisses de taux."),
    ("CPI", "Inflation (indice des prix)",
     "Plus d'inflation que prévu, c'est des taux plus hauts plus longtemps : mauvais pour les actions de croissance, bon pour la devise."),
    ("Core PCE", "Inflation PCE sous-jacente",
     "L'indicateur d'inflation préféré de la Fed."),
    ("PPI", "Prix à la production",
     "L'inflation en amont, qui annonce souvent celle des prix à la consommation."),
    ("Federal Funds Rate", "Décision de taux de la Fed",
     "Le rendez-vous le plus important du mois pour tous les marchés."),
    ("FOMC", "Fed (FOMC)",
     "Tout ce que dit la Fed sur ses prochains taux déplace le dollar, l'or et les indices."),
    ("Main Refinancing Rate", "Décision de taux de la BCE",
     "Le taux directeur de la zone euro : il fait bouger l'euro et les banques européennes."),
    ("ECB", "BCE",
     "Les mots de la BCE sur l'inflation et les taux font bouger l'euro et les actions européennes."),
    ("Official Bank Rate", "Décision de taux de la Banque d'Angleterre", "Fait bouger la livre et le FTSE."),
    ("BOJ", "Banque du Japon", "Fait bouger le yen, et par ricochet tous les marchés quand elle surprend."),
    ("GDP", "Croissance (PIB)", "La santé de l'économie sur le trimestre."),
    ("Retail Sales", "Ventes au détail", "La consommation des ménages, moteur de l'économie."),
    ("ISM Manufacturing PMI", "Indice ISM manufacturier (États-Unis)", "Au-dessus de 50, l'industrie accélère ; en dessous, elle ralentit."),
    ("ISM Services PMI", "Indice ISM des services (États-Unis)", "Le secteur qui pèse le plus dans l'économie américaine."),
    ("Manufacturing PMI", "Indice PMI manufacturier", "Au-dessus de 50, l'industrie accélère ; en dessous, elle ralentit."),
    ("Services PMI", "Indice PMI des services", "Le moral des entreprises de services."),
    ("Unemployment Claims", "Inscriptions hebdomadaires au chômage (US)", "Le thermomètre le plus rapide du marché du travail américain."),
    ("JOLTS", "Offres d'emploi (JOLTS)", "Le nombre de postes à pourvoir aux États-Unis."),
    ("Consumer Confidence", "Confiance des consommateurs", "Ce que les ménages pensent de l'économie."),
    ("Consumer Sentiment", "Moral des ménages (Michigan)", "Ce que les ménages pensent de l'économie, et de l'inflation à venir."),
    ("German Ifo", "Climat des affaires allemand (Ifo)", "Le baromètre de la première économie européenne."),
    ("ZEW", "Sentiment économique (ZEW)", "Le moral des investisseurs sur l'Allemagne."),
    ("Crude Oil Inventories", "Stocks de pétrole américains", "Des stocks qui baissent plus que prévu font monter le pétrole."),
    ("Speaks", "Discours", "Un discours peut déplacer le marché s'il laisse entendre un changement de politique."),
    ("Bank Holiday", "Jour férié", "Marché fermé ou peu actif dans ce pays."),
]
PAYS = {"USD": "États-Unis", "EUR": "Zone euro", "GBP": "Royaume-Uni", "JPY": "Japon",
        "CHF": "Suisse", "CAD": "Canada", "AUD": "Australie", "NZD": "Nouvelle-Zélande",
        "CNY": "Chine"}
IMPORTANCE = {"High": "forte", "Medium": "moyenne", "Low": "faible", "Holiday": "férié"}


QUALIFICATIFS = [("French ", "France"), ("German ", "Allemagne"), ("Spanish ", "Espagne"),
                 ("Italian ", "Italie"), ("Flash ", "première estimation"), ("Revised ", "révisé"),
                 ("Prelim ", "préliminaire"), ("Final ", "définitif")]


def _libelle(titre: str) -> tuple[str, str]:
    for motif, fr, pourquoi in LIBELLES:
        if motif.lower() in titre.lower():
            if motif == "Speaks":
                qui = titre.replace("Speaks", "").strip()
                return f"Discours : {qui}", pourquoi
            precisions = [mot for cle, mot in QUALIFICATIFS if cle in f"{titre} "]
            return (f"{fr} ({', '.join(precisions)})" if precisions else fr), pourquoi
    return titre, ""


async def _cal_init():
    global _cal_pret
    if _cal_pret:
        return
    cle = "SERIAL PRIMARY KEY" if USE_POSTGRES else "INTEGER PRIMARY KEY AUTOINCREMENT"
    await execute_write(f"""
        CREATE TABLE IF NOT EXISTS macro_calendar (
            id {cle},
            cle TEXT NOT NULL UNIQUE,
            titre TEXT NOT NULL,
            pays TEXT NOT NULL,
            quand TEXT NOT NULL,
            importance TEXT,
            prevision TEXT,
            precedent TEXT,
            vu_le TEXT NOT NULL
        )
    """)
    _cal_pret = True


async def _rafraichir_calendrier() -> None:
    """Relit le calendrier publié et le range en base.

    Le flux ne couvre que la semaine en cours (du dimanche au samedi, heure
    de New York) : la semaine suivante n'y apparaît que le dimanche. La base
    garde donc ce qui a été lu, pour que rien ne disparaisse d'une lecture à
    l'autre.
    """
    await _cal_init()
    # None tant que rien n'a été lu : comparer à 0 ferait dépendre la première
    # lecture du temps écoulé depuis le démarrage de la machine.
    if _CAL_CACHE["at"] is not None and time.monotonic() - _CAL_CACHE["at"] < _CAL_TTL:
        return
    _CAL_CACHE["at"] = time.monotonic()
    try:
        async with httpx.AsyncClient(timeout=15.0, headers={"User-Agent": "Mozilla/5.0"}) as c:
            r = await c.get(CALENDRIER_URL)
            r.raise_for_status()
            evenements = r.json()
    except Exception as exc:
        logger.warning("calendrier économique indisponible : %s", exc)
        return
    maintenant = datetime.now(timezone.utc).isoformat()
    for e in evenements if isinstance(evenements, list) else []:
        quand = _a_dt(e.get("date"))
        if not quand or not e.get("title"):
            continue
        cle = f"{e.get('country')}|{e['title']}|{quand.astimezone(timezone.utc).isoformat()}"
        try:
            existe = await execute_query("SELECT id FROM macro_calendar WHERE cle = ?", (cle,))
            if existe:
                await execute_write(
                    "UPDATE macro_calendar SET importance = ?, prevision = ?, precedent = ?, vu_le = ? WHERE cle = ?",
                    (e.get("impact"), e.get("forecast"), e.get("previous"), maintenant, cle))
            else:
                await execute_write(
                    """INSERT INTO macro_calendar (cle, titre, pays, quand, importance, prevision, precedent, vu_le)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                    (cle, e["title"], e.get("country") or "", quand.astimezone(timezone.utc).isoformat(),
                     e.get("impact"), e.get("forecast"), e.get("previous"), maintenant))
        except Exception as exc:
            logger.warning("calendrier : ligne non enregistrée (%s)", exc)


def _chiffre(v) -> str | None:
    """« 54.1 » → « 54,1 », « 201K » → « 201 k » : le calendrier est publié à l'anglaise."""
    if not v:
        return None
    v = str(v).replace(".", ",")
    v = v.replace("%", "\u202f%")
    for suffixe, fr in (("K", "\u202fk"), ("M", "\u202fM"), ("B", "\u202fMd")):
        if v.endswith(suffixe):
            v = v[:-1] + fr
    return v


def _evenement(r: dict) -> dict:
    quand = _a_dt(r["quand"]).astimezone(PARIS)
    fr, pourquoi = _libelle(r["titre"])
    return {
        "titre": fr,
        "titre_origine": r["titre"],
        "pourquoi": pourquoi,
        "pays": r["pays"],
        "pays_nom": PAYS.get(r["pays"], r["pays"]),
        "quand": quand.isoformat(),
        "jour": f"{JOURS[quand.weekday()]} {quand.day}",
        "heure": quand.strftime("%H:%M") if (quand.hour, quand.minute) != (0, 0) else "journée",
        "importance": IMPORTANCE.get(r.get("importance") or "", "faible"),
        "prevision": _chiffre(r.get("prevision")),
        "precedent": _chiffre(r.get("precedent")),
    }


async def _agenda(devises: set[str], lundi: date, lundi_ecoule: date) -> dict:
    await _rafraichir_calendrier()
    debut_ecoule = datetime(lundi_ecoule.year, lundi_ecoule.month, lundi_ecoule.day, tzinfo=PARIS)
    debut = datetime(lundi.year, lundi.month, lundi.day, tzinfo=PARIS)
    fin = debut + timedelta(days=6)
    try:
        lignes = await execute_query(
            "SELECT * FROM macro_calendar WHERE quand >= ? AND quand < ? ORDER BY quand",
            (debut_ecoule.astimezone(timezone.utc).isoformat(), fin.astimezone(timezone.utc).isoformat()),
        ) or []
    except Exception:
        lignes = []

    a_venir, ecoule = [], []
    for r in lignes:
        if r["pays"] not in devises:
            continue
        quand = _a_dt(r["quand"])
        e = _evenement(r)
        if quand >= debut:
            if r.get("importance") in ("High", "Medium", "Holiday"):
                a_venir.append(e)
        elif r.get("importance") in ("High", "Medium"):
            ecoule.append(e)

    return {
        "a_venir": a_venir,
        "semaine_ecoulee": ecoule[-10:],
        # Le flux publie la semaine suivante le dimanche : le samedi, on le dit
        # plutôt que de laisser croire qu'il n'y a rien.
        "publie": bool(a_venir),
        "note": None if a_venir else
            "Le calendrier de la semaine prochaine est publié dans la nuit de samedi à dimanche. "
            "Revenez dimanche : les rendez-vous apparaîtront ici.",
        "source": "ForexFactory",
        "devises": sorted(devises),
    }


# ── 5. Ce qu'il faut penser ───────────────────────────────────────────────

STYLE_MOT = {"scalp": "scalper", "day": "day trader", "swing": "swing trader", "long": "investisseur long terme"}


def _a_penser(profil: dict, semaine: dict, ouvertes: list, prix: dict, agenda: dict) -> list[dict]:
    """Des constats, pas des conseils génériques : chacun cite ce qui le déclenche."""
    out: list[dict] = []
    style = profil.get("style") or "day"

    sans_stop = [p for p in ouvertes if p.get("stop_loss") is None and p.get("instrument") != "turbo"]
    if sans_stop:
        noms = ", ".join(_nom(p["symbol"]) for p in sans_stop[:3])
        out.append({
            "niveau": "important",
            "titre": f"{len(sans_stop)} position{'s' if len(sans_stop) > 1 else ''} sans stop : {noms}",
            "texte": "Le week-end, une nouvelle peut faire ouvrir le cours lundi loin de la clôture de vendredi. "
                     "Sans stop, rien ne limite ce que cet écart peut coûter. Décidez maintenant où vous sortez.",
            "lien": "/wallet",
        })

    actions = [p for p in ouvertes if not _crypto(p["symbol"])]
    if actions:
        out.append({
            "niveau": "conseil",
            "titre": "Le risque d'écart à l'ouverture",
            "texte": f"Vous gardez {len(actions)} position{'s' if len(actions) > 1 else ''} sur des marchés fermés. "
                     "Un stop n'est pas une garantie de prix : si lundi ouvre au-delà, l'ordre s'exécute au premier "
                     "cours disponible, pas à votre niveau.",
            "lien": "/wallet",
        })

    cryptos = [p for p in ouvertes if _crypto(p["symbol"])]
    if cryptos:
        out.append({
            "niveau": "important",
            "titre": "Le marché crypto ne ferme pas",
            "texte": f"{', '.join(_nom(p['symbol']) for p in cryptos[:3])} continue de coter tout le week-end : "
                     "vos stops et objectifs peuvent être touchés avant lundi. Vérifiez qu'ils sont là où vous le voulez.",
            "lien": "/wallet",
        })

    for p in ouvertes:
        if p.get("instrument") == "turbo" and p.get("barriere"):
            cours = (prix.get(p["symbol"]) or {}).get("dernier")
            if cours:
                long = (p.get("direction") or "LONG") == "LONG"
                dist = ((cours - p["barriere"]) if long else (p["barriere"] - cours)) / cours * 100
                if dist < 5:
                    out.append({
                        "niveau": "important",
                        "titre": f"Turbo {_nom(p['symbol'])} à {nombre_fr(dist, 1)} % de sa barrière",
                        "texte": "Un écart d'ouverture de cette taille suffit à le désactiver. S'il est désactivé, "
                                 "il ne vaut plus rien et il n'y a rien à vendre.",
                        "lien": "/wallet",
                    })

    if style in ("scalp", "day") and ouvertes:
        out.append({
            "niveau": "conseil",
            "titre": f"Vous vous êtes déclaré {STYLE_MOT[style]}",
            "texte": f"Et vous portez {len(ouvertes)} position{'s' if len(ouvertes) > 1 else ''} pendant le week-end. "
                     "C'est un autre métier : le trade prévu pour la journée est devenu un pari sur l'ouverture de lundi. "
                     "Si c'était voulu, rien à redire ; sinon, notez-le dans votre journal.",
            "lien": "/journal",
        })

    # La semaine écoulée, lue comme un bilan.
    if semaine["trades"]:
        if semaine["sans_stop"]:
            out.append({
                "niveau": "important",
                "titre": f"{semaine['sans_stop']} trade{'s' if semaine['sans_stop'] > 1 else ''} sur {semaine['trades']} sans stop cette semaine",
                "texte": "C'est la première habitude à corriger : le stop se décide avant d'entrer, "
                         "au moment où l'on est encore lucide.",
                "lien": "/journal",
            })
        if semaine["perdants"] >= 2 and semaine["resultat"] < 0:
            out.append({
                "niveau": "conseil",
                "titre": "Relisez vos pertes avant d'en prendre d'autres",
                "texte": f"{semaine['perdants']} trades perdants cette semaine. Ouvrez-les dans le journal et cherchez "
                         "ce qu'ils ont en commun — l'heure, l'actif, le type d'entrée. C'est rarement le hasard.",
                "lien": "/journal",
            })
        if semaine["journal"] < semaine["trades"]:
            manque = semaine["trades"] - semaine["journal"]
            out.append({
                "niveau": "conseil",
                "titre": f"{manque} trade{'s' if manque > 1 else ''} sans note au journal",
                "texte": "Le week-end est le seul moment où l'on peut relire sa semaine sans avoir de décision à prendre. "
                         "Une ligne par trade suffit : pourquoi vous êtes entré.",
                "lien": "/journal",
            })
    else:
        out.append({
            "niveau": "conseil",
            "titre": "Aucun trade cette semaine",
            "texte": "Ce n'est pas un défaut. Profitez-en pour préparer un ou deux scénarios précis — un actif, "
                     "une entrée, un stop, un objectif — plutôt que de chercher lundi quoi faire.",
            "lien": "/analysis",
        })

    # Les rendez-vous forts de la semaine qui vient.
    forts = [e for e in agenda["a_venir"] if e["importance"] == "forte"]
    if forts:
        premier = forts[0]
        out.append({
            "niveau": "conseil",
            "titre": f"{len(forts)} rendez-vous macro important{'s' if len(forts) > 1 else ''} cette semaine",
            "texte": f"Le premier : {premier['titre']} ({premier['pays_nom']}), {premier['jour']} à {premier['heure']}. "
                     "Autour de ces annonces, les cours peuvent bondir en quelques secondes : "
                     "élargissez vos stops ou attendez la publication pour entrer.",
            "lien": None,
        })

    if profil.get("goal") == "comprendre":
        out.append({
            "niveau": "conseil",
            "titre": "Une leçon pendant que les marchés dorment",
            "texte": "Vous avez dit vouloir comprendre comment ça marche. Le week-end est le bon moment : "
                     "aucune séance ne vous presse.",
            "lien": "/learn",
        })

    ordre = {"important": 0, "conseil": 1}
    out.sort(key=lambda x: ordre.get(x["niveau"], 2))
    return out[:3] if profil.get("weekly_time") == "court" else out[:7]


# ── 6. La synthèse, rédigée à partir des faits ────────────────────────────

SYNTHESE_PROMPT = """Tu rédiges, en français, le mot d'ouverture d'une page de préparation de la semaine
pour un utilisateur d'un simulateur de trading éducatif. Tu tutoies jamais : tu vouvoies.

RÈGLES ABSOLUES :
- N'utilise QUE les faits du JSON ci-dessous. Aucun chiffre, aucun niveau de prix, aucun événement qui n'y figure pas.
- Aucune prévision de direction du marché, aucune recommandation d'achat ou de vente.
- 4 à 6 phrases, un seul paragraphe, sans titre, sans liste, sans emoji.
- Commence par la semaine écoulée de l'utilisateur, puis ce qui l'attend, puis la chose la plus importante à faire avant lundi.

FAITS :
{faits}
"""


async def _synthese_init():
    cle = "SERIAL PRIMARY KEY" if USE_POSTGRES else "INTEGER PRIMARY KEY AUTOINCREMENT"
    await execute_write(f"""
        CREATE TABLE IF NOT EXISTS weekend_synthese (
            id {cle},
            user_id INTEGER NOT NULL,
            lundi TEXT NOT NULL,
            texte TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    """)


# ── Routes ────────────────────────────────────────────────────────────────


@router.get("/fenetre")
async def etat_fenetre():
    """L'espace est-il ouvert ? Sans authentification : l'accueil s'en sert."""
    return fenetre()


async def _tout(user: dict) -> dict:
    f = fenetre()
    lundi = date.fromisoformat(f["lundi"])
    lundi_ecoule = date.fromisoformat(f["lundi_ecoule"])
    debut = datetime(lundi_ecoule.year, lundi_ecoule.month, lundi_ecoule.day, tzinfo=PARIS)
    fin = datetime(lundi.year, lundi.month, lundi.day, 9, tzinfo=PARIS)

    profil = await _profil(user)
    semaine = await _ma_semaine(user, debut, fin)
    ouvertes = semaine.pop("_ouvertes")
    suivis = await _symboles_suivis(user, ouvertes)

    reperes: list[str] = []
    for m in profil["markets"] or []:
        reperes += REPERES[m]
    reperes = list(dict.fromkeys(reperes or REPERES_DEFAUT))[:6]

    devises: set[str] = set()
    for m in profil["markets"] or []:
        devises |= DEVISES_AGENDA[m]
    devises = devises or {"USD", "EUR"}

    actifs, actu, agenda = await asyncio.gather(
        _actifs(suivis, reperes, lundi_ecoule),
        _actualite(suivis),
        _agenda(devises, lundi, lundi_ecoule),
        return_exceptions=True,
    )
    if isinstance(actifs, Exception):
        logger.warning("semaine : actifs indisponibles (%s)", actifs)
        actifs = {"suivis": [], "reperes": []}
    if isinstance(actu, Exception):
        logger.warning("semaine : actualité indisponible (%s)", actu)
        actu = {"sujets": [], "vos_actifs": [], "veille": {}}
    if isinstance(agenda, Exception):
        logger.warning("semaine : agenda indisponible (%s)", agenda)
        agenda = {"a_venir": [], "semaine_ecoulee": [], "publie": False,
                  "note": "Le calendrier économique n'a pas pu être lu.", "source": "ForexFactory",
                  "devises": sorted(devises)}

    prix = {a["symbole"]: a for a in actifs["suivis"] + actifs["reperes"]}
    positions = [{
        "symbole": p["symbol"], "nom": _nom(p["symbol"]), "sens": p.get("direction"),
        "instrument": p.get("instrument") or "cfd", "montant": p.get("amount"),
        "stop": p.get("stop_loss"), "objectif": p.get("take_profit"), "barriere": p.get("barriere"),
        "crypto": _crypto(p["symbol"]),
        "semaine_pct": (prix.get(p["symbol"]) or {}).get("semaine_pct"),
    } for p in ouvertes]

    return {
        "fenetre": f,
        "profil": {k: profil[k] for k in ("goal", "markets", "style", "weekly_time")},
        "semaine": semaine,
        "positions": positions,
        "actifs": actifs,
        "actualite": actu,
        "agenda": agenda,
        "a_penser": _a_penser(profil, semaine, ouvertes, prix, agenda),
    }


@router.get("")
@limiter.limit("20/minute")
async def preparation(request: Request, current_user: dict = Depends(get_current_user)):
    """La préparation de la semaine, pour cet utilisateur. Le week-end seulement."""
    f = fenetre()
    if not f["ouvert"]:
        raise HTTPException(status_code=403, detail={
            "message": "La préparation de la semaine ouvre le vendredi soir, après la clôture de Wall Street.",
            "prochaine_ouverture": f["prochaine_ouverture"],
        })
    return await _tout(current_user)


@router.get("/synthese")
@limiter.limit("6/minute")
async def synthese(request: Request, current_user: dict = Depends(get_current_user)):
    """Le mot d'ouverture, rédigé par un modèle à partir des faits — et d'eux seuls.

    Une fois par utilisateur et par week-end : la relire ne doit pas coûter un
    appel, et la voir changer à chaque visite la rendrait suspecte.
    """
    f = fenetre()
    if not f["ouvert"]:
        raise HTTPException(status_code=403, detail="Hors week-end.")
    uid = current_user["id"]
    await _synthese_init()
    deja = await execute_query(
        "SELECT texte FROM weekend_synthese WHERE user_id = ? AND lundi = ?", (uid, f["lundi"]))
    if deja:
        return {"texte": deja[0]["texte"], "source": "cache"}

    from ._llm import LLMUnavailable, configured_providers, llm_chat
    if not configured_providers():
        return {"texte": None, "source": "indisponible"}

    d = await _tout(current_user)
    faits = {
        "semaine_utilisateur": d["semaine"],
        "positions_ouvertes": [{k: p[k] for k in ("nom", "sens", "instrument", "stop", "semaine_pct")} for p in d["positions"]],
        "actifs_suivis": [{k: a.get(k) for k in ("nom", "semaine_pct")} for a in d["actifs"]["suivis"] if a.get("disponible")],
        "reperes": [{k: a.get(k) for k in ("nom", "semaine_pct")} for a in d["actifs"]["reperes"] if a.get("disponible")],
        "sujets_actualite": [s.get("titre_fr") for s in d["actualite"]["sujets"][:4]],
        "agenda_a_venir": [{k: e[k] for k in ("titre", "pays_nom", "jour", "heure", "importance")}
                           for e in d["agenda"]["a_venir"] if e["importance"] == "forte"][:6],
        "points_a_penser": [p["titre"] for p in d["a_penser"]],
        "style_declare": d["profil"]["style"],
    }
    try:
        texte = (await llm_chat(
            [{"role": "user", "content": SYNTHESE_PROMPT.format(faits=json.dumps(faits, ensure_ascii=False))}],
            temperature=0.3, max_tokens=500, timeout=45.0)).strip()
    except LLMUnavailable:
        return {"texte": None, "source": "indisponible"}
    except Exception as exc:
        logger.warning("synthèse du week-end : %s", exc)
        return {"texte": None, "source": "indisponible"}
    if not texte:
        return {"texte": None, "source": "indisponible"}
    await execute_write(
        "INSERT INTO weekend_synthese (user_id, lundi, texte, created_at) VALUES (?, ?, ?, ?)",
        (uid, f["lundi"], texte, datetime.now(timezone.utc).isoformat()))
    return {"texte": texte, "source": "ia"}
