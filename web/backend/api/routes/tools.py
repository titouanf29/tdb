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
    method: str = Query(default="standard", pattern="^(standard|fibonacci|woodie|camarilla|demark)$"),
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
    from ._prices import fetch_ohlcv

    # Check if advanced pivots are allowed
    if method != "standard":
        limits = await get_user_limits(current_user)
        if not limits.get("advanced_pivots", False):
            raise HTTPException(
                status_code=403,
                detail=f"La methode '{method}' est reservee aux membres Premium. Utilisez 'standard' ou passez Premium."
            )

    try:
        hist = await fetch_ohlcv(symbol, period="5d", interval="1d")

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
    sort: str = Query(default="asc", pattern="^(asc|desc)$"),
    current_user: dict = Depends(get_current_user)
):
    """Get stocks ranked by P/E ratio (price data only — P/E requires premium data provider)"""
    from ._prices import fetch_prices

    # Popular stocks to analyze
    symbols = [
        "AAPL", "MSFT", "GOOGL", "AMZN", "META", "NVDA", "TSLA", "JPM",
        "V", "JNJ", "WMT", "PG", "MA", "HD", "DIS", "NFLX", "ADBE",
        "CRM", "INTC", "AMD", "PYPL", "BA", "GS", "IBM", "CSCO",
        "NKE", "KO", "PEP", "MCD", "SBUX", "CAT", "XOM", "CVX"
    ]

    prices = await fetch_prices(symbols)
    results = []
    for sym in symbols:
        p = prices.get(sym, {})
        if not p.get("price"):
            continue
        results.append({
            "symbol": sym,
            "name": sym,
            "sector": "Unknown",
            "pe_ratio": None,
            "forward_pe": None,
            "price": round(p["price"], 2),
            "change": round(p.get("change", 0), 2),
            "market_cap": None,
            "dividend_yield": None
        })

    return {
        "rankings": results[:limit],
        "total": len(results),
        "sort": sort,
        "sectors": []
    }


# ============== MARKET TRENDS ==============

