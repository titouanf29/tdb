"""
Configuration globale du bot TDB
"""
import os
from dotenv import load_dotenv

load_dotenv()

# ===== TELEGRAM =====
TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN", "")
CHANNEL_ID = os.getenv("CHANNEL_ID", "")  # ID du channel pour les notifications (optionnel)

# Administrateurs du bot (ajouter vos IDs Telegram ici)
ADMIN_IDS = [
    # Ajoutez votre ID Telegram ici
    # Exemple: 123456789
]

# ===== BASE DE DONNÉES =====
DATABASE_PATH = "database/trading_bot.db"

# ===== API KEYS =====
# Pour récupérer les données de marché (gratuit)
NEWS_API_KEY = os.getenv("NEWS_API_KEY", "")
ALPHA_VANTAGE_KEY = os.getenv("ALPHA_VANTAGE_KEY", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
POLYGON_API_KEY = os.getenv("POLYGON_API_KEY", "")

# ===== STRIPE =====
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
STRIPE_PRICE_ID = os.getenv("STRIPE_PRICE_ID", "")  # ID du prix mensuel 5€ créé dans Stripe
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://tdb-web.up.railway.app")
TWELVEDATA_API_KEY = os.getenv("TWELVEDATA_API_KEY", "")

# ===== MARCHES DISPONIBLES =====
MARKETS = {
    "EUROPE": {
        "name": "🇪🇺 EUROPE",
        "open_time": "08:00",
        "close_time": "17:30",
        "timezone": "Europe/Paris",
        "assets": [
            # === Indices ===
            "^FCHI", "^SBF120", "^GDAXI", "^FTSE", "^AEX", "^BFX",
            "^IBEX", "^FTSEMIB", "^SSMI", "^STOXX50E",
            # === CAC 40 (France) ===
            "AI.PA", "AIR.PA", "ALO.PA", "MT.AS", "CS.PA",
            "BNP.PA", "EN.PA", "CAP.PA", "CA.PA", "SGO.PA",
            "ACA.PA", "BN.PA", "DSY.PA", "EDEN.PA", "ENGI.PA",
            "EL.PA", "ERF.PA", "RMS.PA", "KER.PA", "LR.PA",
            "OR.PA", "MC.PA", "ML.PA", "ORA.PA", "RI.PA",
            "PUB.PA", "RNO.PA", "SAF.PA", "SAN.PA", "SU.PA",
            "GLE.PA", "STLA", "STM.PA", "HO.PA", "TTE.PA",
            "URW.PA", "VIE.PA", "DG.PA", "VIV.PA", "SW.PA",
            # === SBF 120 / blue chips francais ===
            "AF.PA", "AM.PA", "BIM.PA", "BVI.PA", "CNP.PA",
            "DEC.PA", "FDJ.PA", "GTT.PA", "ILD.PA", "NK.PA",
            "NEX.PA", "RUI.PA", "SEB.PA", "TFI.PA", "TKO.PA",
            "UBI.PA", "ATOS.PA", "COFA.PA",
            # === AEX - Amsterdam ===
            "ASML.AS", "ADYEN.AS", "HEIA.AS", "SHEL.AS", "INGA.AS",
            "WKL.AS", "NN.AS", "AGN.AS", "RAND.AS", "PHIA.AS",
            "ABN.AS", "AKZA.AS", "UMG.AS", "BESI.AS", "IMCD.AS",
            "ASRNL.AS", "LIGHT.AS", "DSFIR.AS", "TKWY.AS", "GLPG.AS",
            # === BEL 20 - Bruxelles ===
            "ABI.BR", "UCB.BR", "KBC.BR", "APAM.BR", "AGS.BR",
            "ACKB.BR", "COLR.BR", "AED.BR", "BEKB.BR", "GBLB.BR",
            "PROX.BR", "SOF.BR", "UMI.BR", "WDP.BR", "SOLB.BR",
            "MELE.BR",
            # === PSI - Lisbonne ===
            "EDP.LS", "GALP.LS", "JMT.LS", "NOS.LS", "SON.LS",
            "BCP.LS", "EDPR.LS",
            # === DAX 40 - Allemagne ===
            "ADS.DE", "ALV.DE", "BAS.DE", "BAYN.DE", "BEI.DE",
            "BMW.DE", "BNR.DE", "CON.DE", "DTG.DE", "DBK.DE",
            "DB1.DE", "DHL.DE", "DTE.DE", "EOAN.DE", "FRE.DE",
            "HNR1.DE", "HEIDELG.DE", "HEN3.DE", "IFX.DE", "MBG.DE",
            "MRK.DE", "MTX.DE", "MUV2.DE", "P911.DE", "PAH3.DE",
            "QIA.DE", "RHM.DE", "RWE.DE", "SAP.DE", "SRT3.DE",
            "SIE.DE", "ENR.DE", "SHL.DE", "SY1.DE", "VOW3.DE",
            "VNA.DE", "ZAL.DE", "1COV.DE", "PUM.DE",
            # === FTSE 100 - Royaume-Uni ===
            "AZN.L", "SHEL.L", "BP.L", "GSK.L", "ULVR.L",
            "HSBA.L", "RIO.L", "BHP.L", "AAL.L", "GLEN.L",
            "DGE.L", "REL.L", "LSEG.L", "NG.L", "CPG.L",
            "BA.L", "RR.L", "VOD.L", "BT-A.L", "BARC.L",
            "LLOY.L", "STAN.L", "NWG.L", "PRU.L", "LGEN.L",
            "AV.L", "ADM.L", "FLTR.L", "RMV.L", "SGRO.L",
            "RKT.L", "SN.L", "HLN.L", "NXT.L", "JD.L",
            "KGF.L", "MKS.L", "TW.L", "PSN.L", "HL.L",
            "IMB.L", "BATS.L", "EXPN.L", "WPP.L", "IAG.L",
            "EZJ.L", "RTO.L", "HLMA.L", "TSCO.L", "SBRY.L",
            "ABF.L", "SSE.L",
            # === IBEX 35 - Espagne ===
            "ITX.MC", "IBE.MC", "SAN.MC", "BBVA.MC", "CLNX.MC",
            "CABK.MC", "FER.MC", "ACS.MC", "REP.MC", "ELE.MC",
            "REE.MC", "AMS.MC", "MAP.MC", "NTGY.MC", "SAB.MC",
            "GRF.MC", "IAG.MC", "ANA.MC", "IDR.MC",
            # === FTSE MIB - Italie ===
            "ENI.MI", "ENEL.MI", "RACE.MI", "ISP.MI", "UCG.MI",
            "MB.MI", "G.MI", "STM.MI", "PRY.MI", "MONC.MI",
            "BC.MI", "FBK.MI", "LDO.MI", "NEXI.MI", "CPR.MI",
            "SRG.MI", "TRN.MI", "BAMI.MI", "STLAM.MI",
            # === SMI - Suisse ===
            "NESN.SW", "NOVN.SW", "ROG.SW", "UBSG.SW", "ZURN.SW",
            "ABBN.SW", "CFR.SW", "LONN.SW", "SIKA.SW", "PGHN.SW",
            "KNIN.SW", "GIVN.SW", "SREN.SW", "HOLN.SW", "GEBN.SW",
            "SOON.SW", "LISN.SW",
        ]
    },
    "USA": {
        "name": "🇺🇸 USA",
        "open_time": "09:30",
        "close_time": "16:00",
        "timezone": "America/New_York",
        "assets": [
            # === Indices ===
            "^GSPC", "^DJI", "^IXIC", "^RUT", "^VIX",
            # === ETFs majeurs ===
            "SPY", "QQQ", "DIA", "IWM", "VOO", "VTI",
            "GLD", "SLV", "TLT", "HYG", "LQD",
            "XLE", "XLF", "XLK", "XLV", "XLI", "XLY", "XLP", "XLU", "XLRE", "XLB", "XLC",
            "ARKK", "SOXX", "VNQ", "SCHD", "EFA", "EEM",
            # === Mega Cap Tech ===
            "AAPL",  # Apple
            "MSFT",  # Microsoft
            "NVDA",  # Nvidia
            "GOOGL", # Alphabet A
            "GOOG",  # Alphabet C
            "AMZN",  # Amazon
            "META",  # Meta Platforms
            "TSLA",  # Tesla
            "AVGO",  # Broadcom
            "ORCL",  # Oracle
            # === Semiconducteurs ===
            "AMD",   # Advanced Micro Devices
            "INTC",  # Intel
            "QCOM",  # Qualcomm
            "TXN",   # Texas Instruments
            "MU",    # Micron Technology
            "AMAT",  # Applied Materials
            "LRCX",  # Lam Research
            "KLAC",  # KLA Corp
            "MRVL",  # Marvell Technology
            "ON",    # ON Semiconductor
            "ADI",   # Analog Devices
            "MCHP",  # Microchip Technology
            "SWKS",  # Skyworks Solutions
            "MPWR",  # Monolithic Power
            "ENPH",  # Enphase Energy
            "WOLF",  # Wolfspeed
            "ACLS",  # Axcelis Technologies
            "ONTO",  # Onto Innovation
            "RMBS",  # Rambus
            "CRUS",  # Cirrus Logic
            "MTSI",  # MACOM Technology
            # === Software / Cloud ===
            "CRM",   # Salesforce
            "ADBE",  # Adobe
            "NOW",   # ServiceNow
            "WDAY",  # Workday
            "SNOW",  # Snowflake
            "DDOG",  # Datadog
            "ZS",    # Zscaler
            "CRWD",  # CrowdStrike
            "NET",   # Cloudflare
            "OKTA",  # Okta
            "TEAM",  # Atlassian
            "MDB",   # MongoDB
            "HUBS",  # HubSpot
            "ZM",    # Zoom
            "DOCN",  # DigitalOcean
            "GTLB",  # GitLab
            "BILL",  # Bill.com
            "PCTY",  # Paylocity
            "PATH",  # UiPath
            "NTNX",  # Nutanix
            "ESTC",  # Elastic
            "CFLT",  # Confluent
            "S",     # SentinelOne
            "TENB",  # Tenable
            "CYBR",  # CyberArk
            # === Internet / Plateformes ===
            "NFLX",  # Netflix
            "UBER",  # Uber
            "LYFT",  # Lyft
            "SNAP",  # Snap
            "PINS",  # Pinterest
            "TWTR",  # (delisted)
            "RDDT",  # Reddit
            "ABNB",  # Airbnb
            "DASH",  # DoorDash
            "COIN",  # Coinbase
            "RBLX",  # Roblox
            "U",     # Unity Software
            "EA",    # Electronic Arts
            "TTWO",  # Take-Two Interactive
            "ATVI",  # Activision (acquired by MSFT)
            "MTCH",  # Match Group
            "IAC",   # IAC
            # === Hardware / IT ===
            "CSCO",  # Cisco
            "IBM",   # IBM
            "DELL",  # Dell
            "HPQ",   # HP Inc.
            "HPE",   # Hewlett Packard Enterprise
            "PSTG",  # Pure Storage
            "NTAP",  # NetApp
            "WDC",   # Western Digital
            "STX",   # Seagate
            "ANET",  # Arista Networks
            "JNPR",  # Juniper Networks
            "FFIV",  # F5 Networks
            "CIEN",  # Ciena
            # === Finance / Banques ===
            "JPM",   # JPMorgan Chase
            "BAC",   # Bank of America
            "WFC",   # Wells Fargo
            "GS",    # Goldman Sachs
            "MS",    # Morgan Stanley
            "C",     # Citigroup
            "BLK",   # BlackRock
            "SCHW",  # Charles Schwab
            "TFC",   # Truist Financial
            "USB",   # U.S. Bancorp
            "PNC",   # PNC Financial
            "COF",   # Capital One
            "DFS",   # Discover Financial
            "SYF",   # Synchrony Financial
            "ALLY",  # Ally Financial
            "V",     # Visa
            "MA",    # Mastercard
            "AXP",   # American Express
            "PYPL",  # PayPal
            "FIS",   # Fidelity National Info
            "FI",    # Fiserv
            "GPN",   # Global Payments
            "AFRM",  # Affirm
            "SQ",    # Block (Square)
            # === Assurances / Asset Managers ===
            "BRK-B", # Berkshire Hathaway B
            "BRK-A", # Berkshire Hathaway A
            "MET",   # MetLife
            "PRU",   # Prudential Financial
            "AFL",   # Aflac
            "TRV",   # Travelers
            "CB",    # Chubb
            "ALL",   # Allstate
            "PGR",   # Progressive
            "HIG",   # Hartford Financial
            "AON",   # Aon
            "MMC",   # Marsh McLennan
            "WTW",   # Willis Towers Watson
            "AJG",   # Arthur J. Gallagher
            "BRO",   # Brown & Brown
            "BX",    # Blackstone
            "KKR",   # KKR
            "APO",   # Apollo Global
            "CG",    # Carlyle Group
            "ARES",  # Ares Management
            "BAM",   # Brookfield Asset Management
            # === Santé / Pharma ===
            "JNJ",   # Johnson & Johnson
            "UNH",   # UnitedHealth
            "PFE",   # Pfizer
            "ABBV",  # AbbVie
            "LLY",   # Eli Lilly
            "MRK",   # Merck
            "TMO",   # Thermo Fisher
            "ABT",   # Abbott
            "MDT",   # Medtronic
            "BMY",   # Bristol-Myers Squibb
            "AMGN",  # Amgen
            "GILD",  # Gilead Sciences
            "BIIB",  # Biogen
            "REGN",  # Regeneron
            "VRTX",  # Vertex Pharmaceuticals
            "ILMN",  # Illumina
            "IQV",   # IQVIA
            "DHR",   # Danaher
            "BAX",   # Baxter International
            "BDX",   # Becton Dickinson
            "EW",    # Edwards Lifesciences
            "SYK",   # Stryker
            "ZBH",   # Zimmer Biomet
            "ISRG",  # Intuitive Surgical
            "BSX",   # Boston Scientific
            "HCA",   # HCA Healthcare
            "CNC",   # Centene
            "CVS",   # CVS Health
            "MCK",   # McKesson
            "CI",    # Cigna
            "HUM",   # Humana
            "MOH",   # Molina Healthcare
            "MRNA",  # Moderna
            "BNTX",  # BioNTech
            "NTLA",  # Intellia Therapeutics
            "BEAM",  # Beam Therapeutics
            "CRSP",  # CRISPR Therapeutics
            "TDOC",  # Teladoc
            # === Grande Consommation ===
            "PG",    # Procter & Gamble
            "KO",    # Coca-Cola
            "PEP",   # PepsiCo
            "MDLZ",  # Mondelez
            "GIS",   # General Mills
            "K",     # Kellanova (Kellogg's)
            "CPB",   # Campbell Soup
            "CAG",   # Conagra
            "HSY",   # Hershey
            "MKC",   # McCormick
            "SJM",   # J.M. Smucker
            "HRL",   # Hormel Foods
            "TSN",   # Tyson Foods
            "CL",    # Colgate-Palmolive
            "KMB",   # Kimberly-Clark
            "CHD",   # Church & Dwight
            # === Distribution / Retail ===
            "WMT",   # Walmart
            "COST",  # Costco
            "TGT",   # Target
            "HD",    # Home Depot
            "LOW",   # Lowe's
            "EBAY",  # eBay
            "ETSY",  # Etsy
            "W",     # Wayfair
            "ULTA",  # Ulta Beauty
            "TJX",   # TJX Companies
            "ROST",  # Ross Stores
            "BURL",  # Burlington Stores
            "FIVE",  # Five Below
            "DLTR",  # Dollar Tree
            "DG",    # Dollar General
            "KR",    # Kroger
            "SFM",   # Sprouts Farmers Market
            # === Restauration ===
            "MCD",   # McDonald's
            "SBUX",  # Starbucks
            "CMG",   # Chipotle
            "YUM",   # Yum! Brands
            "QSR",   # Restaurant Brands (Burger King)
            "DRI",   # Darden Restaurants
            "TXRH",  # Texas Roadhouse
            "SHAK",  # Shake Shack
            "BROS",  # Dutch Bros
            # === Mode / Luxe / Sport ===
            "NKE",   # Nike
            "LULU",  # Lululemon
            "DECK",  # Deckers Outdoor
            "SKX",   # Skechers
            "PVH",   # PVH Corp (Calvin Klein)
            "RL",    # Ralph Lauren
            "TPR",   # Tapestry (Coach)
            "CPRI",  # Capri Holdings (Michael Kors)
            "HBI",   # Hanesbrands
            # === Médias / Divertissement ===
            "DIS",   # Walt Disney
            "WBD",   # Warner Bros. Discovery
            "PARA",  # Paramount Global
            "FOX",   # Fox Corp
            "FOXA",  # Fox Corp A
            "CMCSA", # Comcast
            "CHTR",  # Charter Communications
            "TMUS",  # T-Mobile US
            "VZ",    # Verizon
            "T",     # AT&T
            # === Automobile ===
            "GM",    # General Motors
            "F",     # Ford
            "RIVN",  # Rivian
            "LCID",  # Lucid Motors
            "NIO",   # Nio
            "LI",    # Li Auto
            "XPEV",  # XPeng
            # === Voyages / Hôtels ===
            "MAR",   # Marriott
            "HLT",   # Hilton
            "H",     # Hyatt
            "MGM",   # MGM Resorts
            "WYNN",  # Wynn Resorts
            "LVS",   # Las Vegas Sands
            "RCL",   # Royal Caribbean
            "CCL",   # Carnival
            "NCLH",  # Norwegian Cruise
            "DAL",   # Delta Air Lines
            "AAL",   # American Airlines
            "UAL",   # United Airlines
            "LUV",   # Southwest Airlines
            "BKNG",  # Booking Holdings
            "EXPE",  # Expedia
            # === Énergie ===
            "XOM",   # ExxonMobil
            "CVX",   # Chevron
            "COP",   # ConocoPhillips
            "SLB",   # Schlumberger
            "EOG",   # EOG Resources
            "MPC",   # Marathon Petroleum
            "VLO",   # Valero Energy
            "PSX",   # Phillips 66
            "HES",   # Hess
            "DVN",   # Devon Energy
            "FANG",  # Diamondback Energy
            "BKR",   # Baker Hughes
            "HAL",   # Halliburton
            "OXY",   # Occidental Petroleum
            "APA",   # APA Corp
            "CTRA",  # Coterra Energy
            "AR",    # Antero Resources
            "CHK",   # Chesapeake Energy
            # === Énergie propre ===
            "FSLR",  # First Solar
            "RUN",   # Sunrun
            "ARRY",  # Array Technologies
            "CWEN",  # Clearway Energy
            "AES",   # AES Corp
            "NEP",   # NextEra Energy Partners
            "BE",    # Bloom Energy
            "PLUG",  # Plug Power
            "BLDP",  # Ballard Power
            # === Utilities ===
            "NEE",   # NextEra Energy
            "DUK",   # Duke Energy
            "SO",    # Southern Company
            "D",     # Dominion Energy
            "AEP",   # American Electric Power
            "EXC",   # Exelon
            "SRE",   # Sempra Energy
            "PCG",   # PG&E
            "ED",    # Consolidated Edison
            "XEL",   # Xcel Energy
            "WEC",   # WEC Energy
            "ES",    # Eversource Energy
            "PPL",   # PPL Corp
            "CMS",   # CMS Energy
            "ETR",   # Entergy
            "CEG",   # Constellation Energy
            "VST",   # Vistra
            # === Aérospatial / Nouvelles introductions ===
            "SPCX",  # SpaceX (Space Exploration Technologies)
            # === Industriel / Défense ===
            "BA",    # Boeing
            "CAT",   # Caterpillar
            "GE",    # GE Aerospace
            "HON",   # Honeywell
            "MMM",   # 3M
            "LMT",   # Lockheed Martin
            "RTX",   # RTX (Raytheon)
            "NOC",   # Northrop Grumman
            "GD",    # General Dynamics
            "HII",   # Huntington Ingalls
            "AXON",  # Axon Enterprise
            "LHX",   # L3Harris
            "KTOS",  # Kratos Defense
            "BWXT",  # BWX Technologies
            "HEI",   # Heico
            "TDG",   # TransDigm
            "EMR",   # Emerson Electric
            "ETN",   # Eaton
            "ROK",   # Rockwell Automation
            "AME",   # AMETEK
            "PH",    # Parker Hannifin
            "ITW",   # Illinois Tool Works
            "DOV",   # Dover
            "IR",    # Ingersoll Rand
            "XYL",   # Xylem
            "IDEX",  # IDEX Corp
            "TRMB",  # Trimble
            # === Transport / Logistique ===
            "UNP",   # Union Pacific
            "CSX",   # CSX Corp
            "NSC",   # Norfolk Southern
            "CHRW",  # CH Robinson
            "ODFL",  # Old Dominion Freight
            "SAIA",  # Saia
            "XPO",   # XPO Logistics
            "JBHT",  # J.B. Hunt Transport
            "WERN",  # Werner Enterprises
            "GXO",   # GXO Logistics
            "FDX",   # FedEx
            "UPS",   # United Parcel Service
            # === Matériaux ===
            "LIN",   # Linde
            "APD",   # Air Products
            "SHW",   # Sherwin-Williams
            "PPG",   # PPG Industries
            "IFF",   # International Flavors
            "EMN",   # Eastman Chemical
            "RPM",   # RPM International
            "PKG",   # Packaging Corp
            "IP",    # International Paper
            "SEE",   # Sealed Air
            "BALL",  # Ball Corp
            "CCK",   # Crown Holdings
            "OLN",   # Olin Corp
            "CE",    # Celanese
            "ALB",   # Albemarle
            "FCX",   # Freeport-McMoRan
            "NEM",   # Newmont
            "AA",    # Alcoa
            "CLF",   # Cleveland-Cliffs
            "X",     # US Steel
            "NUE",   # Nucor
            "STLD",  # Steel Dynamics
            "CF",    # CF Industries
            "MOS",   # Mosaic
            # === REITs / Immobilier ===
            "AMT",   # American Tower
            "PLD",   # Prologis
            "EQIX",  # Equinix
            "CCI",   # Crown Castle
            "SPG",   # Simon Property Group
            "O",     # Realty Income
            "PSA",   # Public Storage
            "EQR",   # Equity Residential
            "AVB",   # AvalonBay Communities
            "DLR",   # Digital Realty
            "VTR",   # Ventas
            "WELL",  # Welltower
            "ARE",   # Alexandria Real Estate
            "BXP",   # BXP Inc.
            "KIM",   # Kimco Realty
            "REG",   # Regency Centers
            "NNN",   # National Retail Properties
            "ADC",   # Agree Realty
            "STAG",  # Stag Industrial
            "VICI",  # VICI Properties
            "GLPI",  # Gaming & Leisure Properties
            "SUI",   # Sun Communities
            "ELS",   # Equity Lifestyle
            "UDR",   # UDR
            "CPT",   # Camden Property
            "ESS",   # Essex Property
            "MAA",   # Mid-America Apartment
        ]
    },
    "ASIA": {
        "name": "🌏 ASIE",
        "open_time": "09:00",
        "close_time": "15:00",
        "timezone": "Asia/Tokyo",
        "assets": [
            # Indices
            "^N225", "^HSI", "000001.SS", "^KOSPI", "^BSESN",
            # Japon
            "7203.T",   # Toyota
            "9984.T",   # SoftBank Group
            "6758.T",   # Sony
            "6861.T",   # Keyence
            "7974.T",   # Nintendo
            "9433.T",   # KDDI
            "6367.T",   # Daikin
            "8306.T",   # Mitsubishi UFJ
            "9432.T",   # NTT
            "6954.T",   # Fanuc
            "8035.T",   # Tokyo Electron
            "4063.T",   # Shin-Etsu Chemical
            "7741.T",   # Hoya
            "2914.T",   # Japan Tobacco
            "8766.T",   # Tokio Marine
            # Hong Kong / Chine
            "9988.HK",  # Alibaba
            "0700.HK",  # Tencent
            "0941.HK",  # China Mobile
            "1299.HK",  # AIA Group
            "0939.HK",  # China Construction Bank
            "9618.HK",  # JD.com
            "3690.HK",  # Meituan
            "2318.HK",  # Ping An Insurance
            "1810.HK",  # Xiaomi
            "0388.HK",  # HKEX
            # Corée du Sud
            "005930.KS", # Samsung Electronics
            "000660.KS", # SK Hynix
            "035420.KS", # NAVER
            "051910.KS", # LG Chem
            "005380.KS", # Hyundai Motor
            "000270.KS", # Kia
            # Inde
            "RELIANCE.NS", # Reliance Industries
            "TCS.NS",      # Tata Consultancy Services
            "INFY.NS",     # Infosys
            "HDFCBANK.NS", # HDFC Bank
            "ICICIBANK.NS",# ICICI Bank
            "WIPRO.NS",    # Wipro
            "HINDUNILVR.NS",# Hindustan Unilever
            "ITC.NS",      # ITC Ltd
            "TATAMOTORS.NS",# Tata Motors
            "BAJFINANCE.NS",# Bajaj Finance
        ]
    },
    "CRYPTO": {
        "name": "🪙 CRYPTO",
        "open_time": "00:00",
        "close_time": "23:59",
        "timezone": "UTC",
        "always_open": True,
        "assets": [
            # Top Caps
            "BTC-USD", "ETH-USD", "BNB-USD", "XRP-USD", "SOL-USD", "ADA-USD",
            "DOGE-USD", "TRX-USD", "TON-USD", "AVAX-USD",
            # Layer 1 / Layer 2
            "DOT-USD", "MATIC-USD", "ATOM-USD", "NEAR-USD", "APT-USD",
            "ARB-USD", "OP-USD", "SUI-USD", "SEI-USD", "INJ-USD",
            # DeFi
            "UNI-USD", "LINK-USD", "AAVE-USD", "MKR-USD", "CRV-USD",
            "COMP-USD", "BAL-USD", "SNX-USD", "1INCH-USD", "SUSHI-USD",
            # Infrastructure
            "FIL-USD", "GRT-USD", "LPT-USD", "RNDR-USD", "AR-USD",
            # Gaming / Metaverse
            "AXS-USD", "SAND-USD", "MANA-USD", "ENJ-USD", "GALA-USD",
            # Stablecoins référence
            "USDT-USD", "USDC-USD", "DAI-USD",
            # Autres
            "LTC-USD", "BCH-USD", "XLM-USD", "ALGO-USD", "VET-USD",
            "HBAR-USD", "EOS-USD", "XMR-USD", "ZEC-USD", "DASH-USD",
        ]
    },
    "COMMODITIES": {
        "name": "🛢️ MATIÈRES PREMIÈRES",
        "open_time": "00:00",
        "close_time": "23:59",
        "timezone": "UTC",
        "assets": [
            # Énergies
            "CL=F", "NG=F", "BZ=F", "RB=F", "HO=F",
            # Métaux précieux
            "GC=F", "SI=F", "PL=F", "PA=F",
            # Métaux industriels
            "HG=F", "ALI=F", "ZN=F", "PB=F", "NI=F",
            # Agriculture
            "ZC=F", "ZW=F", "ZS=F", "KC=F", "SB=F", "CT=F",
            "CC=F", "OJ=F", "LBS=F",
            # Bétail
            "LE=F", "GF=F", "HE=F",
        ]
    }
}

# ===== INDICATEURS TECHNIQUES =====
TECHNICAL_INDICATORS = {
    "rsi_period": 14,
    "rsi_oversold": 30,
    "rsi_overbought": 70,
    "macd_fast": 12,
    "macd_slow": 26,
    "macd_signal": 9,
    "ema_short": 20,
    "ema_medium": 50,
    "ema_long": 200,
    "bb_period": 20,
    "bb_std": 2,
    "atr_period": 14
}

# ===== TIMEFRAMES =====
TIMEFRAMES = ["5m", "15m", "1h", "4h", "1d"]

# ===== SCORING IA =====
SCORING_WEIGHTS = {
    "technical": 0.30,
    "volume": 0.20,
    "momentum": 0.15,
    "volatility": 0.10,
    "market_context": 0.15,
    "news": 0.10
}

# Seuils de score
SCORE_THRESHOLDS = {
    "ignore": 40,
    "watch": 60,
    "opportunity": 75,
    "strong": 85
}

# ===== WALLET PAR DÉFAUT =====
DEFAULT_WALLET_BALANCE = 10000.0
DEFAULT_CURRENCY = "USD"

# ===== SCAN AUTO =====
SCAN_FREQUENCIES = {
    "1min": 60,
    "5min": 300,
    "15min": 900,
    "1hour": 3600
}

# ===== LIMITES =====
MAX_POSITIONS = 10
MAX_ALERTS_PER_DAY = 50
MAX_FAVORITES = 20
MAX_AI_MESSAGES_PER_DAY = 20  # Limite de messages IA par utilisateur par jour

# ===== MESSAGES =====
WELCOME_MESSAGE = """
🤖 Bienvenue sur TDB - Trading Bot Professionnel

Votre assistant IA de trading virtuel avancé.

Utilisez /menu pour accéder à toutes les fonctionnalités.
"""

# ===== LOGS =====
LOG_LEVEL = "INFO"
LOG_FILE = "tdb_bot.log"
