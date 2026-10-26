"""
Chart generator — produces TikTok/Reels-ready charts as base64 PNG images.
Uses matplotlib with CaptentDB dark branding. No external API needed.
"""
import base64
import io
import logging
import math
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# CaptentDB brand colors
BG_DARK = "#0D1117"
BG_CARD = "#0D1E30"
GOLD = "#E8A820"
GOLD_LIGHT = "#FFD700"
BLUE = "#638CFF"
GREEN = "#10B981"
RED = "#EF4444"
MUTED = "#6B7280"
WHITE = "#F8FAFC"
ORANGE = "#F59E0B"


def _get_matplotlib():
    """Lazy import so the server still starts if matplotlib is missing."""
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import matplotlib.patches as mpatches
    return plt, mpatches


def _fig_to_b64(fig) -> str:
    plt, _ = _get_matplotlib()
    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight", facecolor=BG_DARK, dpi=150)
    buf.seek(0)
    b64 = base64.b64encode(buf.read()).decode("utf-8")
    plt.close(fig)
    return b64


def _add_watermark(ax, text="captentdb.fr"):
    ax.text(
        0.99, 0.01, text,
        transform=ax.transAxes,
        fontsize=7, color=GOLD, alpha=0.6,
        ha="right", va="bottom",
        fontfamily="monospace",
    )


def generate_performance_chart(snapshot: Dict[str, Any], period: str = "week") -> str:
    """
    Horizontal bar chart — % performance for all key assets, grouped by region.
    Format: 16:9 landscape (good as thumbnail / video overlay).
    """
    try:
        plt, _ = _get_matplotlib()

        # Collect data
        bars = []
        region_colors = {
            "europe": BLUE,
            "usa": GREEN,
            "crypto": ORANGE,
            "commodities": GOLD,
        }

        for region_key, region_data in snapshot.items():
            color = region_colors.get(region_key, MUTED)
            assets = region_data.get("assets", [])
            # Show top 3 and flop 1 per region
            selected = assets[:2] + (assets[-1:] if len(assets) > 2 else [])
            for asset in selected:
                bars.append({
                    "label": f"{asset['name']} ({region_data['flag']})",
                    "value": asset["change_pct"],
                    "color": GREEN if asset["change_pct"] >= 0 else RED,
                    "region": region_key,
                })

        # Sort by value
        bars.sort(key=lambda x: x["value"])

        fig, ax = plt.subplots(figsize=(12, 7))
        fig.patch.set_facecolor(BG_DARK)
        ax.set_facecolor(BG_DARK)

        labels = [b["label"] for b in bars]
        values = [b["value"] for b in bars]
        colors = [b["color"] for b in bars]

        y_pos = range(len(bars))
        barh = ax.barh(y_pos, values, color=colors, height=0.6, alpha=0.9)

        # Value labels
        for i, (bar, val) in enumerate(zip(barh, values)):
            sign = "+" if val >= 0 else ""
            ax.text(
                val + (0.1 if val >= 0 else -0.1), i,
                f"{sign}{val:.1f}%",
                va="center", ha="left" if val >= 0 else "right",
                color=WHITE, fontsize=8, fontweight="bold",
            )

        ax.set_yticks(y_pos)
        ax.set_yticklabels(labels, color=WHITE, fontsize=9)
        ax.axvline(0, color=MUTED, linewidth=0.8, alpha=0.5)
        ax.set_xlabel("Performance (%)", color=MUTED, fontsize=9)
        ax.tick_params(colors=MUTED, labelsize=8)
        for spine in ax.spines.values():
            spine.set_edgecolor(MUTED)
            spine.set_alpha(0.3)

        period_label = {"day": "24h", "week": "7 jours", "month": "30 jours"}.get(period, period)
        ax.set_title(
            f"Performance des marchés — {period_label}",
            color=GOLD, fontsize=13, fontweight="bold", pad=12,
        )

        # Legend
        legend_items = [
            plt.Rectangle((0, 0), 1, 1, fc=GREEN, label="Hausse"),
            plt.Rectangle((0, 0), 1, 1, fc=RED, label="Baisse"),
        ]
        ax.legend(handles=legend_items, loc="lower right", facecolor=BG_CARD,
                  edgecolor=MUTED, labelcolor=WHITE, fontsize=8)

        _add_watermark(ax)
        fig.tight_layout()
        return _fig_to_b64(fig)

    except Exception as e:
        logger.error("generate_performance_chart failed: %s", e)
        return ""


