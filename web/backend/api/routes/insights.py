"""
Admin Insights Engine — /api/admin/insights/*
Generates market analysis scripts + charts for TikTok/Reels content.
ADMIN ONLY — protected by the existing admin RBAC middleware.
"""
import asyncio
import logging
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..routes.auth import get_current_user
from ..routes.admin import check_if_admin

from ..services.market_data import get_market_snapshot, get_fear_and_greed, compute_heat_score
from ..services.news_fetcher import get_macro_news
from ..services.script_generator import generate_script
from ..services.chart_generator import generate_all_charts

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# Admin guard
# ---------------------------------------------------------------------------
async def require_admin(user: dict = Depends(get_current_user)):
    if not await check_if_admin(user):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------
class GenerateRequest(BaseModel):
    period: str = "week"          # day | week | month
    mode: str = "A"               # A (60-sec) | B (3-part series)
    custom_context: str = ""      # Optional admin notes
    include_charts: bool = True   # Set false for faster generation


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@router.get("/snapshot")
async def get_snapshot(
    period: str = "week",
    _user: dict = Depends(require_admin),
):
    """
    Returns market snapshot + news + sentiment.
    Lightweight endpoint — called on page load.
    """
    try:
        snapshot, news, fear_greed = await asyncio.gather(
            get_market_snapshot(period),
            get_macro_news(max_items=8),
            get_fear_and_greed(),
        )
        heat_score = compute_heat_score(snapshot, fear_greed)

        return {
            "period": period,
            "snapshot": snapshot,
            "news": news,
            "fear_greed": fear_greed,
            "heat_score": heat_score,
        }
    except Exception as e:
        logger.error("Snapshot failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Snapshot error: {str(e)}")


@router.post("/generate")
async def generate_content(
    req: GenerateRequest,
    _user: dict = Depends(require_admin),
):
    """
    Full generation: script (Gemini or template) + optional charts.
    Returns script JSON + base64 chart images.
    """
    try:
        # Fetch all data in parallel
        snapshot, news, fear_greed = await asyncio.gather(
            get_market_snapshot(req.period),
            get_macro_news(max_items=8),
            get_fear_and_greed(),
        )
        heat_score = compute_heat_score(snapshot, fear_greed)

        # Generate script + charts in parallel
        script_coro = generate_script(
            snapshot=snapshot,
            news=news,
            fear_greed=fear_greed,
            heat_score=heat_score,
            period=req.period,
            mode=req.mode,
            custom_context=req.custom_context,
        )

        if req.include_charts:
            script_data, charts = await asyncio.gather(
                script_coro,
                generate_all_charts(snapshot, fear_greed, req.period),
            )
        else:
            script_data = await script_coro
            charts = {}

        return {
            "period": req.period,
            "mode": req.mode,
            "heat_score": heat_score,
            "fear_greed": fear_greed,
            "script": script_data,
            "charts": charts,
            "news_used": news[:4],
        }

    except Exception as e:
        logger.error("Generation failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Generation error: {str(e)}")


@router.get("/charts")
async def get_charts_only(
    period: str = "week",
    _user: dict = Depends(require_admin),
):
    """
    Generate only the charts (no script). Faster for visual refresh.
    """
    try:
        snapshot, fear_greed = await asyncio.gather(
            get_market_snapshot(period),
            get_fear_and_greed(),
        )
        charts = await generate_all_charts(snapshot, fear_greed, period)
        return {"charts": charts, "period": period}
    except Exception as e:
        logger.error("Charts generation failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))