@router.get("/trends")
async def get_market_trends(current_user: dict = Depends(get_current_user)):
    """Get market trends analysis"""
    from ._prices import fetch_ohlcv
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
            hist = await fetch_ohlcv(symbol, period="3mo", interval="1d")

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
            hist = await fetch_ohlcv(symbol, period="1mo", interval="1d")

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
    from ._prices import fetch_prices

    # Check if geopolitical analysis is allowed
    limits = await get_user_limits(current_user)
    if not limits.get("geopolitical_enabled", False):
        raise HTTPException(
            status_code=403,
            detail="L'analyse geopolitique est reservee aux membres Premium."
        )

    api_key = get_groq_api_key()
    if not api_key:
        raise HTTPException(status_code=503, detail="Service IA non configure. Contactez l'administrateur (GROQ_API_KEY manquante).")

    # Get market data for context
    market_data = {}
    symbol_names = {
        "^GSPC": "S&P 500",
        "^DJI": "Dow Jones",
        "GC=F": "Or",
        "CL=F": "Petrole WTI",
        "^TNX": "US 10Y Treasury"
    }

    prices = await fetch_prices(list(symbol_names.keys()))
    for symbol, name in symbol_names.items():
        p = prices.get(symbol, {})
        if p.get("price"):
            market_data[name] = {"price": p["price"], "change": p.get("change", 0)}

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
                error_detail = "AI API error"
                try:
                    error_data = response.json()
                    if "error" in error_data:
                        error_msg = error_data["error"].get("message", "Unknown error")
                        error_detail = f"AI API error: {error_msg}"
                except:
                    error_detail = f"AI API error (status {response.status_code})"
                raise HTTPException(status_code=503, detail=error_detail)

            data = response.json()
            analysis = data["choices"][0]["message"]["content"]

            return {
                "analysis": analysis,
                "market_data": market_data,
                "generated_at": datetime.now(timezone.utc).isoformat()
            }

    except HTTPException:
        raise
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="L'analyse prend trop de temps. Veuillez reessayer.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur inattendue: {str(e)}")


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
    from ._prices import fetch_ohlcv
    import numpy as np

    # Check if backtest is allowed
    limits = await get_user_limits(current_user)
    if not limits.get("backtest_enabled", False):
        raise HTTPException(
            status_code=403,
            detail="Le Backtest est reserve aux membres Premium."
        )

    try:
        hist = await fetch_ohlcv(request.symbol, period=request.period, interval="1d")

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
        "category": "debutant",
        "title": "Introduction au Trading",
        "icon": "book-open",
        "summary": "Les bases essentielles pour debuter en trading en toute securite.",
        "content": """## Introduction au Trading - Guide Complet du Debutant

### Qu'est-ce que le trading ?
Le trading consiste a acheter et vendre des actifs financiers (actions, devises, crypto, matieres premieres) dans le but de realiser un profit. Contrairement a l'investissement long terme, le trading se concentre sur les mouvements de prix a court/moyen terme.

**La difference cle avec l'investissement:**
- **Investisseur**: Achete pour le long terme (annees), se concentre sur la valeur fondamentale
- **Trader**: Cherche a profiter des fluctuations de prix, horizon plus court

---

### Les differents marches financiers

#### 1. Actions (Bourse)
Parts de propriete d'entreprises cotees. Exemples: Apple, Tesla, LVMH.
- **Horaires**: 9h30-16h (NYSE), 9h-17h30 (Paris)
- **Avantages**: Dividendes, transparence, regulation
- **Pour qui**: Swing traders, investisseurs

#### 2. Forex (Marche des devises)
Le plus grand marche au monde (6000 milliards $/jour).
- **Paires majeures**: EUR/USD, GBP/USD, USD/JPY
- **Horaires**: 24h/24 du dimanche soir au vendredi soir
- **Avantages**: Liquidite, faibles frais, levier
- **Pour qui**: Day traders, scalpers

#### 3. Crypto-monnaies
Bitcoin, Ethereum et milliers d'autres actifs numeriques.
- **Horaires**: 24h/24, 7j/7
- **Avantages**: Volatilite (opportunites), accessibilite
- **Risques**: Tres volatile, moins regulé
- **Pour qui**: Traders acceptant le risque eleve

#### 4. Matieres premieres (Commodities)
Or, argent, petrole, gaz, ble, cafe, etc.
- **Influence**: Geopolitique, meteo, offre/demande
- **Pour qui**: Traders macroeconomiques

#### 5. Indices
Paniers d'actions representant un marche: S&P 500, CAC 40, DAX.
- **Avantages**: Diversification, moins volatile qu'actions individuelles
- **Pour qui**: Tous niveaux

---

### Les types de traders

| Type | Duree des trades | Frequence | Stress | Capital minimum |
|------|------------------|-----------|--------|-----------------|
| **Scalper** | Secondes/Minutes | 50-100/jour | Tres eleve | 10,000€+ |
| **Day Trader** | Minutes/Heures | 5-20/jour | Eleve | 5,000€+ |
| **Swing Trader** | Jours/Semaines | 2-10/semaine | Moyen | 2,000€+ |
| **Position Trader** | Semaines/Mois | 1-5/mois | Faible | 1,000€+ |

**Conseil**: Debutez en Swing Trading - c'est le meilleur compromis entre opportunites et stress.

---

### Les outils essentiels du trader

#### 1. Plateforme de trading
- **TradingView**: Graphiques (gratuit/premium)
- **MetaTrader 4/5**: Forex, CFD
- **ProRealTime**: Actions europeennes
- **Binance/Kraken**: Crypto

#### 2. Le journal de trading (CRUCIAL)
Notez pour CHAQUE trade:
- Date et heure
- Actif et direction (achat/vente)
- Raison d'entree (setup)
- Prix d'entree, stop loss, take profit
- Resultat en € et en %
- Emotions ressenties
- Lecons apprises

#### 3. Le calendrier economique
- **Investing.com**: Gratuit, complet
- **ForexFactory**: Reference Forex
- Suivez les evenements "3 taureaux" (haute importance)

---

### Les 5 regles d'or du debutant

#### Regle 1: Apprenez AVANT de trader
- Minimum 3-6 mois de formation
- Lisez au moins 3 livres de reference
- Comprenez l'analyse technique de base

#### Regle 2: Commencez en compte demo
- Tradez 3-6 mois en demo
- Traitez-le comme de l'argent reel
- Ne passez en reel que si vous etes profitable

#### Regle 3: Risquez maximum 1-2% par trade
- Avec 10,000€: risquez max 100-200€/trade
- Permet de survivre aux series de pertes
- Protege votre capital psychologique

#### Regle 4: Ayez TOUJOURS un plan
**Avant d'entrer en position, definissez:**
- Point d'entree exact
- Stop loss (ou vous coupez la perte)
- Take profit (ou vous prenez le gain)
- Taille de position

#### Regle 5: Maitrisez vos emotions
- La peur et l'avidite sont vos ennemis
- Suivez votre plan, pas vos emotions
- Faites des pauses apres les grosses pertes

---

### Erreurs fatales a eviter

| Erreur | Consequence | Solution |
|--------|-------------|----------|
| Trader sans plan | Pertes aleatoires | Plan ecrit avant chaque trade |
| Surrisquer | Compte explose | Max 1-2% par trade |
| Pas de stop loss | Perte catastrophique | TOUJOURS un stop |
| Revenge trading | Pertes en cascade | Pause apres 2 pertes |
| Levier excessif | Liquidation | Levier max x3-5 |
| FOMO | Entrees au pire moment | Attendre les setups |

---

### Exercice pratique pour debutant

**Semaine 1-2: Observer**
1. Choisissez 3 actifs a suivre (ex: AAPL, EUR/USD, BTC)
2. Regardez leurs graphiques chaque jour
3. Notez ce que vous observez (tendances, niveaux)

**Semaine 3-4: Paper trading**
1. Ouvrez un compte demo
2. Faites 1-2 trades par jour maximum
3. Tenez un journal rigoureux

**Mois 2-3: Analyser**
1. Revoyez vos 50 premiers trades
2. Identifiez vos erreurs recurrentes
3. Ameliorez votre strategie

---

### Ressources recommandees

**Livres essentiels:**
- "Trading in the Zone" - Mark Douglas (psychologie)
- "Technical Analysis of the Financial Markets" - John Murphy
- "Market Wizards" - Jack Schwager (interviews de traders)

**Chaines YouTube (FR):**
- Captain Trading
- Trader Evolution
- Zone Bourse

**Citation a retenir:**
> "Le trading n'est pas un sprint, c'est un marathon. Les 90% qui echouent sont ceux qui ont voulu aller trop vite."
""",
        "premium_only": False
    },
    {
        "id": 2,
        "category": "analyse_technique",
        "title": "Comprendre les Tendances de Marche",
        "icon": "trending-up",
        "summary": "Identifier et suivre les tendances pour trader dans le bon sens.",
        "content": """## Les Tendances de Marche - Guide Approfondi

### Qu'est-ce qu'une tendance ?
Une tendance represente la direction generale dans laquelle evolue un prix sur une periode donnee. C'est le concept le plus fondamental de l'analyse technique.

![Tendance Haussiere EMA](/education/ema-trend.svg)

**Principe de base de Dow:**
> "Une tendance est en place jusqu'a preuve du contraire"

---

### Les 3 types de tendances

#### 1. Tendance haussiere (Bull Market)
```
         HH2
        /    \\
   HH1 /      \\
  /   \\        \\  HL2
 /     HL1      \\/
/
```
- **Higher Highs (HH)**: Sommets de plus en plus hauts
- **Higher Lows (HL)**: Creux de plus en plus hauts
- **Prix > MA20 > MA50 > MA200**
- **Strategie**: Acheter sur les replis (pullbacks)

#### 2. Tendance baissiere (Bear Market)
```
\\
 \\     LH1
  \\   /\\        LH2
   \\ /  \\      /\\
    LL1   \\    /  \\
           \\/     \\
            LL2
```
- **Lower Highs (LH)**: Sommets de plus en plus bas
- **Lower Lows (LL)**: Creux de plus en plus bas
- **Prix < MA20 < MA50 < MA200**
- **Strategie**: Vendre sur les rebonds ou rester a l'ecart

#### 3. Range (Consolidation/Trading Range)
```
Resistance ═══════════════════════
           /\\    /\\    /\\
          /  \\  /  \\  /  \\
         /    \\/    \\/    \\
Support ═══════════════════════════
```
- Prix oscille entre support et resistance
- Pas de direction claire
- Volume generalement plus faible
- **Strategie**: Acheter au support, vendre a la resistance

---

### Comment identifier une tendance - Methodes detaillees

#### Methode 1: Structure des prix (la plus fiable)
**Tendance haussiere confirmee quand:**
1. Le prix fait un nouveau sommet (HH)
2. Puis un repli qui reste au-dessus du creux precedent (HL)
3. Ce pattern se repete

**Exemple concret sur Apple:**
- Janvier: Sommet a 150$
- Fevrier: Creux a 140$ (HL)
- Mars: Nouveau sommet a 165$ (HH)
- Avril: Creux a 155$ (HL > 140$) → Tendance haussiere confirmee

#### Methode 2: Moyennes mobiles
| Configuration | Signification |
|---------------|---------------|
| Prix > MA20 > MA50 > MA200 | Tendance haussiere forte |
| Prix > MA20, MA50 > MA200 | Haussiere en acceleration |
| Prix < MA20 < MA50 < MA200 | Tendance baissiere forte |
| MAs entremelees | Pas de tendance (range) |

**Golden Cross**: MA50 croise MA200 vers le haut → Signal haussier majeur
**Death Cross**: MA50 croise MA200 vers le bas → Signal baissier majeur

#### Methode 3: Indicateur ADX (Average Directional Index)
| Valeur ADX | Interpretation |
|------------|----------------|
| < 20 | Pas de tendance (range) |
| 20-25 | Tendance naissante |
| 25-50 | Tendance etablie |
| 50-75 | Tendance tres forte |
| > 75 | Tendance extreme (rare) |

**Note**: L'ADX mesure la FORCE de la tendance, pas sa direction.

---

### Les lignes de tendance - Technique de tracage

#### Regles de tracage
1. **Minimum 2 points** de contact (idealement 3+)
2. **Plus de touches = plus valide**
3. **Respecter les meches** ou les clotures (au choix, mais rester coherent)

#### Ligne de tendance haussiere
- Relier les CREUX successifs
- Agit comme support dynamique
- Pente positive

#### Ligne de tendance baissiere
- Relier les SOMMETS successifs
- Agit comme resistance dynamique
- Pente negative

**Astuce pro**: Une cassure de ligne de tendance n'est confirmee que si:
1. La bougie CLOTURE au-dela de la ligne
2. Le volume est superieur a la moyenne
3. Idealement, il y a un retest de la ligne cassee

---

### Exercices pratiques

#### Exercice 1: Identification visuelle
1. Ouvrez TradingView sur le graphique DAILY de l'EUR/USD
2. Identifiez les 5 derniers Higher Highs et Higher Lows (ou LH/LL)
3. Determinez la tendance actuelle
4. Tracez la ligne de tendance principale

#### Exercice 2: Multi-timeframe
1. Analysez le S&P 500 en Weekly, Daily, H4
2. Pour chaque timeframe, notez:
   - La tendance (haussiere/baissiere/range)
   - La position du prix vs MA20 et MA50
3. Conclusion: Y a-t-il alignement des tendances?

#### Exercice 3: Detection de changement de tendance
1. Identifiez un graphique en tendance haussiere
2. Reperez le premier signe de faiblesse (echec a faire un nouveau HH)
3. Confirmez le changement (cassure du dernier HL)

---

### Cas d'etude: Bitcoin 2020-2021

| Periode | Structure | Tendance |
|---------|-----------|----------|
| Mars 2020 | Crash de 10k$ a 4k$ | Baissiere violente |
| Avril-Oct 2020 | HL successifs, HH | Haussiere |
| Oct-Nov 2020 | Cassure des 10k$, 12k$, 14k$ | Haussiere acceleree |
| Avril 2021 | ATH 64k$, echec a tenir | Sommet potentiel |
| Mai-Juillet 2021 | LH + LL = cassure 30k$ | Baissiere |
| Aout-Nov 2021 | Nouveaux HH vers 69k$ | Reprise haussiere |

**Lecon**: Les tendances peuvent durer des mois, voire des annees. Patience!

---

### Regles d'or pour trader les tendances

1. **"Trend is your friend until the end"**
   - Ne jamais shorter un marche en tendance haussiere forte
   - Ne jamais acheter un marche en tendance baissiere forte

2. **Entrer sur les pullbacks**
   - Attendez que le prix revienne vers la MA20 ou la ligne de tendance
   - Plus sur: entrer quand le pullback est termine (bougie de confirmation)

3. **Confirmer avec le volume**
   - Impulsions avec volume croissant = tendance saine
   - Impulsions avec volume decroissant = tendance qui s'essouffle

4. **Multi-timeframe alignment**
   - Trade en H4? La tendance Daily doit etre dans le meme sens
   - Alignement = probabilites plus elevees

---

### Pieges courants a eviter

| Piege | Probleme | Solution |
|-------|----------|----------|
| Trader contre la tendance | Pertes repetees | "Trend is your friend" |
| Appeler les tops/bottoms | Etre ecrase par la tendance | Attendre la confirmation |
| Ignorer le contexte macro | Tendance court terme vs long terme | Analyser en multi-TF |
| Lignes de tendance forcees | Signaux peu fiables | Minimum 3 touches claires |

---

### Citation de trader pro
> "Je ne suis pas assez intelligent pour savoir quand le marche va se retourner. Alors je suis simplement la tendance jusqu'a ce qu'elle me dise qu'elle est terminee." - Ed Seykota
""",
        "premium_only": True
    },
    {
        "id": 3,
        "category": "analyse_technique",
        "title": "Supports et Resistances",
        "icon": "minus",
        "summary": "Les niveaux cles ou le prix reagit et rebondit.",
        "content": """## Supports et Resistances - Guide Complet

### Definitions fondamentales

**Support**: Zone de prix ou la DEMANDE (acheteurs) est suffisamment forte pour empecher le prix de baisser davantage.

**Resistance**: Zone de prix ou l'OFFRE (vendeurs) est suffisamment forte pour empecher le prix de monter davantage.

![Supports et Resistances](/education/support-resistance.svg)

---

### Pourquoi ces niveaux fonctionnent - La psychologie

#### 1. Memoire du marche
Les traders se souviennent des niveaux importants:
- "J'ai rate l'achat a 50$, la prochaine fois j'achete"
- "J'ai vendu trop tot a 100$, cette fois je tiens"

#### 2. Ordres en attente
Des milliers d'ordres sont empiles a ces niveaux:
- Stop losses
- Take profits
- Ordres limites d'achat/vente

#### 3. Institutionnels
Les gros fonds placent des ordres massifs:
- Defendent leurs positions
- Accumulent ou distribuent

---

### Comment identifier les niveaux cles

#### Methode 1: Sommets et creux precedents (la plus fiable)
Identifiez les points ou le prix a rebondi dans le passe:

**Exemple sur Tesla:**
| Niveau | Type | Nombre de tests | Force |
|--------|------|-----------------|-------|
| 250$ | Resistance | 4 tests | Fort |
| 200$ | Support/Resistance | 6 tests | Tres fort |
| 180$ | Support | 3 tests | Moyen |
| 150$ | Support majeur | 2 tests | Fort (bas historique) |

#### Methode 2: Niveaux psychologiques (ronds)
| Actif | Niveaux ronds importants |
|-------|-------------------------|
| Actions | 10$, 50$, 100$, 500$, 1000$ |
| EUR/USD | 1.0000, 1.1000, 1.2000 |
| Bitcoin | 10k, 20k, 30k, 50k, 100k |
| Indices | 10,000, 15,000, 20,000 pts |

**Pourquoi?** Les humains pensent en chiffres ronds. Les ordres s'accumulent.

#### Methode 3: Moyennes mobiles dynamiques
| MA | Role typique |
|----|--------------|
| MA20 | Support/Resistance court terme |
| MA50 | Support/Resistance moyen terme |
| MA100 | Niveau institutionnel |
| MA200 | Support/Resistance majeur long terme |

**Exemple**: Quand Apple touche sa MA200 Daily, il y a souvent un rebond.

#### Methode 4: Zones de volume (VPVR)
Le Volume Profile montre ou le plus de volume a ete echange:
- **Point of Control (POC)**: Zone de prix avec le plus de volume
- **Value Area High/Low**: Limites de la zone de valeur (70% du volume)

---

### La regle de la polarite - Concept crucial

> Quand un support est casse, il devient resistance. Quand une resistance est cassee, elle devient support.

**Exemple illustre:**
```
Prix
 ↑
    ══════════════  (4) Nouveau support (ancienne resistance)
               /
              / ← (3) Cassure vers le haut
    ══════════════  (2) Devient Resistance
      ↓↑↓↑↓↑        (1) Etait Support
```

**Cas reel - Apple a 150$:**
1. Janvier: 150$ = Resistance (le prix rebondit dessous)
2. Fevrier: Cassure au-dessus de 150$
3. Mars: Retour vers 150$, rebond = Support
4. Le niveau a "change de polarite"

---

### Evaluer la force d'un niveau

| Critere | Impact sur la force |
|---------|-------------------|
| Nombre de tests | Plus de tests = Plus fort |
| Timeframe | Weekly > Daily > H4 > H1 |
| Volume associe | Fort volume = Plus significatif |
| Age du niveau | Recurrent depuis longtemps = Plus fort |
| Reaction du prix | Rejet violent = Plus fort |

**Echelle de force:**
- ⭐ Faible: 1-2 tests, petit timeframe
- ⭐⭐ Moyen: 2-3 tests, timeframe H4/Daily
- ⭐⭐⭐ Fort: 3-5 tests, Daily
- ⭐⭐⭐⭐ Tres fort: 5+ tests, Weekly, niveau historique

---

### Strategies de trading detaillees

#### Strategie 1: Trading de rebond (Range)

**Setup d'achat sur support:**
```
1. Le prix descend vers le support
2. Attendre un signe de rejet:
   - Bougie avec grande meche basse
   - Pattern de retournement (marteau, engloutissante)
3. ENTREE: Sur cloture de confirmation ou cassure du haut de la bougie
4. STOP LOSS: Sous le plus bas recent (sous le support + marge)
5. TAKE PROFIT: Vers la prochaine resistance

Risque: 1R, Objectif: 2R minimum
```

**Exemple concret:**
- Support identifie: 100$
- Le prix descend a 100.50$, forme un marteau
- Entree: 101$ (au-dessus du marteau)
- Stop: 99$ (sous le support)
- TP: 106$ (prochaine resistance)
- Ratio: 5$/2$ = 2.5R ✓

#### Strategie 2: Trading de cassure (Breakout)

**Setup de cassure de resistance:**
```
1. Le prix approche la resistance plusieurs fois
2. Attendre la cassure:
   - Cloture AU-DESSUS du niveau
   - Volume superieur a la moyenne
3. OPTION A: Entrer sur cassure directe (plus agressif)
   OPTION B: Attendre le retest du niveau (plus conservateur)
4. STOP LOSS: Sous le niveau casse
5. TAKE PROFIT: Extension du mouvement (report de range ou Fib)
```

**Filtres pour eviter les fausses cassures:**
- Volume > 1.5x la moyenne
- RSI pas en zone extreme
- Cassure en debut de session (pas en fin)
- Contexte de tendance favorable

---

### Zones vs Prix exact

**IMPORTANT**: Les S/R sont des ZONES, pas des lignes exactes!

```
Resistance ZONE ════════════════════════
                    ↕ 1-3% de marge
                    Le prix peut depasser legerement
Prix actuel         ────────────────────

                    ↕ 1-3% de marge
Support ZONE    ════════════════════════
```

**Pourquoi des zones?**
- Les ordres sont repartis sur plusieurs prix
- Le slippage existe
- Les fausses cassures sont frequentes

---

### Exercices pratiques

#### Exercice 1: Identification de niveaux
1. Ouvrez le graphique DAILY de Microsoft (MSFT)
2. Identifiez les 5 niveaux de S/R les plus importants
3. Classez-les par force (nombre de tests, volume)
4. Notez quels niveaux ont change de polarite

#### Exercice 2: Plan de trade
1. Identifiez un actif en range entre S et R clairs
2. Calculez:
   - Prix d'entree (proche du support)
   - Stop loss (sous le support)
   - Take profit (proche de la resistance)
   - Ratio Risk/Reward
3. Definissez les conditions de validation

#### Exercice 3: Analyse de cassure
1. Trouvez une cassure recente (Daily)
2. Verifiez si:
   - Le volume etait eleve
   - Il y a eu un retest
   - Le mouvement a continue
3. Evaluez si c'etait une vraie ou fausse cassure

---

### Erreurs frequentes et solutions

| Erreur | Solution |
|--------|----------|
| Tracer des niveaux partout | Se limiter aux 3-5 niveaux les plus clairs |
| Ignorer le contexte de tendance | En tendance, les S/R sont moins fiables |
| Entrer sans confirmation | Toujours attendre un signal (bougie, pattern) |
| Mettre le stop trop serre | Laisser de la marge pour le bruit |
| Ignorer le volume | Volume = validation de la cassure |

---

### Pro tip: Confluence

Un niveau est d'autant plus fort s'il combine:
- Support horizontal + MA200
- Resistance + Fibonacci 61.8%
- Point pivot + niveau psychologique

**Plus de confluence = Plus de probabilite de reaction**
""",
        "premium_only": True
    },
    {
        "id": 4,
        "category": "analyse_technique",
        "title": "Maitriser les Moyennes Mobiles",
        "icon": "chart-line",
        "summary": "Les moyennes mobiles sont des indicateurs essentiels pour identifier les tendances.",
        "content": """## Les Moyennes Mobiles - Guide Expert

### Qu'est-ce qu'une moyenne mobile ?
Une moyenne mobile (MA) est un indicateur technique qui lisse les fluctuations de prix en calculant le prix moyen sur une periode donnee. Elle filtre le "bruit" pour reveler la tendance sous-jacente.

**Visualisation:**
```
Prix reel:    /\\/\\ /\\ /\\/\\  /\\  /\\
                 \\/ \\/ \\/\\/ \\/ \\/

MA lisse:    ___---____----___----
             Filtre les variations
```

---

### Types de moyennes mobiles en detail

#### 1. SMA - Simple Moving Average
**Formule:** SMA = (P1 + P2 + ... + Pn) / n

**Exemple SMA(5):**
| Jour | Prix | Calcul SMA(5) |
|------|------|---------------|
| Lun | 100 | - |
| Mar | 102 | - |
| Mer | 101 | - |
| Jeu | 103 | - |
| Ven | 104 | (100+102+101+103+104)/5 = 102 |
| Lun | 106 | (102+101+103+104+106)/5 = 103.2 |

**Avantages:**
- Simple a comprendre
- Stable et moins de faux signaux

**Inconvenients:**
- Reagit lentement aux changements
- Donne le meme poids aux anciens prix

#### 2. EMA - Exponential Moving Average
**Formule:** EMA = Prix × k + EMA(hier) × (1-k), ou k = 2/(n+1)

**Caracteristiques:**
- Donne PLUS de poids aux prix recents
- Reagit plus vite aux changements
- Ideale pour le day trading

| EMA | Multiplicateur k |
|-----|------------------|
| EMA(10) | 18.18% |
| EMA(20) | 9.52% |
| EMA(50) | 3.92% |
| EMA(200) | 1.00% |

#### 3. WMA - Weighted Moving Average
Pondere lineairement: le prix le plus recent a le poids le plus eleve.
- Moins utilisee que SMA et EMA
- Reaction intermediaire

**Comparaison pratique:**
| Situation | Meilleur choix |
|-----------|---------------|
| Tendance forte | EMA (suit mieux) |
| Marche volatile | SMA (filtre mieux) |
| Swing trading | SMA |
| Day trading | EMA |

---

### Les periodes les plus utilisees

| Periode | Usage | Timeframe typique |
|---------|-------|-------------------|
| MA 9/10 | Tres court terme | M15, H1 |
| MA 20/21 | Court terme | H1, H4 |
| MA 50 | Moyen terme | H4, Daily |
| MA 100 | Moyen-long terme | Daily |
| MA 200 | Long terme (institutionnelle) | Daily, Weekly |

**Configuration pro courante:**
- EMA 9 + EMA 21 + EMA 50 (day trading)
- SMA 20 + SMA 50 + SMA 200 (swing trading)

---

### Strategies de trading avec les MAs

#### Strategie 1: Croisement de moyennes (MA Cross)

```
         MA courte (rapide)
              \\    /
               \\  /  ← GOLDEN CROSS = ACHAT
                \\/
                /\\
               /  \\  ← DEATH CROSS = VENTE
              /    \\
         MA longue (lente)
```

**Setup classique EMA 9/21:**
| Signal | Condition | Action |
|--------|-----------|--------|
| Achat | EMA9 croise EMA21 vers le haut | Entree longue |
| Vente | EMA9 croise EMA21 vers le bas | Sortie/Short |

**Filtres pour ameliorer:**
1. Confirmer avec la tendance generale (MA200)
2. Attendre la cloture de bougie
3. Verifier le volume

#### Strategie 2: MA comme Support/Resistance dynamique

**En tendance haussiere:**
```
Prix
 |         /\\
 |        /  \\    /\\
 |       /    \\  /  \\
 |      / ←rebounds sur MA20
 |  MA20‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾
 |__________________________
```

**Setup de pullback:**
1. Tendance haussiere confirmee (prix > MA20 > MA50)
2. Le prix recule vers la MA20
3. Attendre un signal de rejet (bougie, pattern)
4. Entrer long, stop sous la MA20
5. TP: nouveau sommet ou ratio 2:1

#### Strategie 3: Golden Cross / Death Cross

**Golden Cross:** MA50 croise MA200 vers le haut
- Signal BULLISH de long terme
- Utilisee par les institutionnels
- Fiable sur Daily/Weekly

**Death Cross:** MA50 croise MA200 vers le bas
- Signal BEARISH de long terme
- Peut signaler un bear market
- Confirmation de tendance baissiere

**Statistiques historiques (S&P 500):**
- Golden Cross: +10% en moyenne dans les 12 mois suivants
- Death Cross: Variable, parfois deja trop tard

---

### Exercices pratiques

#### Exercice 1: Configuration de base
1. Ouvrez TradingView
2. Ajoutez: SMA 20 (bleu), SMA 50 (orange), SMA 200 (rouge)
3. Sur EUR/USD Daily, identifiez:
   - Le dernier Golden/Death Cross
   - Les rebonds sur MA20 et MA50

#### Exercice 2: Backtest manuel
1. Choisissez une action (ex: Apple)
2. Strategie: Achat quand EMA9 croise EMA21
3. Parcourez les 6 derniers mois
4. Notez chaque signal et son resultat
5. Calculez le taux de reussite

#### Exercice 3: Comparaison SMA vs EMA
1. Affichez SMA 20 et EMA 20 sur le meme graphique
2. Observez les differences lors de mouvements brusques
3. Notez laquelle reagit plus vite
4. Decidez laquelle vous preferez

---

### Cas d'etude: Bitcoin 2020-2021

| Date | Evenement | Configuration MA |
|------|-----------|------------------|
| Mars 2020 | Crash COVID | Death Cross (MA50 < MA200) |
| Mai 2020 | Debut reprise | Prix repasse > MA200 |
| Aout 2020 | Golden Cross | MA50 croise MA200 (haussier) |
| Nov 2020 | Bull run | Prix tres au-dessus des MAs |
| Mai 2021 | Correction | Prix casse MA50, puis MA200 |
| Aout 2021 | Reprise | Rebond sur MA200, Golden Cross |

**Lecon**: Les MAs ont bien signale les grandes tendances du BTC.

---

### Erreurs a eviter

| Erreur | Pourquoi c'est mauvais | Solution |
|--------|----------------------|----------|
| Trop de MAs | Confusion, signaux contradictoires | Max 3 MAs |
| Changer souvent de periodes | Pas de coherence | Testez et gardez |
| Ignorer le contexte | MAs ne fonctionnent pas en range | Confirmer avec la tendance |
| Entrer avant cloture | Faux signaux frequents | Attendre la cloture |

---

### Pro tips

1. **Les institutionnels regardent la MA200 Daily**
   - Quand le S&P touche sa MA200, surveillez!

2. **Le "retour a la moyenne"**
   - Un prix trop eloigne de sa MA20 tend a y revenir

3. **L'alignement parfait**
   - Prix > MA20 > MA50 > MA200 = Force maximale

4. **MAs plates = Range**
   - Des MAs horizontales signalent l'absence de tendance

**Citation:**
> "Les moyennes mobiles ne predisent pas l'avenir, elles montrent simplement ce qui s'est passe. Mais savoir ou on est est crucial pour savoir ou on va."
""",
        "premium_only": True
    },
    {
        "id": 5,
        "category": "analyse_technique",
        "title": "Le RSI et ses secrets",
        "icon": "activity",
        "summary": "Comment utiliser le RSI au-dela des zones de surachat/survente classiques.",
        "content": """## Le RSI (Relative Strength Index) - Guide Expert

### Comprendre le RSI en profondeur

Le RSI (Indice de Force Relative) mesure la vitesse et l'amplitude des mouvements de prix recents pour evaluer si un actif est suracheté ou survendu.

![Zones RSI](/education/rsi-zones.svg)

**Formule:**
```
RSI = 100 - (100 / (1 + RS))
ou RS = Moyenne des gains / Moyenne des pertes (sur n periodes)
```

**Parametres standards:**
- Periode: 14 (defaut de Wilder, le createur)
- Alternatives: 9 (plus sensible), 21 (plus lisse)

---

### Les niveaux traditionnels - Et leurs limites

| Zone | RSI | Interpretation classique |
|------|-----|--------------------------|
| Surachat | > 70 | "Trop cher", potentiel de baisse |
| Neutre | 30-70 | Zone d'equilibre |
| Survente | < 30 | "Trop pas cher", potentiel de hausse |

**ATTENTION - Les pieges des niveaux 30/70:**

En TENDANCE HAUSSIERE forte:
- Le RSI peut rester > 70 pendant des semaines
- Vendre juste parce que RSI > 70 = pertes garanties
- Mieux: utiliser 80 comme niveau en bull market

En TENDANCE BAISSIERE forte:
- Le RSI peut rester < 30 tres longtemps
- Acheter juste parce que RSI < 30 = attraper un couteau
- Mieux: utiliser 20 comme niveau en bear market

**Ajustement selon la tendance:**
| Contexte | Zone surachat | Zone survente |
|----------|---------------|---------------|
| Bull market | 80-90 | 40-50 |
| Bear market | 50-60 | 10-20 |
| Range | 70 | 30 |

---

### Technique avancee 1: Les Divergences

Les divergences sont les signaux RSI les PLUS FIABLES. Elles precedent souvent les retournements.

![Divergence RSI](/education/rsi-divergence.svg)

#### Divergence Haussiere (Bullish Divergence)
**Le prix fait un nouveau bas, mais le RSI fait un bas plus haut.**
- La pression vendeuse s'affaiblit
- Signal d'achat potentiel
- Retournement haussier probable!

#### Divergence Baissiere (Bearish Divergence)
**Le prix fait un nouveau haut, mais le RSI fait un haut plus bas.**
- La pression acheteuse s'affaiblit
- Signal de vente potentiel
- Correction baissiere probable!

#### Divergence Cachee (Hidden Divergence)
- Confirme la CONTINUATION de tendance
- **Hidden bullish**: Prix fait un HL, RSI fait un LL → Achat
- **Hidden bearish**: Prix fait un LH, RSI fait un HH → Vente

---

### Technique avancee 2: Failure Swings

Les failure swings sont des patterns RSI independants du prix.

#### Bullish Failure Swing
```
RSI
 70|
   |
 50|     /\\    /\\
   |    /  \\  /  \\
 30|====/====\\/====\\===== (pas besoin de passer sous 30)
   |       ^     ^
         Point  Point de rupture = ACHAT
         bas    (cassure du sommet intermediaire)
```

#### Bearish Failure Swing
```
RSI
 70|====/====\\/====\\=====
   |   /  \\  /  \\
 50|  /    \\/    \\
   |             ^
               Point de rupture = VENTE
```

---

### Technique avancee 3: RSI comme Support/Resistance

Le RSI forme ses propres niveaux de S/R!

**Exemple:**
- Le RSI rebondit plusieurs fois sur 40 → Support RSI a 40
- Cassure sous 40 → Signal baissier

**Application pratique:**
1. Tracez des lignes de tendance sur le RSI lui-meme
2. La cassure d'une ligne de tendance RSI precede souvent la cassure du prix

---

### Strategies completes avec le RSI

#### Strategie 1: RSI + Tendance (la plus fiable)

**Setup d'achat:**
1. Tendance haussiere confirmee (prix > MA50)
2. RSI revient vers 40-50 (pas besoin de 30)
3. RSI rebondit et repasse > 50
4. ENTREE sur signal de prix (bougie de confirmation)
5. STOP sous le dernier creux
6. TP: ratio 2:1 ou resistance

**Setup de vente:**
1. Tendance baissiere confirmee (prix < MA50)
2. RSI monte vers 50-60 (pas besoin de 70)
3. RSI rejete et repasse < 50
4. ENTREE sur signal de prix
5. STOP au-dessus du dernier sommet
6. TP: ratio 2:1 ou support

#### Strategie 2: Trading de divergence

**Checklist divergence haussiere:**
☐ Tendance baissiere precedente
☐ Prix fait un nouveau bas
☐ RSI fait un bas plus haut
☐ RSI repasse au-dessus de 30 ou du niveau neutre
☐ Confirmation par une bougie haussiere

**Exemple concret:**
| Element | Valeur |
|---------|--------|
| Actif | EUR/USD H4 |
| Bas de prix 1 | 1.0850 (RSI: 25) |
| Bas de prix 2 | 1.0820 (RSI: 32) |
| Divergence | ✓ Prix plus bas, RSI plus haut |
| Entree | 1.0880 (sur bougie engloutissante) |
| Stop | 1.0800 (80 pips) |
| TP | 1.1040 (160 pips, ratio 2:1) |

---

### Exercices pratiques

#### Exercice 1: Reperage de divergences
1. Ouvrez Bitcoin Daily sur les 6 derniers mois
2. Ajoutez le RSI (14)
3. Identifiez TOUTES les divergences (haussieres et baissieres)
4. Verifiez si elles ont ete suivies d'un mouvement

#### Exercice 2: Multi-timeframe RSI
1. Regardez le meme actif en Daily et H4
2. Notez le RSI sur chaque timeframe
3. Quand les deux sont < 30, c'est plus significatif
4. Testez cette confluence sur 10 exemples

#### Exercice 3: Backtest strategie RSI
1. Strategie: Achat quand RSI(14) < 30 + bougie haussiere
2. Testez sur 50 trades (paper trading)
3. Calculez: % gagnants, gain moyen vs perte moyenne
4. Ameliorez avec des filtres (tendance, volume)

---

### Erreurs frequentes et solutions

| Erreur | Pourquoi c'est mauvais | Solution |
|--------|----------------------|----------|
| Acheter a RSI 30 en downtrend | Le RSI peut rester bas longtemps | Confirmer avec la tendance |
| Vendre a RSI 70 en uptrend | Manquer tout le rally | Ajuster les seuils (80/20) |
| Ignorer les divergences | Rater les meilleurs signaux | Les chercher activement |
| RSI seul | Beaucoup de faux signaux | Toujours confirmer |

---

### Configuration recommandee

**Pour debutant:**
- RSI 14, niveaux 30/70
- Focus sur les divergences

**Pour intermediaire:**
- RSI 14 + RSI 9 (double confirmation)
- Ajuster les niveaux selon la tendance
- Tracer les lignes de tendance sur RSI

**Pour avance:**
- Multi-timeframe RSI
- Combiner avec le volume
- Failure swings systematiques

**Citation:**
> "Le RSI est un thermometre, pas une boule de cristal. Il vous dit la temperature du marche, pas ce qu'il fera demain." - J. Welles Wilder
""",
        "premium_only": True
    },
    {
        "id": 6,
        "category": "analyse_technique",
        "title": "Le MACD Explique",
        "icon": "activity",
        "summary": "Comprendre et utiliser le MACD pour detecter les changements de tendance.",
        "content": """## Le MACD (Moving Average Convergence Divergence) - Guide Expert

### Qu'est-ce que le MACD ?
Le MACD est un indicateur de momentum tendanciel cree par Gerald Appel en 1979. Il montre la relation entre deux moyennes mobiles exponentielles et aide a identifier les changements de tendance.

![Signaux MACD](/education/macd-signals.svg)

---

### Anatomie du MACD

#### Les 3 composants:

| Composant | Calcul | Role |
|-----------|--------|------|
| Ligne MACD | EMA(12) - EMA(26) | Mesure la convergence/divergence |
| Ligne Signal | EMA(9) de la ligne MACD | Lisse le MACD pour les signaux |
| Histogramme | MACD - Signal | Visualise la force du momentum |

---

### Configuration standard et alternatives

**Parametres par defaut (12, 26, 9):**
- Cree pour les marches journaliers
- Equilibre entre sensibilite et fiabilite

**Configurations alternatives:**
| Usage | Parametres | Caracteristiques |
|-------|-----------|-----------------|
| Scalping | (5, 13, 6) | Plus reactif |
| Day Trading | (8, 17, 9) | Bon compromis |
| Swing Trading | (12, 26, 9) | Standard |
| Long terme | (19, 39, 9) | Moins de signaux, plus fiables |

---

### Les signaux du MACD en detail

#### Signal 1: Croisement MACD/Signal

**Croisement haussier (Bullish Cross):**
```
       Ligne MACD
          \\    /
           \\  /
            \\/  ← ACHAT: MACD croise Signal vers le haut
            /\\
           /  \\
       Ligne Signal
```

**Croisement baissier (Bearish Cross):**
```
       Ligne Signal
          \\    /
           \\  /
            \\/  ← VENTE: MACD croise Signal vers le bas
            /\\
           /  \\
       Ligne MACD
```

**Fiabilite:** Moderee (nombreux faux signaux en range)

#### Signal 2: Croisement de la ligne zero

**Plus significatif que le croisement MACD/Signal!**

| MACD passe... | Signification |
|---------------|---------------|
| Au-dessus de 0 | EMA12 > EMA26 = Momentum haussier |
| En-dessous de 0 | EMA12 < EMA26 = Momentum baissier |

**Strategie:** Prendre des positions longues uniquement quand MACD > 0

#### Signal 3: L'histogramme

L'histogramme est PREDICTIF - il change AVANT le croisement!

```
Histogramme croissant (momentum accelere):
     |||
    ||| |||
   ||| ||| |||
═══════════════

Histogramme decroissant (momentum ralentit):
   ||| ||| |||
    ||| |||
     |||
═══════════════
```

**Lecture avancee:**
- Barres vertes croissantes → Force acheteuse augmente
- Barres vertes decroissantes → Acheteurs faiblissent (attention!)
- Barres rouges croissantes → Force vendeuse augmente
- Barres rouges decroissantes → Vendeurs faiblissent

---

### Les divergences MACD (signaux les plus fiables)

#### Divergence haussiere
```
PRIX:   \\  Nouveau
         \\ plus bas
          \\___

MACD:   \\  Bas plus
         \\___ HAUT
             /
            /  = SIGNAL D'ACHAT FORT
```

**Checklist:**
☐ Tendance baissiere precedente
☐ Prix fait un nouveau plus bas
☐ MACD fait un bas plus haut (ne confirme pas)
☐ L'histogramme passe du negatif au positif
☐ Bougie de confirmation

#### Divergence baissiere
```
PRIX:       /\\  Nouveau
           /  \\ plus haut
          /

MACD:     /\\  Haut plus
         /  \\ BAS
              = SIGNAL DE VENTE FORT
```

**Exemple reel (Bitcoin novembre 2021):**
| Element | Observation |
|---------|-------------|
| Prix | Nouveau ATH a 69,000$ |
| MACD | Sommets decroissants depuis 63,000$ |
| Divergence | Baissiere confirmee |
| Resultat | Chute vers 35,000$ en 2 mois |

---

### Strategie complete: MACD + Tendance

#### Strategie d'achat
```
CONDITIONS:
1. Prix au-dessus de la MA50 (tendance haussiere)
2. MACD sous la ligne zero (repli dans la tendance)
3. Croisement haussier MACD/Signal OU
   Histogramme passe de negatif a positif

ENTREE: Sur signal de prix (bougie de confirmation)
STOP: Sous le dernier creux ou 1.5x ATR
TP: 2x le risque OU prochain niveau de resistance
```

#### Strategie de vente/short
```
CONDITIONS:
1. Prix en-dessous de la MA50 (tendance baissiere)
2. MACD au-dessus de la ligne zero (rebond dans la tendance)
3. Croisement baissier MACD/Signal OU
   Histogramme passe de positif a negatif

ENTREE: Sur signal de prix
STOP: Au-dessus du dernier sommet
TP: 2x le risque OU prochain support
```

---

### Exercices pratiques

#### Exercice 1: Identification des signaux
1. Ouvrez Apple (AAPL) en Daily sur 1 an
2. Ajoutez le MACD (12, 26, 9)
3. Comptez tous les croisements MACD/Signal
4. Pour chaque croisement, notez si le trade aurait ete gagnant ou perdant
5. Calculez le taux de reussite

#### Exercice 2: Divergences
1. Meme graphique Apple
2. Identifiez TOUTES les divergences (haussieres et baissieres)
3. Verifiez leur fiabilite (retournement oui/non)
4. Conclusion: Les divergences sont-elles plus fiables que les croisements?

#### Exercice 3: Histogramme predictif
1. Observez l'histogramme attentivement
2. Notez quand l'histogramme commence a diminuer
3. Observez si cela precede le croisement
4. Utilisez l'histogramme pour anticiper

---

### MACD + autres indicateurs (Confluence)

| Combinaison | Usage | Pourquoi ca marche |
|-------------|-------|-------------------|
| MACD + RSI | Confirmation | RSI survente + MACD bullish = signal fort |
| MACD + MA200 | Filtrage | Trade uniquement dans le sens de la MA200 |
| MACD + Volume | Validation | Volume eleve confirme le signal |
| MACD + S/R | Timing | Signal pres d'un niveau = meilleur R/R |

**Exemple de confluence:**
- Prix au-dessus de MA200 ✓
- RSI revient a 40 et rebondit ✓
- MACD croise a la hausse ✓
- Volume superieur a la moyenne ✓
→ Signal d'achat a HAUTE PROBABILITE

---

### Erreurs courantes et solutions

| Erreur | Consequence | Solution |
|--------|-------------|----------|
| Trader tous les croisements | Nombreux faux signaux | Filtrer avec la tendance |
| Ignorer l'histogramme | Entrees tardives | Surveiller les changements d'histogramme |
| MACD seul | Pertes en range | Combiner avec S/R ou volume |
| Parametres trop sensibles | Overtrading | Utiliser 12, 26, 9 minimum |

---

### Configuration recommandee par niveau

**Debutant:**
- MACD standard (12, 26, 9)
- Focus sur les croisements + ligne zero
- Confirmer avec MA50/MA200

**Intermediaire:**
- Ajouter l'analyse de l'histogramme
- Chercher les divergences
- Multi-timeframe (Daily + H4)

**Avance:**
- MACD multiple (12,26,9 + 5,13,6)
- Integration complete avec volume et RSI
- Divergences cachees

**Citation de Gerald Appel (createur du MACD):**
> "Le MACD est comme un radar - il vous montre la direction et la vitesse. Mais c'est vous qui pilotez."
""",
        "premium_only": True
    },
    {
        "id": 7,
        "category": "gestion_risque",
        "title": "Gestion du Risque: Les Fondamentaux",
        "icon": "shield",
        "summary": "La gestion du risque est LA competence la plus importante d'un trader.",
        "content": """## La Gestion du Risque - Competence #1 du Trader

### Pourquoi la gestion du risque est CRUCIALE

> "Les traders amateurs se concentrent sur les gains. Les pros se concentrent sur les risques."

**Statistique choc:**
- 90% des traders perdent de l'argent
- La cause principale? Mauvaise gestion du risque
- Un bon trader peut avoir 40% de trades gagnants et etre profitable

---

### La regle d'or: 1-2% maximum par trade

**Le principe:** Ne jamais risquer plus de 1-2% de votre capital sur un seul trade.

| Capital | Risque 1% | Risque 2% |
|---------|-----------|-----------|
| 1,000€ | 10€ | 20€ |
| 5,000€ | 50€ | 100€ |
| 10,000€ | 100€ | 200€ |
| 50,000€ | 500€ | 1,000€ |

**Pourquoi ca marche:**

Avec un risque de 2% par trade:
- 10 pertes consecutives = -18% (pas -100%!)
- 20 pertes consecutives = -33%
- Vous survivez pour trader un autre jour

Avec un risque de 10% par trade:
- 10 pertes consecutives = -65%
- 20 pertes consecutives = -87%
- Compte potentiellement detruit

---

### Calcul de la taille de position - Etape par etape

**La formule:**
```
Taille de position = Risque en € / Risque par unite

Ou:
Risque en € = Capital x % de risque
Risque par unite = Prix d'entree - Prix du stop loss
```

#### Exemple detaille #1: Action Apple

| Donnee | Valeur |
|--------|--------|
| Capital | 10,000€ |
| Risque par trade | 1% = 100€ |
| Prix d'entree | 175$ |
| Stop loss | 170$ |
| Risque par action | 175 - 170 = 5$ |

**Calcul:**
```
Taille = 100€ / 5$ = 20 actions
Valeur totale de la position = 20 x 175$ = 3,500$
```

#### Exemple detaille #2: Forex EUR/USD

| Donnee | Valeur |
|--------|--------|
| Capital | 5,000€ |
| Risque par trade | 2% = 100€ |
| Entree | 1.0850 |
| Stop loss | 1.0800 |
| Risque en pips | 50 pips |
| Valeur du pip (mini lot) | 1$ |

**Calcul:**
```
Risque en $ = 50 pips x 1$/pip = 50$ par mini lot
Nombre de mini lots = 100€ / 50$ = 2 mini lots
Position totale = 20,000 unites
```

---

### Le ratio Risk/Reward (R:R)

**Definition:**
Combien vous pouvez gagner pour chaque euro risque.

| Ratio R:R | Signification |
|-----------|---------------|
| 1:1 | Risquer 100€ pour gagner 100€ |
| 1:2 | Risquer 100€ pour gagner 200€ |
| 1:3 | Risquer 100€ pour gagner 300€ |

**L'impact du ratio sur la profitabilite:**

| Ratio R:R | % Trades gagnants requis | Resultat sur 100 trades |
|-----------|-------------------------|------------------------|
| 1:1 | 51%+ pour etre profitable | 51W x 100€ = 5100€, 49L x 100€ = -4900€ → +200€ |
| 1:2 | 34%+ pour etre profitable | 34W x 200€ = 6800€, 66L x 100€ = -6600€ → +200€ |
| 1:3 | 26%+ pour etre profitable | 26W x 300€ = 7800€, 74L x 100€ = -7400€ → +400€ |

**Conclusion:** Avec un ratio 1:3, vous pouvez perdre 74% de vos trades et rester profitable!

---

### Les types de Stop Loss

#### 1. Stop Loss fixe (basique)
- Niveau de prix predetermine
- Ne bouge pas pendant le trade
- **Avantage:** Simple
- **Inconvenient:** Ne protege pas les gains

#### 2. Stop Loss base sur les niveaux techniques
- Place sous un support ou au-dessus d'une resistance
- Plus logique du point de vue du marche
- **Meilleur choix pour la plupart des traders**

#### 3. Stop Loss ATR (volatilite)
- Base sur l'Average True Range
- S'adapte a la volatilite de l'actif
- **Formule:** Stop = Prix - (1.5 a 2 x ATR)

**Exemple ATR:**
| Actif | ATR(14) | Stop recommande |
|-------|---------|-----------------|
| Apple | 3.50$ | 5.25$ - 7.00$ sous l'entree |
| Bitcoin | 1,500$ | 2,250$ - 3,000$ sous l'entree |

#### 4. Stop Trailing (suiveur)
- Suit le prix a distance fixe
- Protege les gains
- **Quand utiliser:** Quand le trade est en profit

```
Prix monte:  100 → 105 → 110 → 115 → 112 (Stop touche)
Stop suit:    95 → 100 → 105 → 110 → 110 (fige)
                                      |
                                   Sortie a 110 (profit!)
```

#### 5. Stop mental - A EVITER!
- Pas de stop dans le marche, juste "dans votre tete"
- **Probleme:** Vous ne le respecterez pas sous pression
- **Resultat:** Pertes catastrophiques

---

### Regles essentielles de gestion du risque

#### Regle 1: Placez TOUJOURS votre stop AVANT d'entrer
- Determinez votre stop loss avant meme de cliquer "Acheter"
- Calculez votre taille en fonction
- Pas de stop = Pas de trade

#### Regle 2: Ne deplacez JAMAIS votre stop dans le mauvais sens
- Si votre stop est a 95€, ne le descendez pas a 90€
- Vous ne faites qu'augmenter votre risque
- **Exception:** Le deplacer dans le BON sens (trailing)

#### Regle 3: Diversifiez vos positions
- Ne mettez pas tout sur un seul actif
- Correlation: Evitez d'avoir trop de positions correlees
- **Ex:** Long sur Apple + Long sur Microsoft = Risque Tech double

#### Regle 4: Limitez votre risque total
- Max 5-6% de risque total sur le portefeuille
- **Exemple:** 3 positions ouvertes x 2% = 6% de risque max

---

### Exercices pratiques

#### Exercice 1: Calcul de position
Calculez la taille de position pour chaque scenario:

| # | Capital | % Risque | Entree | Stop | Taille? |
|---|---------|----------|--------|------|---------|
| 1 | 10,000€ | 1% | 50€ | 48€ | ? |
| 2 | 5,000€ | 2% | 200€ | 190€ | ? |
| 3 | 20,000€ | 1.5% | 100€ | 95€ | ? |

**Reponses:**
1. 100€ / 2€ = 50 actions
2. 100€ / 10€ = 10 actions
3. 300€ / 5€ = 60 actions

#### Exercice 2: Votre plan de risque
Repondez pour VOTRE situation:
1. Quel est votre capital de trading?
2. Quel % risquerez-vous par trade? (Recommande: 1%)
3. Combien d'euros cela represente?
4. Combien de positions maximum simultanees?
5. Quel est votre risque total max?

---

### Erreurs fatales a eviter

| Erreur | Consequence | Solution |
|--------|-------------|----------|
| Pas de stop loss | Pertes illimitees | TOUJOURS un stop |
| Position trop grande | Une perte detruit le compte | Respecter le 1-2% |
| Deplacer le stop | Pertes amplifiees | Discipline absolue |
| Moyenner a la baisse | Doubler une perte | Accepter la perte initiale |
| Revenge trading | Pertes en cascade | Pause obligatoire |

---

### Checklist avant chaque trade

☐ Mon stop loss est defini
☐ J'ai calcule la taille de position correctement
☐ Mon risque est < 2% de mon capital
☐ Mon ratio Risk/Reward est > 1:2
☐ Mon risque total (toutes positions) est < 6%
☐ J'accepte de perdre ce montant

**Si vous ne pouvez pas cocher toutes les cases, NE PRENEZ PAS LE TRADE.**

---

### Citation a retenir
> "Rule #1: Never lose money. Rule #2: Never forget Rule #1." - Warren Buffett

> "Les meilleurs traders ne sont pas ceux qui ont raison le plus souvent. Ce sont ceux qui perdent le moins quand ils ont tort."
""",
        "premium_only": False
    },
    {
        "id": 8,
        "category": "analyse_technique",
        "title": "Comprendre la Volatilite",
        "icon": "zap",
        "summary": "La volatilite mesure l'amplitude des variations de prix.",
        "content": """## La Volatilite en Trading - Guide Complet

### Qu'est-ce que la volatilite ?

La volatilite mesure l'amplitude et la frequence des variations de prix d'un actif. C'est une mesure du RISQUE mais aussi des OPPORTUNITES.

![Bandes de Bollinger](/education/bollinger-bands.svg)

**Analogie:** La volatilite c'est comme les vagues de l'ocean.
- Mer calme = Faible volatilite (facile a naviguer, peu de progression)
- Mer agitee = Forte volatilite (risque eleve, grande progression possible)

---

### Volatilite haute vs basse - Comparaison detaillee

| Aspect | Forte Volatilite | Faible Volatilite |
|--------|------------------|-------------------|
| Variations de prix | 2-5%+ par jour | < 1% par jour |
| Opportunites | Nombreuses | Rares |
| Risque | Eleve | Faible |
| Spreads | Plus larges | Plus serres |
| Slippage | Frequent | Rare |
| Stops | Doivent etre larges | Peuvent etre serres |
| Style ideal | Swing trading | Scalping, breakout |

**Exemples d'actifs par volatilite:**
| Volatilite | Actifs |
|------------|--------|
| Tres haute | Crypto (BTC, altcoins), actions tech small cap |
| Haute | Forex exotiques, petrole, actions growth |
| Moyenne | Forex majeurs, indices, blue chips |
| Faible | Obligations, ETF diversifies |

---

### Les indicateurs de volatilite

#### 1. ATR (Average True Range) - Le plus utile

**Calcul:**
```
True Range = Max de:
  - High - Low (amplitude du jour)
  - |High - Cloture veille|
  - |Low - Cloture veille|

ATR = Moyenne du True Range sur N periodes (souvent 14)
```

**Interpretation:**
| ATR | Signification |
|-----|---------------|
| ATR en hausse | Volatilite augmente |
| ATR en baisse | Volatilite diminue |
| ATR eleve | Grands mouvements attendus |
| ATR faible | Marche calme |

**Utilisation pratique - Placer les stops:**
```
Stop Loss = Prix d'entree - (1.5 a 2 x ATR)
Take Profit = Prix d'entree + (2 a 3 x ATR)

Exemple sur Apple (ATR = 4$):
- Entree: 180$
- Stop: 180 - (1.5 x 4) = 174$ (6$ de risque)
- TP: 180 + (2 x 4) = 188$ (8$ de gain)
- Ratio R/R: 8/6 = 1.33
```

#### 2. Bandes de Bollinger - Visualisation de la volatilite

```
Bande haute    ═══════════════════════════════
                    /\\    /\\
                   /  \\  /  \\
Moyenne (SMA20) ─────────────────────────────
                   \\  /  \\  /
                    \\/    \\/
Bande basse    ═══════════════════════════════
               |    |
               |<-->|
            Largeur = 2x ecart-type
```

**Interpretation:**
| Configuration | Signification | Action |
|---------------|---------------|--------|
| Bandes larges | Forte volatilite | Prudence, stops larges |
| Bandes etroites | Faible volatilite | Preparer breakout |
| Prix sur bande haute | Potentiel suracheté | Attention |
| Prix sur bande basse | Potentiel survente | Attention |

#### 3. VIX - L'indice de la peur

Le VIX mesure la volatilite ATTENDUE du S&P 500 sur 30 jours.

| Niveau VIX | Interpretation | Contexte typique |
|------------|----------------|------------------|
| < 12 | Extreme complaisance | Bull market mature |
| 12-20 | Normal | Marche sain |
| 20-30 | Nerveux | Incertitude, correction |
| 30-40 | Peur | Correction majeure |
| > 40 | Panique | Krach, crise |

**Historique des pics VIX:**
- Mars 2020 (COVID): VIX = 82
- 2008 (crise financiere): VIX = 80

---

### Le Squeeze de Bollinger - Setup explosif

**Identification:**
```
AVANT le Squeeze (bandes larges):
════════════════════════════════════
        /\\    /\\    /\\
       /  \\  /  \\  /  \\
════════════════════════════════════

PENDANT le Squeeze (bandes resserrees):
═══════════════════════════════════
    ─────────────────────────────
═══════════════════════════════════
         ^
         | Compression maximale

APRES le Squeeze (explosion):
                      /
                     /
                    /  ← BREAKOUT!
═══════════════════════════════════
```

**Comment trader le Squeeze:**
1. Identifier le resserrement des bandes
2. Attendre la cassure (cloture hors des bandes)
3. Confirmer avec le volume
4. Entrer dans le sens de la cassure
5. Stop de l'autre cote des bandes

---

### Exercices pratiques

#### Exercice 1: Calculer et utiliser l'ATR
1. Ouvrez le graphique Daily de Tesla
2. Ajoutez l'indicateur ATR(14)
3. Notez la valeur actuelle de l'ATR
4. Calculez ou serait votre stop (1.5 x ATR)

#### Exercice 2: Identifier un Squeeze
1. Ouvrez Bitcoin en Daily
2. Ajoutez les Bandes de Bollinger (20, 2)
3. Trouvez les 3 derniers squeezes
4. Verifiez la direction de chaque cassure

---

### Adapter sa strategie a la volatilite

#### En periode de FORTE volatilite:
- Reduire la taille de position de 25-50%
- Elargir les stops (2x ATR au lieu de 1.5x)
- Reduire ou eliminer le levier
- Moins de trades, plus selectif

#### En periode de FAIBLE volatilite:
- Strategies de breakout
- Stops peuvent etre plus serres
- Objectifs plus modestes
- Attendre le retour de la volatilite

**Citation:**
> "La volatilite est le prix a payer pour les rendements. Apprenez a l'apprivoiser plutot qu'a la craindre."
""",
        "premium_only": True
    },
    {
        "id": 9,
        "category": "psychologie",
        "title": "Psychologie du Trading",
        "icon": "brain",
        "summary": "Maitriser ses emotions est crucial pour reussir en trading.",
        "content": """## La Psychologie du Trader - Guide Complet

### Pourquoi la psychologie est cruciale

> "Le trading est 10% technique et 90% psychologie." - Van Tharp

**Statistique:** 80% des traders echouent a cause de la psychologie, pas a cause d'une mauvaise strategie.

---

### Les emotions destructrices

#### 1. La Peur
```
Manifestations:
- Ne pas entrer en position (paralysie)
- Couper les gains trop tot
- Ne pas respecter son plan
- Eviter de trader apres une perte
```

**Solutions:**
- Risquer petit (1-2% max)
- Avoir un plan ecrit
- Accepter que perdre fait partie du jeu

#### 2. L'Avidite
```
Manifestations:
- Ne pas prendre ses profits
- Augmenter la taille de position apres des gains
- Surtrading
- Utiliser trop de levier
```

**Solutions:**
- Fixer des TP avant d'entrer
- Respecter sa gestion du risque
- Celebrer les petits gains

#### 3. L'Espoir
```
Manifestations:
- Garder les perdants trop longtemps
- Deplacer son stop dans le mauvais sens
- "Ca va remonter..."
```

**Solutions:**
- Stop loss non-negociable
- Accepter les pertes rapidement
- "Hope is not a strategy"

#### 4. La Frustration / Colere
```
Manifestations:
- Revenge trading
- Decisions impulsives
- Casser du materiel!
```

**Solutions:**
- Pause obligatoire apres 2-3 pertes
- Limite de perte journaliere
- Exercice physique

---

### Les biais cognitifs du trader

| Biais | Description | Impact | Solution |
|-------|-------------|--------|----------|
| FOMO | Peur de rater | Entrees precipitees | Plan strict |
| Confirmation | Voir ce qu'on veut | Ignorer les signaux contraires | Chercher les raisons de NE PAS trader |
| Recence | Surponderer les events recents | Changer de strategie trop souvent | Journal de trading |
| Aversion a la perte | Detester perdre 2x plus qu'on aime gagner | Garder les perdants | Stop loss automatique |
| Overconfidence | Surestimer ses capacites | Position trop grande | Risque fixe par trade |

---

### Le FOMO en detail

**Fear Of Missing Out - La peur de rater**

```
Scenario typique:
1. Vous attendez une entree a 100$
2. Le prix monte a 102$ sans vous
3. FOMO: "Si je n'entre pas maintenant, je vais tout rater!"
4. Vous entrez a 105$
5. Le prix corrige a 98$
6. Vous perdez alors que votre analyse etait bonne
```

**Symptomes:**
- Entrer APRES que le mouvement a commence
- Ne pas respecter ses niveaux d'entree
- Augmenter la taille "pour compenser"

**Solutions:**
1. **Si j'ai rate, tant pis** - Il y aura d'autres opportunites
2. **Le marche sera la demain** - Pas d'urgence
3. **Mieux vaut rater un trade que prendre un mauvais trade**

---

### Le Revenge Trading

**Le cycle destructeur:**
```
Perte → Frustration → "Je vais recuperer!"
                ↓
        Trade impulsif
                ↓
        Nouvelle perte
                ↓
        Plus de frustration
                ↓
        Compte explose
```

**Prevention:**
1. **Regle des 3 pertes**: Arretez apres 3 pertes consecutives
2. **Limite journaliere**: Ex: -3% max par jour, puis stop
3. **Pause physique**: Quittez l'ecran, marchez
4. **Journal**: Ecrivez vos emotions AVANT de reprendre

---

### Construire une mentalite de gagnant

#### Pilier 1: Accepter les pertes
- Les pertes sont le COUT de faire du business
- Un trade perdant n'est pas un echec si vous avez suivi votre plan
- Objectif: Perdre CORRECTEMENT

#### Pilier 2: Penser en probabilites
```
Exemple:
- Votre strategie gagne 40% du temps
- Ratio R/R de 1:2
- Sur 100 trades:
  - 40 gagnants x 200$ = 8,000$
  - 60 perdants x 100$ = -6,000$
  - Profit net = 2,000$

Donc CHAQUE trade perdant fait partie du plan!
```

#### Pilier 3: Discipline absolue
- Le plan est ROI
- Pas d'exception, pas de "juste cette fois"
- La discipline bat l'intelligence TOUJOURS

#### Pilier 4: Focus sur le processus
- Ne jugez pas un trade par son resultat
- Jugez si vous avez SUIVI VOTRE PLAN
- Un trade gagnant hors plan = Mauvais trade
- Un trade perdant selon le plan = Bon trade

---

### Le Journal de Trading

**Pourquoi c'est INDISPENSABLE:**
- Identifier vos patterns emotionnels
- Voir vos erreurs recurrentes
- Mesurer votre progression

**Que noter pour chaque trade:**

| Element | Exemple |
|---------|---------|
| Date/Heure | 15/03/2026 14:30 |
| Actif | EUR/USD |
| Direction | Long |
| Raison d'entree | Rebond sur support + RSI survente |
| Taille | 0.5 lot |
| Entree/Stop/TP | 1.0850 / 1.0820 / 1.0910 |
| Resultat | +60 pips |
| **Emotions AVANT** | Confiant, peut-etre trop? |
| **Emotions PENDANT** | Stress quand ca a touche presque mon stop |
| **Emotions APRES** | Soulage, content |
| **Lecons** | J'ai failli couper trop tot par peur |

---

### Exercices pratiques

#### Exercice 1: Identifier vos emotions
Pendant 1 semaine, avant CHAQUE trade:
1. Notez votre emotion dominante (1 mot)
2. Notez votre niveau de confiance (1-10)
3. Apres le trade, correllez avec le resultat
4. Pattern? Tradez-vous mieux calme ou confiant?

#### Exercice 2: La pause forcee
1. Apres votre prochaine perte, fermez tout
2. Allez marcher 15 minutes
3. Revenez et analysez objectivement
4. Comparez avec vos reactions habituelles

#### Exercice 3: Le "Pre-mortem"
Avant chaque trade, demandez-vous:
- "Comment ce trade pourrait-il echouer?"
- "Quel serait le pire scenario?"
- "Est-ce que je l'accepte?"

---

### Routine du trader gagnant

**Avant la session:**
- Etat d'esprit: Suis-je calme, repose, focus?
- Si non: Ne tradez pas
- Revue du plan du jour

**Pendant la session:**
- Suivre le plan, pas les emotions
- Pause toutes les 2h
- Hydratation, posture

**Apres la session:**
- Journal de trading
- Revue des trades (processus, pas resultat)
- Deconnexion complete

---

### Citations des grands traders

> "Le trading ne revele pas votre caractere, il le forge." - Alexander Elder

> "La capacite a ne pas trader est aussi importante que la capacite a trader." - Jesse Livermore

> "Votre pire ennemi en trading vous regarde dans le miroir chaque matin." - Mark Douglas

**Citation finale:**
> "Le trading est simple, mais pas facile. La difficulte n'est pas intellectuelle, elle est emotionnelle. Maitrisez vos emotions, et vous maitriserez les marches."
""",
        "premium_only": True
    },
    {
        "id": 10,
        "category": "debutant",
        "title": "Les Erreurs Frequentes des Debutants",
        "icon": "alert-triangle",
        "summary": "Evitez les pieges classiques qui font echouer la plupart des nouveaux traders.",
        "content": """## Les 10 Erreurs Fatales des Debutants

### Erreur 1: Trader sans plan
**Le probleme:** Entrer en position sur un coup de tete
**La solution:** Definir avant chaque trade:
- Point d'entree precis
- Stop loss
- Take profit
- Taille de position

### Erreur 2: Risquer trop par trade
**Le probleme:** Mettre 10%, 20% ou plus sur un seul trade
**La solution:** Ne jamais risquer plus de 1-2% de votre capital
- Avec 2% par trade, il faut 36 pertes consecutives pour perdre 50%

### Erreur 3: Ne pas utiliser de stop loss
**Le probleme:** "Je vais surveiller..." - Non, vous ne le ferez pas
**La solution:** TOUJOURS placer un stop loss AVANT d'entrer
- Un trade sans stop est une bombe a retardement

### Erreur 4: Le revenge trading
**Le probleme:** Vouloir recuperer ses pertes immediatement
**La solution:**
- Fixer une limite de perte journaliere
- Arreter apres 2-3 pertes consecutives
- Faire une pause de 24h minimum

### Erreur 5: Surtrading
**Le probleme:** Trader trop souvent, par ennui ou addiction
**La solution:**
- Qualite > Quantite
- Attendre les meilleures setups
- Fixer un nombre max de trades/jour

### Erreur 6: Ignorer la gestion de capital
**Le probleme:** Position sizing au hasard
**La solution:**
- Calculer la taille avant chaque trade
- Formule: Risque / Distance au stop = Taille

### Erreur 7: Suivre les "gourous"
**Le probleme:** Copier les trades sans comprendre
**La solution:**
- Developper VOTRE propre strategie
- Comprendre le POURQUOI de chaque trade

### Erreur 8: Utiliser trop de levier
**Le probleme:** x10, x50, x100... jusqu'a la liquidation
**La solution:**
- Debutant: Pas de levier ou max x2
- Intermediaire: Max x5
- Le levier amplifie aussi les pertes

### Erreur 9: Ne pas tenir de journal
**Le probleme:** Repeter les memes erreurs
**La solution:** Noter pour CHAQUE trade:
- Raison d'entree
- Emotions ressenties
- Resultat et lecons

### Erreur 10: Vouloir devenir riche rapidement
**Le probleme:** Attentes irrealistes
**La realite:**
- La plupart des traders mettent 2-3 ans a devenir profitables
- Les vrais pros visent 20-50%/an
- La patience est votre meilleur allie""",
        "premium_only": False
    },
    {
        "id": 11,
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
        "id": 12,
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
        "id": 13,
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
        "id": 14,
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
            {"key": "debutant", "label": "Pour Debutants"},
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
        raise HTTPException(status_code=503, detail="Service IA non configure. Contactez l'administrateur (GROQ_API_KEY manquante).")

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
                "generated_at": datetime.now(timezone.utc).isoformat()
            }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