def generate_price_chart(asset: Dict[str, Any], title: str = "") -> str:
    """
    Line + area chart for a single asset's OHLCV data.
    Format: 9:16 portrait (TikTok native).
    """
    try:
        plt, _ = _get_matplotlib()
        ohlcv = asset.get("ohlcv", [])
        if not ohlcv:
            return ""

        dates = list(range(len(ohlcv)))
        closes = [c["close"] for c in ohlcv]
        trend_up = closes[-1] >= closes[0]
        line_color = GREEN if trend_up else RED

        fig, ax = plt.subplots(figsize=(6, 10))
        fig.patch.set_facecolor(BG_DARK)
        ax.set_facecolor(BG_DARK)

        # Area fill
        ax.fill_between(dates, closes, min(closes) * 0.995,
                        color=line_color, alpha=0.12)
        ax.plot(dates, closes, color=line_color, linewidth=2.5, zorder=5)

        # Last price annotation
        last = closes[-1]
        change = asset.get("change_pct", 0)
        sign = "+" if change >= 0 else ""
        ax.annotate(
            f"{last:,.2f}\n{sign}{change:.1f}%",
            xy=(dates[-1], last),
            fontsize=13, color=line_color, fontweight="bold",
            ha="center", va="bottom",
        )

        # RSI badge
        rsi = asset.get("rsi", 50)
        rsi_color = RED if rsi > 70 else (GREEN if rsi < 30 else WHITE)
        ax.text(0.05, 0.96, f"RSI {rsi:.0f}", transform=ax.transAxes,
                color=rsi_color, fontsize=10, fontweight="bold", va="top")

        ax.set_xticks([])
        ax.tick_params(colors=MUTED, labelsize=8)
        for spine in ax.spines.values():
            spine.set_edgecolor(MUTED)
            spine.set_alpha(0.2)

        chart_title = title or asset.get("name", "")
        ax.set_title(chart_title, color=GOLD, fontsize=14, fontweight="bold", pad=10)

        _add_watermark(ax)
        fig.tight_layout()
        return _fig_to_b64(fig)

    except Exception as e:
        logger.error("generate_price_chart failed: %s", e)
        return ""


def generate_fear_greed_gauge(value: int, label: str = "") -> str:
    """
    Semi-circular gauge for Fear & Greed index (0-100).
    Format: square 1:1.
    """
    try:
        plt, mpatches = _get_matplotlib()

        fig, ax = plt.subplots(figsize=(6, 6))
        fig.patch.set_facecolor(BG_DARK)
        ax.set_facecolor(BG_DARK)
        ax.set_aspect("equal")

        # Draw colored arc segments
        segments = [
            (0, 20, RED, "Peur extrême"),
            (20, 40, ORANGE, "Peur"),
            (40, 60, "#FACC15", "Neutre"),
            (60, 80, "#86EFAC", "Avidité"),
            (80, 100, GREEN, "Avidité extrême"),
        ]

        for start_val, end_val, color, _ in segments:
            start_angle = 180 - (start_val / 100 * 180)
            end_angle = 180 - (end_val / 100 * 180)
            theta1, theta2 = min(start_angle, end_angle), max(start_angle, end_angle)
            wedge = mpatches.Wedge(
                (0.5, 0.25), 0.40, theta1, theta2,
                width=0.12, facecolor=color, edgecolor=BG_DARK, linewidth=2,
                transform=ax.transAxes,
            )
            ax.add_patch(wedge)

        # Needle
        angle_rad = math.radians(180 - (value / 100 * 180))
        cx, cy = 0.5, 0.25
        length = 0.32
        nx = cx + length * math.cos(angle_rad)
        ny = cy + length * math.sin(angle_rad)
        ax.annotate(
            "", xy=(nx, ny), xytext=(cx, cy),
            xycoords="axes fraction", textcoords="axes fraction",
            arrowprops=dict(arrowstyle="-|>", color=WHITE, lw=2.5),
        )
        # Center dot
        circle = mpatches.Circle((cx, cy), 0.018, color=WHITE, transform=ax.transAxes, zorder=10)
        ax.add_patch(circle)

        # Value text
        gauge_label = label or _fg_label(value)
        ax.text(0.5, 0.52, str(value), transform=ax.transAxes,
                fontsize=36, fontweight="bold", color=WHITE, ha="center", va="center")
        ax.text(0.5, 0.65, gauge_label, transform=ax.transAxes,
                fontsize=13, color=_fg_color(value), ha="center", va="center", fontweight="bold")
        ax.text(0.5, 0.08, "Fear & Greed Index", transform=ax.transAxes,
                fontsize=10, color=MUTED, ha="center")

        ax.set_xlim(0, 1)
        ax.set_ylim(0, 1)
        ax.axis("off")
        ax.set_title("Sentiment de marché", color=GOLD, fontsize=13, fontweight="bold", pad=8)
        _add_watermark(ax)
        return _fig_to_b64(fig)

    except Exception as e:
        logger.error("generate_fear_greed_gauge failed: %s", e)
        return ""


