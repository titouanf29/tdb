"""
Trading Tools API routes
- Pivot Points Calculator
- P/E Ratio Rankings
- Market Trends
- Economic Calendar
- Geopolitical Analysis
- Trading Advice Cards (Fiches conseils)
"""
import os
import httpx
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel

from ..database import execute_query, execute_write
from .auth import get_current_user
from .premium import is_user_premium, get_user_limits, check_premium_required

router = APIRouter()

# Groq API Configuration
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL = "llama-3.3-70b-versatile"

def get_groq_api_key():
    return os.getenv("GROQ_API_KEY", "")


# ============== PIVOT POINTS ==============

class PivotPointsResponse(BaseModel):
    symbol: str
    pivot: float
    r1: float
    r2: float
    r3: float
    s1: float
    s2: float
    s3: float
    high: float
    low: float
    close: float
    method: str


@router.get("/pivot-points/{symbol}")
async def calculate_pivot_points(
    symbol: str,
    method: str = Query(default="standard", regex="^(standard|fibonacci|woodie|camarilla|demark)$"),
    current_user: dict = Depends(get_current_user)
):
    """
    Calculate pivot points for a symbol using different methods:
    - standard: Classic pivot points (FREE)
    - fibonacci: Fibonacci-based pivots (PREMIUM)
    - woodie: Woodie's pivot points (PREMIUM)
    - camarilla: Camarilla pivots (PREMIUM)
    - demark: DeMark pivots (PREMIUM)
    """
    import yfinance as yf

    # Check if advanced pivots are allowed
    if method != "standard":
        limits = await get_user_limits(current_user)
        if not limits.get("advanced_pivots", False):
            raise HTTPException(
                status_code=403,
                detail=f"La methode '{method}' est reservee aux membres Premium. Utilisez 'standard' ou passez Premium."
            )

    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period="5d")

        if hist.empty or len(hist) < 2:
            raise HTTPException(status_code=404, detail="Symbol not found or insufficient data")

        # Use previous day data for calculation
        high = float(hist['High'].iloc[-2])
        low = float(hist['Low'].iloc[-2])
        close = float(hist['Close'].iloc[-2])
        open_price = float(hist['Open'].iloc[-1])

        # Calculate pivot points based on method
        if method == "standard":
            pivot = (high + low + close) / 3
            r1 = 2 * pivot - low
            r2 = pivot + (high - low)
            r3 = high + 2 * (pivot - low)
            s1 = 2 * pivot - high
            s2 = pivot - (high - low)
            s3 = low - 2 * (high - pivot)

        elif method == "fibonacci":
            pivot = (high + low + close) / 3
            diff = high - low
            r1 = pivot + 0.382 * diff
            r2 = pivot + 0.618 * diff
            r3 = pivot + 1.000 * diff
            s1 = pivot - 0.382 * diff
            s2 = pivot - 0.618 * diff
            s3 = pivot - 1.000 * diff

        elif method == "woodie":
            pivot = (high + low + 2 * close) / 4
            r1 = 2 * pivot - low
            r2 = pivot + (high - low)
            r3 = r1 + (high - low)
            s1 = 2 * pivot - high
            s2 = pivot - (high - low)
            s3 = s1 - (high - low)

        elif method == "camarilla":
            pivot = (high + low + close) / 3
            diff = high - low
            r1 = close + diff * 1.1 / 12
            r2 = close + diff * 1.1 / 6
            r3 = close + diff * 1.1 / 4
            s1 = close - diff * 1.1 / 12
            s2 = close - diff * 1.1 / 6
            s3 = close - diff * 1.1 / 4

        elif method == "demark":
            if close < open_price:
                x = high + 2 * low + close
            elif close > open_price:
                x = 2 * high + low + close
            else:
                x = high + low + 2 * close
            pivot = x / 4
            r1 = x / 2 - low
            s1 = x / 2 - high
            r2 = pivot + (r1 - s1)
            s2 = pivot - (r1 - s1)
            r3 = r1 + (high - low)
            s3 = s1 - (high - low)

        return {
            "symbol": symbol.upper(),
            "pivot": round(pivot, 4),
            "r1": round(r1, 4),
            "r2": round(r2, 4),
            "r3": round(r3, 4),
            "s1": round(s1, 4),
            "s2": round(s2, 4),
            "s3": round(s3, 4),
            "high": round(high, 4),
            "low": round(low, 4),
            "close": round(close, 4),
            "current_price": round(float(hist['Close'].iloc[-1]), 4),
            "method": method,
            "date": hist.index[-2].strftime("%Y-%m-%d")
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============== P/E RATIO RANKINGS ==============

@router.get("/per-rankings")
async def get_per_rankings(
    sector: Optional[str] = None,
    limit: int = Query(default=20, le=50),
    sort: str = Query(default="asc", regex="^(asc|desc)$"),
    current_user: dict = Depends(get_current_user)
):
    """Get stocks ranked by P/E ratio"""
    import yfinance as yf

    # Popular stocks to analyze
    symbols = [
        "AAPL", "MSFT", "GOOGL", "AMZN", "META", "NVDA", "TSLA", "JPM",
        "V", "JNJ", "WMT", "PG", "MA", "HD", "DIS", "NFLX", "ADBE",
        "CRM", "INTC", "AMD", "PYPL", "BA", "GS", "IBM", "CSCO",
        "NKE", "KO", "PEP", "MCD", "SBUX", "CAT", "XOM", "CVX"
    ]

    results = []
    for symbol in symbols:
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info

            pe = info.get("trailingPE")
            forward_pe = info.get("forwardPE")
            sector_name = info.get("sector", "Unknown")

            if pe and pe > 0 and pe < 1000:  # Filter unrealistic values
                if sector and sector.lower() not in sector_name.lower():
                    continue

                results.append({
                    "symbol": symbol,
                    "name": info.get("shortName", symbol),
                    "sector": sector_name,
                    "pe_ratio": round(pe, 2),
                    "forward_pe": round(forward_pe, 2) if forward_pe else None,
                    "price": round(info.get("currentPrice", 0), 2),
                    "market_cap": info.get("marketCap", 0),
                    "dividend_yield": round((info.get("dividendYield") or 0) * 100, 2)
                })
        except:
            continue

    # Sort by P/E
    results.sort(key=lambda x: x["pe_ratio"], reverse=(sort == "desc"))

    return {
        "rankings": results[:limit],
        "total": len(results),
        "sort": sort,
        "sectors": list(set(r["sector"] for r in results))
    }


# ============== MARKET TRENDS ==============

@router.get("/trends")
async def get_market_trends(current_user: dict = Depends(get_current_user)):
    """Get market trends analysis"""
    import yfinance as yf
    import numpy as np

    indices = {
        "^GSPC": "S&P 500",
        "^DJI": "Dow Jones",
        "^IXIC": "NASDAQ",
        "^RUT": "Russell 2000",
        "^VIX": "VIX",
        "^STOXX50E": "Euro Stoxx 50",
        "^N225": "Nikkei 225"
    }

    sectors = {
        "XLF": "Finance",
        "XLK": "Tech",
        "XLE": "Energy",
        "XLV": "Healthcare",
        "XLI": "Industrial",
        "XLP": "Consumer",
        "XLU": "Utilities"
    }

    trends = {"indices": [], "sectors": [], "analysis": None}

    # Analyze indices
    for symbol, name in indices.items():
        try:
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period="3mo")

            if len(hist) < 20:
                continue

            current = hist['Close'].iloc[-1]
            sma_20 = hist['Close'].rolling(20).mean().iloc[-1]
            sma_50 = hist['Close'].rolling(50).mean().iloc[-1] if len(hist) >= 50 else None

            change_1d = ((current - hist['Close'].iloc[-2]) / hist['Close'].iloc[-2]) * 100
            change_1w = ((current - hist['Close'].iloc[-5]) / hist['Close'].iloc[-5]) * 100 if len(hist) >= 5 else 0
            change_1m = ((current - hist['Close'].iloc[-22]) / hist['Close'].iloc[-22]) * 100 if len(hist) >= 22 else 0

            # Determine trend
            if current > sma_20 and (sma_50 is None or sma_20 > sma_50):
                trend = "bullish"
            elif current < sma_20 and (sma_50 is None or sma_20 < sma_50):
                trend = "bearish"
            else:
                trend = "neutral"

            trends["indices"].append({
                "symbol": symbol,
                "name": name,
                "price": round(current, 2),
                "change_1d": round(change_1d, 2),
                "change_1w": round(change_1w, 2),
                "change_1m": round(change_1m, 2),
                "sma_20": round(sma_20, 2),
                "sma_50": round(sma_50, 2) if sma_50 else None,
                "trend": trend
            })
        except:
            continue

    # Analyze sectors
    for symbol, name in sectors.items():
        try:
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period="1mo")

            if len(hist) < 5:
                continue

            current = hist['Close'].iloc[-1]
            change_1d = ((current - hist['Close'].iloc[-2]) / hist['Close'].iloc[-2]) * 100
            change_1w = ((current - hist['Close'].iloc[-5]) / hist['Close'].iloc[-5]) * 100 if len(hist) >= 5 else 0

            trends["sectors"].append({
                "symbol": symbol,
                "name": name,
                "price": round(current, 2),
                "change_1d": round(change_1d, 2),
                "change_1w": round(change_1w, 2)
            })
        except:
            continue

    # Sort sectors by performance
    trends["sectors"].sort(key=lambda x: x["change_1w"], reverse=True)

    # Generate AI analysis
    api_key = get_groq_api_key()
    if api_key and trends["indices"]:
        trend_summary = "\n".join([
            f"- {t['name']}: {t['change_1d']:+.2f}% (1j), {t['change_1w']:+.2f}% (1sem), tendance {t['trend']}"
            for t in trends["indices"]
        ])
        sector_summary = "\n".join([
            f"- {s['name']}: {s['change_1w']:+.2f}% (1sem)"
            for s in trends["sectors"][:5]
        ])

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    GROQ_API_URL,
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": MODEL,
                        "messages": [
                            {"role": "system", "content": "Tu es un analyste de marche. Analyse les tendances et donne des insights actionables. Reponds en francais, sois concis."},
                            {"role": "user", "content": f"Analyse ces tendances de marche:\n\nIndices:\n{trend_summary}\n\nSecteurs (perf. 1 sem):\n{sector_summary}\n\nDonne une analyse en 3-4 points avec recommandations."}
                        ],
                        "temperature": 0.4,
                        "max_tokens": 500
                    }
                )

                if response.status_code == 200:
                    data = response.json()
                    trends["analysis"] = data["choices"][0]["message"]["content"]
        except:
            pass

    return trends


