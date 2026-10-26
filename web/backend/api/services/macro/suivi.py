"""
Le suivi en direct : ce qui a été annoncé, comment le marché l'a lu, ce que ça
change pour chaque actif.

DÈS QUE L'HEURE D'UNE ANNONCE EST PASSÉE, TROIS LECTURES :

  1. LA SOURCE. Pour une banque centrale, le communiqué OFFICIEL, lu sur son
     flux (federalreserve.gov, ecb.europa.eu, bankofengland.co.uk) : on en
     extrait la décision — hausse, baisse ou maintien, de combien, à quel
     niveau, avec quel vote. Pour une statistique, aucune source gratuite ne
     publie le chiffre en direct : on cite les titres de presse parus après
     l'annonce, sans en tirer un nombre qu'on ne saurait pas vérifier.
  2. LA RÉACTION. Les cours, minute par minute, juste avant et une heure
     après : taux américain à 5 ans, dollar, euro, indices, or, bitcoin.
  3. LA LECTURE. C'est le marché qui dit si l'annonce a surpris : un taux à
     5 ans qui prend 8 points de base dans l'heure dit « plus ferme
     qu'attendu », quoi qu'en disent les titres. Cette lecture oriente ensuite
     l'impact sur chaque actif (impact.py).

L'annonce passe par trois états : « à venir », « en cours » (la première
heure, lecture provisoire), « publié » (lecture définitive).
"""
from __future__ import annotations

import html as _html
import json
import logging
import re
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime

import httpx

from ...database import USE_POSTGRES, execute_query, execute_write
from . import calendrier
from ._texte import nombre, pb, pct
from .familles import FAMILLES

logger = logging.getLogger(__name__)
UA = calendrier.UA

FLUX = {
    "FED": ("https://www.federalreserve.gov/feeds/press_monetary.xml", re.compile(r"issues FOMC statement", re.I)),
    "BCE": ("https://www.ecb.europa.eu/rss/press.html", re.compile(r"monetary policy decisions", re.I)),
    "BOE": ("https://www.bankofengland.co.uk/rss/news", re.compile(r"Bank Rate (maintained|increased|reduced|cut|raised)", re.I)),
}

# Le thermomètre de chaque banque centrale, et le seuil au-delà duquel son
# mouvement dans l'heure est une surprise. `signe` : +1 si une hausse du
# thermomètre veut dire « plus ferme ».
LECTEURS = {
    "FED": [("^FVX", "pb", 3.0, +1, "le taux américain à 5 ans"), ("DX-Y.NYB", "%", 0.2, +1, "le dollar")],
    "BCE": [("EURUSD=X", "%", 0.15, +1, "l'euro contre le dollar")],
    "BOE": [("GBPUSD=X", "%", 0.2, +1, "la livre contre le dollar")],
    "BOJ": [("JPY=X", "%", 0.3, -1, "le dollar contre le yen")],
}

# Ce qu'on montre de la réaction, par banque centrale.
PANNEAU = {
    "FED": ["^FVX", "DX-Y.NYB", "EURUSD=X", "ES=F", "NQ=F", "GC=F", "BTC-USD"],
    "BCE": ["EURUSD=X", "^STOXX50E", "^FCHI", "ES=F", "GC=F", "BTC-USD"],
    "BOE": ["GBPUSD=X", "^FTSE", "EURUSD=X"],
    "BOJ": ["JPY=X", "^N225", "BTC-USD"],
}
NOMS = {
    "^FVX": "Taux US à 5 ans", "DX-Y.NYB": "Dollar (indice DXY)", "EURUSD=X": "Euro / dollar",
    "ES=F": "S&P 500 (contrat à terme)", "NQ=F": "Nasdaq 100 (contrat à terme)", "GC=F": "Or",
    "BTC-USD": "Bitcoin", "^STOXX50E": "Euro Stoxx 50", "^FCHI": "CAC 40", "GBPUSD=X": "Livre / dollar",
    "^FTSE": "FTSE 100", "JPY=X": "Dollar / yen", "^N225": "Nikkei 225",
}

MINUTES_LECTURE = 60


# ── 1. La source officielle ───────────────────────────────────────────────


def _frac(s: str) -> float | None:
    """« 3-3/4 » → 3,75 ; « 4 » → 4 ; « 1/4 » → 0,25."""
    s = s.strip()
    m = re.fullmatch(r"(\d+)-(\d+)/(\d+)", s)
    if m:
        return int(m[1]) + int(m[2]) / int(m[3])
    m = re.fullmatch(r"(\d+)/(\d+)", s)
    if m:
        return int(m[1]) / int(m[2])
    try:
        return float(s)
    except ValueError:
        return None


