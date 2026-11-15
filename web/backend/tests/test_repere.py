"""La phrase du repère ne contredit plus le plan que Nimbo propose."""

from api.routes._opportunity import accorder_repere

TENIR = "La moyenne 20 à 9,591 sert de repère : la tenir maintient le scénario."
REPASSER = "La moyenne 20 à 4,483 sert de repère : la repasser le relancerait."


def test_stop_au_dessus_du_repere():
    r = accorder_repere(TENIR, ema20=9.591, price=9.9, stop=9.627, sens="long")
    assert "9,627" in r and "au-dessus" in r and "sortiriez avant" in r


def test_stop_sous_le_repere_garde_la_phrase():
    assert accorder_repere(TENIR, ema20=9.591, price=9.9, stop=9.40, sens="long") == TENIR


def test_achat_sous_la_moyenne():
    r = accorder_repere(REPASSER, ema20=4.483, price=4.2, stop=4.0, sens="long")
    assert "sous sa moyenne 20" in r and "repose sur le score" in r


def test_sans_proposition_rien_ne_change():
    assert accorder_repere(REPASSER, ema20=4.483, price=4.2, stop=None, sens=None) == REPASSER
    assert accorder_repere("Ça se confirme au-dessus de 10.", ema20=9.0, price=9.9, stop=9.5, sens="long").startswith("Ça se confirme")