# ============== ECONOMIC CALENDAR ==============

@router.get("/economic-calendar")
async def get_economic_calendar(
    days: int = Query(default=7, le=30),
    current_user: dict = Depends(get_current_user)
):
    """Get upcoming economic events"""

    # Key economic events (hardcoded for reliability)
    # In production, this would fetch from an economic calendar API
    events = [
        {
            "date": "2026-03-12",
            "time": "14:30",
            "event": "US CPI (Consumer Price Index)",
            "country": "USA",
            "importance": "high",
            "previous": "2.8%",
            "forecast": "2.9%",
            "impact": "Inflation measure - affects Fed policy and markets"
        },
        {
            "date": "2026-03-13",
            "time": "14:30",
            "event": "US PPI (Producer Price Index)",
            "country": "USA",
            "importance": "medium",
            "previous": "3.0%",
            "forecast": "2.8%",
            "impact": "Leading indicator for consumer inflation"
        },
        {
            "date": "2026-03-14",
            "time": "16:00",
            "event": "US Consumer Sentiment (Michigan)",
            "country": "USA",
            "importance": "medium",
            "previous": "67.8",
            "forecast": "68.0",
            "impact": "Measures consumer confidence"
        },
        {
            "date": "2026-03-18",
            "time": "20:00",
            "event": "FOMC Interest Rate Decision",
            "country": "USA",
            "importance": "high",
            "previous": "4.50%",
            "forecast": "4.50%",
            "impact": "Major market mover - Fed monetary policy"
        },
        {
            "date": "2026-03-19",
            "time": "10:00",
            "event": "ECB Economic Bulletin",
            "country": "EU",
            "importance": "medium",
            "previous": "-",
            "forecast": "-",
            "impact": "ECB economic outlook and policy signals"
        },
        {
            "date": "2026-03-20",
            "time": "14:30",
            "event": "US Jobless Claims",
            "country": "USA",
            "importance": "medium",
            "previous": "220K",
            "forecast": "218K",
            "impact": "Weekly employment health indicator"
        },
        {
            "date": "2026-03-25",
            "time": "14:30",
            "event": "US GDP Q4 Final",
            "country": "USA",
            "importance": "high",
            "previous": "3.2%",
            "forecast": "3.1%",
            "impact": "Quarterly economic growth measure"
        },
        {
            "date": "2026-03-28",
            "time": "14:30",
            "event": "US PCE Price Index",
            "country": "USA",
            "importance": "high",
            "previous": "2.6%",
            "forecast": "2.7%",
            "impact": "Fed's preferred inflation measure"
        }
    ]

    # Filter by date range
    today = datetime.now().date()
    end_date = today + timedelta(days=days)

    filtered_events = [
        e for e in events
        if today <= datetime.strptime(e["date"], "%Y-%m-%d").date() <= end_date
    ]

    return {
        "events": filtered_events,
        "total": len(filtered_events),
        "date_range": {
            "from": today.isoformat(),
            "to": end_date.isoformat()
        }
    }


