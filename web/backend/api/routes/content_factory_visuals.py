"""
Content Factory Visuals — admin-only endpoints for generating visual assets.
Covers: trading chart (yfinance+matplotlib), screenshot (playwright),
stock photos (Unsplash), AI image (DALL-E 3), screencast stub.
"""
import base64
import io
import os
from typing import Optional

import httpx
import matplotlib
matplotlib.use("Agg")                     # non-interactive backend — must be before any pyplot import
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
import matplotlib.ticker as mticker
from matplotlib.patches import Rectangle
import numpy as np
import pandas as pd

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from ..database import execute_query
from .admin import get_admin_user

router = APIRouter()

# ── Brand palette ─────────────────────────────────────────────────────────────
BG      = "#0A0E1A"
BLUE    = "#638CFF"
GREEN   = "#00D4AA"
RED     = "#FF4757"
YELLOW  = "#FFD700"
MUTED   = "#4A5568"
TEXT    = "#E2E8F0"

# ── Topic → symbol mapping ────────────────────────────────────────────────────
TOPIC_SYMBOLS: dict[str, str] = {
    "RSI":                      "BTC-USD",
    "MACD":                     "BTC-USD",
    "EMA":                      "GC=F",
    "Bollinger Bands":          "ETH-USD",
    "Volume":                   "SPY",
    "Stochastique":             "BTC-USD",
    "ATR":                      "BTC-USD",
    "Ichimoku":                 "EURUSD=X",
    "Support & Résistance":     "EURUSD=X",
    "Chandelier Japonais":      "BTC-USD",
    "Tendance":                 "SPY",
    "Risk Management":          "BTC-USD",
    "Take Profit / Stop Loss":  "GC=F",
    "Scalping":                 "EURUSD=X",
    "Swing Trading":            "SPY",
    "Day Trading":              "EURUSD=X",
}

TOPIC_INDICATOR: dict[str, str] = {
    "RSI":                      "rsi",
    "MACD":                     "macd",
    "EMA":                      "ema",
    "Bollinger Bands":          "bollinger",
    "Volume":                   "volume",
    "Stochastique":             "stochastic",
    "ATR":                      "atr",
    "Ichimoku":                 "ema",
    "Support & Résistance":     "sr",
    "Chandelier Japonais":      "candles",
    "Tendance":                 "ema",
    "Risk Management":          "sr",
    "Take Profit / Stop Loss":  "sr",
    "Scalping":                 "ema",
    "Swing Trading":            "macd",
    "Day Trading":              "rsi",
}

FMT_FIGSIZE: dict[str, tuple[float, float]] = {
    "portrait":  (5.4, 9.6),
    "landscape": (9.6, 5.4),
    "square":    (5.4, 5.4),
}

UNSPLASH_QUERIES: dict[str, str] = {
    "RSI":                      "stock market chart trading screen",
    "MACD":                     "stock market chart trading screen",
    "EMA":                      "stock market chart trading screen",
    "Bollinger Bands":          "stock market chart trading screen",
    "Stochastique":             "stock market chart trading screen",
    "Volume":                   "trading dashboard financial data",
    "ATR":                      "trading dashboard financial data",
    "Ichimoku":                 "financial chart analysis",
    "Chandelier Japonais":      "financial chart analysis",
    "Support & Résistance":     "financial chart analysis",
    "Tendance":                 "financial chart analysis",
    "Risk Management":          "risk management investment",
    "Take Profit / Stop Loss":  "risk management investment",
    "Scalping":                 "day trader multiple monitors",
    "Day Trading":              "day trader multiple monitors",
    "Swing Trading":            "swing trading investment strategy",
}

DALLE_DESCS: dict[str, str] = {
    "RSI":                      "an RSI oscillator with glowing cyan overbought and oversold zones",
    "MACD":                     "MACD signal lines crossing with green and red histogram bars",
    "EMA":                      "multiple exponential moving average lines on a gold price chart",
    "Bollinger Bands":          "Bollinger Bands with price bouncing between the upper and lower bands",
    "Volume":                   "volume bars beneath a candlestick chart with highlighted spikes",
    "Stochastique":             "a stochastic oscillator with glowing K and D lines crossing",
    "ATR":                      "an ATR volatility indicator with glowing signal lines",
    "Ichimoku":                 "an Ichimoku cloud chart with colourful cloud and signal lines",
    "Support & Résistance":     "horizontal support and resistance lines with price bouncing off them",
    "Chandelier Japonais":      "Japanese candlestick patterns — doji, hammer, engulfing — on a dark chart",
    "Tendance":                 "an upward trending market with a clean cyan trend channel",
    "Risk Management":          "a trading risk-reward dashboard showing stop loss and take-profit levels",
    "Take Profit / Stop Loss":  "price chart with green take-profit and red stop-loss horizontal lines",
    "Scalping":                 "a 1-minute scalping chart with rapid price movements and entry signals",
    "Swing Trading":            "a daily swing trading chart with multi-day price swings highlighted",
    "Day Trading":              "a day trading monitor showing intraday price action and indicators",
}


