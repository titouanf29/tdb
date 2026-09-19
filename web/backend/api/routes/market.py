"""
Market data routes
"""
import logging
import re
import sys
import httpx
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Depends, Request
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address

logger = logging.getLogger(__name__)

from config import MARKETS

from ..database import execute_query, execute_write
from .auth import get_current_user

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)
_SYMBOL_RE = re.compile(r'^[\^A-Z0-9.\-=]{1,30}$')

# Human-readable names — covers ALL registered MARKETS assets (~800 symbols)
SYMBOL_NAMES: dict = {
    # ---- Indices ----
    "^FCHI": "CAC 40", "^SBF120": "SBF 120", "^GDAXI": "DAX 40", "^FTSE": "FTSE 100",
    "^AEX": "AEX Amsterdam", "^BFX": "BEL 20", "^IBEX": "IBEX 35", "^FTSEMIB": "FTSE MIB",
    "^SSMI": "SMI Suisse", "^STOXX50E": "Euro Stoxx 50", "^GSPC": "S&P 500", "^DJI": "Dow Jones",
    "^IXIC": "NASDAQ Composite", "^RUT": "Russell 2000", "^VIX": "VIX Volatilite",
    "^N225": "Nikkei 225", "^HSI": "Hang Seng", "000001.SS": "Shanghai Composite",
    "^KOSPI": "KOSPI Coree du Sud", "^BSESN": "BSE Sensex Inde",
    # ---- ETFs USA ----
    "SPY": "SPDR S&P 500 ETF", "QQQ": "Invesco QQQ NASDAQ-100", "DIA": "SPDR Dow Jones ETF",
    "IWM": "iShares Russell 2000 ETF", "VOO": "Vanguard S&P 500 ETF", "VTI": "Vanguard Total Market ETF",
    "GLD": "SPDR Gold Shares ETF", "SLV": "iShares Silver Trust ETF", "TLT": "iShares 20Y Treasury ETF",
    "HYG": "iShares HY Corporate Bond ETF", "LQD": "iShares IG Corporate Bond ETF",
    "XLE": "Energy Select SPDR ETF", "XLF": "Financial Select SPDR ETF", "XLK": "Technology Select SPDR ETF",
    "XLV": "Health Care SPDR ETF", "XLI": "Industrial SPDR ETF", "XLY": "Consumer Discret SPDR ETF",
    "XLP": "Consumer Staples SPDR ETF", "XLU": "Utilities SPDR ETF", "XLRE": "Real Estate SPDR ETF",
    "XLB": "Materials SPDR ETF", "XLC": "Comm Services SPDR ETF",
    "ARKK": "ARK Innovation ETF", "SOXX": "iShares Semiconductor ETF",
    "VNQ": "Vanguard Real Estate ETF", "SCHD": "Schwab US Dividend ETF",
    "EFA": "iShares MSCI EAFE ETF", "EEM": "iShares MSCI Emerging Markets ETF",
    # ---- France CAC 40 ----
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
    # ---- France SBF 120 ----
    "AF.PA": "Air France-KLM", "AM.PA": "Dassault Aviation", "BIM.PA": "BioMerieux",
    "BVI.PA": "Bureau Veritas", "CNP.PA": "CNP Assurances", "DEC.PA": "JCDecaux",
    "FDJ.PA": "Francaise des Jeux", "GTT.PA": "GTT", "ILD.PA": "Iliad", "NK.PA": "Imerys",
    "NEX.PA": "Nexans", "RUI.PA": "Rubis", "SEB.PA": "SEB", "TFI.PA": "TF1",
    "TKO.PA": "Technip Energies", "UBI.PA": "Ubisoft", "ATOS.PA": "Atos", "COFA.PA": "Coface",
    # ---- Netherlands AEX ----
    "ASML.AS": "ASML Holding", "ADYEN.AS": "Adyen", "HEIA.AS": "Heineken", "SHEL.AS": "Shell",
    "INGA.AS": "ING Groep", "WKL.AS": "Wolters Kluwer", "NN.AS": "NN Group", "AGN.AS": "Aegon",
    "RAND.AS": "Randstad", "PHIA.AS": "Philips", "ABN.AS": "ABN AMRO", "AKZA.AS": "Akzo Nobel",
    "UMG.AS": "Universal Music Group", "BESI.AS": "BE Semiconductor", "IMCD.AS": "IMCD",
    "ASRNL.AS": "ASR Nederland", "LIGHT.AS": "Signify", "DSFIR.AS": "DSM-Firmenich",
    "TKWY.AS": "Just Eat Takeaway", "GLPG.AS": "Galapagos",
    # ---- Belgium BEL 20 ----
    "ABI.BR": "AB InBev", "UCB.BR": "UCB", "KBC.BR": "KBC Groupe", "APAM.BR": "Aperam",
    "AGS.BR": "Ageas", "ACKB.BR": "Ackermans van Haaren", "COLR.BR": "Colruyt",
    "AED.BR": "Aedifica", "BEKB.BR": "Bekaert", "GBLB.BR": "Groupe Bruxelles Lambert",
    "PROX.BR": "Proximus", "SOF.BR": "Sofina", "UMI.BR": "Umicore", "WDP.BR": "Warehouses De Pauw",
    "SOLB.BR": "Solvay", "MELE.BR": "Melexis",
    # ---- Portugal PSI ----
    "EDP.LS": "EDP", "GALP.LS": "Galp Energia", "JMT.LS": "Jeronimo Martins",
    "NOS.LS": "NOS", "SON.LS": "Sonae", "BCP.LS": "Banco Comercial Portugues",
    "EDPR.LS": "EDP Renovaveis",
    # ---- Germany DAX 40 ----
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
    # ---- UK FTSE 100 ----
    "AZN.L": "AstraZeneca", "SHEL.L": "Shell", "BP.L": "BP", "GSK.L": "GSK",
    "ULVR.L": "Unilever", "HSBA.L": "HSBC", "RIO.L": "Rio Tinto", "BHP.L": "BHP Group",
    "AAL.L": "Anglo American", "GLEN.L": "Glencore", "DGE.L": "Diageo", "REL.L": "RELX",
    "LSEG.L": "London Stock Exchange Group", "NG.L": "National Grid", "CPG.L": "Compass Group",
    "BA.L": "BAE Systems", "RR.L": "Rolls-Royce", "VOD.L": "Vodafone", "BT-A.L": "BT Group",
    "BARC.L": "Barclays", "LLOY.L": "Lloyds Banking Group", "STAN.L": "Standard Chartered",
    "NWG.L": "NatWest Group", "PRU.L": "Prudential", "LGEN.L": "Legal & General",
    "AV.L": "Aviva", "ADM.L": "Admiral Group", "FLTR.L": "Flutter Entertainment",
    "RMV.L": "Rightmove", "SGRO.L": "Segro", "RKT.L": "Reckitt", "SN.L": "Smith & Nephew",
    "HLN.L": "Haleon", "NXT.L": "Next", "JD.L": "JD Sports", "KGF.L": "Kingfisher",
    "MKS.L": "Marks & Spencer", "TW.L": "Taylor Wimpey", "PSN.L": "Persimmon",
    "HL.L": "Hargreaves Lansdown", "IMB.L": "Imperial Brands",
    "BATS.L": "British American Tobacco", "EXPN.L": "Experian",
    "WPP.L": "WPP", "IAG.L": "IAG Iberia British Airways", "EZJ.L": "easyJet",
    "RTO.L": "Rentokil Initial", "HLMA.L": "Halma", "TSCO.L": "Tesco",
    "SBRY.L": "Sainsbury's", "ABF.L": "Associated British Foods", "SSE.L": "SSE",
    # ---- Spain IBEX 35 ----
    "ITX.MC": "Inditex Zara", "IBE.MC": "Iberdrola", "SAN.MC": "Banco Santander",
    "BBVA.MC": "BBVA", "CLNX.MC": "Cellnex Telecom", "CABK.MC": "CaixaBank",
    "FER.MC": "Ferrovial", "ACS.MC": "ACS", "REP.MC": "Repsol", "ELE.MC": "Endesa",
    "REE.MC": "Red Electrica", "AMS.MC": "Amadeus IT", "MAP.MC": "MAPFRE",
    "NTGY.MC": "Naturgy", "SAB.MC": "Banco Sabadell", "GRF.MC": "Grifols",
    "IAG.MC": "IAG", "ANA.MC": "Acciona", "IDR.MC": "Indra Sistemas",
    # ---- Italy FTSE MIB ----
    "ENI.MI": "Eni", "ENEL.MI": "Enel", "RACE.MI": "Ferrari", "ISP.MI": "Intesa Sanpaolo",
    "UCG.MI": "UniCredit", "MB.MI": "Mediobanca", "G.MI": "Generali",
    "STM.MI": "STMicroelectronics", "PRY.MI": "Prysmian", "MONC.MI": "Moncler",
    "BC.MI": "Brunello Cucinelli", "FBK.MI": "FinecoBank", "LDO.MI": "Leonardo",
    "NEXI.MI": "Nexi", "CPR.MI": "Campari", "SRG.MI": "Snam", "TRN.MI": "Terna",
    "BAMI.MI": "Banco BPM", "STLAM.MI": "Stellantis",
    # ---- Switzerland SMI ----
    "NESN.SW": "Nestle", "NOVN.SW": "Novartis", "ROG.SW": "Roche", "UBSG.SW": "UBS Group",
    "ZURN.SW": "Zurich Insurance", "ABBN.SW": "ABB", "CFR.SW": "Richemont",
    "LONN.SW": "Lonza Group", "SIKA.SW": "Sika", "PGHN.SW": "Partners Group",
    "KNIN.SW": "Kuhne+Nagel", "GIVN.SW": "Givaudan", "SREN.SW": "Swiss Re",
    "HOLN.SW": "Holcim", "GEBN.SW": "Geberit", "SOON.SW": "Sonova", "LISN.SW": "Lindt & Sprungli",
    # ---- USA Tech / Mega Cap ----
    "AAPL": "Apple", "MSFT": "Microsoft", "NVDA": "Nvidia", "GOOGL": "Alphabet A",
    "GOOG": "Alphabet C", "AMZN": "Amazon", "META": "Meta Platforms", "TSLA": "Tesla",
    "AVGO": "Broadcom", "ORCL": "Oracle", "AMD": "AMD", "INTC": "Intel",
    "QCOM": "Qualcomm", "TXN": "Texas Instruments", "MU": "Micron Technology",
    "AMAT": "Applied Materials", "LRCX": "Lam Research", "KLAC": "KLA Corp",
    "MRVL": "Marvell Technology", "ON": "ON Semiconductor", "ADI": "Analog Devices",
    "MCHP": "Microchip Technology", "SWKS": "Skyworks Solutions", "MPWR": "Monolithic Power",
    "ENPH": "Enphase Energy", "WOLF": "Wolfspeed", "ACLS": "Axcelis Technologies",
    "ONTO": "Onto Innovation", "RMBS": "Rambus", "CRUS": "Cirrus Logic", "MTSI": "MACOM Technology",
    "CSCO": "Cisco", "IBM": "IBM", "DELL": "Dell Technologies", "HPQ": "HP Inc",
    "HPE": "Hewlett Packard Enterprise", "ANET": "Arista Networks", "JNPR": "Juniper Networks",
    "FFIV": "F5 Networks", "CIEN": "Ciena", "PSTG": "Pure Storage", "NTAP": "NetApp",
    "WDC": "Western Digital", "STX": "Seagate Technology",
    # ---- USA Software / Cloud / SaaS ----
    "CRM": "Salesforce", "ADBE": "Adobe", "NOW": "ServiceNow", "WDAY": "Workday",
    "SNOW": "Snowflake", "DDOG": "Datadog", "ZS": "Zscaler", "CRWD": "CrowdStrike",
    "PANW": "Palo Alto Networks", "FTNT": "Fortinet", "OKTA": "Okta", "NET": "Cloudflare",
    "TEAM": "Atlassian", "MDB": "MongoDB", "HUBS": "HubSpot", "DOCN": "DigitalOcean",
    "GTLB": "GitLab", "BILL": "Bill.com", "PCTY": "Paylocity", "PATH": "UiPath",
    "NTNX": "Nutanix", "ESTC": "Elastic", "CFLT": "Confluent", "S": "SentinelOne",
    "TENB": "Tenable Holdings", "CYBR": "CyberArk",
    "TTD": "The Trade Desk", "PLTR": "Palantir", "SHOP": "Shopify",
    # ---- USA Internet / Plateformes ----
    "NFLX": "Netflix", "UBER": "Uber", "LYFT": "Lyft", "SNAP": "Snap",
    "PINS": "Pinterest", "TWTR": "Twitter (X)", "RDDT": "Reddit", "ABNB": "Airbnb",
    "DASH": "DoorDash", "COIN": "Coinbase", "RBLX": "Roblox", "U": "Unity Software",
    "EA": "Electronic Arts", "TTWO": "Take-Two Interactive", "ATVI": "Activision Blizzard",
    "MTCH": "Match Group", "IAC": "IAC", "EBAY": "eBay", "ETSY": "Etsy",
    "W": "Wayfair", "SPOT": "Spotify",
    # ---- USA Telecom / Media ----
    "T": "AT&T", "VZ": "Verizon", "TMUS": "T-Mobile US", "CMCSA": "Comcast",
    "DIS": "Walt Disney", "CHTR": "Charter Communications", "WBD": "Warner Bros Discovery",
    "PARA": "Paramount Global", "FOX": "Fox Corp B", "FOXA": "Fox Corp A",
    # ---- USA Finance / Banques ----
    "JPM": "JPMorgan Chase", "BAC": "Bank of America", "WFC": "Wells Fargo",
    "GS": "Goldman Sachs", "MS": "Morgan Stanley", "C": "Citigroup",
    "BLK": "BlackRock", "SCHW": "Charles Schwab", "TFC": "Truist Financial",
    "USB": "U.S. Bancorp", "PNC": "PNC Financial Services",
    "COF": "Capital One", "DFS": "Discover Financial", "SYF": "Synchrony Financial",
    "ALLY": "Ally Financial", "V": "Visa", "MA": "Mastercard", "AXP": "American Express",
    "PYPL": "PayPal", "FIS": "Fidelity National Info", "FI": "Fiserv",
    "GPN": "Global Payments", "AFRM": "Affirm", "SQ": "Block",
    "ICE": "Intercontinental Exchange", "CME": "CME Group",
    "SPGI": "S&P Global", "MCO": "Moody's", "MSCI": "MSCI",
    # ---- USA Assurances / Asset Managers ----
    "BRK-B": "Berkshire Hathaway B", "BRK-A": "Berkshire Hathaway A",
    "MET": "MetLife", "PRU": "Prudential Financial", "AFL": "Aflac",
    "TRV": "Travelers", "CB": "Chubb", "ALL": "Allstate", "PGR": "Progressive",
    "HIG": "Hartford Financial", "AON": "Aon", "MMC": "Marsh McLennan",
    "WTW": "Willis Towers Watson", "AJG": "Arthur J. Gallagher", "BRO": "Brown & Brown",
    "BX": "Blackstone", "KKR": "KKR & Co", "APO": "Apollo Global Management",
    "CG": "Carlyle Group", "ARES": "Ares Management", "BAM": "Brookfield Asset Management",
    # ---- USA Sante / Pharma ----
    "JNJ": "Johnson & Johnson", "UNH": "UnitedHealth Group", "PFE": "Pfizer",
    "ABBV": "AbbVie", "LLY": "Eli Lilly", "MRK": "Merck",
    "TMO": "Thermo Fisher Scientific", "ABT": "Abbott Laboratories", "MDT": "Medtronic",
    "BMY": "Bristol-Myers Squibb", "AMGN": "Amgen", "GILD": "Gilead Sciences",
    "BIIB": "Biogen", "REGN": "Regeneron", "VRTX": "Vertex Pharmaceuticals",
    "ILMN": "Illumina", "IQV": "IQVIA", "DHR": "Danaher", "BAX": "Baxter International",
    "BDX": "Becton Dickinson", "EW": "Edwards Lifesciences", "SYK": "Stryker",
    "ZBH": "Zimmer Biomet", "ISRG": "Intuitive Surgical", "BSX": "Boston Scientific",
    "HCA": "HCA Healthcare", "CNC": "Centene", "CVS": "CVS Health", "MCK": "McKesson",
    "CI": "Cigna", "HUM": "Humana", "MOH": "Molina Healthcare",
    "MRNA": "Moderna", "BNTX": "BioNTech", "NTLA": "Intellia Therapeutics",
    "BEAM": "Beam Therapeutics", "CRSP": "CRISPR Therapeutics", "TDOC": "Teladoc Health",
    # ---- USA Grande Conso / Retail ----
    "PG": "Procter & Gamble", "KO": "Coca-Cola", "PEP": "PepsiCo",
    "MDLZ": "Mondelez", "GIS": "General Mills", "K": "Kellanova",
    "CPB": "Campbell Soup", "CAG": "Conagra Brands", "HSY": "Hershey",
    "MKC": "McCormick", "SJM": "J.M. Smucker", "HRL": "Hormel Foods",
    "TSN": "Tyson Foods", "CL": "Colgate-Palmolive", "KMB": "Kimberly-Clark",
    "CHD": "Church & Dwight", "CLX": "Clorox", "MNST": "Monster Beverage",
    "PM": "Philip Morris", "MO": "Altria Group", "EL": "Estee Lauder",
    "WMT": "Walmart", "COST": "Costco", "TGT": "Target", "HD": "Home Depot",
    "LOW": "Lowe's", "EBAY": "eBay", "ETSY": "Etsy", "W": "Wayfair",
    "ULTA": "Ulta Beauty", "TJX": "TJX Companies", "ROST": "Ross Stores",
    "BURL": "Burlington Stores", "FIVE": "Five Below", "DLTR": "Dollar Tree",
    "DG": "Dollar General", "KR": "Kroger", "SFM": "Sprouts Farmers Market",
    # ---- USA Restauration ----
    "MCD": "McDonald's", "SBUX": "Starbucks", "CMG": "Chipotle Mexican Grill",
    "YUM": "Yum! Brands", "QSR": "Restaurant Brands International",
    "DRI": "Darden Restaurants", "TXRH": "Texas Roadhouse",
    "SHAK": "Shake Shack", "BROS": "Dutch Bros",
    # ---- USA Mode / Sport ----
    "NKE": "Nike", "LULU": "Lululemon Athletica", "DECK": "Deckers Outdoor",
    "SKX": "Skechers", "PVH": "PVH Corp", "RL": "Ralph Lauren",
    "TPR": "Tapestry", "CPRI": "Capri Holdings", "HBI": "Hanesbrands",
    # ---- USA Automobile ----
    "TSLA": "Tesla", "GM": "General Motors", "F": "Ford Motor",
    "RIVN": "Rivian Automotive", "LCID": "Lucid Motors",
    "NIO": "Nio", "LI": "Li Auto", "XPEV": "XPeng",
    # ---- USA Voyages / Hotels / Casinos ----
    "MAR": "Marriott International", "HLT": "Hilton Worldwide", "H": "Hyatt Hotels",
    "MGM": "MGM Resorts", "WYNN": "Wynn Resorts", "LVS": "Las Vegas Sands",
    "RCL": "Royal Caribbean", "CCL": "Carnival", "NCLH": "Norwegian Cruise Line",
    "DAL": "Delta Air Lines", "AAL": "American Airlines", "UAL": "United Airlines",
    "LUV": "Southwest Airlines", "BKNG": "Booking Holdings", "EXPE": "Expedia",
    # ---- USA Energie / Petrole / Gaz ----
    "XOM": "ExxonMobil", "CVX": "Chevron", "COP": "ConocoPhillips",
    "SLB": "SLB Schlumberger", "EOG": "EOG Resources", "MPC": "Marathon Petroleum",
    "VLO": "Valero Energy", "PSX": "Phillips 66", "HES": "Hess",
    "DVN": "Devon Energy", "FANG": "Diamondback Energy", "BKR": "Baker Hughes",
    "HAL": "Halliburton", "OXY": "Occidental Petroleum", "APA": "APA Corp",
    "CTRA": "Coterra Energy", "AR": "Antero Resources", "CHK": "Chesapeake Energy",
    # ---- USA Energie propre ----
    "FSLR": "First Solar", "RUN": "Sunrun", "ARRY": "Array Technologies",
    "CWEN": "Clearway Energy", "AES": "AES Corp", "NEP": "NextEra Energy Partners",
    "BE": "Bloom Energy", "PLUG": "Plug Power", "BLDP": "Ballard Power",
    # ---- USA Utilities ----
    "NEE": "NextEra Energy", "DUK": "Duke Energy", "SO": "Southern Company",
    "D": "Dominion Energy", "AEP": "American Electric Power", "EXC": "Exelon",
    "SRE": "Sempra Energy", "PCG": "PG&E", "ED": "Consolidated Edison",
    "XEL": "Xcel Energy", "WEC": "WEC Energy", "ES": "Eversource Energy",
    "PPL": "PPL Corp", "CMS": "CMS Energy", "ETR": "Entergy",
    "CEG": "Constellation Energy", "VST": "Vistra",
    # ---- USA Industrie / Defense ----
    "SPCX": "SpaceX",
    "BA": "Boeing", "CAT": "Caterpillar", "GE": "GE Aerospace", "HON": "Honeywell",
    "MMM": "3M", "LMT": "Lockheed Martin", "RTX": "RTX Raytheon",
    "NOC": "Northrop Grumman", "GD": "General Dynamics", "HII": "Huntington Ingalls",
    "AXON": "Axon Enterprise", "LHX": "L3Harris", "KTOS": "Kratos Defense",
    "BWXT": "BWX Technologies", "HEI": "Heico", "TDG": "TransDigm",
    "EMR": "Emerson Electric", "ETN": "Eaton", "ROK": "Rockwell Automation",
    "AME": "AMETEK", "PH": "Parker Hannifin", "ITW": "Illinois Tool Works",
    "DOV": "Dover", "IR": "Ingersoll Rand", "XYL": "Xylem",
    "IDEX": "IDEX Corp", "TRMB": "Trimble",
    # ---- USA Transport / Logistique ----
    "UNP": "Union Pacific", "CSX": "CSX Corp", "NSC": "Norfolk Southern",
    "CHRW": "C.H. Robinson", "ODFL": "Old Dominion Freight", "SAIA": "Saia",
    "XPO": "XPO Logistics", "JBHT": "J.B. Hunt Transport", "WERN": "Werner Enterprises",
    "GXO": "GXO Logistics", "FDX": "FedEx", "UPS": "United Parcel Service",
    # ---- USA Materiaux ----
    "LIN": "Linde", "APD": "Air Products", "SHW": "Sherwin-Williams",
    "PPG": "PPG Industries", "IFF": "International Flavors", "EMN": "Eastman Chemical",
    "RPM": "RPM International", "PKG": "Packaging Corp", "IP": "International Paper",
    "SEE": "Sealed Air", "BALL": "Ball Corp", "CCK": "Crown Holdings", "OLN": "Olin Corp",
    "CE": "Celanese", "ALB": "Albemarle", "FCX": "Freeport-McMoRan", "NEM": "Newmont",
    "AA": "Alcoa", "CLF": "Cleveland-Cliffs", "X": "U.S. Steel", "NUE": "Nucor",
    "STLD": "Steel Dynamics", "CF": "CF Industries", "MOS": "Mosaic",
    # ---- USA REITs ----
    "AMT": "American Tower", "PLD": "Prologis", "EQIX": "Equinix", "CCI": "Crown Castle",
    "SPG": "Simon Property Group", "O": "Realty Income", "PSA": "Public Storage",
    "EQR": "Equity Residential", "AVB": "AvalonBay Communities", "DLR": "Digital Realty",
    "VTR": "Ventas", "WELL": "Welltower", "ARE": "Alexandria Real Estate", "BXP": "BXP Inc",
    "KIM": "Kimco Realty", "REG": "Regency Centers", "NNN": "NNN REIT", "ADC": "Agree Realty",
    "STAG": "STAG Industrial", "VICI": "VICI Properties", "GLPI": "Gaming & Leisure Properties",
    "SUI": "Sun Communities", "ELS": "Equity Lifestyle", "UDR": "UDR",
    "CPT": "Camden Property", "ESS": "Essex Property Trust", "MAA": "Mid-America Apartment",
    # ---- Asie Japon ----
    "7203.T": "Toyota", "9984.T": "SoftBank Group", "6758.T": "Sony", "6861.T": "Keyence",
    "7974.T": "Nintendo", "9433.T": "KDDI", "6367.T": "Daikin", "8306.T": "Mitsubishi UFJ",
    "9432.T": "NTT", "6954.T": "Fanuc", "8035.T": "Tokyo Electron",
    "4063.T": "Shin-Etsu Chemical", "7741.T": "Hoya", "2914.T": "Japan Tobacco",
    "8766.T": "Tokio Marine",
    # ---- Asie Hong Kong / Chine ----
    "9988.HK": "Alibaba", "0700.HK": "Tencent", "0941.HK": "China Mobile",
    "1299.HK": "AIA Group", "0939.HK": "China Construction Bank", "9618.HK": "JD.com",
    "3690.HK": "Meituan", "2318.HK": "Ping An Insurance", "1810.HK": "Xiaomi",
    "0388.HK": "HKEX Hong Kong Exchanges",
    # ---- Asie Coree du Sud ----
    "005930.KS": "Samsung Electronics", "000660.KS": "SK Hynix", "035420.KS": "NAVER",
    "051910.KS": "LG Chem", "005380.KS": "Hyundai Motor", "000270.KS": "Kia",
    # ---- Asie Inde ----
    "RELIANCE.NS": "Reliance Industries", "TCS.NS": "Tata Consultancy Services",
    "INFY.NS": "Infosys", "HDFCBANK.NS": "HDFC Bank", "ICICIBANK.NS": "ICICI Bank",
    "WIPRO.NS": "Wipro", "HINDUNILVR.NS": "Hindustan Unilever", "ITC.NS": "ITC Ltd",
    "TATAMOTORS.NS": "Tata Motors", "BAJFINANCE.NS": "Bajaj Finance",
    # ---- Crypto ----
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
    "USDC-USD": "USD Coin", "DAI-USD": "DAI Stablecoin", "LTC-USD": "Litecoin",
    "BCH-USD": "Bitcoin Cash", "XLM-USD": "Stellar", "ALGO-USD": "Algorand",
    "VET-USD": "VeChain", "HBAR-USD": "Hedera", "EOS-USD": "EOS",
    "XMR-USD": "Monero", "ZEC-USD": "Zcash", "DASH-USD": "Dash",
    # ---- Matieres premieres ----
    "CL=F": "Petrole brut WTI", "NG=F": "Gaz naturel", "BZ=F": "Petrole Brent",
    "RB=F": "Essence RBOB", "HO=F": "Fioul domestique", "GC=F": "Or",
    "SI=F": "Argent", "PL=F": "Platine", "PA=F": "Palladium",
    "HG=F": "Cuivre", "ALI=F": "Aluminium", "ZN=F": "Zinc",
    "PB=F": "Plomb", "NI=F": "Nickel", "ZC=F": "Mais", "ZW=F": "Ble",
    "ZS=F": "Soja", "KC=F": "Cafe", "SB=F": "Sucre", "CT=F": "Coton",
    "CC=F": "Cacao", "OJ=F": "Jus d'orange", "LBS=F": "Bois d'oeuvre",
    "LE=F": "Boeuf vif", "GF=F": "Boeuf engraissement", "HE=F": "Porc maigre",
}


