"""
Le calendrier macro : quand, quoi, et d'où vient la date.

TROIS SOURCES, PAR ORDRE DE CONFIANCE.

  1. Les calendriers OFFICIELS des banques centrales. La Fed publie ses
     réunions plusieurs années à l'avance (federalreserve.gov), la BCE les
     siennes sur ecb.europa.eu. Ce sont les seules dates qu'on connaît
     longtemps à l'avance — c'est ce qui permet d'annoncer une décision de la
     Fed dans trois semaines, et pas seulement « cette semaine ».
  2. Le calendrier économique ForexFactory, pour les statistiques (inflation,
     emploi, PMI…) avec la prévision du consensus et le chiffre précédent. Il
     ne couvre que la semaine en cours : tout ce qui est lu est gardé en base.
  3. L'historique des décisions de la BCE, écrit ici. La BCE ne publie pas de
     liste lisible des réunions passées ; les dates ci-dessous ont été
     VÉRIFIÉES contre son API de données : chacun des vingt changements de
     taux de dépôt depuis 2022 prend effet six jours après une date de cette
     liste, sans exception.

UNE SEULE TABLE, `macro_calendar`, où chaque annonce a une clé stable : la
même réunion lue deux fois n'est enregistrée qu'une fois, et ce que le suivi en
direct y ajoute (décision, réaction, résumé) survit aux relectures.
"""
from __future__ import annotations

import json
import logging
import re
import time
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import httpx

from ...database import USE_POSTGRES, execute_query, execute_write
from .familles import FAMILLES, banque_du_discours, famille_de

logger = logging.getLogger(__name__)

NEW_YORK = ZoneInfo("America/New_York")
FRANCFORT = ZoneInfo("Europe/Berlin")
UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36"}

FED_URL = "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm"
BCE_URL = "https://www.ecb.europa.eu/press/calendars/mgcgc/html/index.en.html"
FF_URL = "https://nfs.faireconomy.media/ff_calendar_thisweek.json"

# Jours de décision de politique monétaire de la BCE. Vérifiés : les dates de
# changement du taux de dépôt publiées par l'API de la BCE (série
# FM.D.U2.EUR.4F.KR.DFR.LEV) tombent toutes six jours après l'une d'elles.
BCE_HISTORIQUE = [
    "2022-02-03", "2022-03-10", "2022-04-14", "2022-06-09", "2022-07-21", "2022-09-08", "2022-10-27", "2022-12-15",
    "2023-02-02", "2023-03-16", "2023-05-04", "2023-06-15", "2023-07-27", "2023-09-14", "2023-10-26", "2023-12-14",
    "2024-01-25", "2024-03-07", "2024-04-11", "2024-06-06", "2024-07-18", "2024-09-12", "2024-10-17", "2024-12-12",
    "2025-01-30", "2025-03-06", "2025-04-17", "2025-06-05", "2025-07-24", "2025-09-11", "2025-10-30", "2025-12-18",
    "2026-02-05", "2026-03-19", "2026-04-30", "2026-06-11", "2026-07-23", "2026-09-10",
]

MOIS_EN = ["January", "February", "March", "April", "May", "June", "July", "August",
           "September", "October", "November", "December"]

_pret = False
_LU: dict = {"ff": None, "fed": None, "bce": None}
TTL = {"ff": 3 * 3600, "fed": 24 * 3600, "bce": 24 * 3600}


async def init() -> None:
    global _pret
    if _pret:
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
    # Ajoutées avec le moteur macro ; la table existait avant pour l'espace du
    # week-end.
    for col, typ in [("famille", "TEXT"), ("banque", "TEXT"), ("source", "TEXT"),
                     ("officiel", "INTEGER DEFAULT 0"), ("note", "TEXT"),
                     ("statut", "TEXT DEFAULT 'a_venir'"), ("resultat", "TEXT"),
                     ("resolu_le", "TEXT")]:
        try:
            await execute_write(f"ALTER TABLE macro_calendar ADD COLUMN {col} {typ}")
        except Exception:
            pass
    try:
        await execute_write("CREATE INDEX IF NOT EXISTS idx_macro_quand ON macro_calendar(quand)")
    except Exception:
        pass
    _pret = True


def _perime(quoi: str) -> bool:
    # None tant que rien n'a été lu : comparer à 0 ferait dépendre la première
    # lecture du temps écoulé depuis le démarrage de la machine.
    return _LU[quoi] is None or time.monotonic() - _LU[quoi] > TTL[quoi]


