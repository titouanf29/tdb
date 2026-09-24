"""
Welcome-back recap — "voici ce qui a bougé depuis votre dernière visite".

The dashboard keeps a per-user snapshot of the portfolio (equity, open
positions P&L, favorites prices). It is refreshed while the user is active
and frozen when they leave (a beacon fires on tab hide/close). On the next
dashboard load, if enough time has passed, we diff the current live state
against that frozen snapshot and return a summary + a warm message that the
frontend plays once as an animation.

Design notes:
- The welcome-back GET resets the baseline to "now" after computing, so a
  refresh in the same session never replays it (gap ≈ 0 → no summary).
- Rule-based message (no LLM): deterministic, instant, zero cost, testable.
"""
import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from ..database import execute_query, execute_write
from .auth import get_current_user
from ._prices import fetch_prices
# The wallet/positions tables are keyed by wallet.get_user_id ("web_{id}"
# for email accounts) while web_favorites uses the raw id. We MUST reuse
# the exact resolvers or the queries silently return nothing → 0% recap.
from .wallet import get_user_id as _wallet_uid
from .favorites import get_user_id as _fav_uid
from ._fr import nombre_fr

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

# Minimum absence before we bother showing a recap (avoids firing on refreshes)
MIN_GAP_MINUTES = 30
# Only surface items that actually moved
MIN_MOVE_PCT = 0.05


async def _ensure_table() -> None:
    await execute_write(
        """CREATE TABLE IF NOT EXISTS dashboard_snapshots (
            user_id TEXT PRIMARY KEY,
            snapshot_at TEXT NOT NULL,
            equity REAL NOT NULL DEFAULT 0,
            positions_json TEXT NOT NULL DEFAULT '[]',
            favorites_json TEXT NOT NULL DEFAULT '[]',
            updated_at TEXT NOT NULL
        )""",
        (),
    )


def _uid(user: dict):
    return user.get("id")


async def _compute_state(current_user: dict) -> dict:
    """Current live portfolio state: equity, per-position P&L, favorite prices."""
    wuid = _wallet_uid(current_user)   # "web_{id}" for email accounts
    fuid = _fav_uid(current_user)      # raw id

    wallets = await execute_query("SELECT balance FROM wallet WHERE user_id = ?", (wuid,))
    balance = float(wallets[0]["balance"]) if wallets else 10000.0

    positions = await execute_query(
        "SELECT symbol, direction, entry_price, quantity, amount FROM positions "
        "WHERE user_id = ? AND status = 'open' AND (archived IS NULL OR archived = 0)",
        (wuid,),
    )
    favorites = await execute_query(
        "SELECT symbol FROM web_favorites WHERE user_id = ?", (fuid,)
    )

    symbols = list({p["symbol"] for p in positions} | {f["symbol"] for f in favorites})
    prices = await fetch_prices(symbols) if symbols else {}

    invested = 0.0
    total_pnl = 0.0
    pos_state = []
    for p in positions:
        sym = p["symbol"]
        entry = float(p["entry_price"] or 0)
        qty = float(p["quantity"] or 0)
        amount = float(p["amount"] or 0)
        pr = prices.get(sym) or {}
        has_price = bool(pr.get("price"))
        cur = float(pr["price"]) if has_price else entry
        pnl = (cur - entry) * qty if p["direction"] == "LONG" else (entry - cur) * qty
        invested += amount
        total_pnl += pnl
        # `stale` marks a position whose live price could not be fetched: its
        # P&L falls back to entry (=0) and must NOT be reported as "flat".
        pos_state.append({"symbol": sym, "price": round(cur, 4), "pnl": round(pnl, 2), "stale": not has_price})

    fav_state = []
    for f in favorites:
        sym = f["symbol"]
        pr = prices.get(sym) or {}
        if pr.get("price"):
            fav_state.append({
                "symbol": sym,
                "price": round(float(pr["price"]), 4),
                "change": round(float(pr.get("change", 0) or 0), 2),
            })

    return {
        "equity": round(balance + invested + total_pnl, 2),
        "positions": pos_state,
        "favorites": fav_state,
    }


async def _write_snapshot(user_id, state: dict) -> None:
    now = datetime.now(timezone.utc).isoformat()
    await execute_write(
        """INSERT INTO dashboard_snapshots (user_id, snapshot_at, equity, positions_json, favorites_json, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(user_id) DO UPDATE SET
             snapshot_at=excluded.snapshot_at, equity=excluded.equity,
             positions_json=excluded.positions_json, favorites_json=excluded.favorites_json,
             updated_at=excluded.updated_at""",
        (str(user_id), now, state["equity"],
         json.dumps(state["positions"]), json.dumps(state["favorites"]), now),
    )


