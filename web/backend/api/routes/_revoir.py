"""Quand Nimbo ne propose rien : quand revenir voir.

« Je ne propose pas de position » ne suffit pas. La personne veut savoir si
c'est une affaire de minutes, d'heures, ou si cet actif ne se prêtera pas à
ce plan avant longtemps. La réponse dépend de la raison :

  · une configuration pas encore mûre (verdict neutre, rapport gain/risque
    trop faible, volatilité extrême, score trop bas) se relit à chaque
    nouvelle bougie : on dit quand la prochaine se ferme ;
  · un marché fermé ou des données qui datent de la dernière séance : on dit
    quand il rouvre ;
  · l'intraday, sans avantage mesuré : rien à attendre, c'est l'horizon qui
    ne va pas ;
  · un plan qui a déjà perdu sur cet actif, une liquidité ou un historique
    insuffisants : ce n'est pas une question d'heure, et on le dit.

Aucune heure n'est inventée : elles viennent des horaires réels des places
(config.MARKETS) et de l'unité de temps de l'analyse.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional
from zoneinfo import ZoneInfo

from config import MARKETS

from ._actifs_ajoutes import marche_de

PARIS = ZoneInfo("Europe/Paris")
_JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]
_PAS_MIN = {"5m": 5, "15m": 15, "30m": 30, "1h": 60, "4h": 240}
_UNITE = {"5m": "de 5 minutes", "15m": "de 15 minutes", "30m": "de 30 minutes", "1h": "d'une heure",
          "4h": "de 4 heures", "1d": "du jour", "3d": "de 3 jours", "1w": "de la semaine", "1mo": "du mois"}


# Les horaires des places, repris de lib/marketStatus.ts côté écran : c'est
# la table corrigée et vérifiée (les contrats à terme et le forex rouvrent le
# dimanche à 23 h, pas le lundi matin). config.MARKETS, partagé avec le bot,
# ne la reflète pas, et la page Marchés et Nimbo doivent annoncer la même heure.
_HORAIRES = {
    "EUROPE": {"tz": "Europe/Paris", "ouvre": (9, 0), "ferme": (17, 30)},
    "USA": {"tz": "America/New_York", "ouvre": (9, 30), "ferme": (16, 0)},
    "ASIA": {"tz": "Asia/Tokyo", "ouvre": (9, 0), "ferme": (15, 0)},
    # Séance continue du dimanche 23 h au vendredi 22 h (Paris).
    "COMMODITIES": {"tz": "Europe/Paris", "ouvre": (23, 0), "ferme": (22, 0), "semaine": True},
    "FOREX": {"tz": "Europe/Paris", "ouvre": (23, 0), "ferme": (22, 0), "semaine": True},
}


def _place(symbol: str) -> Optional[str]:
    if symbol.upper().endswith("=X"):
        return "FOREX"
    return marche_de(symbol)


def _seance(cle: Optional[str]) -> Optional[dict]:
    h = _HORAIRES.get(cle or "")
    if not h:
        return None  # crypto, ou inconnu : toujours ouvert
    return {**h, "tz": ZoneInfo(h["tz"])}


def _ouvert(s: Optional[dict], t: datetime) -> bool:
    if s is None:
        return True
    loc = t.astimezone(s["tz"])
    if s.get("semaine"):
        if loc.weekday() == 5:
            return False
        if loc.weekday() == 6:
            return loc.hour >= 23
        if loc.weekday() == 4 and loc.hour >= 22:
            return False
        return True
    if loc.weekday() >= 5:
        return False
    cur = loc.hour * 60 + loc.minute
    o, f = s["ouvre"][0] * 60 + s["ouvre"][1], s["ferme"][0] * 60 + s["ferme"][1]
    return o <= cur < f


def _prochaine_ouverture(s: dict, t: datetime) -> datetime:
    loc = t.astimezone(s["tz"])
    if s.get("semaine"):
        jours = (6 - loc.weekday()) % 7
        d = (loc + timedelta(days=jours)).replace(hour=23, minute=0, second=0, microsecond=0)
        return d if d > loc else d + timedelta(days=7)
    for j in range(0, 8):
        d = (loc + timedelta(days=j)).replace(hour=s["ouvre"][0], minute=s["ouvre"][1], second=0, microsecond=0)
        if d.weekday() < 5 and d > loc:
            return d
    return loc + timedelta(days=1)


def _prochaine_cloture(s: Optional[dict], t: datetime) -> datetime:
    """La fin de la séance en cours, ou de la prochaine si le marché est fermé."""
    if s is None:  # crypto : la bougie du jour se ferme à minuit UTC
        return (t.astimezone(timezone.utc) + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    loc = t.astimezone(s["tz"])
    debut = loc if _ouvert(s, t) else _prochaine_ouverture(s, t)
    c = debut.replace(hour=s["ferme"][0], minute=s["ferme"][1], second=0, microsecond=0)
    # Une séance qui s'ouvre le soir (contrats à terme) se ferme le lendemain.
    return c if c > debut else c + timedelta(days=1)


def _dire(cible: datetime, t: datetime) -> str:
    """« dans 25 min », « dans 3 h », « demain vers 15 h 30 », « lundi vers 9 h »."""
    minutes = max(1, round((cible - t).total_seconds() / 60))
    if minutes < 60:
        return f"dans {minutes} min"
    if minutes < 6 * 60:
        h = round(minutes / 60)
        return f"dans {h} h"
    loc, maintenant = cible.astimezone(PARIS), t.astimezone(PARIS)
    heure = f"{loc.hour} h" + (f" {loc.minute:02d}" if loc.minute else "")
    ecart = (loc.date() - maintenant.date()).days
    jour = "aujourd'hui" if ecart == 0 else "demain" if ecart == 1 else _JOURS[loc.weekday()]
    return f"{jour} vers {heure}"


def _prochaine_bougie(timeframe: str, s: Optional[dict], t: datetime) -> datetime:
    pas = _PAS_MIN.get(timeframe)
    if pas:
        if s is not None and not _ouvert(s, t):
            return _prochaine_ouverture(s, t) + timedelta(minutes=pas)
        u = t.astimezone(timezone.utc)
        ecoule = (u.hour * 60 + u.minute) % pas
        return u.replace(second=0, microsecond=0) + timedelta(minutes=pas - ecoule)
    if timeframe in ("1w", "3d", "1mo"):
        # La bougie se ferme avec la dernière séance de la semaine.
        c = _prochaine_cloture(s, t)
        while c.weekday() != 4 and s is not None:
            c = _prochaine_cloture(s, c + timedelta(hours=1))
        return c
    return _prochaine_cloture(s, t)


def quand_revenir(blocage: Optional[str], timeframe: str, symbol: str,
                  maintenant: Optional[datetime] = None) -> Optional[dict]:
    """{"texte", "a"} : ce qu'il faut attendre, et l'instant (ISO) s'il y en a un."""
    if not blocage:
        return None
    t = maintenant or datetime.now(timezone.utc)
    s = _seance(_place(symbol))
    b = blocage

    if b.startswith("Intraday"):
        return {"texte": "Rien à attendre ici : en intraday, Nimbo ne propose pas de position. "
                         "Passez en Swing, c'est l'horizon où ses signaux ont gagné.", "a": None}

    if (b.startswith("Ce plan a déjà perdu") or "liquidit" in b.lower() or b.startswith("Confiance des données")
            or b.startswith("Seulement") or "qualit" in b.lower() or "source" in b.lower()):
        return {"texte": "Ce n'est pas une question d'heure : la raison tient à l'actif lui-même, "
                         "pas au moment. Mieux vaut chercher ailleurs.", "a": None}

    if b.startswith("Données de marché périmées") or (s is not None and not _ouvert(s, t)):
        if s is not None:
            o = _prochaine_ouverture(s, t)
            return {"texte": f"Le marché est fermé : il rouvre {_dire(o, t)}. Revenez après l'ouverture, "
                             "avec un cours frais.", "a": o.astimezone(timezone.utc).isoformat()}

    c = _prochaine_bougie(timeframe, s, t)
    quand = _dire(c, t)
    unite = _UNITE.get(timeframe, "")
    if b.startswith("Score bas"):
        return {"texte": "Nimbo ne vend pas à découvert sur ce signal : mesurées, ces ventes ont perdu. "
                         f"Le score se relit à chaque bougie {unite} : revenez {quand}.",
                "a": c.astimezone(timezone.utc).isoformat()}
    return {"texte": f"La configuration se relit à chaque nouvelle bougie {unite} : revenez {quand}, "
                     "à sa clôture.", "a": c.astimezone(timezone.utc).isoformat()}