# ── Indicator maths ────────────────────────────────────────────────────────────

def _rsi(closes: np.ndarray, period: int = 14) -> np.ndarray:
    delta = np.diff(closes.astype(float))
    gains  = np.where(delta > 0, delta, 0.0)
    losses = np.where(delta < 0, -delta, 0.0)
    rsi = np.full(len(closes), np.nan)
    if len(closes) <= period:
        return rsi
    ag = np.mean(gains[:period])
    al = np.mean(losses[:period])
    for i in range(period, len(closes) - 1):
        ag = (ag * (period - 1) + gains[i]) / period
        al = (al * (period - 1) + losses[i]) / period
        rs = ag / al if al > 0 else np.inf
        rsi[i + 1] = 100.0 - (100.0 / (1.0 + rs))
    return rsi


def _ema(closes: np.ndarray, span: int) -> np.ndarray:
    return pd.Series(closes.astype(float)).ewm(span=span, adjust=False).mean().values


def _macd(closes: np.ndarray, fast=12, slow=26, signal=9):
    line   = _ema(closes, fast) - _ema(closes, slow)
    sig    = pd.Series(line).ewm(span=signal, adjust=False).mean().values
    hist   = line - sig
    return line, sig, hist


def _bollinger(closes: np.ndarray, period=20, k=2.0):
    s   = pd.Series(closes.astype(float))
    mid = s.rolling(period).mean().values
    std = s.rolling(period).std().values
    return mid + k * std, mid, mid - k * std


def _stoch(closes: np.ndarray, period=14):
    kline = np.full(len(closes), np.nan)
    for i in range(period - 1, len(closes)):
        lo = closes[i - period + 1: i + 1].min()
        hi = closes[i - period + 1: i + 1].max()
        kline[i] = 100.0 * (closes[i] - lo) / (hi - lo) if hi > lo else 50.0
    dline = pd.Series(kline).rolling(3).mean().values
    return kline, dline


# ── Matplotlib helpers ─────────────────────────────────────────────────────────

def _style(ax):
    ax.set_facecolor(BG)
    ax.tick_params(colors=TEXT, labelsize=7)
    for sp in ax.spines.values():
        sp.set_edgecolor(MUTED)
    ax.yaxis.tick_right()
    ax.yaxis.set_label_position("right")


def _candlesticks(ax, df: pd.DataFrame):
    o = df["Open"].values
    h = df["High"].values
    l = df["Low"].values
    c = df["Close"].values
    n = len(df)
    x = np.arange(n)
    w = 0.6
    for i in range(n):
        col = GREEN if c[i] >= o[i] else RED
        ax.plot([x[i], x[i]], [l[i], h[i]], color=col, lw=0.8)
        bh = max(abs(c[i] - o[i]), (h[i] - l[i]) * 0.005)
        rect = Rectangle((x[i] - w/2, min(o[i], c[i])), w, bh,
                          fc=col, ec=col, alpha=0.88)
        ax.add_patch(rect)
    ax.set_xlim(-1, n)
    ax.set_ylim(l.min() * 0.998, h.max() * 1.002)


def _watermark(fig):
    fig.text(0.98, 0.01, "captentdb.fr", ha="right", va="bottom",
             color="white", alpha=0.18, fontsize=8, fontstyle="italic")


def _fig_to_b64(fig, dpi=100) -> str:
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=dpi, bbox_inches="tight", facecolor=BG)
    plt.close(fig)
    buf.seek(0)
    return "data:image/png;base64," + base64.b64encode(buf.read()).decode()