def _away_label(minutes: float, lang: str) -> str:
    fr = lang != "en"
    if minutes < 90:
        n = max(1, round(minutes))
        return f"{n} minute{'s' if n > 1 else ''}" if fr else f"{n} minute{'s' if n > 1 else ''}"
    hours = minutes / 60
    if hours < 36:
        n = round(hours)
        return f"{n} heure{'s' if n > 1 else ''}" if fr else f"{n} hour{'s' if n > 1 else ''}"
    days = round(hours / 24)
    return f"{days} jour{'s' if days > 1 else ''}" if fr else f"{days} day{'s' if days > 1 else ''}"


def _build_message(equity_pct: float, market_change: float, best, worst, away: str,
                   name: str, lang: str, opened=None, closed=None) -> str:
    """Message about MARKET movement only — never about deposits or trades
    the user made themselves (those are reported separately)."""
    fr = lang != "en"
    opened = opened or []
    closed = closed or []
    hello = f"Bon retour {name} !" if fr else f"Welcome back {name}!"

    def _extra() -> str:
        bits = []
        if opened:
            bits.append((f"{len(opened)} position{'s' if len(opened) > 1 else ''} ouverte{'s' if len(opened) > 1 else ''} entre-temps"
                         if fr else f"{len(opened)} position{'s' if len(opened) > 1 else ''} opened since"))
        if closed:
            bits.append((f"{len(closed)} clôturée{'s' if len(closed) > 1 else ''}"
                         if fr else f"{len(closed)} closed"))
        return (" (" + ", ".join(bits) + ")") if bits else ""

    if abs(equity_pct) < 0.15 and abs(market_change) < 1:
        if fr:
            return f"{hello} Peu de mouvement pendant votre absence ({away}) — vos positions sont restées globalement stables.{_extra()}"
        return f"{hello} Not much moved while you were away ({away}) — your positions stayed roughly flat.{_extra()}"

    if equity_pct >= 0:
        base = (f"{hello} Sur les {away} écoulées, vos positions ont gagné {nombre_fr(market_change, 2, signe=True)} ({nombre_fr(equity_pct, 1, signe=True)}% du portefeuille)."
                if fr else
                f"{hello} Over the past {away}, your positions gained {market_change:+.2f} ({equity_pct:+.1f}% of the portfolio).")
        if best:
            base += (f" {best['symbol']} a été votre meilleur mouvement ({nombre_fr(best['pct'], 1, signe=True)}%)."
                     if fr else f" {best['symbol']} was your best move ({best['pct']:+.1f}%).")
        return base + _extra()

    base = (f"{hello} Pendant votre absence ({away}), vos positions ont perdu {nombre_fr(market_change, 2, signe=True)} ({nombre_fr(equity_pct, 1, signe=True)}% du portefeuille)."
            if fr else
            f"{hello} While you were away ({away}), your positions lost {market_change:+.2f} ({equity_pct:+.1f}% of the portfolio).")
    if worst:
        base += (f" {worst['symbol']} a le plus pesé ({nombre_fr(worst['pct'], 1, signe=True)}%) — rien d'alarmant, c'est du paper trading."
                 if fr else f" {worst['symbol']} weighed most ({worst['pct']:+.1f}%) — nothing to worry about, it's paper trading.")
    return base + _extra()