def _texte_page(h: str) -> str:
    return _html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", h)))


def lire_fed(texte: str) -> dict | None:
    m = re.search(r"decided to (raise|lower|maintain) the target range for the federal funds rate"
                  r"(?: by ([\d/ -]+?) percentage points?)? (?:to|at) ([\d/-]+) to ([\d/-]+) percent", texte)
    if not m:
        return None
    action = {"raise": "hausse", "lower": "baisse", "maintain": "maintien"}[m[1]]
    ampleur = _frac(m[2]) if m[2] else 0.0
    bas, haut = _frac(m[3]), _frac(m[4])
    vote = re.search(r"by a (\d+)\s*[–-]\s*(\d+) vote", texte)
    extrait = texte[m.start(): m.start() + 600]
    return {
        "action": action,
        "ampleur_pb": round((ampleur or 0) * 100),
        "niveau": f"{nombre(bas, 2).rstrip('0').rstrip(',')}–{nombre(haut, 2).rstrip('0').rstrip(',')} %" if bas is not None and haut is not None else None,
        "niveau_haut": haut,
        "vote": f"{vote[1]} voix contre {vote[2]}" if vote else None,
        "unanime": bool(vote and vote[2] == "0"),
        "extrait": extrait,
    }


def lire_bce(texte: str) -> dict | None:
    m = re.search(r"decided to (keep|raise|increase|lower|reduce|cut) the three key ECB interest rates"
                  r"(?: unchanged)?(?: by (\d+) basis points)?", texte)
    if not m:
        return None
    verbe = m[1]
    action = "maintien" if verbe == "keep" else "hausse" if verbe in ("raise", "increase") else "baisse"
    niveau = re.search(r"deposit facility[^.]{0,120}?(\d+\.\d+)\s?%", texte)
    return {
        "action": action,
        "ampleur_pb": int(m[2]) if m[2] else 0,
        "niveau": f"{niveau[1].replace('.', ',')} % (taux de dépôt)" if niveau else None,
        "niveau_haut": float(niveau[1]) if niveau else None,
        "vote": None, "unanime": None,
        "extrait": texte[m.start(): m.start() + 600],
    }


def lire_boe(titre: str, texte: str) -> dict | None:
    m = re.search(r"Bank Rate (maintained|increased|reduced|cut|raised) (?:to|at) (\d+(?:\.\d+)?)%", titre + " " + texte)
    if not m:
        return None
    action = {"maintained": "maintien", "increased": "hausse", "raised": "hausse"}.get(m[1], "baisse")
    vote = re.search(r"voted by a majority of (\d+)[–-](\d+)|voted (?:unanimously|by (\d+)[–-](\d+))", texte)
    return {
        "action": action, "ampleur_pb": None,
        "niveau": f"{m[2].replace('.', ',')} %", "niveau_haut": float(m[2]),
        "vote": (f"{vote[1]} voix contre {vote[2]}" if vote and vote[1] else None),
        "unanime": None, "extrait": texte[:600],
    }


async def _rss(url: str) -> list[dict]:
    async with httpx.AsyncClient(timeout=20.0, headers=UA, follow_redirects=True) as c:
        r = await c.get(url)
        r.raise_for_status()
    out = []
    for bloc in re.findall(r"<item>(.*?)</item>", r.text, re.S):
        def champ(n):
            m = re.search(rf"<{n}>(.*?)</{n}>", bloc, re.S)
            v = (m[1] if m else "").strip()
            return re.sub(r"^<!\[CDATA\[(.*)\]\]>$", r"\1", v, flags=re.S).strip()
        try:
            quand = parsedate_to_datetime(champ("pubDate"))
        except (TypeError, ValueError):
            continue
        out.append({"titre": _html.unescape(champ("title")), "lien": champ("link"), "quand": quand})
    return out


