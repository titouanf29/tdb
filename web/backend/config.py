"""
Configuration globale du bot TDB
"""
import os
from dotenv import load_dotenv

load_dotenv()

# ===== TELEGRAM =====
TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN", "8213431546:AAHnL4lswPUDYNubdcsLPvTwW0f1KYgjLgs")
CHANNEL_ID = os.getenv("CHANNEL_ID", "-1003160198658")  # ID du channel pour les notifications (optionnel)

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
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "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")  # Groq pour l'assistant IA (ultra-rapide, gratuit)

# ===== MARCHÉS DISPONIBLES =====
MARKETS = {
    # ------------------------------------------------------------------ #
    #  FRANCE — CAC 40 + blue chips SBF 120                              #
    # ------------------------------------------------------------------ #
    "FRANCE": {
        "name": "🇫🇷 FRANCE",
        "open_time": "09:00",
        "close_time": "17:30",
        "timezone": "Europe/Paris",
        "assets": [
            # Indices
            "^FCHI", "^SBF120",
            # === CAC 40 (40 valeurs) ===
            "AI.PA",    # Air Liquide
            "AIR.PA",   # Airbus
            "ALO.PA",   # Alstom
            "MT.AS",    # ArcelorMittal
            "CS.PA",    # AXA
            "BNP.PA",   # BNP Paribas
            "EN.PA",    # Bouygues
            "CAP.PA",   # Capgemini
            "CA.PA",    # Carrefour
            "SGO.PA",   # Saint-Gobain
            "ACA.PA",   # Crédit Agricole
            "BN.PA",    # Danone
            "DSY.PA",   # Dassault Systèmes
            "EDEN.PA",  # Edenred
            "ENGI.PA",  # Engie
            "EL.PA",    # EssilorLuxottica
            "ERF.PA",   # Eurofins Scientific
            "RMS.PA",   # Hermès International
            "KER.PA",   # Kering
            "LR.PA",    # Legrand
            "OR.PA",    # L'Oréal
            "MC.PA",    # LVMH
            "ML.PA",    # Michelin
            "ORA.PA",   # Orange
            "RI.PA",    # Pernod Ricard
            "PUB.PA",   # Publicis Groupe
            "RNO.PA",   # Renault
            "SAF.PA",   # Safran
            "SAN.PA",   # Sanofi
            "SU.PA",    # Schneider Electric
            "GLE.PA",   # Société Générale
            "STLA",     # Stellantis (NYSE)
            "STM.PA",   # STMicroelectronics
            "HO.PA",    # Thales
            "TTE.PA",   # TotalEnergies
            "URW.PA",   # Unibail-Rodamco-Westfield
            "VIE.PA",   # Veolia
            "DG.PA",    # Vinci
            "VIV.PA",   # Vivendi
            "SW.PA",    # Sodexo
            # === SBF 120 / autres blue chips français ===
            "AF.PA",    # Air France-KLM
            "AM.PA",    # Dassault Aviation
            "BIM.PA",   # BioMérieux
            "BVI.PA",   # Bureau Veritas
            "CNP.PA",   # CNP Assurances
            "COX.PA",   # Covivio
            "DBG.PA",   # Dbv Technologies (skip if uncertain)
            "DEC.PA",   # JCDecaux
            "FDJ.PA",   # FDJ (Française des Jeux)

            "GFC.PA",   # Gecina
            "GTT.PA",   # GTT
            "ILD.PA",   # Iliad
            "IMRG.PA",  # Interparfums
            "INF.PA",   # Ipsen
            "LI.PA",    # Klepierre
            "NEOEN.PA", # Neoen
            "NEX.PA",   # Nexans
            "NK.PA",    # Imerys
            "OPX.PA",   # Orpea (en restructuration)
            "ORO.PA",   # L'Occitane (ex-ORPEA)
            "OSE.PA",   # OSE Immunotherapeutics
            "RECY.PA",  # Séché Environnement
            "ROBO.PA",  # Icade
            "RUI.PA",   # Rubis

            "SEB.PA",   # Groupe SEB
            "SOLB.PA",  # Solvay (Paris)
            "SQLI.PA",  # SQLI
            "TFI.PA",   # TF1
            "TKO.PA",   # Technip Energies
            "UBI.PA",   # Ubisoft
            "VK.PA",    # Vallourec
            "VLOF.PA",  # Verallia
            "VPK.PA",   # Vopak (Amsterdam)
            "ATOS.PA",  # Atos
        ]
    },

    # ------------------------------------------------------------------ #
    #  EURONEXT — Amsterdam · Bruxelles · Lisbonne                       #
    # ------------------------------------------------------------------ #
    "EURONEXT": {
        "name": "🇳🇱 EURONEXT",
        "open_time": "09:00",
        "close_time": "17:30",
        "timezone": "Europe/Amsterdam",
        "assets": [
            # Indice
            "^AEX", "^BFX",
            # === AEX (Amsterdam) ===
            "ASML.AS",  # ASML Holding
            "ADYEN.AS", # Adyen
            "HEIA.AS",  # Heineken
            "SHEL.AS",  # Shell (Amsterdam)
            "INGA.AS",  # ING Groep
            "WKL.AS",   # Wolters Kluwer
            "NN.AS",    # NN Group
            "AGN.AS",   # Aegon
            "RAND.AS",  # Randstad
            "PHIA.AS",  # Philips
            "ABN.AS",   # ABN AMRO
            "AKZA.AS",  # Akzo Nobel
            "UMG.AS",   # Universal Music Group
            "BESI.AS",  # BE Semiconductor (Besi)
            "IMCD.AS",  # IMCD
            "ASRNL.AS", # ASR Nederland
            "LIGHT.AS", # Signify (Philips Lighting)
            "DSFIR.AS", # DSM-Firmenich
            "TKWY.AS",  # Just Eat Takeaway
            "MT.AS",    # ArcelorMittal
            "RDSA.AS",  # Royal Dutch Shell (ex)
            "URW.AS",   # Unibail-Rodamco-Westfield (Amsterdam)
            "FLOW.AS",  # Flow Traders
            "CRBN.AS",  # Corbion
            "GLPG.AS",  # Galapagos
            # === BEL 20 (Bruxelles) ===
            "ABI.BR",   # AB InBev
            "UCB.BR",   # UCB
            "KBC.BR",   # KBC Groep
            "APAM.BR",  # Aperam
            "AGS.BR",   # Ageas
            "ACKB.BR",  # Ackermans & van Haaren
            "COLR.BR",  # Colruyt
            "AED.BR",   # Aedifica
            "BEKB.BR",  # Bekaert
            "GBLB.BR",  # GBL
            "PROX.BR",  # Proximus
            "SOF.BR",   # Sofina
            "UMI.BR",   # Umicore
            "WDP.BR",   # Warehouses De Pauw
            "SOLB.BR",  # Solvay (Bruxelles)
            "MELE.BR",  # Melexis
            # === PSI (Lisbonne) ===
            "EDP.LS",   # EDP
            "GALP.LS",  # Galp Energia
            "JMT.LS",   # Jerónimo Martins
            "NOS.LS",   # NOS
            "SON.LS",   # Sonae
            "BCP.LS",   # Millennium BCP
            "EDPR.LS",  # EDP Renováveis
        ]
    },

    # ------------------------------------------------------------------ #
    #  ALLEMAGNE — DAX 40                                                 #
    # ------------------------------------------------------------------ #
    "GERMANY": {
        "name": "🇩🇪 ALLEMAGNE",
        "open_time": "09:00",
        "close_time": "17:30",
        "timezone": "Europe/Berlin",
        "assets": [
            # Indice
            "^GDAXI", "^MDAXI",
            # === DAX 40 ===
            "ADS.DE",   # Adidas
            "ALV.DE",   # Allianz
            "BAS.DE",   # BASF
            "BAYN.DE",  # Bayer
            "BEI.DE",   # Beiersdorf
            "BMW.DE",   # BMW
            "BNR.DE",   # Brenntag
            "CON.DE",   # Continental
            "DTG.DE",   # Daimler Truck
            "DBK.DE",   # Deutsche Bank
            "DB1.DE",   # Deutsche Börse
            "DHL.DE",   # Deutsche Post (DHL)
            "DTE.DE",   # Deutsche Telekom
            "EOAN.DE",  # E.ON
            "FRE.DE",   # Fresenius
            "HNR1.DE",  # Hannover Re
            "HEIDELG.DE",# HeidelbergMaterials
            "HEN3.DE",  # Henkel
            "IFX.DE",   # Infineon Technologies
            "MBG.DE",   # Mercedes-Benz
            "MRK.DE",   # Merck KGaA
            "MTX.DE",   # MTU Aero Engines
            "MUV2.DE",  # Munich Re
            "P911.DE",  # Porsche AG
            "PAH3.DE",  # Porsche SE (Holding)
            "QIA.DE",   # Qiagen
            "RHM.DE",   # Rheinmetall
            "RWE.DE",   # RWE
            "SAP.DE",   # SAP
            "SRT3.DE",  # Sartorius
            "SIE.DE",   # Siemens
            "ENR.DE",   # Siemens Energy
            "SHL.DE",   # Siemens Healthineers
            "SY1.DE",   # Symrise
            "VOW3.DE",  # Volkswagen
            "VNA.DE",   # Vonovia
            "ZAL.DE",   # Zalando
            "1COV.DE",  # Covestro
            "AIR.DE",   # Airbus (Frankfurt)
            "PUM.DE",   # Puma
        ]
    },

    # ------------------------------------------------------------------ #
    #  ROYAUME-UNI — FTSE 100                                             #
    # ------------------------------------------------------------------ #
    "UK": {
        "name": "🇬🇧 ROYAUME-UNI",
        "open_time": "08:00",
        "close_time": "16:30",
        "timezone": "Europe/London",
        "assets": [
            # Indices
            "^FTSE", "^FTMC",
            # === FTSE 100 ===
            "AZN.L",    # AstraZeneca
            "SHEL.L",   # Shell
            "BP.L",     # BP
            "GSK.L",    # GSK
            "ULVR.L",   # Unilever
            "HSBA.L",   # HSBC
            "RIO.L",    # Rio Tinto
            "BHP.L",    # BHP
            "AAL.L",    # Anglo American
            "GLEN.L",   # Glencore
            "DGE.L",    # Diageo
            "REL.L",    # RELX
            "LSEG.L",   # London Stock Exchange Group
            "NG.L",     # National Grid
            "CPG.L",    # Compass Group
            "BA.L",     # BAE Systems
            "RR.L",     # Rolls-Royce
            "VOD.L",    # Vodafone
            "BT-A.L",   # BT Group
            "BARC.L",   # Barclays
            "LLOY.L",   # Lloyds Banking Group
            "STAN.L",   # Standard Chartered
            "NWG.L",    # NatWest Group
            "PRU.L",    # Prudential
            "LGEN.L",   # Legal & General
            "AV.L",     # Aviva
            "ADM.L",    # Admiral Group
            "FLTR.L",   # Flutter Entertainment
            "RMV.L",    # Rightmove
            "SGRO.L",   # Segro
            "RKT.L",    # Reckitt
            "SN.L",     # Smith & Nephew
            "HLN.L",    # Haleon
            "NXT.L",    # Next
            "JD.L",     # JD Sports
            "KGF.L",    # Kingfisher
            "MKS.L",    # Marks & Spencer
            "TW.L",     # Taylor Wimpey
            "PSN.L",    # Persimmon
            "HL.L",     # Hargreaves Lansdown
            "BKG.L",    # Berkeley Group
            "IMB.L",    # Imperial Brands
            "BATS.L",   # British American Tobacco
            "MNG.L",    # M&G
            "EXPN.L",   # Experian
            "WPP.L",    # WPP
            "ITV.L",    # ITV
            "IAG.L",    # International Airlines Group
            "EZJ.L",    # easyJet
            "RTO.L",    # Rentokil
            "HLMA.L",   # Halma
            "SMT.L",    # Scottish Mortgage Trust
            "III.L",    # 3i Group
            "LAND.L",   # Land Securities
            "BLND.L",   # British Land
            "SBRY.L",   # Sainsbury's
            "TSCO.L",   # Tesco
            "ABF.L",    # Associated British Foods
            "CNA.L",    # Centrica
            "SSE.L",    # SSE
            "SVT.L",    # Severn Trent
            "UU.L",     # United Utilities
        ]
    },

    # ------------------------------------------------------------------ #
    #  EUROPE SUD — IBEX 35 · FTSE MIB · SMI                            #
    # ------------------------------------------------------------------ #
    "EUROPE_SUD": {
        "name": "🌍 EUROPE SUD",
        "open_time": "09:00",
        "close_time": "17:30",
        "timezone": "Europe/Madrid",
        "assets": [
            # Indices
            "^IBEX", "^FTSEMIB", "^SSMI",
            # === IBEX 35 (Espagne) ===
            "ITX.MC",   # Inditex (Zara)
            "IBE.MC",   # Iberdrola
            "SAN.MC",   # Banco Santander
            "BBVA.MC",  # BBVA
            "CLNX.MC",  # Cellnex Telecom
            "CABK.MC",  # CaixaBank
            "FER.MC",   # Ferrovial
            "ACS.MC",   # ACS
            "REP.MC",   # Repsol
            "ELE.MC",   # Endesa
            "REE.MC",   # Redeia (Red Eléctrica)
            "AMS.MC",   # Amadeus IT
            "MAP.MC",   # Mapfre
            "NTGY.MC",  # Naturgy
            "SAB.MC",   # Banco Sabadell
            "GRF.MC",   # Grifols
            "IAG.MC",   # IAG (Iberia)
            "MEL.MC",   # Meliá Hotels
            "ANA.MC",   # Acciona
            "ANE.MC",   # Acciona Energía
            "IDR.MC",   # Indra
            "PUIG.MC",  # Puig Brands
            "SOLARIA.MC", # Solaria
            # === FTSE MIB (Italie) ===
            "ENI.MI",   # ENI
            "ENEL.MI",  # Enel
            "RACE.MI",  # Ferrari
            "ISP.MI",   # Intesa Sanpaolo
            "UCG.MI",   # UniCredit
            "MB.MI",    # Mediobanca
            "G.MI",     # Generali
            "STM.MI",   # STMicroelectronics (Milan)
            "PRY.MI",   # Prysmian
            "MONC.MI",  # Moncler
            "BC.MI",    # Brunello Cucinelli
            "FBK.MI",   # FinecoBank
            "REC.MI",   # Recordati
            "LDO.MI",   # Leonardo
            "NEXI.MI",  # Nexi
            "CPR.MI",   # Campari
            "HER.MI",   # Hera
            "SRG.MI",   # Snam
            "TRN.MI",   # Terna
            "BAMI.MI",  # Banco BPM
            "STLAM.MI", # Stellantis (Milan)
            # === SMI (Suisse) ===
            "NESN.SW",  # Nestlé
            "NOVN.SW",  # Novartis
            "ROG.SW",   # Roche
            "UBSG.SW",  # UBS Group
            "ZURN.SW",  # Zurich Insurance
            "ABBN.SW",  # ABB
            "CFR.SW",   # Richemont
            "LONN.SW",  # Lonza
            "SIKA.SW",  # Sika
            "PGHN.SW",  # Partners Group
            "KNIN.SW",  # Kühne+Nagel
            "GIVN.SW",  # Givaudan
            "SREN.SW",  # Swiss Re
            "HOLN.SW",  # Holcim
            "GEBN.SW",  # Geberit
            "SOON.SW",  # Sonova
            "STMN.SW",  # Straumann
            "LISN.SW",  # Lindt & Sprüngli
            "TEMN.SW",  # Temenos
        ]
    },

    # ------------------------------------------------------------------ #
    #  USA — S&P 500 (large coverage) + indices + ETFs                   #
    # ------------------------------------------------------------------ #
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
