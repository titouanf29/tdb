"""
AI Analysis routes - Using the same analyzer as the bot
"""
import sys
from pathlib import Path
from fastapi import APIRouter, HTTPException, Query

# Import analyzer from bot
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent.parent))

router = APIRouter()


@router.get("/{symbol}")
async def analyze_asset(
    symbol: str,
    timeframe: str = Query(default="1d", regex="^(5m|15m|1h|4h|1d)$")
):
    """Get AI analysis for an asset"""
    import yfinance as yf
    import pandas as pd
    import numpy as np

    try:
        ticker = yf.Ticker(symbol)

        # Get historical data
        period_map = {
            "5m": "5d", "15m": "5d", "1h": "1mo",
            "4h": "3mo", "1d": "6mo"
        }
        hist = ticker.history(period=period_map.get(timeframe, "1mo"), interval=timeframe)

        if hist.empty or len(hist) < 20:
            raise HTTPException(status_code=400, detail="Insufficient data for analysis")

        # Calculate technical indicators
        close = hist['Close']
        high = hist['High']
        low = hist['Low']
        volume = hist['Volume']

        # RSI
        delta = close.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        current_rsi = rsi.iloc[-1]

        # MACD
        ema12 = close.ewm(span=12, adjust=False).mean()
        ema26 = close.ewm(span=26, adjust=False).mean()
        macd = ema12 - ema26
        signal = macd.ewm(span=9, adjust=False).mean()
        macd_hist = macd - signal

        # EMAs
        ema20 = close.ewm(span=20, adjust=False).mean()
        ema50 = close.ewm(span=50, adjust=False).mean()
        ema200 = close.ewm(span=200, adjust=False).mean() if len(close) >= 200 else None

        # Bollinger Bands
        bb_mid = close.rolling(window=20).mean()
        bb_std = close.rolling(window=20).std()
        bb_upper = bb_mid + (bb_std * 2)
        bb_lower = bb_mid - (bb_std * 2)

        # ATR
        tr = pd.concat([
            high - low,
            abs(high - close.shift(1)),
            abs(low - close.shift(1))
        ], axis=1).max(axis=1)
        atr = tr.rolling(window=14).mean().iloc[-1]

        # Current values
        current_price = close.iloc[-1]
        prev_price = close.iloc[-2]
        price_change = ((current_price - prev_price) / prev_price) * 100

        # Volume analysis
        avg_volume = volume.rolling(window=20).mean().iloc[-1]
        current_volume = volume.iloc[-1]
        volume_ratio = current_volume / avg_volume if avg_volume > 0 else 1

        # Calculate scores
        technical_score = 50

        # RSI contribution
        if current_rsi < 30:
            technical_score += 15  # Oversold = bullish signal
        elif current_rsi > 70:
            technical_score -= 15  # Overbought = bearish signal
        elif 40 <= current_rsi <= 60:
            technical_score += 5  # Neutral

        # MACD contribution
        if macd_hist.iloc[-1] > 0 and macd_hist.iloc[-2] <= 0:
            technical_score += 15  # Bullish crossover
        elif macd_hist.iloc[-1] < 0 and macd_hist.iloc[-2] >= 0:
            technical_score -= 15  # Bearish crossover
        elif macd_hist.iloc[-1] > 0:
            technical_score += 5
        else:
            technical_score -= 5

        # EMA contribution
        if current_price > ema20.iloc[-1]:
            technical_score += 5
        if current_price > ema50.iloc[-1]:
            technical_score += 5
        if ema200 is not None and current_price > ema200.iloc[-1]:
            technical_score += 10

        # Volume contribution
        volume_score = min(100, int(volume_ratio * 50))

        # Momentum
        momentum_5d = ((current_price - close.iloc[-6]) / close.iloc[-6]) * 100 if len(close) > 5 else 0
        momentum_score = 50 + min(25, max(-25, momentum_5d * 5))

        # Final score
        final_score = int(
            technical_score * 0.4 +
            volume_score * 0.3 +
            momentum_score * 0.3
        )
        final_score = max(0, min(100, final_score))

        # Determine trend
        if current_price > ema20.iloc[-1] > ema50.iloc[-1]:
            trend = "BULLISH"
        elif current_price < ema20.iloc[-1] < ema50.iloc[-1]:
            trend = "BEARISH"
        else:
            trend = "NEUTRAL"

        # Support/Resistance levels
        recent_low = low.tail(20).min()
        recent_high = high.tail(20).max()

        # Signal
        if final_score >= 75:
            signal_text = "STRONG BUY"
            signal_emoji = "🔥"
        elif final_score >= 60:
            signal_text = "BUY"
            signal_emoji = "🟢"
        elif final_score >= 40:
            signal_text = "HOLD"
            signal_emoji = "🟡"
        elif final_score >= 25:
            signal_text = "SELL"
            signal_emoji = "🟠"
        else:
            signal_text = "STRONG SELL"
            signal_emoji = "🔴"

        # Get fundamental data
        info = ticker.info

        # Fundamental metrics
        fundamentals = {
            "market_cap": info.get("marketCap"),
            "pe_ratio": info.get("trailingPE"),
            "forward_pe": info.get("forwardPE"),
            "peg_ratio": info.get("pegRatio"),
            "price_to_book": info.get("priceToBook"),
            "dividend_yield": info.get("dividendYield"),
            "profit_margin": info.get("profitMargins"),
            "revenue_growth": info.get("revenueGrowth"),
            "earnings_growth": info.get("earningsGrowth"),
            "debt_to_equity": info.get("debtToEquity"),
            "current_ratio": info.get("currentRatio"),
            "roe": info.get("returnOnEquity"),
            "roa": info.get("returnOnAssets"),
            "beta": info.get("beta"),
            "52w_high": info.get("fiftyTwoWeekHigh"),
            "52w_low": info.get("fiftyTwoWeekLow"),
            "50d_avg": info.get("fiftyDayAverage"),
            "200d_avg": info.get("twoHundredDayAverage"),
            "avg_volume": info.get("averageVolume"),
            "shares_outstanding": info.get("sharesOutstanding"),
            "short_ratio": info.get("shortRatio"),
            "target_price": info.get("targetMeanPrice"),
            "target_high": info.get("targetHighPrice"),
            "target_low": info.get("targetLowPrice"),
            "recommendation": info.get("recommendationKey"),
            "num_analysts": info.get("numberOfAnalystOpinions"),
        }

        # Company info
        company_info = {
            "name": info.get("shortName") or info.get("longName"),
            "sector": info.get("sector"),
            "industry": info.get("industry"),
            "country": info.get("country"),
            "employees": info.get("fullTimeEmployees"),
            "description": info.get("longBusinessSummary"),
            "website": info.get("website"),
        }

        # Get recent news
        news_items = []
        try:
            news = ticker.news[:5] if hasattr(ticker, 'news') and ticker.news else []
            for item in news:
                news_items.append({
                    "title": item.get("title"),
                    "publisher": item.get("publisher"),
                    "link": item.get("link"),
                    "date": item.get("providerPublishTime"),
                    "type": item.get("type"),
                })
        except Exception:
            pass

        # Historical performance
        hist_1m = ((close.iloc[-1] - close.iloc[-22]) / close.iloc[-22] * 100) if len(close) > 22 else None
        hist_3m = ((close.iloc[-1] - close.iloc[-66]) / close.iloc[-66] * 100) if len(close) > 66 else None
        hist_6m = ((close.iloc[-1] - close.iloc[-132]) / close.iloc[-132] * 100) if len(close) > 132 else None
        hist_ytd = None
        try:
            ytd_start = close[close.index.year == close.index[-1].year].iloc[0]
            hist_ytd = ((close.iloc[-1] - ytd_start) / ytd_start * 100)
        except Exception:
            pass

        performance = {
            "1d": round(price_change, 2),
            "1w": round(((close.iloc[-1] - close.iloc[-6]) / close.iloc[-6] * 100), 2) if len(close) > 6 else None,
            "1m": round(hist_1m, 2) if hist_1m else None,
            "3m": round(hist_3m, 2) if hist_3m else None,
            "6m": round(hist_6m, 2) if hist_6m else None,
            "ytd": round(hist_ytd, 2) if hist_ytd else None,
        }

        # Volatility analysis
        daily_returns = close.pct_change().dropna()
        volatility_20d = daily_returns.tail(20).std() * np.sqrt(252) * 100
        volatility_60d = daily_returns.tail(60).std() * np.sqrt(252) * 100 if len(daily_returns) > 60 else None

        # Price targets based on technicals
        target_bull = round(current_price * 1.15, 2)  # +15%
        target_base = round(current_price * 1.05, 2)  # +5%
        target_bear = round(current_price * 0.90, 2)  # -10%

        # Adjust based on trend
        if trend == "BULLISH":
            target_bull = round(current_price * 1.20, 2)
            target_base = round(current_price * 1.10, 2)
        elif trend == "BEARISH":
            target_base = round(current_price * 0.95, 2)
            target_bear = round(current_price * 0.80, 2)

        # Fundamental score
        fundamental_score = 50
        if fundamentals.get("pe_ratio"):
            pe = fundamentals["pe_ratio"]
            if pe < 15:
                fundamental_score += 10
            elif pe > 30:
                fundamental_score -= 10
        if fundamentals.get("revenue_growth"):
            rg = fundamentals["revenue_growth"]
            if rg > 0.1:
                fundamental_score += 10
            elif rg < 0:
                fundamental_score -= 10
        if fundamentals.get("profit_margin"):
            pm = fundamentals["profit_margin"]
            if pm > 0.15:
                fundamental_score += 5
            elif pm < 0:
                fundamental_score -= 10
        fundamental_score = max(0, min(100, fundamental_score))

        # Analyst sentiment
        analyst_sentiment = "neutral"
        if fundamentals.get("recommendation"):
            rec = fundamentals["recommendation"].lower()
            if "buy" in rec or "strong" in rec:
                analyst_sentiment = "bullish"
            elif "sell" in rec or "under" in rec:
                analyst_sentiment = "bearish"

        return {
            "symbol": symbol,
            "timeframe": timeframe,
            "company": company_info,
            "price": {
                "current": round(current_price, 2),
                "change": round(price_change, 2),
                "high_24h": round(high.iloc[-1], 2),
                "low_24h": round(low.iloc[-1], 2)
            },
            "score": {
                "total": final_score,
                "technical": int(technical_score),
                "volume": volume_score,
                "momentum": int(momentum_score),
                "fundamental": fundamental_score
            },
            "signal": {
                "text": signal_text,
                "emoji": signal_emoji
            },
            "trend": trend,
            "indicators": {
                "rsi": {
                    "value": round(current_rsi, 1),
                    "signal": "oversold" if current_rsi < 30 else "overbought" if current_rsi > 70 else "neutral"
                },
                "macd": {
                    "value": round(macd.iloc[-1], 4),
                    "signal_line": round(signal.iloc[-1], 4),
                    "histogram": round(macd_hist.iloc[-1], 4),
                    "signal": "bullish" if macd_hist.iloc[-1] > 0 else "bearish"
                },
                "ema": {
                    "ema20": round(ema20.iloc[-1], 2),
                    "ema50": round(ema50.iloc[-1], 2),
                    "ema200": round(ema200.iloc[-1], 2) if ema200 is not None else None
                },
                "bollinger": {
                    "upper": round(bb_upper.iloc[-1], 2),
                    "middle": round(bb_mid.iloc[-1], 2),
                    "lower": round(bb_lower.iloc[-1], 2),
                    "position": "upper" if current_price > bb_upper.iloc[-1] else "lower" if current_price < bb_lower.iloc[-1] else "middle"
                },
                "atr": round(atr, 4),
                "volume_ratio": round(volume_ratio, 2)
            },
            "levels": {
                "support": round(recent_low, 2),
                "resistance": round(recent_high, 2),
                "pivot": round((recent_high + recent_low + current_price) / 3, 2)
            },
            "risk": {
                "suggested_sl": round(current_price - (atr * 2), 2),
                "suggested_tp": round(current_price + (atr * 3), 2),
                "risk_reward": 1.5
            },
            "fundamentals": fundamentals,
            "performance": performance,
            "volatility": {
                "20d": round(volatility_20d, 2),
                "60d": round(volatility_60d, 2) if volatility_60d else None,
            },
            "targets": {
                "bull": target_bull,
                "base": target_base,
                "bear": target_bear,
                "analyst_mean": fundamentals.get("target_price"),
                "analyst_high": fundamentals.get("target_high"),
                "analyst_low": fundamentals.get("target_low"),
            },
            "analyst_sentiment": analyst_sentiment,
            "news": news_items,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/scan/{market_key}")
async def scan_market(
    market_key: str,
    min_score: int = Query(default=60, ge=0, le=100),
    limit: int = Query(default=10, le=50)
):
    """Scan a market for opportunities"""
    from config import MARKETS
    import yfinance as yf

    market_key = market_key.upper()
    if market_key not in MARKETS:
        raise HTTPException(status_code=404, detail="Market not found")

    assets = MARKETS[market_key]["assets"]
    results = []

    for symbol in assets[:20]:  # Limit to 20 for performance
        try:
            # Quick analysis
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period="1mo", interval="1d")

            if len(hist) < 14:
                continue

            close = hist['Close']

            # Quick RSI
            delta = close.diff()
            gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
            rs = gain / loss
            rsi = 100 - (100 / (1 + rs))

            # Quick score
            current_price = close.iloc[-1]
            prev_price = close.iloc[-2]
            change = ((current_price - prev_price) / prev_price) * 100

            score = 50
            current_rsi = rsi.iloc[-1]
            if current_rsi < 30:
                score += 20
            elif current_rsi > 70:
                score -= 20

            if change > 0:
                score += min(15, change * 3)
            else:
                score += max(-15, change * 3)

            score = max(0, min(100, int(score)))

            if score >= min_score:
                results.append({
                    "symbol": symbol,
                    "price": round(current_price, 2),
                    "change": round(change, 2),
                    "score": score,
                    "rsi": round(current_rsi, 1)
                })
        except Exception:
            continue

    # Sort by score
    results.sort(key=lambda x: x["score"], reverse=True)

    return {
        "market": market_key,
        "min_score": min_score,
        "results": results[:limit]
    }