def _demo(topic: str, fmt: str) -> str:
    """Synthetic sine-wave chart when real data is unavailable."""
    figsize = FMT_FIGSIZE.get(fmt, FMT_FIGSIZE["portrait"])
    fig, ax = plt.subplots(figsize=figsize, facecolor=BG)
    _style(ax)
    t = np.linspace(0, 4 * np.pi, 120)
    p = 100 + 10 * np.sin(t) + np.cumsum(np.random.randn(120) * 0.3)
    ax.plot(p, color=BLUE, lw=1.5)
    ax.set_title(f"{topic} — démo (données indisponibles)", color=TEXT, fontsize=9, pad=6, loc="left")
    _watermark(fig)
    return _fig_to_b64(fig)


# ── Core chart generator (importable by content_factory.py for ZIP) ────────────

async def generate_chart_b64(topic: str, fmt: str = "portrait", dpi: int = 100) -> tuple[str, str]:
    """Return (base64_png_data_url, source_label)."""
    import yfinance as yf

    symbol    = TOPIC_SYMBOLS.get(topic, "BTC-USD")
    indicator = TOPIC_INDICATOR.get(topic, "rsi")
    figsize   = FMT_FIGSIZE.get(fmt, FMT_FIGSIZE["portrait"])

    try:
        df = yf.Ticker(symbol).history(period="1mo", interval="1d")
        if df.empty or len(df) < 15:
            raise ValueError("too little data")
    except Exception:
        return _demo(topic, fmt), "demo"

    closes = df["Close"].values
    n      = len(df)
    x      = np.arange(n)

    try:
        fig = plt.figure(figsize=figsize, facecolor=BG)
        sym_label = symbol.replace("-USD", "").replace("=X", "").replace("=F", "")

        if indicator in ("rsi", "default"):
            gs   = gridspec.GridSpec(3, 1, height_ratios=[3, 1.5, .05], hspace=0.1, figure=fig)
            ax_p = fig.add_subplot(gs[0])
            ax_r = fig.add_subplot(gs[1], sharex=ax_p)
            _candlesticks(ax_p, df)
            _style(ax_p)
            plt.setp(ax_p.get_xticklabels(), visible=False)
            rsi_v = _rsi(closes)
            ax_r.plot(x, rsi_v, color=GREEN, lw=1.5)
            ax_r.axhline(70, color=RED,   ls="--", alpha=0.7, lw=1)
            ax_r.axhline(30, color=GREEN, ls="--", alpha=0.7, lw=1)
            ax_r.fill_between(x, rsi_v, 70, where=(rsi_v > 70),  alpha=0.15, color=RED)
            ax_r.fill_between(x, rsi_v, 30, where=(rsi_v < 30),  alpha=0.15, color=GREEN)
            _style(ax_r)
            ax_r.set_ylim(0, 100)
            ax_r.set_yticks([30, 50, 70])
            ax_r.set_ylabel("RSI(14)", color=TEXT, fontsize=7)

        elif indicator == "macd":
            gs   = gridspec.GridSpec(3, 1, height_ratios=[3, 1.5, .05], hspace=0.1, figure=fig)
            ax_p = fig.add_subplot(gs[0])
            ax_m = fig.add_subplot(gs[1], sharex=ax_p)
            _candlesticks(ax_p, df)
            _style(ax_p)
            plt.setp(ax_p.get_xticklabels(), visible=False)
            ml, sl, hl = _macd(closes)
            ax_m.plot(x, ml, color=BLUE,   lw=1.3, label="MACD")
            ax_m.plot(x, sl, color=YELLOW, lw=1.3, label="Signal")
            bar_c = [GREEN if h >= 0 else RED for h in hl]
            ax_m.bar(x, hl, color=bar_c, alpha=0.75, width=0.8)
            ax_m.axhline(0, color=MUTED, lw=0.8)
            _style(ax_m)
            ax_m.set_ylabel("MACD", color=TEXT, fontsize=7)

        elif indicator == "bollinger":
            gs   = gridspec.GridSpec(2, 1, height_ratios=[4, .05], hspace=0.05, figure=fig)
            ax_p = fig.add_subplot(gs[0])
            _candlesticks(ax_p, df)
            _style(ax_p)
            up, mid, lo = _bollinger(closes)
            ax_p.plot(x, up,  color=BLUE,   lw=1.2, ls="--", alpha=0.85)
            ax_p.plot(x, mid, color=YELLOW, lw=1.2, alpha=0.85)
            ax_p.plot(x, lo,  color=BLUE,   lw=1.2, ls="--", alpha=0.85)
            ax_p.fill_between(x, up, lo, alpha=0.06, color=BLUE)

        elif indicator == "ema":
            gs   = gridspec.GridSpec(2, 1, height_ratios=[4, .05], hspace=0.05, figure=fig)
            ax_p = fig.add_subplot(gs[0])
            _candlesticks(ax_p, df)
            _style(ax_p)
            ax_p.plot(x, _ema(closes, 9),  color=GREEN,  lw=1.5, label="EMA 9")
            ax_p.plot(x, _ema(closes, 21), color=BLUE,   lw=1.5, label="EMA 21")
            if n >= 50:
                ax_p.plot(x, _ema(closes, 50), color=YELLOW, lw=1.5, label="EMA 50")
            ax_p.legend(fontsize=6, loc="upper left", facecolor=BG, labelcolor=TEXT,
                        framealpha=0.7, edgecolor=MUTED)

        elif indicator == "stochastic":
            gs   = gridspec.GridSpec(3, 1, height_ratios=[3, 1.5, .05], hspace=0.1, figure=fig)
            ax_p = fig.add_subplot(gs[0])
            ax_s = fig.add_subplot(gs[1], sharex=ax_p)
            _candlesticks(ax_p, df)
            _style(ax_p)
            plt.setp(ax_p.get_xticklabels(), visible=False)
            k, d = _stoch(closes)
            ax_s.plot(x, k, color=BLUE,   lw=1.3, label="%K")
            ax_s.plot(x, d, color=YELLOW, lw=1.3, label="%D")
            ax_s.axhline(80, color=RED,   ls="--", alpha=0.7, lw=1)
            ax_s.axhline(20, color=GREEN, ls="--", alpha=0.7, lw=1)
            _style(ax_s)
            ax_s.set_ylim(0, 100)
            ax_s.set_ylabel("Stoch", color=TEXT, fontsize=7)

        elif indicator == "volume":
            gs   = gridspec.GridSpec(3, 1, height_ratios=[3, 1.5, .05], hspace=0.1, figure=fig)
            ax_p = fig.add_subplot(gs[0])
            ax_v = fig.add_subplot(gs[1], sharex=ax_p)
            _candlesticks(ax_p, df)
            _style(ax_p)
            plt.setp(ax_p.get_xticklabels(), visible=False)
            vols  = df["Volume"].values
            vcols = [GREEN if df["Close"].values[i] >= df["Open"].values[i] else RED for i in range(n)]
            ax_v.bar(x, vols, color=vcols, alpha=0.75, width=0.8)
            _style(ax_v)
            ax_v.set_ylabel("Volume", color=TEXT, fontsize=7)
            ax_v.yaxis.set_major_formatter(
                mticker.FuncFormatter(lambda v, _: f"{v/1e6:.1f}M" if v >= 1e6 else f"{v/1e3:.0f}K")
            )

        elif indicator == "atr":
            gs   = gridspec.GridSpec(3, 1, height_ratios=[3, 1.5, .05], hspace=0.1, figure=fig)
            ax_p = fig.add_subplot(gs[0])
            ax_a = fig.add_subplot(gs[1], sharex=ax_p)
            _candlesticks(ax_p, df)
            _style(ax_p)
            plt.setp(ax_p.get_xticklabels(), visible=False)
            h  = df["High"].values
            l  = df["Low"].values
            c  = df["Close"].values
            tr = np.maximum(h - l, np.maximum(abs(h - np.roll(c, 1)), abs(l - np.roll(c, 1))))
            tr[0] = h[0] - l[0]
            atr = pd.Series(tr).rolling(14).mean().values
            ax_a.plot(x, atr, color=YELLOW, lw=1.5)
            _style(ax_a)
            ax_a.set_ylabel("ATR(14)", color=TEXT, fontsize=7)

        elif indicator == "sr":
            gs   = gridspec.GridSpec(2, 1, height_ratios=[4, .05], hspace=0.05, figure=fig)
            ax_p = fig.add_subplot(gs[0])
            _candlesticks(ax_p, df)
            _style(ax_p)
            period = max(5, n // 4)
            res    = pd.Series(df["High"].values).rolling(period).max().iloc[-1]
            sup    = pd.Series(df["Low"].values).rolling(period).min().iloc[-1]
            ax_p.axhline(res, color=RED,   ls="--", lw=1.8, alpha=0.85, label="Résistance")
            ax_p.axhline(sup, color=GREEN, ls="--", lw=1.8, alpha=0.85, label="Support")
            ax_p.legend(fontsize=7, loc="upper left", facecolor=BG, labelcolor=TEXT,
                        framealpha=0.7, edgecolor=MUTED)

        else:  # candles / generic — just price
            gs   = gridspec.GridSpec(2, 1, height_ratios=[4, .05], hspace=0.05, figure=fig)
            ax_p = fig.add_subplot(gs[0])
            _candlesticks(ax_p, df)
            _style(ax_p)

        # Title on first axes
        first_ax = fig.axes[0]
        first_ax.set_title(f"{topic} — {sym_label} (30j)", color=TEXT, fontsize=9, pad=6, loc="left")
        _watermark(fig)

        buf = io.BytesIO()
        fig.savefig(buf, format="png", dpi=dpi, bbox_inches="tight", facecolor=BG)
        plt.close(fig)
        buf.seek(0)
        return "data:image/png;base64," + base64.b64encode(buf.read()).decode(), "yfinance+matplotlib"

    except Exception as exc:
        print(f"[Visuals] chart error for {topic}: {exc}")
        plt.close("all")
        return _demo(topic, fmt), "demo"


# ── Screenshot helper (also importable) ───────────────────────────────────────

async def take_screenshot_b64(page_slug: str, fmt: str = "portrait") -> tuple[str | None, str, str | None]:
    """Return (base64_png_or_None, source, error_or_None)."""
    dims = {"portrait": (1080, 1920), "landscape": (1920, 1080), "square": (1080, 1080)}
    w, h = dims.get(fmt, dims["portrait"])
    url  = "https://captentdb.fr" + (page_slug or "/")
    preview_token = os.getenv("PREVIEW_TOKEN", "")
    try:
        from playwright.async_api import async_playwright
        async with async_playwright() as p:
            browser = await p.chromium.launch(args=["--no-sandbox", "--disable-setuid-sandbox"])
            page    = await browser.new_page()
            await page.set_viewport_size({"width": w, "height": h})
            if preview_token:
                await page.context.add_cookies([{
                    "name": "cf_preview_token", "value": preview_token,
                    "domain": "captentdb.fr", "path": "/",
                }])
            try:
                await page.goto(url, timeout=15_000, wait_until="networkidle")
            except Exception:
                await page.goto(url, timeout=15_000, wait_until="load")
            raw = await page.screenshot(full_page=False, type="png")
            await browser.close()
        return "data:image/png;base64," + base64.b64encode(raw).decode(), "playwright", None
    except ImportError:
        return None, "unavailable", "Playwright non installé. Exécutez : pip install playwright && playwright install chromium"
    except Exception as exc:
        return None, "unavailable", str(exc)


# ── AI image helper (also importable) ─────────────────────────────────────────

async def generate_ai_image_b64(topic: str) -> tuple[str | None, str, str]:
    """Return (base64_png_or_None, prompt, source)."""
    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        return None, "", "unavailable"
    desc   = DALLE_DESCS.get(topic, f"professional trading chart about {topic}")
    prompt = (
        f"Dark fintech aesthetic, vertical format 9:16. "
        f"Professional trading dashboard showing {desc}. "
        f"Deep navy blue background (#0A0E1A), glowing cyan and purple neon accents. "
        f"Clean modern UI with financial charts, no text, no watermarks. "
        f"Cinematic lighting, ultra-sharp professional fintech screenshot aesthetic."
    )
    try:
        import openai as _openai
        client   = _openai.AsyncOpenAI(api_key=api_key)
        response = await client.images.generate(
            model="dall-e-3", prompt=prompt,
            size="1024x1792", quality="hd", style="natural", n=1,
        )
        img_url = response.data[0].url
        async with httpx.AsyncClient(timeout=30.0) as http:
            raw = await http.get(img_url)
        return "data:image/png;base64," + base64.b64encode(raw.content).decode(), prompt, "dall-e-3"
    except Exception:
        return None, prompt, "unavailable"


# ── Pydantic ──────────────────────────────────────────────────────────────────

class VisualBody(BaseModel):
    topic:    Optional[str] = None
    category: Optional[str] = None


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/pieces/{piece_id}/chart")
async def endpoint_chart(
    piece_id: str,
    body: VisualBody,
    format: str = Query("portrait", pattern="^(portrait|landscape|square)$"),
    current_user: dict = Depends(get_admin_user),
):
    topic = body.topic
    if not topic and piece_id != "preview":
        rows = await execute_query("SELECT topic FROM content_pieces WHERE id = ?", (piece_id,))
        if rows:
            topic = rows[0]["topic"]
    image, source = await generate_chart_b64(topic or "RSI", format)
    return {"image": image, "source": source}


@router.post("/pieces/{piece_id}/screenshot")
async def endpoint_screenshot(
    piece_id: str,
    body: VisualBody,
    format: str = Query("portrait", pattern="^(portrait|landscape|square)$"),
    current_user: dict = Depends(get_admin_user),
):
    page_slug = "/"
    if piece_id != "preview":
        rows = await execute_query(
            "SELECT site_page_url FROM content_pieces WHERE id = ?", (piece_id,)
        )
        if rows and rows[0].get("site_page_url"):
            page_slug = rows[0]["site_page_url"]
    image, source, error = await take_screenshot_b64(page_slug, format)
    resp: dict = {"image": image, "source": source}
    if error:
        resp["error"] = error
    return resp


@router.get("/pieces/{piece_id}/stock-photos")
async def endpoint_stock_photos(
    piece_id: str,
    current_user: dict = Depends(get_admin_user),
):
    topic = None
    if piece_id != "preview":
        rows = await execute_query("SELECT topic FROM content_pieces WHERE id = ?", (piece_id,))
        if rows:
            topic = rows[0]["topic"]
    query   = UNSPLASH_QUERIES.get(topic or "", "fintech financial technology trading")
    api_key = os.getenv("UNSPLASH_ACCESS_KEY", "")
    if not api_key:
        return {"photos": [], "error": "UNSPLASH_ACCESS_KEY non configuré"}
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                "https://api.unsplash.com/search/photos",
                params={"query": query, "orientation": "portrait", "per_page": 6},
                headers={"Authorization": f"Client-ID {api_key}"},
            )
        if resp.status_code != 200:
            return {"photos": [], "error": f"Unsplash {resp.status_code}"}
        data = resp.json()
        photos = [
            {
                "id":         p["id"],
                "url":        p["urls"]["regular"],
                "thumb":      p["urls"]["thumb"],
                "credit":     p["user"]["name"],
                "credit_url": p["user"]["links"]["html"],
            }
            for p in data.get("results", [])
        ]
        return {"photos": photos}
    except Exception as exc:
        return {"photos": [], "error": str(exc)}