class AssetRequestCreate(BaseModel):
    symbol: str
    asset_name: Optional[str] = None
    asset_type: Optional[str] = None  # stock, crypto, commodity, forex
    reason: Optional[str] = None


async def _fetch_quote_data(symbol: str) -> Optional[dict]:
    """Return best-effort quote data for a symbol, or None if unavailable."""
    symbol = symbol.upper()
    from config import POLYGON_API_KEY, TWELVEDATA_API_KEY
    from ._prices import _yf_to_td

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            # International stock via Twelve Data
            base, exchange = _yf_to_td(symbol)
            if base and exchange and TWELVEDATA_API_KEY:
                r = await client.get(
                    "https://api.twelvedata.com/quote",
                    params={"symbol": f"{base}:{exchange}", "apikey": TWELVEDATA_API_KEY}
                )
                if r.status_code == 200:
                    d = r.json()
                    if "close" in d:
                        price = float(d.get("close") or 0)
                        prev_close = float(d.get("previous_close") or price)
                        change = float(d.get("percent_change") or 0)
                        fw = d.get("fifty_two_week", {})
                        return {
                            "symbol": symbol,
                            "name": d.get("name", symbol),
                            "price": round(price, 4),
                            "change": round(change, 2),
                            "change_amount": round(price - prev_close, 4),
                            "high": float(d.get("high") or 0),
                            "low": float(d.get("low") or 0),
                            "open": float(d.get("open") or 0),
                            "volume": int(float(d.get("volume") or 0)),
                            "market_cap": None,
                            "pe_ratio": None,
                            "52w_high": float(fw.get("high") or 0) if fw else None,
                            "52w_low": float(fw.get("low") or 0) if fw else None,
                        }

            # US stock via Polygon.io
            if POLYGON_API_KEY:
                r = await client.get(
                    f"https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/{symbol}",
                    params={"apiKey": POLYGON_API_KEY}
                )
                if r.status_code == 200:
                    t = r.json().get("ticker", {})
                    day = t.get("day", {})
                    prev = t.get("prevDay", {})
                    price = day.get("c") or t.get("lastTrade", {}).get("p") or 0
                    prev_c = prev.get("c") or 0
                    change = ((price - prev_c) / prev_c * 100) if prev_c else 0
                    if price:
                        return {
                            "symbol": symbol,
                            "name": SYMBOL_NAMES.get(symbol, symbol),
                            "price": round(float(price), 4),
                            "change": round(change, 2),
                            "change_amount": round(float(price) - float(prev_c), 4),
                            "high": float(day.get("h") or 0),
                            "low": float(day.get("l") or 0),
                            "open": float(day.get("o") or 0),
                            "volume": int(day.get("v") or 0),
                            "market_cap": None,
                            "pe_ratio": None,
                            "52w_high": None,
                            "52w_low": None,
                        }
    except Exception:
        # Fall through to yfinance
        pass

    # Fallback: yfinance (no API key needed)
    from ._prices import fetch_prices as _fetch_yf
    prices = await _fetch_yf([symbol])
    p = prices.get(symbol)
    if p and p.get("price"):
        return {
            "symbol": symbol,
            "name": SYMBOL_NAMES.get(symbol, symbol),
            "price": round(float(p["price"]), 4),
            "change": round(float(p.get("change", 0)), 2),
            "change_amount": 0.0,
            "high": 0.0,
            "low": 0.0,
            "open": 0.0,
            "volume": int(p.get("volume", 0)),
            "market_cap": None,
            "pe_ratio": None,
            "52w_high": None,
            "52w_low": None,
        }

    return None