async def _ecrire(cle: str, titre: str, pays: str, quand: datetime, *, importance: str | None,
                  prevision=None, precedent=None, famille=None, banque=None, source: str,
                  officiel: bool, note: str | None = None) -> None:
    maintenant = datetime.now(timezone.utc).isoformat()
    q = quand.astimezone(timezone.utc).isoformat()
    existe = await execute_query("SELECT id FROM macro_calendar WHERE cle = ?", (cle,))
    if existe:
        await execute_write(
            """UPDATE macro_calendar SET titre = ?, quand = ?, importance = ?,
               prevision = COALESCE(?, prevision), precedent = COALESCE(?, precedent),
               famille = ?, banque = ?, source = ?, officiel = ?, note = COALESCE(?, note), vu_le = ?
               WHERE cle = ?""",
            (titre, q, importance, prevision or None, precedent or None, famille, banque, source,
             1 if officiel else 0, note, maintenant, cle))
    else:
        await execute_write(
            """INSERT INTO macro_calendar (cle, titre, pays, quand, importance, prevision, precedent,
                famille, banque, source, officiel, note, statut, vu_le)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'a_venir', ?)""",
            (cle, titre, pays, q, importance, prevision or None, precedent or None, famille, banque,
             source, 1 if officiel else 0, note, maintenant))


# ── La Fed ────────────────────────────────────────────────────────────────


def lire_page_fed(html: str) -> list[dict]:
    """Les réunions publiées : jour de décision (le second jour), avec ou sans projections."""
    out = []
    blocs = re.split(r"(\d{4}) FOMC Meetings", html)
    for i in range(1, len(blocs), 2):
        annee = int(blocs[i])
        for mois, jours in re.findall(
                r"fomc-meeting__month[^>]*>\s*<strong>([^<]+)</strong>.*?fomc-meeting__date[^>]*>([^<]+)<",
                blocs[i + 1], re.S):
            if "notation" in jours.lower() or "unscheduled" in jours.lower():
                continue
            m = mois.split("/")[-1].strip()[:3]
            num = next((k for k, nom in enumerate(MOIS_EN, 1) if nom.startswith(m)), None)
            chiffres = re.findall(r"\d+", jours)
            if not num or not chiffres:
                continue
            try:
                d = date(annee, num, int(chiffres[-1]))
            except ValueError:
                continue
            out.append({"date": d, "projections": "*" in jours})
    return sorted(out, key=lambda x: x["date"])


async def _fed() -> None:
    if not _perime("fed"):
        return
    _LU["fed"] = time.monotonic()
    try:
        async with httpx.AsyncClient(timeout=20.0, headers=UA) as c:
            r = await c.get(FED_URL)
            r.raise_for_status()
        reunions = lire_page_fed(r.text)
    except Exception as exc:
        logger.warning("macro : calendrier de la Fed illisible (%s)", exc)
        return
    for x in reunions:
        d = x["date"]
        quand = datetime(d.year, d.month, d.day, 14, 0, tzinfo=NEW_YORK)
        await _ecrire(
            f"FED|decision|{d.isoformat()}", "Décision de taux de la Fed", "USD", quand,
            importance="High", famille="FED_DECISION", banque="FED", source="federalreserve.gov",
            officiel=True,
            note=("Avec les projections économiques des membres (le « dot plot ») : "
                  "souvent la réunion qui fait le plus bouger les marchés.") if x["projections"] else None)


async def dates_fed() -> list[date]:
    """Les jours de décision de la Fed déjà passés, pour la mesure."""
    await init()
    await _fed()
    rows = await execute_query(
        "SELECT quand FROM macro_calendar WHERE famille = 'FED_DECISION' AND officiel = 1 AND quand < ?",
        (datetime.now(timezone.utc).isoformat(),)) or []
    return sorted({datetime.fromisoformat(r["quand"]).astimezone(NEW_YORK).date() for r in rows})


# ── La BCE ────────────────────────────────────────────────────────────────


def lire_page_bce(html: str) -> list[date]:
    texte = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", html))
    out = []
    for jj, mm, aaaa in re.findall(
            r"(\d{2})/(\d{2})/(\d{4}) Governing Council of the ECB: monetary policy meeting[^0-9]{0,60}\(Day 2\)",
            texte):
        try:
            out.append(date(int(aaaa), int(mm), int(jj)))
        except ValueError:
            pass
    # Une réunion d'un seul jour s'écrit sans « Day 2 ».
    for jj, mm, aaaa in re.findall(
            r"(\d{2})/(\d{2})/(\d{4}) Governing Council of the ECB: monetary policy meeting(?![^0-9]{0,60}\(Day 1\))",
            texte):
        try:
            d = date(int(aaaa), int(mm), int(jj))
        except ValueError:
            continue
        if d not in out and d - timedelta(days=1) not in out:
            out.append(d)
    return sorted(set(out))


