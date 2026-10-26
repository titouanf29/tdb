"""« Quand revenir » : des heures réelles, et le silence quand l'heure n'y change rien."""

from datetime import datetime, timezone

from api.routes._revoir import quand_revenir

DIMANCHE_MIDI = datetime(2026, 10, 18, 11, 0, tzinfo=timezone.utc)
LUNDI_14H_PARIS = datetime(2026, 10, 19, 12, 0, tzinfo=timezone.utc)


def test_marche_ferme_le_week_end():
    r = quand_revenir("Verdict neutre", "1d", "MC.PA", DIMANCHE_MIDI)
    assert "rouvre demain vers 9 h" in r["texte"] and r["a"]


def test_contrats_a_terme_rouvrent_dimanche_soir():
    r = quand_revenir("Verdict neutre", "1d", "GC=F", DIMANCHE_MIDI)
    assert "aujourd'hui vers 23 h" in r["texte"]


def test_prochaine_bougie_quand_le_marche_est_ouvert():
    r = quand_revenir("Rapport gain/risque de 0,9", "4h", "MC.PA", LUNDI_14H_PARIS)
    assert "bougie de 4 heures" in r["texte"] and "dans 4 h" in r["texte"]


def test_crypto_toujours_ouverte():
    r = quand_revenir("Verdict neutre", "1h", "BTC-USD", DIMANCHE_MIDI)
    assert "dans 1 h" in r["texte"]


def test_raison_structurelle_sans_heure():
    r = quand_revenir("Ce plan a déjà perdu sur cet actif", "1d", "KO", LUNDI_14H_PARIS)
    assert r["a"] is None and "pas une question d'heure" in r["texte"]


def test_intraday_renvoie_vers_le_swing():
    r = quand_revenir("Intraday : …", "15m", "AAPL", LUNDI_14H_PARIS)
    assert r["a"] is None and "Swing" in r["texte"]


def test_rien_a_dire_sans_blocage():
    assert quand_revenir(None, "1d", "AAPL") is None