# ============== GEOPOLITICAL ANALYSIS ==============

@router.get("/geopolitical")
async def get_geopolitical_analysis(current_user: dict = Depends(get_current_user)):
    """Get geopolitical analysis with market impact (PREMIUM)"""
    import yfinance as yf

    # Check if geopolitical analysis is allowed
    limits = await get_user_limits(current_user)
    if not limits.get("geopolitical_enabled", False):
        raise HTTPException(
            status_code=403,
            detail="L'analyse geopolitique est reservee aux membres Premium."
        )

    api_key = get_groq_api_key()
    if not api_key:
        raise HTTPException(status_code=503, detail="AI not configured")

    # Get market data for context
    market_data = {}
    symbols = {
        "^GSPC": "S&P 500",
        "^DJI": "Dow Jones",
        "GC=F": "Or",
        "CL=F": "Petrole WTI",
        "DX-Y.NYB": "Dollar Index",
        "^TNX": "US 10Y Treasury"
    }

    for symbol, name in symbols.items():
        try:
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period="5d")
            if len(hist) >= 2:
                current = hist['Close'].iloc[-1]
                prev = hist['Close'].iloc[-2]
                change = ((current - prev) / prev) * 100
                market_data[name] = {"price": round(current, 2), "change": round(change, 2)}
        except:
            continue

    market_context = "\n".join([
        f"- {name}: {data['price']} ({data['change']:+.2f}%)"
        for name, data in market_data.items()
    ])

    prompt = f"""En tant qu'analyste geopolitique et financier, fournis une analyse COMPLETE de la situation actuelle:

## CONTEXTE MARCHE ACTUEL:
{market_context}

## ANALYSE DEMANDEE:

### 1. TENSIONS GEOPOLITIQUES MAJEURES
Identifie les 3-4 zones de tension principales dans le monde et leur impact potentiel sur les marches:
- Conflits actifs ou latents
- Relations commerciales (USA-Chine, etc.)
- Sanctions et embargos
- Risques politiques majeurs

### 2. IMPACT SUR LES MARCHES
Pour chaque tension identifiee, explique:
- Secteurs affectes (defense, energie, tech, etc.)
- Actifs refuges a surveiller (Or, CHF, JPY, Treasuries)
- Matieres premieres impactees

### 3. SCENARIOS ET PROBABILITES
- Scenario optimiste (de-escalade)
- Scenario central (statu quo)
- Scenario pessimiste (escalade)

### 4. RECOMMANDATIONS POUR TRADERS
- Positions a privilegier
- Hedges recommandes
- Actifs a eviter
- Niveaux cles a surveiller

Sois precis, factuel et donne des recommandations actionables."""

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                GROQ_API_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": MODEL,
                    "messages": [
                        {"role": "system", "content": "Tu es un expert en geopolitique et finance internationale avec 20 ans d'experience. Tu analyses les risques geopolitiques et leur impact sur les marches financiers."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.4,
                    "max_tokens": 2000
                }
            )

            if response.status_code != 200:
                raise HTTPException(status_code=500, detail="AI API error")

            data = response.json()
            analysis = data["choices"][0]["message"]["content"]

            return {
                "analysis": analysis,
                "market_data": market_data,
                "generated_at": datetime.utcnow().isoformat()
            }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============== BACKTEST SIMULATION ==============