@router.get("/welcome-back")
@limiter.limit("30/minute")
async def welcome_back(
    request: Request,
    lang: str = Query(default="fr"),
    # How long the user must have been away before a recap is worth showing.
    # Driven by the user's preference (every visit / daily / weekly).
    min_gap_minutes: int = Query(default=MIN_GAP_MINUTES, ge=MIN_GAP_MINUTES, le=43200),
    current_user: dict = Depends(get_current_user),
):
    await _ensure_table()
    min_gap = max(MIN_GAP_MINUTES, min_gap_minutes)
    user_id = _uid(current_user)
    name = current_user.get("first_name") or current_user.get("username") or ""

    prev_rows = await execute_query(
        "SELECT snapshot_at, equity, positions_json, favorites_json FROM dashboard_snapshots WHERE user_id = ?",
        (str(user_id),),
    )
    current = await _compute_state(current_user)

    result = {"has_summary": False}

    if prev_rows:
        prev = prev_rows[0]
        try:
            snap_at = datetime.fromisoformat(prev["snapshot_at"])
            if snap_at.tzinfo is None:
                snap_at = snap_at.replace(tzinfo=timezone.utc)
            gap_min = (datetime.now(timezone.utc) - snap_at).total_seconds() / 60
        except Exception:
            gap_min = 0

        has_content = bool(current["positions"] or current["favorites"])
        if gap_min >= min_gap and has_content:
            prev_pos = {p["symbol"]: p for p in json.loads(prev["positions_json"] or "[]")}
            prev_fav = {f["symbol"]: f for f in json.loads(prev["favorites_json"] or "[]")}

            position_moves = []
            for p in current["positions"]:
                bp = prev_pos.get(p["symbol"])
                if not bp:
                    continue
                # No live price → we cannot say anything truthful about it
                if p.get("stale") or bp.get("stale"):
                    continue
                base = bp.get("price") or 0
                pct = ((p["price"] - base) / base * 100) if base else 0
                pnl_delta = round(p["pnl"] - bp.get("pnl", 0), 2)
                # A position that didn't move is not "a move" — skip the flat ones
                if abs(pct) < MIN_MOVE_PCT and abs(pnl_delta) < 0.5:
                    continue
                position_moves.append({
                    "symbol": p["symbol"],
                    "pnl_now": p["pnl"], "pnl_before": bp.get("pnl", 0),
                    "pnl_delta": pnl_delta,
                    "price_now": p["price"], "price_before": base,
                    "pct_move": round(pct, 2),
                })
            favorite_moves = []
            for f in current["favorites"]:
                bf = prev_fav.get(f["symbol"])
                if not bf:
                    continue
                base = bf.get("price") or 0
                pct = ((f["price"] - base) / base * 100) if base else 0
                if abs(pct) >= MIN_MOVE_PCT:
                    favorite_moves.append({
                        "symbol": f["symbol"],
                        "price_now": f["price"], "price_before": base,
                        "pct_move": round(pct, 2),
                    })

            # ── Market-only change ────────────────────────────────────────
            # The raw equity difference is NOT performance: adding funds,
            # opening or closing a position all move equity without the
            # market moving. We therefore report the sum of unrealized P&L
            # deltas on positions held in BOTH snapshots — that is the part
            # the market actually produced — and surface opened/closed
            # positions separately so the numbers are explainable.
            held_both = [m for m in position_moves]
            market_change = round(sum(m["pnl_delta"] for m in held_both), 2)

            prev_syms = set(prev_pos.keys())
            cur_syms = {p["symbol"] for p in current["positions"]}
            opened_positions = sorted(cur_syms - prev_syms)
            closed_positions = sorted(prev_syms - cur_syms)

            equity_before = float(prev["equity"] or 0)
            # Percentage is expressed against the portfolio value at the time
            # of the baseline, so deposits made while away don't inflate it.
            equity_pct = (market_change / equity_before * 100) if equity_before else 0
            equity_delta = market_change

            # Best / worst across everything that moved
            all_moves = ([{"symbol": m["symbol"], "pct": m["pct_move"]} for m in position_moves] +
                         [{"symbol": m["symbol"], "pct": m["pct_move"]} for m in favorite_moves])
            best = max(all_moves, key=lambda m: m["pct"], default=None)
            worst = min(all_moves, key=lambda m: m["pct"], default=None)
            if best and best["pct"] <= 0:
                best = None
            if worst and worst["pct"] >= 0:
                worst = None

            away = _away_label(gap_min, lang)
            position_moves.sort(key=lambda m: -abs(m["pct_move"]))
            favorite_moves.sort(key=lambda m: -abs(m["pct_move"]))

            # Only surface a recap when something MEANINGFUL moved — never a
            # near-flat "0%" card. Either the portfolio shifted ≥0.1%, or at
            # least one asset moved ≥0.3%.
            max_move = max([abs(m["pct_move"]) for m in position_moves + favorite_moves], default=0.0)
            meaningful = abs(equity_pct) >= 0.1 or max_move >= 0.3
            if meaningful:
                result = {
                    "has_summary": True,
                    "first_name": name,
                    "away_minutes": int(gap_min),
                    "away_label": away,
                    "currency": "USD",
                    "equity": {
                        "now": current["equity"],
                        "before": round(equity_before, 2),
                        "change": equity_delta,
                        "change_pct": round(equity_pct, 2),
                    },
                    "positions": position_moves[:5],
                    "favorites": favorite_moves[:5],
                    "opened_positions": opened_positions,
                    "closed_positions": closed_positions,
                    "best": best,
                    "worst": worst,
                    "message": _build_message(equity_pct, market_change, best, worst,
                                              away, name, lang, opened_positions, closed_positions),
                }

    # Reset the baseline ONLY when a recap was actually shown (or when there
    # was none yet). Otherwise the gap must keep accumulating — with a daily
    # or weekly preference, resetting on every visit would mean the threshold
    # is never reached and the recap never appears.
    if result["has_summary"] or not prev_rows:
        await _write_snapshot(user_id, current)
    return result


@router.post("/activity")
@limiter.limit("60/minute")
async def record_activity(
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """Beacon: freeze the current portfolio state as the baseline for the
    next visit. Called on tab hide / unload so 'last active' is captured."""
    await _ensure_table()
    user_id = _uid(current_user)
    state = await _compute_state(current_user)
    await _write_snapshot(user_id, state)
    return {"ok": True}