async def source_officielle(banque: str, t0: datetime) -> dict | None:
    """Le communiqué publié à l'heure de l'annonce, lu et résumé en chiffres."""
    if banque not in FLUX:
        return None
    url, motif = FLUX[banque]
    try:
        items = await _rss(url)
    except Exception as exc:
        logger.warning("macro : flux officiel %s illisible (%s)", banque, exc)
        return None
    for it in items:
        if not motif.search(it["titre"]):
            continue
        if not (t0 - timedelta(minutes=30) <= it["quand"] <= t0 + timedelta(hours=6)):
            continue
        try:
            async with httpx.AsyncClient(timeout=20.0, headers=UA, follow_redirects=True) as c:
                page = await c.get(it["lien"])
            texte = _texte_page(page.text)
        except Exception:
            texte = ""
        lu = (lire_fed(texte) if banque == "FED" else lire_bce(texte) if banque == "BCE"
              else lire_boe(it["titre"], texte))
        return {"titre": it["titre"], "url": it["lien"], "publie_le": it["quand"].isoformat(),
                "decision": lu, "texte": texte[:6000]}
    return None


# ── 2. La réaction des cours ──────────────────────────────────────────────


async def _variation(symbole: str, t0: datetime, minutes: int) -> dict | None:
    """Du dernier cours avant l'annonce au cours `minutes` après."""
    from ...routes._prices import fetch_ohlcv
    age = datetime.now(timezone.utc) - t0
    periode = "5d" if age < timedelta(days=4) else "1mo"
    try:
        df = await fetch_ohlcv(symbole, periode, "5m")
    except Exception:
        return None
    if df is None or getattr(df, "empty", True):
        return None
    idx = df.index
    if idx.tz is None:
        idx = idx.tz_localize("UTC")
    close = df["Close"].copy()
    close.index = idx.tz_convert("UTC")
    avant = close[close.index < t0]
    apres = close[(close.index >= t0) & (close.index <= t0 + timedelta(minutes=minutes))]
    if avant.empty or apres.empty or (t0 - avant.index[-1]) > timedelta(hours=3):
        return None
    ref, fin = float(avant.iloc[-1]), float(apres.iloc[-1])
    minutes_vues = int((apres.index[-1] - t0).total_seconds() // 60) + 5
    if symbole in ("^FVX", "^TNX", "^IRX"):
        return {"symbole": symbole, "nom": NOMS.get(symbole, symbole), "avant": round(ref, 3),
                "apres": round(fin, 3), "variation": round((fin - ref) * 100, 1), "unite": "pb",
                "minutes": minutes_vues}
    return {"symbole": symbole, "nom": NOMS.get(symbole, symbole), "avant": round(ref, 5),
            "apres": round(fin, 5), "variation": round((fin / ref - 1) * 100, 2), "unite": "%",
            "minutes": minutes_vues}


def lecture_du_marche(banque: str, reaction: dict[str, dict]) -> dict:
    """Le premier thermomètre disponible dit si l'annonce a surpris, et dans quel sens."""
    for sym, unite, seuil, signe, nom in LECTEURS.get(banque, []):
        r = reaction.get(sym)
        if not r:
            continue
        v = r["variation"] * signe
        sens = 1 if v >= seuil else -1 if v <= -seuil else 0
        mouvement = pb(r["variation"]) if unite == "pb" else pct(r["variation"])
        verbe = "a pris" if r["variation"] > 0 else "a perdu"
        mv = mouvement.lstrip("+−-")
        if sens > 0:
            phrase = f"{nom[0].upper()}{nom[1:]} {verbe} {mv} dans les {r['minutes']} minutes qui ont suivi : le marché a lu l'annonce comme plus ferme qu'attendu."
        elif sens < 0:
            phrase = f"{nom[0].upper()}{nom[1:]} {verbe} {mv} dans les {r['minutes']} minutes qui ont suivi : le marché a lu l'annonce comme plus souple qu'attendu."
        else:
            phrase = f"{nom[0].upper()}{nom[1:]} n'a presque pas bougé ({mouvement} en {r['minutes']} minutes) : pas de surprise, l'annonce était attendue."
        return {"sens": sens, "thermometre": sym, "mouvement": r["variation"], "unite": unite, "phrase": phrase}
    return {"sens": None, "thermometre": None, "mouvement": None, "unite": None,
            "phrase": "La réaction des cours n'a pas pu être mesurée (marché fermé ou cours indisponibles)."}


# ── 3. Ce qu'en dit la presse ─────────────────────────────────────────────


async def presse(famille: str, t0: datetime) -> list[dict]:
    mots = [m.lower() for m in FAMILLES.get(famille, {}).get("presse", [])]
    if not mots:
        return []
    try:
        from ..news_fetcher import collect_all
        articles = await collect_all()
    except Exception:
        return []
    out = []
    for a in articles:
        try:
            quand = parsedate_to_datetime(a.get("pub_date") or "")
            if quand.tzinfo is None:
                quand = quand.replace(tzinfo=timezone.utc)
        except (TypeError, ValueError):
            continue
        if not (t0 - timedelta(minutes=5) <= quand <= t0 + timedelta(hours=8)):
            continue
        titre = (a.get("title") or "")
        texte = f"{titre} {a.get('summary') or ''}".lower()
        score = sum(1 for m in mots if m in texte)
        if score >= 1:
            out.append({"titre": titre, "source": a.get("source"), "lien": a.get("link"),
                        "quand": quand.isoformat(), "_s": score})
    out.sort(key=lambda x: (-x["_s"], x["quand"]))
    vus, garde = set(), []
    for x in out:
        cle = x["titre"][:60].lower()
        if cle in vus:
            continue
        vus.add(cle)
        x.pop("_s")
        garde.append(x)
    return garde[:5]


# ── Le résumé ─────────────────────────────────────────────────────────────

ACTION_MOT = {"hausse": "a relevé ses taux", "baisse": "a baissé ses taux", "maintien": "a laissé ses taux inchangés"}
QUI = {"FED": "La Fed", "BCE": "La BCE", "BOE": "La Banque d'Angleterre", "BOJ": "La Banque du Japon"}


def _consensus(prevision: str | None, decision: dict | None) -> str | None:
    if not prevision or not decision or decision.get("niveau_haut") is None:
        return None
    m = re.search(r"(-?\d+(?:\.\d+)?)", prevision)
    if not m:
        return None
    attendu = float(m[1])
    if abs(attendu - decision["niveau_haut"]) < 0.01:
        return "conforme au consensus"
    return f"alors que le consensus attendait {prevision.replace('.', ',')}"


def resume(ev: dict, officiel: dict | None, lecture: dict, articles: list[dict]) -> str:
    banque = ev.get("banque")
    phrases = []
    dec = officiel and officiel.get("decision")
    if dec:
        tete = f"{QUI.get(banque, 'La banque centrale')} {ACTION_MOT[dec['action']]}"
        if dec["action"] != "maintien" and dec.get("ampleur_pb"):
            tete += f" de {dec['ampleur_pb']} points de base"
        if dec.get("niveau"):
            tete += f", {'à' if dec['action'] != 'maintien' else 'à'} {dec['niveau']}"
        c = _consensus(ev.get("prevision"), dec)
        if c:
            tete += f", {c}"
        tete += "."
        if dec.get("vote"):
            tete += f" Vote : {dec['vote']}{' (unanime)' if dec.get('unanime') else ''}."
        phrases.append(tete)
    elif FAMILLES.get(ev.get("famille") or "", {}).get("type") == "statistique":
        prev = f" Consensus : {ev['prevision'].replace('.', ',')}" if ev.get("prevision") else ""
        prec = f", précédent : {ev['precedent'].replace('.', ',')}" if ev.get("precedent") else ""
        phrases.append(f"Chiffre publié.{prev}{prec}{'.' if prev or prec else ''}")
    phrases.append(lecture["phrase"])
    if articles and not dec:
        phrases.append(f"Dans la presse : « {articles[0]['titre']} » ({articles[0]['source']}).")
    return " ".join(phrases)


async def resume_ia(officiel: dict | None) -> str | None:
    """Le communiqué, résumé en français — à partir de son texte, et de lui seul."""
    if not officiel or not officiel.get("texte"):
        return None
    try:
        from ...routes._llm import configured_providers, llm_chat
        if not configured_providers():
            return None
        texte = officiel["texte"]
        i = max(0, texte.find("decided") - 1500)
        prompt = ("Résume en français, en 3 à 4 phrases, ce communiqué officiel de banque centrale. "
                  "Uniquement ce qui y est écrit : la décision, la raison donnée, ce qui est dit de la suite. "
                  "Aucun chiffre qui n'y figure pas, aucune prévision de marché.\n\nCOMMUNIQUÉ :\n" + texte[i:i + 4000])
        return (await llm_chat([{"role": "user", "content": prompt}], temperature=0.2, max_tokens=400, timeout=40.0)).strip() or None
    except Exception as exc:
        logger.warning("macro : résumé du communiqué (%s)", exc)
        return None


# ── La résolution d'une annonce ───────────────────────────────────────────


async def resoudre(ev: dict) -> dict | None:
    """Lit la source, la réaction et la presse ; écrit le résultat. Rend le résultat."""
    t0 = datetime.fromisoformat(ev["quand"])
    maintenant = datetime.now(timezone.utc)
    if maintenant < t0:
        return None
    banque = ev.get("banque")
    precedent = ev.get("resultat") or {}

    officiel = precedent.get("officiel")
    if banque in FLUX and not (officiel and officiel.get("decision")):
        officiel = await source_officielle(banque, t0) or officiel

    reaction = {}
    for sym in PANNEAU.get(banque or "", []):
        v = await _variation(sym, t0, MINUTES_LECTURE)
        if v:
            reaction[sym] = v
    lecture = lecture_du_marche(banque, reaction) if banque else {"sens": None, "phrase": ""}
    articles = await presse(ev.get("famille") or "", t0)

    definitif = maintenant >= t0 + timedelta(minutes=MINUTES_LECTURE + 10)
    resultat = {
        "officiel": {k: v for k, v in (officiel or {}).items() if k != "texte"} or None,
        "reaction": list(reaction.values()),
        "lecture": lecture,
        "presse": articles,
        "resume": resume(ev, officiel, lecture, articles),
        "resume_communique": precedent.get("resume_communique"),
        "maj": maintenant.isoformat(),
        "definitif": definitif,
    }
    if definitif and officiel and not resultat["resume_communique"]:
        resultat["resume_communique"] = await resume_ia(officiel)

    statut = "publie" if definitif else "en_cours"
    await execute_write(
        "UPDATE macro_calendar SET statut = ?, resultat = ?, resolu_le = ? WHERE id = ?",
        (statut, json.dumps(resultat, ensure_ascii=False), maintenant.isoformat(), ev["id"]))
    return resultat


async def a_resoudre() -> list[dict]:
    """Les annonces passées depuis moins de 12 h et pas encore définitivement lues."""
    await calendrier.init()
    maintenant = datetime.now(timezone.utc)
    rows = await execute_query(
        """SELECT * FROM macro_calendar
           WHERE quand <= ? AND quand >= ? AND famille IS NOT NULL
           AND (statut IS NULL OR statut <> 'publie')
           AND importance IN ('High', 'Medium')""",
        (maintenant.isoformat(), (maintenant - timedelta(hours=12)).isoformat())) or []
    out = []
    for r in rows:
        r = dict(r)
        try:
            r["resultat"] = json.loads(r["resultat"]) if r.get("resultat") else None
        except (ValueError, TypeError):
            r["resultat"] = None
        out.append(r)
    return out


# ── Les notifications ─────────────────────────────────────────────────────

_notif_pret = False


async def _notif_init():
    global _notif_pret
    if _notif_pret:
        return
    cle = "SERIAL PRIMARY KEY" if USE_POSTGRES else "INTEGER PRIMARY KEY AUTOINCREMENT"
    await execute_write(f"""
        CREATE TABLE IF NOT EXISTS macro_notifie (
            id {cle},
            evenement_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            genre TEXT NOT NULL
        )
    """)
    _notif_pret = True


async def _exposes(banque: str) -> dict[int, list[tuple[str, str, int]]]:
    """Par utilisateur : ses positions ouvertes que cette banque centrale touche."""
    from .impact import pour_actif
    from ...routes.market import SYMBOL_NAMES
    rows = await execute_query(
        "SELECT DISTINCT user_id, symbol FROM positions WHERE status = 'open' AND (archived IS NULL OR archived = 0)") or []
    par_user: dict[int, list] = {}
    cache: dict[str, dict] = {}
    for r in rows:
        uid = str(r["user_id"])
        if not uid.startswith("web_"):
            continue
        sym = r["symbol"]
        if sym not in cache:
            cache[sym] = await pour_actif(banque, sym, nom=SYMBOL_NAMES.get(sym, sym))
        imp = cache[sym]
        if imp["sens_si_restrictive"]:
            par_user.setdefault(int(uid[4:]), []).append((sym, imp["nom"], imp["sens_si_restrictive"]))
    return par_user


async def _deja(evid: int, uid: int, genre: str) -> bool:
    r = await execute_query(
        "SELECT id FROM macro_notifie WHERE evenement_id = ? AND user_id = ? AND genre = ?", (evid, uid, genre))
    return bool(r)


async def _notifier(uid: int, titre: str, message: str, lien: str) -> None:
    from ..notifications import notifier
    await notifier(uid, "macro", titre, message, lien)


async def rappels() -> None:
    """Une heure avant une décision de banque centrale ou un chiffre majeur,
    prévenir ceux dont une position ouverte y est exposée."""
    await _notif_init()
    maintenant = datetime.now(timezone.utc)
    rows = await execute_query(
        """SELECT * FROM macro_calendar WHERE quand > ? AND quand <= ? AND importance = 'High'
           AND famille IN ('FED_DECISION', 'BCE_DECISION', 'BOE_DECISION', 'US_CPI', 'US_EMPLOI', 'EZ_INFLATION')""",
        (maintenant.isoformat(), (maintenant + timedelta(minutes=70)).isoformat())) or []
    for ev in rows:
        banque = ev.get("banque")
        if not banque:
            continue
        nom = FAMILLES[ev["famille"]]["nom"]
        heure = datetime.fromisoformat(ev["quand"]).astimezone(calendrier.FRANCFORT).strftime("%H:%M")
        for uid, positions in (await _exposes(banque)).items():
            if await _deja(ev["id"], uid, "rappel"):
                continue
            liste = ", ".join(n for _, n, _ in positions[:3])
            await _notifier(uid, f"Dans une heure : {nom}",
                            f"À {heure} (Paris). Vos positions exposées : {liste}. Autour de l'annonce, les cours "
                            "peuvent bondir en quelques secondes et un stop trop serré peut sauter.",
                            f"/macro?e={ev['id']}")
            await execute_write("INSERT INTO macro_notifie (evenement_id, user_id, genre) VALUES (?, ?, 'rappel')",
                                (ev["id"], uid))


async def annoncer(ev: dict, resultat: dict) -> None:
    """Une fois la lecture définitive, dire à chacun ce que ça change pour ses positions."""
    if ev.get("importance") != "High" or not ev.get("banque") or not resultat.get("definitif"):
        return
    await _notif_init()
    lecture = (resultat.get("lecture") or {}).get("sens")
    nom = FAMILLES.get(ev.get("famille") or "", {}).get("nom", ev["titre"])
    for uid, positions in (await _exposes(ev["banque"])).items():
        if await _deja(ev["id"], uid, "resultat"):
            continue
        if lecture:
            effets = [f"{n} {'plutôt favorable' if s * lecture > 0 else 'plutôt défavorable'}" for _, n, s in positions[:3]]
            suite = "Pour vos positions : " + ", ".join(effets) + "."
        else:
            suite = "Pas de surprise lue par le marché : effet limité attendu sur vos positions."
        premiere = resultat["resume"].split(". ")[0].rstrip(".") + "."
        await _notifier(uid, f"{nom} : c'est publié", f"{premiere} {suite}", f"/macro?e={ev['id']}")
        await execute_write("INSERT INTO macro_notifie (evenement_id, user_id, genre) VALUES (?, ?, 'resultat')",
                            (ev["id"], uid))


async def tour() -> None:
    """Un passage de la boucle de fond. Ne lève jamais."""
    try:
        await calendrier.rafraichir()
        for ev in await a_resoudre():
            try:
                res = await resoudre(ev)
                if res:
                    await annoncer(ev, res)
            except Exception as exc:
                logger.warning("macro : résolution de %s (%s)", ev.get("titre"), exc)
        await rappels()
        await prechauffer()
    except Exception as exc:
        logger.warning("macro : tour de suivi (%s)", exc)


async def prechauffer() -> None:
    """Calcule d'avance les sensibilités des actifs de référence et des
    positions ouvertes, pour que les fiches s'ouvrent sans attendre. Une
    mesure par tour au plus : la boucle ne doit pas saturer le fournisseur de
    cours."""
    from ...routes.macro import REFERENCES
    from .mesure import sensibilite
    candidats = [(b, s) for b, syms in REFERENCES.items() if b in ("FED", "BCE") for s in syms]
    try:
        rows = await execute_query(
            "SELECT DISTINCT symbol FROM positions WHERE status = 'open' AND (archived IS NULL OR archived = 0)") or []
        for r in rows:
            candidats += [("FED", r["symbol"].upper()), ("BCE", r["symbol"].upper())]
    except Exception:
        pass
    faits = 0
    for b, s in candidats:
        m = await sensibilite(s, b, cache_seul=True)
        if m.get("fiabilite") == "en_calcul":
            await sensibilite(s, b)
            faits += 1
            if faits >= 3:
                return