@router.get("/list")
async def get_markets():
    """Get all available markets, with the size of each scannable universe.

    The counts go through extend_market so they match what a scan actually
    walks, and the union is reported too: "all assets" is 819 symbols, which
    is a minute of scanning — the user should see that before spending their
    one daily scan on it rather than after.
    """
    from ._universe import extend_market

    out, union = [], set()
    for key, market in MARKETS.items():
        assets = extend_market(key, list(market["assets"]))
        union |= set(assets)
        out.append({
            "key": key,
            "name": market["name"],
            "description": market.get("description", market["name"]),
            "asset_count": len(assets),
            "always_open": market.get("always_open", False),
        })
    return {"markets": out, "all_asset_count": len(union)}


@router.get("/search")
@limiter.limit("30/minute")
async def search_assets(request: Request, q: str = Query(..., min_length=2, max_length=100)):
    """Search assets — catalogue local uniquement (actifs inscrits sur TDB)."""
    query_upper = q.strip().upper()
    query_lower = q.strip().lower()
    hits = []
    seen: set = set()
    for market_key, market in MARKETS.items():
        for sym in market["assets"]:
            if sym in seen:
                continue
            display_name = SYMBOL_NAMES.get(sym, sym)
            if query_upper in sym or sym.startswith(query_upper) or query_lower in display_name.lower():
                seen.add(sym)
                hits.append({"symbol": sym, "name": display_name, "exchange": market_key, "type": "EQUITY"})
    return {"results": hits[:15]}


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