async def _bce() -> None:
    if not _perime("bce"):
        return
    _LU["bce"] = time.monotonic()
    dates = [date.fromisoformat(d) for d in BCE_HISTORIQUE]
    try:
        async with httpx.AsyncClient(timeout=20.0, headers=UA) as c:
            r = await c.get(BCE_URL)
            r.raise_for_status()
        dates += lire_page_bce(r.text)
    except Exception as exc:
        logger.warning("macro : calendrier de la BCE illisible (%s)", exc)
    for d in sorted(set(dates)):
        # Communiqué à 14 h 15, conférence de presse à 14 h 45, heure de Francfort.
        quand = datetime(d.year, d.month, d.day, 14, 15, tzinfo=FRANCFORT)
        await _ecrire(
            f"BCE|decision|{d.isoformat()}", "Décision de taux de la BCE", "EUR", quand,
            importance="High", famille="BCE_DECISION", banque="BCE", source="ecb.europa.eu",
            officiel=True, note="Communiqué à 14 h 15, conférence de presse de la présidente à 14 h 45.")


async def dates_bce() -> list[date]:
    await init()
    await _bce()
    rows = await execute_query(
        "SELECT quand FROM macro_calendar WHERE famille = 'BCE_DECISION' AND officiel = 1 AND quand < ?",
        (datetime.now(timezone.utc).isoformat(),)) or []
    return sorted({datetime.fromisoformat(r["quand"]).astimezone(FRANCFORT).date() for r in rows})


# ── ForexFactory ──────────────────────────────────────────────────────────


def _a_dt(v) -> datetime | None:
    if not v:
        return None
    try:
        d = datetime.fromisoformat(str(v).replace("Z", "+00:00"))
    except ValueError:
        return None
    return d if d.tzinfo else d.replace(tzinfo=timezone.utc)


async def _forexfactory() -> None:
    if not _perime("ff"):
        return
    _LU["ff"] = time.monotonic()
    try:
        async with httpx.AsyncClient(timeout=15.0, headers=UA) as c:
            r = await c.get(FF_URL)
            r.raise_for_status()
            evenements = r.json()
    except Exception as exc:
        logger.warning("macro : calendrier économique indisponible (%s)", exc)
        return
    for e in evenements if isinstance(evenements, list) else []:
        quand = _a_dt(e.get("date"))
        titre, pays = e.get("title"), e.get("country") or ""
        if not quand or not titre:
            continue
        fam = famille_de(titre, pays)
        banque = FAMILLES[fam]["banque"] if fam else None
        if fam == "DISCOURS":
            banque = banque_du_discours(titre)
        # Les décisions de la Fed et de la BCE ont déjà leur ligne officielle :
        # la ligne ForexFactory du même jour y verse seulement le consensus.
        if fam in ("FED_DECISION", "BCE_DECISION"):
            b = "FED" if fam == "FED_DECISION" else "BCE"
            tz = NEW_YORK if b == "FED" else FRANCFORT
            jour = quand.astimezone(tz).date().isoformat()
            existe = await execute_query("SELECT id FROM macro_calendar WHERE cle = ?", (f"{b}|decision|{jour}",))
            if existe:
                if e.get("forecast") or e.get("previous"):
                    await execute_write(
                        "UPDATE macro_calendar SET prevision = COALESCE(?, prevision), precedent = COALESCE(?, precedent) WHERE cle = ?",
                        (e.get("forecast") or None, e.get("previous") or None, f"{b}|decision|{jour}"))
                continue
        cle = f"{pays}|{titre}|{quand.astimezone(timezone.utc).isoformat()}"
        try:
            await _ecrire(cle, titre, pays, quand, importance=e.get("impact"),
                          prevision=e.get("forecast"), precedent=e.get("previous"),
                          famille=fam, banque=banque, source="ForexFactory", officiel=False)
        except Exception as exc:
            logger.warning("macro : ligne non enregistrée (%s)", exc)


async def rafraichir() -> None:
    """Relit les trois sources si elles sont périmées. Ne lève jamais."""
    try:
        await init()
        await _fed()
        await _bce()
        await _forexfactory()
    except Exception as exc:
        logger.warning("macro : rafraîchissement du calendrier (%s)", exc)


async def evenements(debut: datetime, fin: datetime, *, devises: set[str] | None = None,
                     importance_min: str = "Low") -> list[dict]:
    """Les annonces entre deux instants, de la plus proche à la plus lointaine."""
    await rafraichir()
    rang = {"Holiday": 0, "Low": 1, "Medium": 2, "High": 3}
    rows = await execute_query(
        "SELECT * FROM macro_calendar WHERE quand >= ? AND quand < ? ORDER BY quand",
        (debut.astimezone(timezone.utc).isoformat(), fin.astimezone(timezone.utc).isoformat())) or []
    out = []
    for r in rows:
        if devises and r["pays"] not in devises:
            continue
        if rang.get(r.get("importance") or "Low", 1) < rang.get(importance_min, 1) and r.get("importance") != "Holiday":
            continue
        r = dict(r)
        try:
            r["resultat"] = json.loads(r["resultat"]) if r.get("resultat") else None
        except (ValueError, TypeError):
            r["resultat"] = None
        out.append(r)
    return out