def generate_sector_heatmap(snapshot: Dict[str, Any]) -> str:
    """
    Grid heatmap of all regions × assets, colored by % change.
    Format: 16:9.
    """
    try:
        plt, _ = _get_matplotlib()
        import matplotlib.colors as mcolors

        # Build grid data
        region_keys = list(snapshot.keys())
        max_assets = max(len(snapshot[r]["assets"]) for r in region_keys)

        fig, axes = plt.subplots(1, len(region_keys), figsize=(14, 8))
        fig.patch.set_facecolor(BG_DARK)

        if len(region_keys) == 1:
            axes = [axes]

        cmap = mcolors.LinearSegmentedColormap.from_list(
            "tdb", [RED, "#1F2937", GREEN]
        )

        for ax, region_key in zip(axes, region_keys):
            ax.set_facecolor(BG_DARK)
            region = snapshot[region_key]
            assets = region["assets"][:8]  # Max 8 per column

            for i, asset in enumerate(assets):
                val = asset["change_pct"]
                norm_val = max(0, min(1, (val + 10) / 20))  # -10%=red, +10%=green
                color = cmap(norm_val)

                rect = plt.Rectangle((0, i), 1, 0.85, facecolor=color, edgecolor=BG_DARK, linewidth=1)
                ax.add_patch(rect)

                sign = "+" if val >= 0 else ""
                ax.text(0.5, i + 0.55, asset["name"][:12],
                        ha="center", va="center", color=WHITE,
                        fontsize=8, fontweight="bold")
                ax.text(0.5, i + 0.2, f"{sign}{val:.1f}%",
                        ha="center", va="center", color=WHITE, fontsize=7)

            ax.set_xlim(0, 1)
            ax.set_ylim(-0.2, max(len(assets), 1))
            ax.axis("off")
            ax.set_title(f"{region['flag']} {region['label']}",
                         color=GOLD, fontsize=11, fontweight="bold")

        fig.suptitle("Heatmap Marchés — captentdb.fr",
                     color=GOLD, fontsize=13, fontweight="bold", y=1.01)
        fig.tight_layout()
        return _fig_to_b64(fig)

    except Exception as e:
        logger.error("generate_sector_heatmap failed: %s", e)
        return ""


def _fg_label(v: int) -> str:
    if v <= 20: return "Peur extrême"
    if v <= 40: return "Peur"
    if v <= 60: return "Neutre"
    if v <= 80: return "Avidité"
    return "Avidité extrême"


def _fg_color(v: int) -> str:
    if v <= 20: return RED
    if v <= 40: return ORANGE
    if v <= 60: return "#FACC15"
    if v <= 80: return "#86EFAC"
    return GREEN


async def generate_all_charts(snapshot: Dict, fear_greed: Dict, period: str) -> Dict[str, str]:
    """
    Generates all 4 charts and returns them as base64 PNG strings.
    Run in thread executor to avoid blocking the event loop.
    """
    import asyncio
    loop = asyncio.get_event_loop()
    from concurrent.futures import ThreadPoolExecutor

    with ThreadPoolExecutor(max_workers=4) as pool:
        perf_fut = loop.run_in_executor(pool, generate_performance_chart, snapshot, period)
        heatmap_fut = loop.run_in_executor(pool, generate_sector_heatmap, snapshot)
        gauge_fut = loop.run_in_executor(
            pool, generate_fear_greed_gauge,
            fear_greed.get("value", 50), fear_greed.get("label", "")
        )

        # Top asset chart (best performer across all regions)
        best_asset = None
        for region_data in snapshot.values():
            top = region_data.get("top")
            if top and (best_asset is None or top["change_pct"] > best_asset["change_pct"]):
                best_asset = top

        top_chart_fut = loop.run_in_executor(
            pool, generate_price_chart,
            best_asset or {}, f"Top — {best_asset['name']}" if best_asset else "Top actif"
        )

        perf, heatmap, gauge, top_chart = await asyncio.gather(
            perf_fut, heatmap_fut, gauge_fut, top_chart_fut
        )

    return {
        "performance": perf,
        "heatmap": heatmap,
        "fear_greed": gauge,
        "top_asset": top_chart,
    }