@router.get("/prices")
async def get_prices(symbols: str = Query(..., description="Comma-separated symbols")):
    """Return live prices for any symbol type (US, crypto, indices, commodities, international)."""
    from ._prices import fetch_prices

    raw = [s.strip() for s in symbols.split(",") if s.strip()][:50]
    if not raw:
        return {"prices": {}}

    prices = await fetch_prices(raw)
    return {"prices": prices}


# ── FX ───────────────────────────────────────────────────────────────────────
# Declared BEFORE the catch-all "/{market_key}": Starlette matches in
# declaration order, so a literal route placed after it is unreachable.

_FX_CACHE: dict = {"rate": None, "ts": 0.0, "source": "fallback"}
_FX_TTL = 900.0          # 15 min — display conversion, not a trading rate
EUR_USD_FALLBACK = 1.09  # only used until the first successful fetch


@router.get("/fx")
async def get_fx_rates():
    """Live EUR/USD used to display USD-quoted assets in euros.

    This was a constant hard-coded in the frontend. Every USD price — crypto,
    US stocks, indices — was therefore converted with a rate that drifts a
    little more every month, and the error lands entirely on the displayed
    price: at 1.09 against a real 1.154, Bitcoin showed ~5.9% above its
    actual euro value while the dollar price was perfectly correct.
    """
    import time as _time
    from ._prices import fetch_prices

    now = _time.monotonic()
    if _FX_CACHE["rate"] and now - _FX_CACHE["ts"] < _FX_TTL:
        return {"EURUSD": _FX_CACHE["rate"], "source": _FX_CACHE["source"], "cached": True}

    rate, source = None, "fallback"
    try:
        quotes = await fetch_prices(["EURUSD=X"])
        q = quotes.get("EURUSD=X") or {}
        px = float(q.get("price") or 0)
        # Sanity band: EUR/USD has never been outside it in the euro's history.
        # A bad parse must fall back rather than distort every price on screen.
        if 0.7 < px < 1.7:
            rate, source = round(px, 4), "live"
    except Exception as exc:
        logger.warning("fx fetch failed: %s", exc)

    if rate is None:
        rate = _FX_CACHE["rate"] or EUR_USD_FALLBACK
        source = _FX_CACHE["source"] if _FX_CACHE["rate"] else "fallback"
    else:
        _FX_CACHE.update({"rate": rate, "ts": now, "source": source})

    return {"EURUSD": rate, "source": source, "cached": False}


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
    limit: int = Query(default=20, le=100),
    offset: int = Query(default=0, ge=0)
):
    """Return asset list instantly from config — no live prices, no yfinance."""
    market_key = market_key.upper()
    if market_key not in MARKETS:
        raise HTTPException(status_code=404, detail="Market not found")

    all_assets = MARKETS[market_key]["assets"]
    total = len(all_assets)
    batch = all_assets[offset:offset + limit]

    result = [
        {
            "symbol": s,
            "name": SYMBOL_NAMES.get(s, s),
            "price": 0,
            "change": 0,
            "volume": 0,
        }
        for s in batch
    ]
    return {"assets": result, "total": total, "offset": offset, "limit": limit}



