"""
Ce qu'on peut dire d'un trade qui vient de se clôturer.

Le constat existait déjà côté interface, pour la clôture manuelle : on
proposait d'écrire dans le journal, avec un conseil tiré du trade. Mais une
position atteinte par son stop se ferme SANS l'utilisateur, souvent la nuit,
et ne laissait alors aucune trace : pas de notification, pas d'entrée de
journal, rien. Le seul trade dont on apprend vraiment quelque chose — celui
qui a touché le stop — était le seul qu'on ne racontait pas.

Ce module est donc côté serveur, et il est la SEULE source de ce jugement.
L'écrire une deuxième fois en TypeScript pour la clôture manuelle aurait
garanti qu'au premier ajustement les deux versions se mettent à dire des
choses différentes du même trade.

Règle tenue : chaque remarque doit être méritée par CE trade, citer ses
chiffres, et se taire quand rien ne la justifie. Un journal qui trouve un
reproche à chaque ligne se fait ignorer aussi vite qu'un journal vide.
"""

from datetime import datetime, timezone


def _fmt(v) -> str:
    """Un prix, avec la précision de son ordre de grandeur."""
    try:
        v = float(v)
    except (TypeError, ValueError):
        return "—"
    a = abs(v)
    d = 2 if a >= 100 else 3 if a >= 1 else 5 if a >= 0.01 else 6 if a >= 0.0001 else 8
    return f"{v:,.{d}f}".replace(",", " ").replace(".", ",")


def _eur(v) -> str:
    try:
        v = float(v)
    except (TypeError, ValueError):
        return "—"
    return f"{v:,.2f} €".replace(",", " ").replace(".", ",")


def _duration(minutes: float) -> str:
    if minutes < 60:
        return f"{round(minutes)} min"
    if minutes < 1440:
        return f"{round(minutes / 60)} h"
    return f"{round(minutes / 1440)} jours"


# Durée typique d'un trade selon l'horizon déclaré, en minutes. Le long terme
# n'en a pas : une position de plusieurs années ne « déborde » de rien.
_EXPECTED = {"scalp": 15, "day": 240, "swing": 7 * 1440, "long": None}
_STYLE_LABEL = {"scalp": "Scalping", "day": "Day Trading",
                "swing": "Swing", "long": "Long terme"}
_STYLE_HORIZON = {"scalp": "1 à 15 min", "day": "15 min à 1 h",
                  "swing": "jours à semaines", "long": "plusieurs années"}


def _held_minutes(created_at, closed_at: datetime) -> float:
    if not created_at:
        return 0.0
    try:
        opened = datetime.fromisoformat(str(created_at).replace("Z", "+00:00"))
        if opened.tzinfo is None:
            opened = opened.replace(tzinfo=timezone.utc)
    except ValueError:
        return 0.0
    return max(0.0, (closed_at - opened).total_seconds() / 60.0)


def build_advice(pos: dict, exit_price: float, pnl: float,
                 style: str, minutes: float, closed_by: str | None) -> list[str]:
    """Les remarques que ce trade justifie, de la plus coûteuse à la moindre."""
    out: list[str] = []
    long = (pos.get("direction") or "LONG").upper() == "LONG"
    entry = float(pos.get("entry_price") or 0)
    sl = pos.get("stop_loss")
    tp = pos.get("take_profit")
    leverage = int(pos.get("leverage") or 1)

    risk = abs(entry - sl) if sl is not None else None
    reward = abs(tp - entry) if tp is not None else None
    rr = (reward / risk) if risk and reward and risk > 0 else None
    moved = abs(exit_price - entry)

    # 0. La sortie automatique se raconte en premier : c'est l'information que
    #    l'utilisateur n'a pas vécue, puisqu'il n'était pas là.
    if closed_by == "stop_loss":
        out.append(
            f"Le stop à {_fmt(sl)} a été touché et la position s'est fermée toute seule. "
            "C'est exactement son rôle : la perte s'est arrêtée où vous l'aviez décidé, "
            "pas où le marché l'aurait menée."
        )
    elif closed_by == "take_profit":
        out.append(
            f"L'objectif à {_fmt(tp)} a été atteint et la position s'est fermée toute seule. "
            "Le plan est allé au bout sans intervention."
        )

    # 1. Pas de stop : le seul défaut qui peut coûter le capital entier.
    if sl is None:
        out.append(
            "Aucun stop n'était posé. Cette perte n'avait pas de plancher : elle s'est "
            "arrêtée parce que vous avez clôturé, pas parce qu'une limite l'a arrêtée."
            if pnl < 0 else
            "Aucun stop n'était posé. Ça s'est bien terminé cette fois, mais le résultat "
            "ne doit rien au plan — il doit tout au marché."
        )

    # 2. Un rapport qui ne paie pas, quel que soit le résultat.
    if rr is not None and rr < 1:
        out.append(
            f"Le rapport gain / risque était de 1 : {rr:.2f}".replace(".", ",")
            + ". Vous risquiez plus que vous ne visiez : il faut avoir raison bien plus "
            "d'une fois sur deux pour que ça paie."
        )

    # 3. Sorti avant l'objectif alors que le trade gagnait — mais pas quand
    #    c'est l'objectif lui-même qui a déclenché la sortie.
    if pnl > 0 and tp is not None and reward and closed_by != "take_profit" and moved < reward * 0.6:
        out.append(
            f"Vous avez clôturé à {_fmt(exit_price)} alors que l'objectif était à {_fmt(tp)} — "
            f"environ {round(moved / reward * 100)} % du chemin. Couper tôt sur les gagnants "
            "et tenir les perdants est le schéma qui vide un compte lentement."
        )

    # 4. Sorti au-delà du stop : la perte a dépassé ce qui était accepté.
    if pnl < 0 and sl is not None and closed_by != "stop_loss":
        past = exit_price < sl if long else exit_price > sl
        if past:
            out.append(
                f"La sortie ({_fmt(exit_price)}) est au-delà du stop prévu ({_fmt(sl)}). "
                "La perte a dépassé ce que vous aviez accepté au départ."
            )

    # 5. Le levier, seulement quand il a réellement pesé.
    if leverage > 1 and pnl < 0:
        out.append(
            f"Le levier ×{leverage} a transformé {_eur(pnl / leverage)} de variation en "
            f"{_eur(pnl)}. Sans levier, la même erreur de lecture coûtait ce premier montant."
        )

    # 6. La durée, confrontée à l'horizon déclaré. C'est là que le style de
    #    trading cesse d'être une étiquette.
    attendu = _EXPECTED.get(style)
    if attendu and minutes > attendu * 4:
        out.append(
            f"Position tenue {_duration(minutes)}, pour un horizon « {_STYLE_LABEL.get(style, style)} » "
            f"({_STYLE_HORIZON.get(style, '')}). Une position qui déborde largement de son "
            "horizon n'est plus celle que vous aviez prévue."
        )

    # 7. Rien à redire : on le dit aussi, plutôt que d'inventer un reproche.
    if not out:
        out.append(
            "Rien à redire sur l'exécution : niveaux posés, sortie cohérente avec le plan. "
            "Notez ce qui vous a fait entrer — c'est cette partie-là qui se répète."
            if pnl >= 0 else
            "L'exécution a suivi le plan ; c'est le plan qui n'a pas fonctionné. Une perte "
            "dans les règles est le coût normal du métier, pas une erreur."
        )
    return out