@router.post("/pieces/{piece_id}/ai-image")
async def endpoint_ai_image(
    piece_id: str,
    body: VisualBody,
    current_user: dict = Depends(get_admin_user),
):
    topic = body.topic
    if not topic and piece_id != "preview":
        rows = await execute_query("SELECT topic FROM content_pieces WHERE id = ?", (piece_id,))
        if rows:
            topic = rows[0]["topic"]
    if not topic:
        topic = "RSI"

    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        return {"image": None, "source": "unavailable", "error": "OPENAI_API_KEY non configuré"}

    desc   = DALLE_DESCS.get(topic, f"professional trading chart about {topic}")
    prompt = (
        f"Dark fintech aesthetic, vertical format 9:16. "
        f"Professional trading dashboard showing {desc}. "
        f"Deep navy blue background (#0A0E1A), glowing cyan and purple neon accents. "
        f"Clean modern UI with financial charts, no text, no watermarks. "
        f"Cinematic lighting, ultra-sharp professional fintech screenshot aesthetic."
    )
    try:
        import openai as _openai
        client   = _openai.AsyncOpenAI(api_key=api_key)
        response = await client.images.generate(
            model="dall-e-3", prompt=prompt,
            size="1024x1792", quality="hd", style="natural", n=1,
        )
        img_url = response.data[0].url
        async with httpx.AsyncClient(timeout=30.0) as http:
            raw = await http.get(img_url)
        image = "data:image/png;base64," + base64.b64encode(raw.content).decode()
        return {"image": image, "source": "dall-e-3", "prompt": prompt}
    except ImportError:
        return {"image": None, "source": "unavailable", "error": "Package openai non installé"}
    except Exception as exc:
        return {"image": None, "source": "unavailable", "error": str(exc)}


@router.post("/pieces/{piece_id}/screencast")
async def endpoint_screencast(
    piece_id: str,
    body: VisualBody,
    current_user: dict = Depends(get_admin_user),
):
    return {
        "video": None,
        "source": "unavailable",
        "error": "Le screencast nécessite ffmpeg + Chromium. Disponible prochainement.",
    }