class BacktestRequest(BaseModel):
    symbol: str
    strategy: str  # sma_crossover, rsi, macd, bollinger
    period: str = "1y"  # 6mo, 1y, 2y, 5y
    initial_capital: float = 10000
    # Strategy parameters
    sma_short: int = 20
    sma_long: int = 50
    rsi_oversold: int = 30
    rsi_overbought: int = 70


@router.post("/backtest")
async def run_backtest(
    request: BacktestRequest,
    current_user: dict = Depends(get_current_user)
):
    """Run a simple backtest simulation (PREMIUM)"""
    import yfinance as yf
    import numpy as np

    # Check if backtest is allowed
    limits = await get_user_limits(current_user)
    if not limits.get("backtest_enabled", False):
        raise HTTPException(
            status_code=403,
            detail="Le Backtest est reserve aux membres Premium."
        )

    try:
        ticker = yf.Ticker(request.symbol)
        hist = ticker.history(period=request.period)

        if hist.empty or len(hist) < 60:
            raise HTTPException(status_code=400, detail="Insufficient data for backtest")

        # Initialize
        capital = request.initial_capital
        position = 0  # 0 = no position, 1 = long
        shares = 0
        trades = []
        equity_curve = []

        # Calculate indicators based on strategy
        if request.strategy == "sma_crossover":
            hist['sma_short'] = hist['Close'].rolling(request.sma_short).mean()
            hist['sma_long'] = hist['Close'].rolling(request.sma_long).mean()
            hist['signal'] = 0
            hist.loc[hist['sma_short'] > hist['sma_long'], 'signal'] = 1
            hist.loc[hist['sma_short'] < hist['sma_long'], 'signal'] = -1

        elif request.strategy == "rsi":
            delta = hist['Close'].diff()
            gain = (delta.where(delta > 0, 0)).rolling(14).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(14).mean()
            rs = gain / loss
            hist['rsi'] = 100 - (100 / (1 + rs))
            hist['signal'] = 0
            hist.loc[hist['rsi'] < request.rsi_oversold, 'signal'] = 1
            hist.loc[hist['rsi'] > request.rsi_overbought, 'signal'] = -1

        elif request.strategy == "macd":
            hist['ema12'] = hist['Close'].ewm(span=12).mean()
            hist['ema26'] = hist['Close'].ewm(span=26).mean()
            hist['macd'] = hist['ema12'] - hist['ema26']
            hist['signal_line'] = hist['macd'].ewm(span=9).mean()
            hist['signal'] = 0
            hist.loc[hist['macd'] > hist['signal_line'], 'signal'] = 1
            hist.loc[hist['macd'] < hist['signal_line'], 'signal'] = -1

        elif request.strategy == "bollinger":
            hist['sma'] = hist['Close'].rolling(20).mean()
            hist['std'] = hist['Close'].rolling(20).std()
            hist['upper'] = hist['sma'] + 2 * hist['std']
            hist['lower'] = hist['sma'] - 2 * hist['std']
            hist['signal'] = 0
            hist.loc[hist['Close'] < hist['lower'], 'signal'] = 1
            hist.loc[hist['Close'] > hist['upper'], 'signal'] = -1

        # Simulate trades
        for i in range(1, len(hist)):
            price = hist['Close'].iloc[i]
            signal = hist['signal'].iloc[i]
            prev_signal = hist['signal'].iloc[i-1]
            date = hist.index[i].strftime("%Y-%m-%d")

            # Buy signal
            if signal == 1 and prev_signal != 1 and position == 0:
                shares = capital / price
                position = 1
                trades.append({
                    "date": date,
                    "type": "BUY",
                    "price": round(price, 2),
                    "shares": round(shares, 4),
                    "value": round(capital, 2)
                })
                capital = 0

            # Sell signal
            elif signal == -1 and prev_signal != -1 and position == 1:
                capital = shares * price
                position = 0
                trades.append({
                    "date": date,
                    "type": "SELL",
                    "price": round(price, 2),
                    "shares": round(shares, 4),
                    "value": round(capital, 2)
                })
                shares = 0

            # Track equity
            current_equity = capital + (shares * price)
            equity_curve.append({
                "date": date,
                "equity": round(current_equity, 2)
            })

        # Final equity
        final_price = hist['Close'].iloc[-1]
        final_equity = capital + (shares * final_price)

        # Calculate metrics
        total_return = ((final_equity - request.initial_capital) / request.initial_capital) * 100
        num_trades = len([t for t in trades if t["type"] == "BUY"])

        # Calculate win rate
        profits = []
        for i in range(0, len(trades) - 1, 2):
            if i + 1 < len(trades):
                buy_val = trades[i]["value"]
                sell_val = trades[i + 1]["value"]
                profits.append(sell_val - buy_val if buy_val > 0 else sell_val)

        winning_trades = len([p for p in profits if p > 0])
        win_rate = (winning_trades / len(profits) * 100) if profits else 0

        # Max drawdown
        peak = request.initial_capital
        max_dd = 0
        for point in equity_curve:
            if point["equity"] > peak:
                peak = point["equity"]
            dd = (peak - point["equity"]) / peak * 100
            if dd > max_dd:
                max_dd = dd

        return {
            "symbol": request.symbol.upper(),
            "strategy": request.strategy,
            "period": request.period,
            "initial_capital": request.initial_capital,
            "final_equity": round(final_equity, 2),
            "total_return": round(total_return, 2),
            "num_trades": num_trades,
            "win_rate": round(win_rate, 1),
            "max_drawdown": round(max_dd, 2),
            "trades": trades[-20:],  # Last 20 trades
            "equity_curve": equity_curve[::max(1, len(equity_curve)//50)]  # Sampled for chart
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============== TRADING ADVICE CARDS (FICHES CONSEILS) ==============

TRADING_ADVICE = [
    {
        "id": 1,
        "category": "analyse_technique",
        "title": "Maitriser les Moyennes Mobiles",
        "icon": "trending-up",
        "summary": "Les moyennes mobiles sont des indicateurs essentiels pour identifier les tendances.",
        "content": """## Les Moyennes Mobiles Expliquees

### Qu'est-ce qu'une moyenne mobile ?
Une moyenne mobile est un indicateur technique qui lisse les fluctuations de prix en calculant le prix moyen sur une periode donnee.

### Types de moyennes mobiles
1. **SMA (Simple Moving Average)**: Moyenne arithmetique simple des prix
2. **EMA (Exponential Moving Average)**: Donne plus de poids aux prix recents
3. **WMA (Weighted Moving Average)**: Pondere lineairement les prix

### Strategies populaires
- **Croisement de moyennes**: Achat quand la MA courte croise la MA longue vers le haut
- **Support/Resistance dynamique**: La MA200 sert souvent de support majeur
- **Golden Cross**: La MA50 croise la MA200 vers le haut (signal haussier)
- **Death Cross**: La MA50 croise la MA200 vers le bas (signal baissier)

### Conseils pratiques
- Utilisez plusieurs timeframes pour confirmer
- La MA200 est suivie par les institutionnels
- Evitez les faux signaux en attendant la cloture de bougie""",
        "premium_only": False
    },
    {
        "id": 2,
        "category": "analyse_technique",
        "title": "Le RSI et ses secrets",
        "icon": "activity",
        "summary": "Comment utiliser le RSI au-dela des zones de surachat/survente classiques.",
        "content": """## Le RSI (Relative Strength Index) Approfondi

### Comprendre le RSI
Le RSI mesure la force relative des mouvements haussiers par rapport aux mouvements baissiers sur une periode donnee (generalement 14).

### Niveaux traditionnels
- **RSI > 70**: Zone de surachat (potentiel de baisse)
- **RSI < 30**: Zone de survente (potentiel de hausse)
- **RSI = 50**: Niveau neutre

### Utilisations avancees
1. **Divergences**: Plus puissantes que les niveaux
   - Divergence haussiere: Prix en baisse mais RSI en hausse
   - Divergence baissiere: Prix en hausse mais RSI en baisse

2. **Support/Resistance sur RSI**: Le RSI peut former ses propres niveaux de support/resistance

3. **Failure Swings**: Signaux de retournement puissants
   - Bullish failure swing: RSI passe sous 30, rebondit, repasse au-dessus
   - Bearish failure swing: RSI passe au-dessus de 70, recule, repasse en-dessous

### Erreurs a eviter
- Ne pas trader uniquement sur les niveaux 30/70
- Tenir compte de la tendance generale
- Confirmer avec d'autres indicateurs""",
        "premium_only": False
    },
    {
        "id": 3,
        "category": "gestion_risque",
        "title": "Gestion du Risque: Les Fondamentaux",
        "icon": "shield",
        "summary": "La gestion du risque est LA competence la plus importante d'un trader.",
        "content": """## La Gestion du Risque en Trading

### La regle d'or: Ne jamais risquer plus de 1-2% par trade

### Calcul de la taille de position
```
Taille = (Capital x % Risque) / (Prix entree - Stop Loss)
```

**Exemple:**
- Capital: 10,000€
- Risque: 1% = 100€
- Entree: 100€, Stop: 95€
- Risque par action: 5€
- Taille: 100 / 5 = 20 actions

### Ratio Risk/Reward
- Minimum recommande: 1:2 (risquer 1€ pour gagner 2€)
- Ideal: 1:3 ou plus
- Un ratio 1:3 permet d'etre profitable avec 30% de trades gagnants

### Les types de stops
1. **Stop Loss fixe**: Niveau de prix predetermine
2. **Stop Trailing**: Suit le prix a distance fixe
3. **Stop basé sur ATR**: S'adapte a la volatilite
4. **Stop mental**: A eviter absolument

### Regles essentielles
- Toujours placer son stop AVANT d'entrer en position
- Ne jamais deplacer son stop dans le mauvais sens
- Diversifier ses positions
- Ne pas utiliser de levier excessif""",
        "premium_only": False
    },
    {
        "id": 4,
        "category": "psychologie",
        "title": "Psychologie du Trading",
        "icon": "brain",
        "summary": "Maitriser ses emotions est crucial pour reussir en trading.",
        "content": """## La Psychologie du Trader

### Les emotions destructrices
1. **La peur**: Empeche de prendre des positions ou fait couper trop tot
2. **L'avidite**: Pousse a surtrader ou a ne pas prendre ses profits
3. **L'espoir**: Fait garder des positions perdantes trop longtemps
4. **La frustration**: Mene au revenge trading

### Le FOMO (Fear Of Missing Out)
- Symptome: Entrer en position par peur de rater un mouvement
- Solution: Avoir un plan de trading strict et s'y tenir

### Le Revenge Trading
- Symptome: Vouloir recuperer ses pertes immediatement
- Consequence: Pertes accrues
- Solution: Faire une pause apres une serie de pertes

### Construire une mentalite de gagnant
1. **Accepter les pertes**: Elles font partie du jeu
2. **Tenir un journal de trading**: Analyser ses trades et emotions
3. **Suivre son plan**: La discipline bat l'intelligence
4. **Penser en probabilites**: Chaque trade est independant
5. **Focus sur le processus**: Pas sur les resultats a court terme

### Citation a retenir
"Le trading est simple, mais pas facile. La difficulte n'est pas intellectuelle, elle est emotionnelle."
""",
        "premium_only": False
    },
    {
        "id": 5,
        "category": "analyse_technique",
        "title": "Les Figures Chartistes",
        "icon": "chart",
        "summary": "Reconnaitre les patterns graphiques pour anticiper les mouvements.",
        "content": """## Les Figures Chartistes Essentielles

### Figures de Retournement

**Epaule-Tete-Epaule (ETE)**
- Signal de retournement baissier
- 3 sommets: le central (tete) plus haut que les lateraux (epaules)
- Validation: cassure de la ligne de cou
- Objectif: hauteur de la tete reportee sous la ligne de cou

**Double Top / Double Bottom**
- Double Top: 2 sommets au meme niveau = signal baissier
- Double Bottom: 2 creux au meme niveau = signal haussier
- Plus fiable si le volume diminue au 2eme sommet/creux

### Figures de Continuation

**Triangles**
- Triangle ascendant: Haussier (resistance horizontale, support montant)
- Triangle descendant: Baissier (support horizontal, resistance descendante)
- Triangle symmetrique: Neutre, suivra la tendance precedente

**Drapeaux et Fanions**
- Formes de consolidation apres un mouvement fort
- Duree: quelques jours a quelques semaines
- Objectif: reporter le mouvement initial apres la cassure

### Conseils d'utilisation
1. Attendre la cassure confirmee (cloture au-dela du niveau)
2. Verifier le volume (augmentation a la cassure)
3. Utiliser plusieurs timeframes
4. Combiner avec d'autres indicateurs""",
        "premium_only": True
    },
    {
        "id": 6,
        "category": "fondamentaux",
        "title": "Analyse Fondamentale: Les Ratios Cles",
        "icon": "bar-chart",
        "summary": "Comprendre les ratios financiers pour evaluer une entreprise.",
        "content": """## Les Ratios Fondamentaux Expliques

### Ratios de Valorisation

**P/E Ratio (Price/Earnings)**
- Formule: Cours / Benefice par action
- Interpretation: Nombre d'annees de benefices pour payer l'action
- P/E bas: Potentiellement sous-evalue
- P/E eleve: Croissance attendue ou surevaluation

**P/B Ratio (Price/Book)**
- Formule: Cours / Valeur comptable par action
- P/B < 1: L'action vaut moins que ses actifs nets
- Utile pour les valeurs financieres et industrielles

**PEG Ratio**
- Formule: P/E / Taux de croissance des benefices
- PEG < 1: Potentiellement sous-evalue par rapport a la croissance
- PEG > 2: Potentiellement surevalue

### Ratios de Rentabilite

**ROE (Return on Equity)**
- Formule: Resultat net / Capitaux propres
- Mesure l'efficacite de l'utilisation des fonds propres
- ROE > 15%: Generalement bon

**Marge nette**
- Formule: Resultat net / Chiffre d'affaires
- Plus elle est elevee et stable, mieux c'est

### Ratios de Solidite

**Debt/Equity**
- Formule: Dettes / Capitaux propres
- D/E > 2: Endettement eleve, plus risque

**Current Ratio**
- Formule: Actifs courants / Passifs courants
- > 1.5: Bonne liquidite a court terme""",
        "premium_only": True
    },
    {
        "id": 7,
        "category": "strategies",
        "title": "Strategies de Trading Populaires",
        "icon": "target",
        "summary": "Vue d'ensemble des strategies les plus utilisees par les traders.",
        "content": """## Les Strategies de Trading

### Day Trading
- **Definition**: Ouverture et fermeture de positions dans la meme journee
- **Avantages**: Pas de risque overnight, capitalisation rapide
- **Inconvenients**: Stressant, necessite disponibilite totale, frais eleves
- **Capital minimum recommande**: 25,000€

### Swing Trading
- **Definition**: Positions de quelques jours a quelques semaines
- **Avantages**: Plus de flexibilite, moins stressant
- **Inconvenients**: Risque overnight, necessite patience
- **Ideal pour**: Traders avec un emploi a temps plein

### Position Trading
- **Definition**: Positions de plusieurs semaines a mois
- **Avantages**: Peu de temps requis, suit les grandes tendances
- **Inconvenients**: Capital immobilise longtemps, drawdowns potentiels

### Scalping
- **Definition**: Trades de quelques secondes a minutes
- **Avantages**: Nombreuses opportunites
- **Inconvenients**: Tres stressant, frais tres eleves, necessite execution rapide

### Quelle strategie choisir ?
1. Evaluez votre disponibilite en temps
2. Determinez votre tolerance au risque
3. Considerez votre capital
4. Testez en paper trading d'abord""",
        "premium_only": True
    },
    {
        "id": 8,
        "category": "macro",
        "title": "Impact des Taux d'Interet",
        "icon": "percent",
        "summary": "Comment les decisions des banques centrales affectent les marches.",
        "content": """## Les Taux d'Interet et les Marches

### Le role des banques centrales
- **Fed (USA)**: Federal Reserve - influence mondiale
- **BCE (Europe)**: Banque Centrale Europeenne
- **BoJ (Japon)**: Bank of Japan
- **BoE (UK)**: Bank of England

### Impact sur les actifs

**Actions**
- Taux en hausse → Actions en baisse (generalement)
  - Le cout du capital augmente
  - Les obligations deviennent plus attractives
  - Les valorisations sont revisees a la baisse
- Taux en baisse → Actions en hausse (generalement)

**Obligations**
- Taux en hausse → Prix des obligations en baisse
- Taux en baisse → Prix des obligations en hausse
- Relation inverse entre rendement et prix

**Devises**
- Taux en hausse → Devise renforce
- Les investisseurs cherchent le meilleur rendement

**Or**
- Taux reels positifs → Or defavorise
- Taux reels negatifs → Or favorise
- L'or ne genere pas d'interets

### Indicateurs a surveiller
1. Decisions de taux (8 fois/an pour la Fed)
2. Dot plot (projections des membres du FOMC)
3. Discours des gouverneurs
4. Minutes des reunions""",
        "premium_only": True
    }
]


@router.get("/advice")
async def get_trading_advice(
    category: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get trading advice cards (fiches conseils)"""
    is_premium = await is_user_premium(current_user)

    advice = TRADING_ADVICE.copy()

    # Filter by category if specified
    if category:
        advice = [a for a in advice if a["category"] == category]

    # For free users, show limited content for premium-only cards
    result = []
    for card in advice:
        if card["premium_only"] and not is_premium:
            # Show card but with locked content
            result.append({
                **card,
                "content": None,
                "locked": True,
                "lock_message": "Contenu reserve aux membres Premium"
            })
        else:
            result.append({**card, "locked": False})

    return {
        "advice": result,
        "categories": [
            {"key": "analyse_technique", "label": "Analyse Technique"},
            {"key": "gestion_risque", "label": "Gestion du Risque"},
            {"key": "psychologie", "label": "Psychologie"},
            {"key": "fondamentaux", "label": "Analyse Fondamentale"},
            {"key": "strategies", "label": "Strategies"},
            {"key": "macro", "label": "Macroeconomie"},
        ],
        "is_premium": is_premium
    }


@router.get("/advice/{advice_id}")
async def get_advice_detail(
    advice_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Get detailed trading advice card"""
    is_premium = await is_user_premium(current_user)

    card = next((a for a in TRADING_ADVICE if a["id"] == advice_id), None)
    if not card:
        raise HTTPException(status_code=404, detail="Advice not found")

    if card["premium_only"] and not is_premium:
        raise HTTPException(
            status_code=403,
            detail="Ce contenu est reserve aux membres Premium"
        )

    return card


# ============== ECONOMIC CALENDAR WITH SUMMARIES ==============

@router.get("/economic-calendar/event/{event_id}/summary")
async def get_event_summary(
    event_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get AI-generated summary for an economic event after it occurred"""
    is_premium = await is_user_premium(current_user)

    if not is_premium:
        raise HTTPException(
            status_code=403,
            detail="Les resumes d'evenements sont reserves aux membres Premium"
        )

    api_key = get_groq_api_key()
    if not api_key:
        raise HTTPException(status_code=503, detail="AI not configured")

    # This would normally fetch real data from an economic calendar API
    # For now, generate a summary based on the event
    prompt = f"""Genere un resume court (3-4 paragraphes) d'un evenement economique recent:

Evenement: {event_id}

Structure du resume:
1. Ce qui s'est passe (les chiffres annonces)
2. Comparaison avec les attentes
3. Reaction immediate des marches
4. Implications pour les traders

Sois factuel et concis."""

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                GROQ_API_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": MODEL,
                    "messages": [
                        {"role": "system", "content": "Tu es un analyste financier qui resume les evenements economiques de facon claire et concise."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.4,
                    "max_tokens": 500
                }
            )

            if response.status_code != 200:
                raise HTTPException(status_code=500, detail="AI API error")

            data = response.json()
            summary = data["choices"][0]["message"]["content"]

            return {
                "event_id": event_id,
                "summary": summary,
                "generated_at": datetime.utcnow().isoformat()
            }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