def review(pos: dict, exit_price: float, pnl: float, *,
           style: str = "day", closed_by: str | None = None) -> dict:
    """Le dossier complet du trade : faits rédigés, conseil, champs du journal."""
    closed_at = datetime.now(timezone.utc)
    minutes = _held_minutes(pos.get("created_at"), closed_at)
    long = (pos.get("direction") or "LONG").upper() == "LONG"
    entry = float(pos.get("entry_price") or 0)
    amount = float(pos.get("amount") or 0)
    sl, tp = pos.get("stop_loss"), pos.get("take_profit")
    leverage = int(pos.get("leverage") or 1)

    risk = abs(entry - sl) if sl is not None else None
    reward = abs(tp - entry) if tp is not None else None
    rr = round(reward / risk, 2) if risk and reward and risk > 0 else None

    advice = build_advice(pos, exit_price, pnl, style, minutes, closed_by)

    # Les faits, écrits pour être relus dans six mois : ce sont ceux que la
    # mémoire déforme en premier.
    lignes = [
        f"{pos.get('symbol')} · {'achat' if long else 'vente à découvert'}"
        + (f" · levier ×{leverage}" if leverage > 1 else ""),
        f"Entrée à {_fmt(entry)}, sortie à {_fmt(exit_price)} après {_duration(minutes)}.",
        (f"Plan : stop {_fmt(sl) if sl is not None else 'aucun'}, "
         f"objectif {_fmt(tp) if tp is not None else 'aucun'}"
         + (f", rapport 1 : {rr}".replace(".", ",") if rr else "") + ".")
        if (sl is not None or tp is not None) else "Aucun niveau n'était posé au départ.",
        f"Résultat : {'+' if pnl >= 0 else ''}{_eur(pnl)} sur {_eur(amount)} engagés.",
    ]
    if closed_by:
        lignes.append(
            # « sur le objectif » — l'élision manquait.
            "Clôture automatique sur "
            + ("le stop." if closed_by == "stop_loss" else "l'objectif.")
        )
    lignes += ["", "Pourquoi suis-je entré ? "]

    post = [f"• {a}" for a in advice] + ["", "Ce que je referais pareil : ", "Ce que je changerais : "]

    return {
        "symbol": pos.get("symbol"),
        "direction": "LONG" if long else "SHORT",
        "entry_price": entry,
        "exit_price": exit_price,
        "quantity": float(pos.get("quantity") or 0),
        "pnl": round(pnl, 2),
        "result": "win" if pnl > 0 else "loss" if pnl < 0 else "breakeven",
        "risk_reward": rr,
        "entry_time": pos.get("created_at"),
        "exit_time": closed_at.isoformat(),
        "closed_by": closed_by,
        "held_minutes": round(minutes),
        "advice": advice,
        "pre_trade_notes": "\n".join(lignes),
        "post_trade_notes": "\n".join(post),
    }