@router.get("/quote/{symbol}")
@limiter.limit("20/minute")
async def get_quote(request: Request, symbol: str):
    """Get real-time quote for a symbol"""
    if not _SYMBOL_RE.match(symbol.upper()):
        raise HTTPException(status_code=400, detail="Symbole invalide")
    symbol = symbol.upper()
    data = await _fetch_quote_data(symbol)
    if data:
        return data

    raise HTTPException(
        status_code=404,
        detail=f"Symbole \"{symbol}\" introuvable ou données indisponibles"
    )


@router.get("/chart/{symbol}")
@limiter.limit("10/minute")
async def get_chart_data(
    request: Request,
    symbol: str,
    period: str = Query(default="1mo", pattern="^(1d|5d|1mo|3mo|6mo|1y|2y|5y|max)$"),
    interval: str = Query(default="1d", pattern="^(1m|5m|15m|1h|1d|1wk|1mo)$")
):
    """Get OHLCV chart data for a symbol"""
    if not _SYMBOL_RE.match(symbol.upper()):
        raise HTTPException(status_code=400, detail="Symbole invalide")
    symbol = symbol.upper()
    from datetime import date, timedelta
    from config import POLYGON_API_KEY, TWELVEDATA_API_KEY
    from ._prices import _yf_to_td

    # Convert period to date range
    period_days = {"1d": 1, "5d": 5, "1mo": 30, "3mo": 90, "6mo": 180, "1y": 365, "2y": 730, "5y": 1825, "max": 1825}
    days = period_days.get(period, 30)
    date_from = (date.today() - timedelta(days=days)).isoformat()
    date_to = date.today().isoformat()

    # Polygon interval mapping
    interval_map = {"1m": ("minute", 1), "5m": ("minute", 5), "15m": ("minute", 15),
                    "1h": ("hour", 1), "1d": ("day", 1), "1wk": ("week", 1), "1mo": ("month", 1)}
    timespan, multiplier = interval_map.get(interval, ("day", 1))

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # International via Twelve Data
            base, exchange = _yf_to_td(symbol)
            if base and exchange and TWELVEDATA_API_KEY:
                td_interval_map = {"1m": "1min", "5m": "5min", "15m": "15min",
                                   "1h": "1h", "1d": "1day", "1wk": "1week", "1mo": "1month"}
                td_interval = td_interval_map.get(interval, "1day")
                r = await client.get(
                    "https://api.twelvedata.com/time_series",
                    params={
                        "symbol": f"{base}:{exchange}",
                        "interval": td_interval,
                        "start_date": date_from,
                        "end_date": date_to,
                        "outputsize": 500,
                        "apikey": TWELVEDATA_API_KEY,
                    }
                )
                if r.status_code == 200:
                    d = r.json()
                    values = d.get("values", [])
                    if values:
                        from datetime import datetime as dt
                        return {
                            "symbol": symbol, "period": period, "interval": interval,
                            "data": [{
                                "timestamp": int(dt.fromisoformat(v["datetime"]).timestamp() * 1000),
                                "open": float(v.get("open", 0)),
                                "high": float(v.get("high", 0)),
                                "low": float(v.get("low", 0)),
                                "close": float(v.get("close", 0)),
                                "volume": int(float(v.get("volume", 0)))
                            } for v in reversed(values)]
                        }

            # US stock via Polygon.io
            if POLYGON_API_KEY:
                r = await client.get(
                    f"https://api.polygon.io/v2/aggs/ticker/{symbol}/range/{multiplier}/{timespan}/{date_from}/{date_to}",
                    params={"adjusted": "true", "sort": "asc", "limit": 500, "apiKey": POLYGON_API_KEY}
                )
                if r.status_code == 200:
                    results = r.json().get("results", [])
                    if results:
                        return {
                            "symbol": symbol, "period": period, "interval": interval,
                            "data": [{
                                "timestamp": int(bar.get("t", 0)),
                                "open": round(float(bar.get("o", 0)), 4),
                                "high": round(float(bar.get("h", 0)), 4),
                                "low": round(float(bar.get("l", 0)), 4),
                                "close": round(float(bar.get("c", 0)), 4),
                                "volume": int(bar.get("v", 0))
                            } for bar in results]
                        }

        # Fall back to yfinance.
        #
        # Without this the endpoint answered 404 whenever neither paid key was
        # configured — which is every local checkout, and any deployment that
        # has not bought both. The analysis endpoint has always used yfinance
        # through _prices, so the page could compute a full verdict on data the
        # chart then claimed did not exist.
        #
        # Same cache and same executor as the rest of the engine, so a chart
        # request costs nothing when the analysis has just fetched the same
        # series.
        from ._prices import _download_ohlcv

        df = await _download_ohlcv(symbol, period, interval)
        if df is not None and not df.empty:
            rows = []
            for ts, row in df.iterrows():
                try:
                    close = float(row["Close"])
                except (TypeError, ValueError):
                    continue
                if close != close:          # NaN: a gap, not a price
                    continue
                rows.append({
                    "timestamp": int(ts.timestamp() * 1000),
                    "open":   round(float(row["Open"]), 4),
                    "high":   round(float(row["High"]), 4),
                    "low":    round(float(row["Low"]), 4),
                    "close":  round(close, 4),
                    "volume": int(row["Volume"]) if row["Volume"] == row["Volume"] else 0,
                })
            if rows:
                return {
                    "symbol": symbol, "period": period,
                    "interval": interval, "data": rows,
                }

        raise HTTPException(status_code=404, detail="No data found")
    except HTTPException:
        raise
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
    from datetime import datetime as _dt
    await execute_write("""
        INSERT INTO asset_requests (user_id, symbol, asset_name, asset_type, reason, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (user_id, symbol_upper, request.asset_name, request.asset_type, request.reason, _dt.utcnow().isoformat()))

    return {
        "success": True,
        "message": f"Request for {symbol_upper} has been submitted for admin review"
    }


