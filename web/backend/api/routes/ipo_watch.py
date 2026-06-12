from fastapi import APIRouter

router = APIRouter()

# Static IPO watchlist — admin can update this list
# Each entry: symbol (None if not yet listed), name, date, exchange, sector, status, description
IPO_DATA = [
    {
        "id": "spcx",
        "symbol": "SPCX",
        "name": "SpaceX",
        "full_name": "Space Exploration Technologies Corp.",
        "date": "2026",  # approximate
        "exchange": "NASDAQ",
        "sector": "Aérospatial",
        "sector_en": "Aerospace",
        "status": "listed",  # listed | upcoming | rumored
        "price_at_ipo": None,
        "description_fr": "Premier constructeur de fusées réutilisables et opérateur du réseau Starlink. Révolutionne l'accès à l'espace et l'internet par satellite.",
        "description_en": "Pioneer of reusable rockets and operator of the Starlink satellite network. Revolutionizing access to space and satellite internet.",
        "tags_fr": ["spatial", "satellites", "Starlink", "Elon Musk"],
        "tags_en": ["space", "satellites", "Starlink", "Elon Musk"],
        "ticker_to_watch": "SPCX",
    },
    {
        "id": "openai",
        "symbol": None,
        "name": "OpenAI",
        "full_name": "OpenAI, Inc.",
        "date": "2026-2027",
        "exchange": "NASDAQ (rumored)",
        "sector": "Intelligence Artificielle",
        "sector_en": "Artificial Intelligence",
        "status": "rumored",
        "price_at_ipo": None,
        "description_fr": "Créateur de ChatGPT et GPT-4. Leader mondial de l'IA générative. Une introduction en bourse serait l'une des plus importantes de la décennie.",
        "description_en": "Creator of ChatGPT and GPT-4. Global leader in generative AI. An IPO would be one of the largest of the decade.",
        "tags_fr": ["IA", "ChatGPT", "technologie"],
        "tags_en": ["AI", "ChatGPT", "technology"],
        "ticker_to_watch": None,
    },
    {
        "id": "stripe",
        "symbol": None,
        "name": "Stripe",
        "full_name": "Stripe, Inc.",
        "date": "2026-2027",
        "exchange": "NYSE (rumored)",
        "sector": "Fintech",
        "sector_en": "Fintech",
        "status": "rumored",
        "price_at_ipo": None,
        "description_fr": "Infrastructure de paiement en ligne valorisée à +50Md$. Fondée par les frères Collison, présente dans 195 pays.",
        "description_en": "Online payment infrastructure valued at $50B+. Founded by the Collison brothers, present in 195 countries.",
        "tags_fr": ["paiements", "fintech", "B2B"],
        "tags_en": ["payments", "fintech", "B2B"],
        "ticker_to_watch": None,
    },
    {
        "id": "shein",
        "symbol": None,
        "name": "Shein",
        "full_name": "Shein Group Ltd.",
        "date": "2026",
        "exchange": "London Stock Exchange",
        "sector": "Mode / E-commerce",
        "sector_en": "Fashion / E-commerce",
        "status": "upcoming",
        "price_at_ipo": None,
        "description_fr": "Géant de la fast fashion en ligne, valorisé à +60Md$. Introduction prévue à Londres après avoir renoncé aux États-Unis.",
        "description_en": "Online fast fashion giant, valued at $60B+. IPO planned in London after abandoning US plans.",
        "tags_fr": ["mode", "e-commerce", "Chine"],
        "tags_en": ["fashion", "e-commerce", "China"],
        "ticker_to_watch": None,
    },
]


@router.get("/ipo-watch")
async def get_ipo_watch():
    return {"ipos": IPO_DATA}
