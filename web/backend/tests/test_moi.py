"""Le profil observé, sur des trades inventés dont on connaît la réponse."""

from datetime import datetime, timedelta, timezone

from api.routes.moi import observer

T0 = datetime(2026, 9, 1, 10, tzinfo=timezone.utc)


def trade(i, *, minutes=60, pnl=10.0, stop=95.0, tp=110.0, sortie=None, symbol="AAPL",
          qte=10.0, montant=1000.0, status="closed"):
    ouvert = T0 + timedelta(days=i)
    return {
        "symbol": symbol, "direction": "LONG", "entry_price": 100.0, "quantity": qte,
        "amount": montant, "stop_loss": stop, "take_profit": tp, "realized_pnl": pnl,
        "exit_price": sortie if sortie is not None else 100.0 + pnl / qte,
        "status": status, "instrument": "cfd",
        "created_at": ouvert.isoformat(),
        "closed_at": (ouvert + timedelta(minutes=minutes)).isoformat() if status == "closed" else None,
    }


def cles(r):
    return {c["cle"] for c in r["constats"]}


def test_rien_a_dire_sans_trades():
    r = observer([], {}, {}, 10_000)
    assert r["constats"] == [] and r["assez"] is False


def test_silence_sous_le_seuil():
    r = observer([trade(i, stop=None) for i in range(3)], {}, {}, 10_000)
    assert r["constats"] == []


def test_horizon_swing_mais_trades_d_une_heure():
    r = observer([trade(i, minutes=45) for i in range(6)], {}, {"trading_style": "swing"}, 10_000)
    assert "horizon" in cles(r)


def test_gains_coupes_avant_l_objectif():
    # Gagnants fermés à 102 alors que l'objectif est 110 et le stop risque 5 : 0,4 R.
    ts = [trade(i, pnl=20.0, sortie=102.0) for i in range(5)] + [trade(9, pnl=-50.0, sortie=95.0)]
    assert "gains_coupes" in cles(observer(ts, {}, {}, 10_000))


def test_sans_stop():
    ts = [trade(i, stop=None) for i in range(4)] + [trade(i + 4) for i in range(2)]
    assert "sans_stop" in cles(observer(ts, {}, {}, 10_000))


def test_risque_superieur_au_reglage():
    # 100 parts, stop à 5 € : 500 € au stop, soit 5 % de 10 000 € ; réglage modéré, 1 %.
    ts = [trade(i, qte=100.0, montant=10_000.0, pnl=100.0) for i in range(6)]
    r = observer(ts, {}, {"risk_level": "moderate"}, 10_000)
    assert "risque_trop_fort" in cles(r)
    assert r["mesures"]["risque_capital_pct"] > 4


def test_stop_plus_large_que_la_perte_acceptee():
    ts = [trade(i, stop=90.0) for i in range(6)]  # 10 % du montant
    assert "stop_contre_perte_declaree" in cles(observer(ts, {"perte_max_pct": 2}, {}, 10_000))


def test_discipline_quand_tout_va_bien():
    ts = [trade(i, minutes=120, pnl=100.0, sortie=110.0) for i in range(6)]
    r = observer(ts, {}, {"trading_style": "day", "risk_level": "conservative"}, 10_000)
    assert cles(r) == {"discipline"}
