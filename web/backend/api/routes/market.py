"""
Market data routes
"""
import re
import sys
from pathlib import Path
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query, Depends, Request
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address

from config import MARKETS

from ..database import execute_query, execute_write
from .auth import get_current_user

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)
_SYMBOL_RE = re.compile(r'^[\^A-Z0-9.\-=]{1,30}$')


class AssetRequestCreate(BaseModel):
    symbol: str
    asset_name: Optional[str] = None
    asset_type: Optional[str] = None  # stock, crypto, commodity, forex
    reason: Optional[str] = None


@router.get("/list")
async def get_markets():
    """Get all available markets"""
    return {
        "markets": [
            {
                "key": key,
                "name": market["name"],
                "description": market.get("description", market["name"]),
                "asset_count": len(market["assets"]),
                "always_open": market.get("always_open", False)
            }
            for key, market in MARKETS.items()
        ]
    }


@router.get("/search")
@limiter.limit("10/minute")
async def search_assets(request: Request, q: str = Query(..., min_length=2, max_length=100)):
    """Search assets by name or symbol — Yahoo Finance with local fallback."""
    import httpx

    q_upper = q.strip().upper()

    # --- Local fallback: search among known MARKETS assets by symbol prefix/contains ---
    SYMBOL_NAMES = {
        # Indices
        "^FCHI": "CAC 40", "^SBF120": "SBF 120", "^GDAXI": "DAX 40", "^FTSE": "FTSE 100",
        "^AEX": "AEX Amsterdam", "^BFX": "BEL 20", "^IBEX": "IBEX 35", "^FTSEMIB": "FTSE MIB",
        "^SSMI": "SMI Suisse", "^STOXX50E": "Euro Stoxx 50", "^GSPC": "S&P 500", "^DJI": "Dow Jones",
        "^IXIC": "NASDAQ", "^RUT": "Russell 2000", "^VIX": "VIX Volatilite",
        "^N225": "Nikkei 225", "^HSI": "Hang Seng", "000001.SS": "Shanghai Composite",
        "^KOSPI": "KOSPI Coree", "^BSESN": "BSE Sensex Inde",
        # ETFs
        "SPY": "SPDR S&P 500 ETF", "QQQ": "Invesco QQQ NASDAQ-100", "DIA": "SPDR Dow Jones ETF",
        "IWM": "iShares Russell 2000", "VOO": "Vanguard S&P 500 ETF", "VTI": "Vanguard Total Market ETF",
        "GLD": "SPDR Gold Shares", "SLV": "iShares Silver Trust", "TLT": "iShares 20Y Treasury",
        "XLE": "Energy SPDR ETF", "XLF": "Financial SPDR ETF", "XLK": "Technology SPDR ETF",
        "XLV": "Health Care SPDR ETF", "XLI": "Industrial SPDR ETF", "XLY": "Consumer Discret SPDR ETF",
        "XLP": "Consumer Staples SPDR ETF", "XLU": "Utilities SPDR ETF", "XLRE": "Real Estate SPDR ETF",
        "XLB": "Materials SPDR ETF", "XLC": "Comm Services SPDR ETF",
        "ARKK": "ARK Innovation ETF", "SOXX": "iShares Semiconductor ETF",
        "VNQ": "Vanguard Real Estate ETF", "SCHD": "Schwab US Dividend ETF",
        "EFA": "iShares MSCI EAFE ETF", "EEM": "iShares MSCI Emerging Markets",
        # France CAC 40
        "AI.PA": "Air Liquide", "AIR.PA": "Airbus", "ALO.PA": "Alstom", "MT.AS": "ArcelorMittal",
        "CS.PA": "AXA", "BNP.PA": "BNP Paribas", "EN.PA": "Bouygues", "CAP.PA": "Capgemini",
        "CA.PA": "Carrefour", "SGO.PA": "Saint-Gobain", "ACA.PA": "Credit Agricole", "BN.PA": "Danone",
        "DSY.PA": "Dassault Systemes", "EDEN.PA": "Edenred", "ENGI.PA": "Engie",
        "EL.PA": "EssilorLuxottica", "ERF.PA": "Eurofins Scientific", "RMS.PA": "Hermes International",
        "KER.PA": "Kering", "LR.PA": "Legrand", "OR.PA": "L'Oreal", "MC.PA": "LVMH",
        "ML.PA": "Michelin", "ORA.PA": "Orange", "RI.PA": "Pernod Ricard", "PUB.PA": "Publicis Groupe",
        "RNO.PA": "Renault", "SAF.PA": "Safran", "SAN.PA": "Sanofi", "SU.PA": "Schneider Electric",
        "GLE.PA": "Societe Generale", "STLA": "Stellantis", "STM.PA": "STMicroelectronics",
        "HO.PA": "Thales", "TTE.PA": "TotalEnergies", "URW.PA": "Unibail-Rodamco-Westfield",
        "VIE.PA": "Veolia", "DG.PA": "Vinci", "VIV.PA": "Vivendi", "SW.PA": "Sodexo",
        # France SBF 120
        "AF.PA": "Air France-KLM", "AM.PA": "Dassault Aviation", "BIM.PA": "BioMerieux",
        "BVI.PA": "Bureau Veritas", "CNP.PA": "CNP Assurances", "DEC.PA": "JCDecaux",
        "FDJ.PA": "Francaise des Jeux", "GTT.PA": "GTT", "ILD.PA": "Iliad", "NK.PA": "Imerys",
        "NEX.PA": "Nexans", "RUI.PA": "Rubis", "SEB.PA": "SEB", "TFI.PA": "TF1",
        "TKO.PA": "Technip Energies", "UBI.PA": "Ubisoft", "ATOS.PA": "Atos",
        # AEX Amsterdam
        "ASML.AS": "ASML Holding", "ADYEN.AS": "Adyen", "HEIA.AS": "Heineken", "SHEL.AS": "Shell",
        "INGA.AS": "ING Groep", "WKL.AS": "Wolters Kluwer", "NN.AS": "NN Group", "AGN.AS": "Aegon",
        "RAND.AS": "Randstad", "PHIA.AS": "Philips", "ABN.AS": "ABN AMRO", "AKZA.AS": "Akzo Nobel",
        "UMG.AS": "Universal Music Group", "BESI.AS": "BE Semiconductor", "IMCD.AS": "IMCD",
        "ASRNL.AS": "ASR Nederland", "LIGHT.AS": "Signify", "DSFIR.AS": "DSM-Firmenich",
        "TKWY.AS": "Just Eat Takeaway", "GLPG.AS": "Galapagos",
        # BEL 20
        "ABI.BR": "AB InBev", "UCB.BR": "UCB", "KBC.BR": "KBC Groupe", "APAM.BR": "Aperam",
        "AGS.BR": "Ageas", "ACKB.BR": "Ackermans van Haaren", "COLR.BR": "Colruyt",
        "AED.BR": "Aedifica", "BEKB.BR": "Bekaert", "GBLB.BR": "Groupe Bruxelles Lambert",
        "PROX.BR": "Proximus", "SOF.BR": "Sofina", "UMI.BR": "Umicore", "WDP.BR": "Warehouses De Pauw",
        "SOLB.BR": "Solvay", "MELE.BR": "Melexis",
        # Portugal
        "EDP.LS": "EDP", "GALP.LS": "Galp Energia", "JMT.LS": "Jeronimo Martins",
        "NOS.LS": "NOS", "SON.LS": "Sonae", "BCP.LS": "Banco Comercial Portugues", "EDPR.LS": "EDP Renovaveis",
        # DAX 40
        "ADS.DE": "Adidas", "ALV.DE": "Allianz", "BAS.DE": "BASF", "BAYN.DE": "Bayer",
        "BEI.DE": "Beiersdorf", "BMW.DE": "BMW", "BNR.DE": "Brenntag", "CON.DE": "Continental",
        "DTG.DE": "Daimler Truck", "DBK.DE": "Deutsche Bank", "DB1.DE": "Deutsche Borse",
        "DHL.DE": "DHL Group", "DTE.DE": "Deutsche Telekom", "EOAN.DE": "E.ON", "FRE.DE": "Fresenius",
        "HNR1.DE": "Hannover Ruck", "HEIDELG.DE": "HeidelbergMaterials", "HEN3.DE": "Henkel",
        "IFX.DE": "Infineon Technologies", "MBG.DE": "Mercedes-Benz", "MRK.DE": "Merck KGaA",
        "MTX.DE": "MTU Aero Engines", "MUV2.DE": "Munich Re", "P911.DE": "Porsche AG",
        "PAH3.DE": "Porsche SE", "QIA.DE": "Qiagen", "RHM.DE": "Rheinmetall", "RWE.DE": "RWE",
        "SAP.DE": "SAP", "SRT3.DE": "Sartorius", "SIE.DE": "Siemens", "ENR.DE": "Siemens Energy",
        "SHL.DE": "Siemens Healthineers", "SY1.DE": "Symrise", "VOW3.DE": "Volkswagen",
        "VNA.DE": "Vonovia", "ZAL.DE": "Zalando", "1COV.DE": "Covestro", "PUM.DE": "Puma",
        # FTSE 100
        "AZN.L": "AstraZeneca", "SHEL.L": "Shell", "BP.L": "BP", "GSK.L": "GSK",
        "ULVR.L": "Unilever", "HSBA.L": "HSBC", "RIO.L": "Rio Tinto", "BHP.L": "BHP Group",
        "AAL.L": "Anglo American", "GLEN.L": "Glencore", "DGE.L": "Diageo", "REL.L": "RELX",
        "LSEG.L": "London Stock Exchange", "NG.L": "National Grid", "CPG.L": "Compass Group",
        "BA.L": "BAE Systems", "RR.L": "Rolls-Royce", "VOD.L": "Vodafone", "BT-A.L": "BT Group",
        "BARC.L": "Barclays", "LLOY.L": "Lloyds Banking Group", "STAN.L": "Standard Chartered",
        "NWG.L": "NatWest Group", "PRU.L": "Prudential", "LGEN.L": "Legal & General",
        "AV.L": "Aviva", "FLTR.L": "Flutter Entertainment", "RMV.L": "Rightmove",
        "SGRO.L": "Segro", "RKT.L": "Reckitt", "SN.L": "Smith & Nephew", "HLN.L": "Haleon",
        "NXT.L": "Next", "JD.L": "JD Sports", "KGF.L": "Kingfisher", "MKS.L": "Marks & Spencer",
        "TW.L": "Taylor Wimpey", "PSN.L": "Persimmon", "HL.L": "Hargreaves Lansdown",
        "IMB.L": "Imperial Brands", "BATS.L": "British American Tobacco", "EXPN.L": "Experian",
        "WPP.L": "WPP", "IAG.L": "IAG Iberia British Airways", "EZJ.L": "easyJet",
        "RTO.L": "Rentokil Initial", "HLMA.L": "Halma", "TSCO.L": "Tesco", "SBRY.L": "Sainsbury's",
        "ABF.L": "Associated British Foods", "SSE.L": "SSE",
        # IBEX 35
        "ITX.MC": "Inditex Zara", "IBE.MC": "Iberdrola", "SAN.MC": "Banco Santander",
        "BBVA.MC": "BBVA", "CLNX.MC": "Cellnex Telecom", "CABK.MC": "CaixaBank",
        "FER.MC": "Ferrovial", "ACS.MC": "ACS", "REP.MC": "Repsol", "ELE.MC": "Endesa",
        "REE.MC": "Red Electrica", "AMS.MC": "Amadeus IT", "MAP.MC": "MAPFRE",
        "NTGY.MC": "Naturgy", "SAB.MC": "Banco Sabadell", "GRF.MC": "Grifols",
        "IAG.MC": "IAG", "ANA.MC": "Acciona", "IDR.MC": "Indra Sistemas",
        # FTSE MIB
        "ENI.MI": "Eni", "ENEL.MI": "Enel", "RACE.MI": "Ferrari", "ISP.MI": "Intesa Sanpaolo",
        "UCG.MI": "UniCredit", "MB.MI": "Mediobanca", "G.MI": "Generali",
        "STM.MI": "STMicroelectronics", "PRY.MI": "Prysmian", "MONC.MI": "Moncler",
        "BC.MI": "Brunello Cucinelli", "FBK.MI": "FinecoBank", "LDO.MI": "Leonardo",
        "NEXI.MI": "Nexi", "CPR.MI": "Azimut", "SRG.MI": "Snam", "TRN.MI": "Terna",
        "BAMI.MI": "Banco BPM", "STLAM.MI": "Stellantis",
        # SMI Suisse
        "NESN.SW": "Nestle", "NOVN.SW": "Novartis", "ROG.SW": "Roche", "UBSG.SW": "UBS Group",
        "ZURN.SW": "Zurich Insurance", "ABBN.SW": "ABB", "CFR.SW": "Richemont",
        "LONN.SW": "Lonza Group", "SIKA.SW": "Sika", "PGHN.SW": "Partners Group",
        "KNIN.SW": "Kuhne Nagel", "GIVN.SW": "Givaudan", "SREN.SW": "Swiss Re",
        "HOLN.SW": "Holcim", "GEBN.SW": "Geberit", "SOON.SW": "Sonova", "LISN.SW": "Lindt Sprungli",
        # USA Tech
        "AAPL": "Apple", "MSFT": "Microsoft", "NVDA": "Nvidia", "GOOGL": "Alphabet",
        "GOOG": "Alphabet", "AMZN": "Amazon", "META": "Meta Platforms", "TSLA": "Tesla",
        "AVGO": "Broadcom", "ORCL": "Oracle", "AMD": "Advanced Micro Devices", "INTC": "Intel",
        "QCOM": "Qualcomm", "TXN": "Texas Instruments", "MU": "Micron Technology",
        "AMAT": "Applied Materials", "LRCX": "Lam Research", "KLAC": "KLA Corp",
        "MRVL": "Marvell Technology", "ON": "ON Semiconductor", "ADI": "Analog Devices",
        "MCHP": "Microchip Technology", "SWKS": "Skyworks Solutions", "MPWR": "Monolithic Power",
        "ENPH": "Enphase Energy", "WOLF": "Wolfspeed", "ACLS": "Axcelis Technologies",
        "ONTO": "Onto Innovation", "RMBS": "Rambus", "CRUS": "Cirrus Logic", "MTSI": "MACOM Technology",
        "CRM": "Salesforce", "ADBE": "Adobe", "NOW": "ServiceNow", "WDAY": "Workday",
        "SNOW": "Snowflake", "DDOG": "Datadog", "ZS": "Zscaler", "PANW": "Palo Alto Networks",
        "CRWD": "CrowdStrike", "FTNT": "Fortinet", "OKTA": "Okta", "NET": "Cloudflare",
        "TEAM": "Atlassian", "MDB": "MongoDB", "TTD": "The Trade Desk", "PLTR": "Palantir",
        "SHOP": "Shopify", "RBLX": "Roblox", "UBER": "Uber", "ABNB": "Airbnb",
        "COIN": "Coinbase", "SQ": "Block Square", "PYPL": "PayPal", "NFLX": "Netflix",
        "DIS": "Disney", "CMCSA": "Comcast", "SPOT": "Spotify", "T": "AT&T",
        "VZ": "Verizon", "TMUS": "T-Mobile US",
        # USA Finance
        "JPM": "JPMorgan Chase", "BAC": "Bank of America", "WFC": "Wells Fargo",
        "C": "Citigroup", "GS": "Goldman Sachs", "MS": "Morgan Stanley", "BLK": "BlackRock",
        "SCHW": "Charles Schwab", "AXP": "American Express", "V": "Visa", "MA": "Mastercard",
        "COF": "Capital One", "USB": "U.S. Bancorp", "ICE": "Intercontinental Exchange",
        "CME": "CME Group", "SPGI": "S&P Global", "MCO": "Moody's", "MSCI": "MSCI",
        "FIS": "Fidelity National Information", "FISV": "Fiserv",
        # USA Sante
        "JNJ": "Johnson & Johnson", "UNH": "UnitedHealth Group", "LLY": "Eli Lilly",
        "PFE": "Pfizer", "ABT": "Abbott Laboratories", "TMO": "Thermo Fisher Scientific",
        "DHR": "Danaher", "BMY": "Bristol-Myers Squibb", "ABBV": "AbbVie",
        "GILD": "Gilead Sciences", "AMGN": "Amgen", "REGN": "Regeneron Pharmaceuticals",
        "VRTX": "Vertex Pharmaceuticals", "BIIB": "Biogen", "MRNA": "Moderna",
        "ISRG": "Intuitive Surgical", "MDT": "Medtronic", "SYK": "Stryker",
        "EW": "Edwards Lifesciences", "BSX": "Boston Scientific", "CVS": "CVS Health",
        "CI": "Cigna", "HUM": "Humana", "MCK": "McKesson",
        # USA Consommation
        "WMT": "Walmart", "HD": "Home Depot", "LOW": "Lowe's", "TGT": "Target",
        "COST": "Costco", "KO": "Coca-Cola", "PEP": "PepsiCo", "MCD": "McDonald's",
        "SBUX": "Starbucks", "NKE": "Nike", "PG": "Procter & Gamble",
        "CL": "Colgate-Palmolive", "GIS": "General Mills", "MDLZ": "Mondelez International",
        "PM": "Philip Morris", "MO": "Altria Group", "EL": "Estee Lauder",
        "CLX": "Clorox", "MNST": "Monster Beverage",
        # USA Energie
        "XOM": "ExxonMobil", "CVX": "Chevron", "COP": "ConocoPhillips",
        "SLB": "Schlumberger SLB", "EOG": "EOG Resources", "MPC": "Marathon Petroleum",
        "VLO": "Valero Energy", "PSX": "Phillips 66", "HES": "Hess", "DVN": "Devon Energy",
        "FANG": "Diamondback Energy", "BKR": "Baker Hughes", "HAL": "Halliburton",
        "OXY": "Occidental Petroleum", "APA": "APA Corp", "CTRA": "Coterra Energy",
        "AR": "Antero Resources", "CHK": "Chesapeake Energy", "FSLR": "First Solar",
        "RUN": "Sunrun", "ARRY": "Array Technologies", "CWEN": "Clearway Energy",
        "AES": "AES Corp", "NEP": "NextEra Energy Partners", "BE": "Bloom Energy",
        "PLUG": "Plug Power", "BLDP": "Ballard Power", "NEE": "NextEra Energy",
        "DUK": "Duke Energy", "SO": "Southern Company", "D": "Dominion Energy",
        "AEP": "American Electric Power", "EXC": "Exelon", "SRE": "Sempra Energy",
        "PCG": "PG&E", "ED": "Consolidated Edison", "XEL": "Xcel Energy", "WEC": "WEC Energy",
        "ES": "Eversource Energy", "PPL": "PPL Corp", "CMS": "CMS Energy", "ETR": "Entergy",
        "CEG": "Constellation Energy", "VST": "Vistra",
        # USA Industrie / Defense
        "BA": "Boeing", "CAT": "Caterpillar", "GE": "GE Aerospace", "HON": "Honeywell",
        "MMM": "3M", "LMT": "Lockheed Martin", "RTX": "RTX Raytheon", "NOC": "Northrop Grumman",
        "GD": "General Dynamics", "HII": "Huntington Ingalls", "AXON": "Axon Enterprise",
        "LHX": "L3Harris", "KTOS": "Kratos Defense", "BWXT": "BWX Technologies",
        "HEI": "Heico", "TDG": "TransDigm", "EMR": "Emerson Electric", "ETN": "Eaton",
        "ROK": "Rockwell Automation", "AME": "AMETEK", "PH": "Parker Hannifin",
        "ITW": "Illinois Tool Works", "DOV": "Dover", "IR": "Ingersoll Rand",
        "XYL": "Xylem", "IDEX": "IDEX Corp", "TRMB": "Trimble",
        "UNP": "Union Pacific", "CSX": "CSX Corp", "NSC": "Norfolk Southern",
        "CHRW": "C.H. Robinson", "ODFL": "Old Dominion Freight", "SAIA": "Saia",
        "XPO": "XPO Logistics", "JBHT": "J.B. Hunt Transport", "WERN": "Werner Enterprises",
        "GXO": "GXO Logistics", "FDX": "FedEx", "UPS": "United Parcel Service",
        # USA Materiaux
        "LIN": "Linde", "APD": "Air Products", "SHW": "Sherwin-Williams",
        "PPG": "PPG Industries", "IFF": "International Flavors", "EMN": "Eastman Chemical",
        "RPM": "RPM International", "PKG": "Packaging Corp", "IP": "International Paper",
        "SEE": "Sealed Air", "BALL": "Ball Corp", "CCK": "Crown Holdings", "OLN": "Olin Corp",
        "CE": "Celanese", "ALB": "Albemarle", "FCX": "Freeport-McMoRan", "NEM": "Newmont",
        "AA": "Alcoa", "CLF": "Cleveland-Cliffs", "X": "U.S. Steel", "NUE": "Nucor",
        "STLD": "Steel Dynamics", "CF": "CF Industries", "MOS": "Mosaic",
        # USA REITs
        "AMT": "American Tower", "PLD": "Prologis", "EQIX": "Equinix", "CCI": "Crown Castle",
        "SPG": "Simon Property Group", "O": "Realty Income", "PSA": "Public Storage",
        "EQR": "Equity Residential", "AVB": "AvalonBay Communities", "DLR": "Digital Realty",
        "VTR": "Ventas", "WELL": "Welltower", "ARE": "Alexandria Real Estate", "BXP": "BXP Inc",
        "KIM": "Kimco Realty", "REG": "Regency Centers", "NNN": "NNN REIT", "ADC": "Agree Realty",
        "STAG": "STAG Industrial", "VICI": "VICI Properties", "GLPI": "Gaming Leisure Properties",
        "SUI": "Sun Communities", "ELS": "Equity Lifestyle", "UDR": "UDR",
        "CPT": "Camden Property", "ESS": "Essex Property Trust", "MAA": "Mid-America Apartment",
        # Asie Japon
        "7203.T": "Toyota", "9984.T": "SoftBank Group", "6758.T": "Sony", "6861.T": "Keyence",
        "7974.T": "Nintendo", "9433.T": "KDDI", "6367.T": "Daikin", "8306.T": "Mitsubishi UFJ",
        "9432.T": "NTT", "6954.T": "Fanuc", "8035.T": "Tokyo Electron",
        "4063.T": "Shin-Etsu Chemical", "7741.T": "Hoya", "2914.T": "Japan Tobacco",
        "8766.T": "Tokio Marine",
        # Asie Hong Kong
        "9988.HK": "Alibaba", "0700.HK": "Tencent", "0941.HK": "China Mobile",
        "1299.HK": "AIA Group", "0939.HK": "China Construction Bank", "9618.HK": "JD.com",
        "3690.HK": "Meituan", "2318.HK": "Ping An Insurance", "1810.HK": "Xiaomi",
        "0388.HK": "Hong Kong Exchanges",
        # Asie Coree
        "005930.KS": "Samsung Electronics", "000660.KS": "SK Hynix", "035420.KS": "NAVER",
        "051910.KS": "LG Chem", "005380.KS": "Hyundai Motor", "000270.KS": "Kia",
        # Asie Inde
        "RELIANCE.NS": "Reliance Industries", "TCS.NS": "Tata Consultancy Services",
        "INFY.NS": "Infosys", "HDFCBANK.NS": "HDFC Bank", "ICICIBANK.NS": "ICICI Bank",
        "WIPRO.NS": "Wipro", "HINDUNILVR.NS": "Hindustan Unilever", "ITC.NS": "ITC Ltd",
        "TATAMOTORS.NS": "Tata Motors", "BAJFINANCE.NS": "Bajaj Finance",
        # Crypto
        "BTC-USD": "Bitcoin", "ETH-USD": "Ethereum", "BNB-USD": "BNB Binance Coin",
        "XRP-USD": "XRP Ripple", "SOL-USD": "Solana", "ADA-USD": "Cardano",
        "DOGE-USD": "Dogecoin", "TRX-USD": "TRON", "TON-USD": "Toncoin", "AVAX-USD": "Avalanche",
        "DOT-USD": "Polkadot", "MATIC-USD": "Polygon MATIC", "ATOM-USD": "Cosmos",
        "NEAR-USD": "NEAR Protocol", "APT-USD": "Aptos", "ARB-USD": "Arbitrum",
        "OP-USD": "Optimism", "SUI-USD": "Sui", "SEI-USD": "Sei", "INJ-USD": "Injective",
        "UNI-USD": "Uniswap", "LINK-USD": "Chainlink", "AAVE-USD": "Aave",
        "MKR-USD": "Maker", "CRV-USD": "Curve DAO", "COMP-USD": "Compound",
        "BAL-USD": "Balancer", "SNX-USD": "Synthetix", "1INCH-USD": "1inch",
        "SUSHI-USD": "SushiSwap", "FIL-USD": "Filecoin", "GRT-USD": "The Graph",
        "LPT-USD": "Livepeer", "RNDR-USD": "Render Token", "AR-USD": "Arweave",
        "AXS-USD": "Axie Infinity", "SAND-USD": "The Sandbox", "MANA-USD": "Decentraland",
        "ENJ-USD": "Enjin Coin", "GALA-USD": "Gala Games", "USDT-USD": "Tether USDT",
        "USDC-USD": "USD Coin USDC", "DAI-USD": "DAI", "LTC-USD": "Litecoin",
        "BCH-USD": "Bitcoin Cash", "XLM-USD": "Stellar", "ALGO-USD": "Algorand",
        "VET-USD": "VeChain", "HBAR-USD": "Hedera", "EOS-USD": "EOS",
        "XMR-USD": "Monero", "ZEC-USD": "Zcash", "DASH-USD": "Dash",
        # Matieres premieres
        "CL=F": "Petrole brut WTI", "NG=F": "Gaz naturel", "BZ=F": "Petrole Brent",
        "RB=F": "Essence RBOB", "HO=F": "Fioul domestique", "GC=F": "Or", "SI=F": "Argent",
        "PL=F": "Platine", "PA=F": "Palladium", "HG=F": "Cuivre", "ALI=F": "Aluminium",
        "ZN=F": "Zinc", "PB=F": "Plomb", "NI=F": "Nickel", "ZC=F": "Mais", "ZW=F": "Ble",
        "ZS=F": "Soja", "KC=F": "Cafe", "SB=F": "Sucre", "CT=F": "Coton",
        "CC=F": "Cacao", "OJ=F": "Jus d'orange", "LBS=F": "Bois d'oeuvre",
        "LE=F": "Boeuf vif", "GF=F": "Boeuf engraissement", "HE=F": "Porc maigre",
    }

    def _local_search(query: str) -> list:
        query_upper = query.upper()
        query_lower = query.lower()
        hits = []
        seen = set()
        for market_key, market in MARKETS.items():
            for sym in market["assets"]:
                if sym in seen:
                    continue
                display_name = SYMBOL_NAMES.get(sym, sym)
                sym_match = query_upper in sym or sym.startswith(query_upper)
                name_match = query_lower in display_name.lower()
                if sym_match or name_match:
                    seen.add(sym)
                    hits.append({"symbol": sym, "name": display_name, "exchange": market_key, "type": "EQUITY"})
        return hits[:10]

    # --- Yahoo Finance search ---
    base_urls = [
        "https://query1.finance.yahoo.com/v1/finance/search",
        "https://query2.finance.yahoo.com/v1/finance/search",
    ]
    params = {
        "q": q,
        "lang": "en-US",
        "region": "US",
        "quotesCount": 15,
        "newsCount": 0,
        "enableFuzzyQuery": True,
        "quotesQueryId": "tss_match_phrase_query",
    }
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://finance.yahoo.com/",
    }

    data = None
    async with httpx.AsyncClient(timeout=8) as client:
        for url in base_urls:
            try:
                resp = await client.get(url, params=params, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    break
            except Exception:
                continue

    allowed = {"EQUITY", "ETF", "CRYPTOCURRENCY", "MUTUALFUND", "INDEX", "FUTURE", "CURRENCY"}
    results = []
    seen = set()

    if data:
        for quote in data.get("quotes", []):
            symbol = quote.get("symbol", "")
            if not symbol or symbol in seen:
                continue
            qtype = quote.get("quoteType", "EQUITY")
            if qtype not in allowed:
                continue
            seen.add(symbol)
            results.append({
                "symbol":   symbol,
                "name":     quote.get("longname") or quote.get("shortname") or symbol,
                "exchange": quote.get("exchDisp") or quote.get("exchange", ""),
                "type":     qtype,
            })

    # If Yahoo returned nothing, use local fallback
    if not results:
        results = _local_search(q_upper)

    return {"results": results}


@router.get("/my-requests")
async def get_my_asset_requests(
    current_user: dict = Depends(get_current_user)
):
    """Get user's asset requests"""
    user_id = current_user.get("id")

    requests = await execute_query("""
        SELECT * FROM asset_requests
        WHERE user_id = ?
        ORDER BY created_at DESC
    """, (user_id,))

    return {"requests": requests or []}


@router.get("/{market_key}")
async def get_market_info(market_key: str):
    """Get detailed info for a specific market"""
    market_key = market_key.upper()
    if market_key not in MARKETS:
        raise HTTPException(status_code=404, detail="Market not found")

    market = MARKETS[market_key]
    return {
        "key": market_key,
        **market
    }


@router.get("/{market_key}/assets")
async def get_market_assets(
    market_key: str,
    limit: int = Query(default=20, le=100)
):
    """Get assets for a market with live prices"""
    market_key = market_key.upper()
    if market_key not in MARKETS:
        raise HTTPException(status_code=404, detail="Market not found")

    assets = MARKETS[market_key]["assets"][:limit]

    # Import yfinance to get live data
    import yfinance as yf

    result = []
    for symbol in assets:
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.fast_info
            hist = ticker.history(period="2d")

            if len(hist) >= 2:
                current_price = hist['Close'].iloc[-1]
                prev_price = hist['Close'].iloc[-2]
                change = ((current_price - prev_price) / prev_price) * 100
            else:
                current_price = getattr(info, 'last_price', 0) or 0
                change = 0

            result.append({
                "symbol": symbol,
                "price": round(current_price, 2),
                "change": round(change, 2),
                "volume": int(hist['Volume'].iloc[-1]) if len(hist) > 0 else 0
            })
        except Exception:
            result.append({
                "symbol": symbol,
                "price": 0,
                "change": 0,
                "volume": 0,
                "error": True
            })

    return {"assets": result}


@router.get("/quote/{symbol}")
@limiter.limit("20/minute")
async def get_quote(request: Request, symbol: str):
    """Get real-time quote for a symbol"""
    if not _SYMBOL_RE.match(symbol.upper()):
        raise HTTPException(status_code=400, detail="Symbole invalide")
    symbol = symbol.upper()
    import yfinance as yf

    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info
        hist = ticker.history(period="5d")

        if hist.empty:
            raise HTTPException(status_code=404, detail="Symbol not found")

        current = hist['Close'].iloc[-1]
        prev = hist['Close'].iloc[-2] if len(hist) > 1 else current
        change = ((current - prev) / prev) * 100

        return {
            "symbol": symbol,
            "name": info.get("shortName", symbol),
            "price": round(current, 2),
            "change": round(change, 2),
            "change_amount": round(current - prev, 2),
            "high": round(hist['High'].iloc[-1], 2),
            "low": round(hist['Low'].iloc[-1], 2),
            "open": round(hist['Open'].iloc[-1], 2),
            "volume": int(hist['Volume'].iloc[-1]),
            "market_cap": info.get("marketCap"),
            "pe_ratio": info.get("trailingPE"),
            "52w_high": info.get("fiftyTwoWeekHigh"),
            "52w_low": info.get("fiftyTwoWeekLow")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/chart/{symbol}")
@limiter.limit("10/minute")
async def get_chart_data(
    request: Request,
    symbol: str,
    period: str = Query(default="1mo", regex="^(1d|5d|1mo|3mo|6mo|1y|2y|5y|max)$"),
    interval: str = Query(default="1d", regex="^(1m|5m|15m|1h|1d|1wk|1mo)$")
):
    """Get OHLCV chart data for a symbol"""
    if not _SYMBOL_RE.match(symbol.upper()):
        raise HTTPException(status_code=400, detail="Symbole invalide")
    symbol = symbol.upper()
    import yfinance as yf

    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period=period, interval=interval)

        if hist.empty:
            raise HTTPException(status_code=404, detail="No data found")

        return {
            "symbol": symbol,
            "period": period,
            "interval": interval,
            "data": [
                {
                    "timestamp": int(idx.timestamp() * 1000),
                    "open": round(row["Open"], 4),
                    "high": round(row["High"], 4),
                    "low": round(row["Low"], 4),
                    "close": round(row["Close"], 4),
                    "volume": int(row["Volume"])
                }
                for idx, row in hist.iterrows()
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============== ASSET REQUESTS ==============

@router.post("/request-asset")
async def request_new_asset(
    request: AssetRequestCreate,
    current_user: dict = Depends(get_current_user)
):
    """Request a new asset to be added to the platform"""
    user_id = current_user.get("id")

    # Check if symbol already exists in any market
    symbol_upper = request.symbol.upper()
    for market_key, market in MARKETS.items():
        if symbol_upper in market["assets"]:
            raise HTTPException(
                status_code=400,
                detail=f"Asset {symbol_upper} already exists in {market['name']}"
            )

    # Check if there's already a pending request for this symbol
    existing = await execute_query(
        "SELECT * FROM asset_requests WHERE symbol = ? AND status = 'pending'",
        (symbol_upper,)
    )
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"A request for {symbol_upper} is already pending"
        )

    # Create the request
    await execute_write("""
        INSERT INTO asset_requests (user_id, symbol, asset_name, asset_type, reason, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
    """, (user_id, symbol_upper, request.asset_name, request.asset_type, request.reason))

    return {
        "success": True,
        "message": f"Request for {symbol_upper} has been submitted for admin review"
    }


