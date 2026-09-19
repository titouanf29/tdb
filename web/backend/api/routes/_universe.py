"""Web-side extensions to the asset universe.

MARKETS lives in the repo-root config.py, which is shared with the Telegram
bot, so assets the web scanner needs are added here instead of editing it.

Only established, liquid coins with a plain "XXX-USD" Yahoo ticker are listed.
Assets whose Yahoo symbol carries a disambiguating suffix (SUI20947-USD,
TON11419-USD, UNI7083-USD, GRT6719-USD, COMP5692-USD, STX4847-USD…) are left
out on purpose: the exact suffix could not be confirmed, and a wrong ticker
would silently return no data. A symbol that resolves to nothing is dropped
during the scan, and the gap between requested and analysed assets is reported
as `total_scanned` vs `total_analyzed` so a dead ticker is visible instead of
quietly shrinking the universe.
"""

# Layer-1s, DeFi blue chips and privacy coins — no memecoins.
EXTRA_CRYPTO: dict[str, str] = {
    "ETC-USD":   "Ethereum Classic",
    "XMR-USD":   "Monero",
    "XTZ-USD":   "Tezos",
    "EOS-USD":   "EOS",
    "DASH-USD":  "Dash",
    "ZEC-USD":   "Zcash",
    "NEO-USD":   "Neo",
    "VET-USD":   "VeChain",
    "HBAR-USD":  "Hedera",
    "ICP-USD":   "Internet Computer",
    "APT-USD":   "Aptos",
    "OP-USD":    "Optimism",
    "INJ-USD":   "Injective",
    "MKR-USD":   "Maker",
    "SNX-USD":   "Synthetix",
    "CRV-USD":   "Curve DAO",
    "LDO-USD":   "Lido DAO",
    "QNT-USD":   "Quant",
    "RUNE-USD":  "THORChain",
    "KAS-USD":   "Kaspa",
    "SEI-USD":   "Sei",
    "FTM-USD":   "Fantom",
    "EGLD-USD":  "MultiversX",
    "THETA-USD": "Theta Network",
    "FLOW-USD":  "Flow",
    "CHZ-USD":   "Chiliz",
    "ZIL-USD":   "Zilliqa",
    "KSM-USD":   "Kusama",
    "MINA-USD":  "Mina Protocol",
    "ROSE-USD":  "Oasis Network",
    # Polygon is deliberately absent: the backend config already carries it as
    # MATIC-USD, its pre-rename ticker. Adding POL-USD would list the same
    # asset twice in a scan. If MATIC-USD ever stops resolving — visible as a
    # gap between total_scanned and total_analyzed — swap the ticker there.
}


def extend_market(market_key: str, assets: list[str]) -> list[str]:
    """Append the web-side additions for a market, preserving order and
    dropping anything already present in the shared config."""
    if market_key != "CRYPTO":
        return assets
    seen = set(assets)
    return assets + [s for s in EXTRA_CRYPTO if s not in seen]
