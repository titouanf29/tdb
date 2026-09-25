"""
User routes — settings, profile, password, RGPD export & account deletion.
"""
import re
from datetime import datetime, timedelta, timezone
import json
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials
from jose import JWTError, jwt
from pydantic import BaseModel, Field
from slowapi import Limiter
from slowapi.util import get_remote_address

from ..database import execute_query, execute_write
from .auth import (
    regle_mot_de_passe,
    ACCESS_TOKEN_EXPIRE_HOURS,
    ALGORITHM,
    REMEMBER_ME_EXPIRE_DAYS,
    SECRET_KEY,
    create_access_token,
    get_current_user,
    hash_password,
    security,
    verify_password,
)

router = APIRouter()

# app.state.limiter and the RateLimitExceeded handler are registered in main.py,
# so a router-local Limiter works. Handlers decorated with @limiter.limit MUST
# take a parameter literally named `request: Request` — hence every Pydantic
# body parameter in this module is named `data`.
limiter = Limiter(key_func=get_remote_address)

VALID_STYLES     = {"scalp", "day", "swing", "long"}
VALID_RISKS      = {"conservative", "moderate", "aggressive", "very_aggressive"}
VALID_LEVELS     = {"beginner", "intermediate", "expert"}
VALID_THEMES     = {"dark", "light"}
VALID_LANGS      = {"fr", "en"}
VALID_CURRENCIES = {"EUR", "USD"}
VALID_LEVERAGES  = {"1", "2", "5", "10"}
VALID_ACCENTS    = {"blue", "purple", "teal", "orange", "pink"}
VALID_RECAPS     = {"off", "always", "daily", "weekly"}

# Older rows stored human-readable style labels; normalize them on read.
LEGACY_STYLE_MAP = {
    "Day Trading": "day",
    "Scalping": "scalp",
    "scalping": "scalp",
    "Swing Trading": "swing",
    "Long Term": "long",
    "Long Terme": "long",
}

SETTINGS_DEFAULTS = {
    "trading_style": "day",
    "risk_level": "moderate",
    "notifications_enabled": True,
    "theme": "dark",
    "language": "fr",
    "currency": "EUR",
    "default_leverage": "1",
    "accent_color": "blue",
    "recap_frequency": "always",
    "broker": "none",
    "order_mode": "cfd",
    "order_fee": "0",
}

# Le courtier réel, pour que le simulateur passe les ordres comme lui.
VALID_BROKERS = {"none", "trade_republic", "boursorama", "degiro", "cfd", "other"}
VALID_ORDER_MODES = {"cfd", "turbo"}
FRAIS_MAXI = 50.0


def _frais(value) -> str:
    """Des frais par ordre lisibles : un nombre entre 0 et 50, virgule acceptée."""
    try:
        v = float(str(value).replace(",", "."))
    except (TypeError, ValueError):
        return "0"
    if not (0 <= v <= FRAIS_MAXI):
        return "0"
    return f"{round(v, 2):g}"


def _clamp(value, allowed: set, fallback: str) -> str:
    """An out-of-range stored value must never reach the client."""
    return value if value in allowed else fallback


async def _safe_query(sql: str, params: tuple = ()) -> list:
    """Some tables are created lazily by their route module — tolerate absence."""
    try:
        return await execute_query(sql, params) or []
    except Exception:
        return []


async def _safe_write(sql: str, params: tuple = ()) -> None:
    try:
        await execute_write(sql, params)
    except Exception:
        pass


async def _read_settings(user_id: int) -> dict:
    """Single source of truth for the settings payload shape (GET and PUT)."""
    rows = await execute_query(
        "SELECT * FROM web_user_settings WHERE user_id = ?", (user_id,)
    )
    user_rows = await execute_query(
        "SELECT trading_level FROM web_users WHERE id = ?", (user_id,)
    )
    trading_level = user_rows[0].get("trading_level") if user_rows else None
    if trading_level not in VALID_LEVELS:
        trading_level = None

    row = rows[0] if rows else {}

    def g(col: str):
        val = row.get(col)
        return SETTINGS_DEFAULTS[col] if val is None else val

    raw_style = g("trading_style")
    style = LEGACY_STYLE_MAP.get(raw_style, raw_style)

    notif = row.get("notifications_enabled")
    return {
        "trading_style":         _clamp(style, VALID_STYLES, "day"),
        "risk_level":            _clamp(g("risk_level"), VALID_RISKS, "moderate"),
        "notifications_enabled": True if notif is None else bool(notif),
        "theme":                 _clamp(g("theme"), VALID_THEMES, "dark"),
        "language":              _clamp(g("language"), VALID_LANGS, "fr"),
        "currency":              _clamp(g("currency"), VALID_CURRENCIES, "EUR"),
        "default_leverage":      _clamp(str(g("default_leverage")), VALID_LEVERAGES, "1"),
        "accent_color":          _clamp(g("accent_color"), VALID_ACCENTS, "blue"),
        "recap_frequency":       _clamp(g("recap_frequency"), VALID_RECAPS, "always"),
        "broker":                _clamp(g("broker"), VALID_BROKERS, "none"),
        "order_mode":            _clamp(g("order_mode"), VALID_ORDER_MODES, "cfd"),
        "order_fee":             _frais(g("order_fee")),
        "trading_level":         trading_level,
        "updated_at":            row.get("updated_at"),
    }


class UpdateSettingsRequest(BaseModel):
    trading_style: Optional[str] = None
    risk_level: Optional[str] = None
    notifications_enabled: Optional[bool] = None
    theme: Optional[str] = None
    language: Optional[str] = None
    currency: Optional[str] = None
    default_leverage: Optional[str] = None
    accent_color: Optional[str] = None
    recap_frequency: Optional[str] = None
    trading_level: Optional[str] = None
    broker: Optional[str] = None
    order_mode: Optional[str] = None
    order_fee: Optional[str] = None


@router.get("/settings")
async def get_user_settings(current_user: dict = Depends(get_current_user)):
    """Get web user settings. No row → defaults (nothing is inserted)."""
    return await _read_settings(current_user["id"])


@router.put("/settings")
async def update_user_settings(
    data: UpdateSettingsRequest,
    current_user: dict = Depends(get_current_user),
):
    """Update web user settings (upsert). Returns the full reconciled settings."""
    user_id = current_user["id"]

    for field, allowed in [
        ("trading_style",   VALID_STYLES),
        ("risk_level",      VALID_RISKS),
        ("theme",           VALID_THEMES),
        ("language",        VALID_LANGS),
        ("currency",        VALID_CURRENCIES),
        ("default_leverage", VALID_LEVERAGES),
        ("accent_color",    VALID_ACCENTS),
        ("recap_frequency", VALID_RECAPS),
        ("trading_level",   VALID_LEVELS),
        ("broker",          VALID_BROKERS),
        ("order_mode",      VALID_ORDER_MODES),
    ]:
        value = getattr(data, field)
        if value is not None and value not in allowed:
            raise HTTPException(
                status_code=400,
                detail=f"Valeur invalide pour {field}. Valeurs acceptées : {sorted(allowed)}",
            )

    if data.order_fee is not None:
        brut = str(data.order_fee).replace(",", ".").strip()
        try:
            ok = 0 <= float(brut) <= FRAIS_MAXI
        except ValueError:
            ok = False
        if not ok:
            raise HTTPException(
                status_code=400,
                detail=f"Frais par ordre invalides : un montant entre 0 et {FRAIS_MAXI:g} €.",
            )
        data.order_fee = _frais(brut)

    # trading_level lives on web_users, not on the settings table
    if data.trading_level is not None:
        await execute_write(
            "UPDATE web_users SET trading_level = ? WHERE id = ?",
            (data.trading_level, user_id),
        )

    # Bare upsert: every other column has a DB default, so a trading_level-only
    # PUT can no longer reset trading_style/risk_level.
    await execute_write(
        "INSERT INTO web_user_settings (user_id) VALUES (?) ON CONFLICT (user_id) DO NOTHING",
        (user_id,),
    )

    # Fixed field → column mapping. Column names are never derived from input.
    # notifications_enabled == "show in-app price-alert notifications".
    SAFE_COLUMN_MAP = [
        ("trading_style",         data.trading_style),
        ("risk_level",            data.risk_level),
        ("notifications_enabled", None if data.notifications_enabled is None
                                  else (1 if data.notifications_enabled else 0)),
        ("theme",                 data.theme),
        ("language",              data.language),
        ("currency",              data.currency),
        ("default_leverage",      data.default_leverage),
        ("accent_color",          data.accent_color),
        ("recap_frequency",       data.recap_frequency),
        ("broker",                data.broker),
        ("order_mode",            data.order_mode),
        ("order_fee",             data.order_fee),
    ]
    updates, params = [], []
    for col_name, db_val in SAFE_COLUMN_MAP:
        if db_val is not None:
            updates.append(f"{col_name} = ?")
            params.append(db_val)
    if updates:
        updates.append("updated_at = ?")
        params.append(datetime.now(timezone.utc).isoformat())
        params.append(user_id)
        query = "UPDATE web_user_settings SET " + ", ".join(updates) + " WHERE user_id = ?"
        await execute_write(query, tuple(params))

    return {"success": True, "settings": await _read_settings(user_id)}


# === Profile ==================================================================

class UpdateProfileRequest(BaseModel):
    # The 2..40 rule is enforced in the handler (after .strip()) so the client
    # gets a 400 with a French message instead of a raw 422 validation array.
    display_name: str = Field(min_length=1, max_length=200)


@router.put("/profile")
@limiter.limit("10/minute")
async def update_profile(
    request: Request,
    data: UpdateProfileRequest,
    current_user: dict = Depends(get_current_user),
):
    """Update the free-text display name (web_users.first_name). username stays immutable."""
    name = data.display_name.strip()
    if len(name) < 2 or len(name) > 40 or any(c in name for c in "<>\n\r\t"):
        raise HTTPException(status_code=400, detail="Nom d'affichage invalide")

    await execute_write(
        "UPDATE web_users SET first_name = ? WHERE id = ?", (name, current_user["id"])
    )
    return {"success": True, "display_name": name}


# === Password =================================================================

class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    # min length 8 is enforced in the handler (400 + French message, not a 422);
    # 72 is bcrypt's hard input limit.
    new_password: str = Field(min_length=1, max_length=72)


@router.post("/change-password")
@limiter.limit("5/minute")
async def change_password(
    request: Request,
    data: ChangePasswordRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user: dict = Depends(get_current_user),
):
    """Change the account password and invalidate every other live session."""
    new = data.new_password
    # La même règle que la réinitialisation, écrite une seule fois (auth.py).
    erreur = regle_mot_de_passe(new)
    if erreur:
        raise HTTPException(status_code=400, detail=erreur)
    if new == data.current_password:
        raise HTTPException(
            status_code=400,
            detail="Le nouveau mot de passe doit être différent de l'actuel.",
        )

    # Never trust the bearer token alone.
    if not verify_password(data.current_password, current_user["password_hash"]):
        raise HTTPException(status_code=401, detail="Mot de passe actuel incorrect")

    uid = current_user["id"]
    changed_at = datetime.now(timezone.utc).isoformat()
    await execute_write(
        "UPDATE web_users SET password_hash = ?, password_changed_at = ? WHERE id = ?",
        (hash_password(new), changed_at, uid),
    )

    # Mint a replacement token so the caller isn't left holding one that
    # get_current_user will now reject.
    try:
        rm = bool(
            jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM]).get("rm", False)
        )
    except JWTError:
        rm = False
    expires = (
        timedelta(days=REMEMBER_ME_EXPIRE_DAYS) if rm
        else timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    )
    token = create_access_token(
        {"sub": str(uid), "rm": rm, "pwc": changed_at}, expires_delta=expires
    )
    return {"success": True, "access_token": token, "token_type": "bearer"}


# === RGPD =====================================================================

@router.get("/export")
@limiter.limit("3/minute")
async def export_user_data(
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """RGPD art. 20 — full portable export of the user's own data."""
    uid = current_user["id"]
    web_uid = f"web_{uid}"
    tuid = (str(uid), web_uid)

    wallet_rows = await _safe_query(
        "SELECT * FROM wallet WHERE user_id IN (?, ?)", tuid
    )

    # account is built by explicit key selection — password_hash must never leak.
    account = {
        "id": uid,
        "email": current_user.get("email"),
        "username": current_user.get("username"),
        "display_name": current_user.get("first_name"),
        "last_name": current_user.get("last_name"),
        "created_at": current_user.get("created_at"),
        "last_login": current_user.get("last_login"),
        "email_verified": bool(current_user.get("email_verified")),
        "trading_level": current_user.get("trading_level"),
        "is_premium": bool(current_user.get("is_premium")),
    }

    payload = {
        "export_version": 1,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "account": account,
        "settings": await _read_settings(uid),
        "wallet": wallet_rows[0] if wallet_rows else None,
        # TEXT user_id, "web_{id}" convention
        "positions": await _safe_query(
            "SELECT * FROM positions WHERE user_id IN (?, ?)", tuid),
        "real_positions": await _safe_query(
            "SELECT * FROM real_positions WHERE user_id IN (?, ?)", tuid),
        "journal": await _safe_query(
            "SELECT * FROM trading_journal WHERE user_id IN (?, ?)", tuid),
        # price_alerts uses the plain "{id}" convention (price_alerts._uid)
        "price_alerts": await _safe_query(
            "SELECT * FROM price_alerts WHERE user_id IN (?, ?)", tuid),
        # INTEGER user_id
        "favorites": await _safe_query(
            "SELECT * FROM web_favorites WHERE user_id = ?", (uid,)),
        "ai_chat": await _safe_query(
            "SELECT * FROM web_ai_chat WHERE user_id = ?", (uid,)),
        "notifications": await _safe_query(
            "SELECT * FROM user_notifications WHERE user_id = ?", (uid,)),
    }

    stamp = datetime.now(timezone.utc).strftime("%Y%m%d")
    filename = f"tdb-export-{current_user.get('username') or uid}-{stamp}.json"
    return JSONResponse(
        content=payload,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


class DeleteAccountRequest(BaseModel):
    password: str
    confirm: str


@router.delete("/me")
@limiter.limit("3/minute")
async def delete_account(
    request: Request,
    data: DeleteAccountRequest,
    current_user: dict = Depends(get_current_user),
):
    """RGPD art. 17 — permanently delete the account and cascade its data."""
    if data.confirm.strip().upper() not in {"SUPPRIMER", "DELETE"}:
        raise HTTPException(
            status_code=400,
            detail="Confirmation invalide. Tapez SUPPRIMER pour confirmer.",
        )
    if not verify_password(data.password, current_user["password_hash"]):
        raise HTTPException(status_code=401, detail="Mot de passe incorrect")

    uid = current_user["id"]
    tuid = (str(uid), f"web_{uid}")  # covers both TEXT conventions

    # TEXT user_id
    for tbl in ("positions", "real_positions", "trading_journal",
                "price_alerts", "dashboard_snapshots"):
        await _safe_write(f"DELETE FROM {tbl} WHERE user_id IN (?, ?)", tuid)
    await _safe_write("DELETE FROM wallet WHERE user_id IN (?, ?)", tuid)

    # INTEGER user_id
    for tbl in ("web_favorites", "web_ai_chat", "user_notifications",
                "user_changelog_reads", "web_scan_usage", "user_missions",
                "user_progress", "community_message_likes", "community_messages",
                "admin_ticket_messages", "admin_tickets", "daily_intents",
                "email_verification_tokens", "web_user_settings"):
        await _safe_write(f"DELETE FROM {tbl} WHERE user_id = ?", (uid,))

    await execute_write("DELETE FROM web_users WHERE id = ?", (uid,))
    return {"success": True}


@router.get("/favorites")
async def get_favorites(current_user: dict = Depends(get_current_user)):
    """Get user's favorite assets"""
    user_id = current_user["id"]
    favorites = await execute_query(
        "SELECT symbol FROM web_favorites WHERE user_id = ? ORDER BY added_at DESC",
        (user_id,)
    )
    return {"favorites": [f["symbol"] for f in favorites]}


@router.post("/favorites/{symbol}")
async def add_favorite(symbol: str, current_user: dict = Depends(get_current_user)):
    """Add asset to favorites"""
    user_id = current_user["id"]
    existing = await execute_query(
        "SELECT symbol FROM web_favorites WHERE user_id = ? AND symbol = ?",
        (user_id, symbol.upper())
    )
    if existing:
        return {"success": False, "message": "Already in favorites"}
    await execute_write(
        "INSERT INTO web_favorites (user_id, symbol, added_at) VALUES (?, ?, ?)",
        (user_id, symbol.upper(), datetime.now(timezone.utc).isoformat())
    )
    return {"success": True, "message": f"{symbol} added to favorites"}


@router.delete("/favorites/{symbol}")
async def remove_favorite(symbol: str, current_user: dict = Depends(get_current_user)):
    """Remove asset from favorites"""
    await execute_write(
        "DELETE FROM web_favorites WHERE user_id = ? AND symbol = ?",
        (current_user["id"], symbol.upper())
    )
    return {"success": True, "message": f"{symbol} removed from favorites"}


@router.get("/public-settings")
async def get_public_settings(current_user: dict = Depends(get_current_user)):
    """Return admin_settings keys that are safe for any authenticated user to read."""
    # « gold_hub_enabled » a disparu avec l'écran Gold Hub : plus rien ne
    # l'écrit ni ne le lit. Une éventuelle ligne restée en base est simplement
    # ignorée — on ne la supprime pas, une donnée d'exploitation ne se détruit
    # pas au passage d'un nettoyage de code.
    PUBLIC_KEYS = {"maintenance_mode", "registration_enabled"}
    DEFAULTS = {"maintenance_mode": "false", "registration_enabled": "true"}
    rows = await execute_query(
        "SELECT key, value FROM admin_settings WHERE key IN ({})".format(
            ",".join("?" * len(PUBLIC_KEYS))
        ),
        tuple(PUBLIC_KEYS),
    )
    result = dict(DEFAULTS)
    result.update({r["key"]: r["value"] for r in (rows or [])})
    return {"settings": result}


# ─── Profil de personnalisation ───────────────────────────────────────────────
#
# Trois questions, et une règle qui a décidé lesquelles : chacune doit changer
# quelque chose de visible. Une question posée dont la réponse ne sert à rien
# est un formulaire pour rien — elle coûte du temps à l'inscription, donne
# l'impression d'un fichage, et déçoit quand l'utilisateur constate que rien
# n'a bougé.
#
#   goal         pourquoi la personne est là -> ce que l'accueil met en avant
#   markets      ce qu'elle suit             -> la place ouverte par défaut
#                                               dans les Marchés
#   weekly_time  le temps dont elle dispose  -> le rythme proposé au Parcours
#
# Le niveau (trading_level) reste où il est, dans les réglages : il est
# antérieur à ce profil et déjà lu par plusieurs écrans.

VALID_GOALS = {"comprendre", "tester", "suivre"}
VALID_MARKETS = {"europe", "usa", "crypto", "devises", "matieres"}
VALID_TIMES = {"court", "moyen", "long"}

# ── Les réponses qui entrent dans le CALCUL de l'analyse ────────────────────
#
# Les trois champs ci-dessus orientent des écrans. Ceux-ci sont lus par
# routes/_personnel.py et produisent des nombres : la taille de position, la
# comparaison du stop avec la perte acceptée, la faisabilité de la fenêtre de
# trade. Les ensembles sont donc fermés pour la même raison que plus haut —
# une valeur inattendue produirait une phrase fausse à propos de l'argent de
# quelqu'un.
VALID_DISPONIBILITES = {"continu", "quotidien", "soir", "weekend"}
VALID_REACTIONS = {"coupe", "attend", "renforce", "inconnu"}
VALID_LECTURES = {"verdict", "raisons", "detail"}
VALID_PERTES = {2, 5, 10, 20}
VALID_INDICATEURS = {"rsi", "macd", "ema", "bollinger", "adx", "atr", "volume"}
# Un plafond, pas un jugement : au-delà, c'est une faute de frappe.
MISE_MAX_EUR = 10_000_000


class ProfileRequest(BaseModel):
    goal: Optional[str] = None
    markets: Optional[List[str]] = None
    weekly_time: Optional[str] = None
    # Les intentions. `0` pour mise_eur vaut « je préfère ne pas le dire » et
    # efface la valeur, ce qui doit rester possible à tout moment.
    mise_eur: Optional[int] = None
    perte_max_pct: Optional[int] = None
    disponibilite: Optional[str] = None
    reaction: Optional[str] = None
    lecture: Optional[str] = None
    connait: Optional[List[str]] = None


@router.get("/profile-preferences")
async def get_profile_preferences(current_user: dict = Depends(get_current_user)):
    vide = {
        "goal": None, "markets": [], "weekly_time": None, "updated_at": None,
        "mise_eur": None, "perte_max_pct": None, "disponibilite": None,
        "reaction": None, "lecture": None, "connait": [], "intentions_at": None,
    }
    rows = await execute_query(
        "SELECT goal, markets, weekly_time, updated_at, mise_eur, perte_max_pct, "
        "disponibilite, reaction, lecture, connait, intentions_at "
        "FROM user_profile WHERE user_id = ?",
        (current_user["id"],),
    )
    if not rows:
        return vide

    r = rows[0]
    try:
        markets = json.loads(r.get("markets") or "[]")
    except (ValueError, TypeError):
        markets = []
    try:
        connait = json.loads(r.get("connait") or "[]")
    except (ValueError, TypeError):
        connait = []

    def _dans(valeur, ensemble):
        return valeur if valeur in ensemble else None

    mise = r.get("mise_eur")
    perte = r.get("perte_max_pct")
    return {
        "goal": _dans(r.get("goal"), VALID_GOALS),
        "markets": [m for m in markets if m in VALID_MARKETS],
        "weekly_time": _dans(r.get("weekly_time"), VALID_TIMES),
        "updated_at": r.get("updated_at"),
        "mise_eur": int(mise) if isinstance(mise, int) and 0 < mise <= MISE_MAX_EUR else None,
        "perte_max_pct": int(perte) if perte in VALID_PERTES else None,
        "disponibilite": _dans(r.get("disponibilite"), VALID_DISPONIBILITES),
        "reaction": _dans(r.get("reaction"), VALID_REACTIONS),
        "lecture": _dans(r.get("lecture"), VALID_LECTURES),
        "connait": [c for c in connait if c in VALID_INDICATEURS],
        "intentions_at": r.get("intentions_at"),
    }


@router.put("/profile-preferences")
async def update_profile_preferences(
    data: ProfileRequest,
    current_user: dict = Depends(get_current_user),
):
    """Partial update: only the fields actually sent are touched.

    Validated against the allowed sets rather than stored as received — these
    values steer which screen opens on what, so an unexpected string would
    silently land a user on a blank default with no way to tell why.
    """
    user_id = current_user["id"]
    now = datetime.now(timezone.utc).isoformat()

    current = await get_profile_preferences(current_user)

    goal = current["goal"]
    if data.goal is not None:
        if data.goal not in VALID_GOALS:
            raise HTTPException(status_code=400, detail=f"Objectif inconnu : {data.goal}")
        goal = data.goal

    markets = current["markets"]
    if data.markets is not None:
        unknown = [m for m in data.markets if m not in VALID_MARKETS]
        if unknown:
            raise HTTPException(status_code=400, detail=f"Marché inconnu : {unknown[0]}")
        # Dédoublonné en gardant l'ordre : c'est l'ordre de préférence, et
        # les Marchés ouvrent sur le premier.
        markets = list(dict.fromkeys(data.markets))[:5]

    weekly_time = current["weekly_time"]
    if data.weekly_time is not None:
        if data.weekly_time not in VALID_TIMES:
            raise HTTPException(status_code=400, detail=f"Rythme inconnu : {data.weekly_time}")
        weekly_time = data.weekly_time

    # ── Les intentions ──────────────────────────────────────────────────────
    #
    # Même règle partout : un champ absent n'est pas touché, un champ envoyé
    # est validé. `mise_eur = 0` est la seule valeur qui EFFACE — « je préfère
    # ne pas le dire » doit rester disponible après avoir répondu, sans quoi
    # une réponse donnée une fois serait définitive.
    mise = current["mise_eur"]
    if data.mise_eur is not None:
        if data.mise_eur == 0:
            mise = None
        elif 0 < data.mise_eur <= MISE_MAX_EUR:
            mise = data.mise_eur
        else:
            raise HTTPException(status_code=400, detail="Montant hors limites")

    perte = current["perte_max_pct"]
    if data.perte_max_pct is not None:
        if data.perte_max_pct == 0:
            perte = None
        elif data.perte_max_pct in VALID_PERTES:
            perte = data.perte_max_pct
        else:
            raise HTTPException(status_code=400, detail=f"Perte inconnue : {data.perte_max_pct}")

    def _valide(envoye, actuel, ensemble, nom):
        if envoye is None:
            return actuel
        if envoye == "":
            return None
        if envoye not in ensemble:
            raise HTTPException(status_code=400, detail=f"{nom} inconnu : {envoye}")
        return envoye

    disponibilite = _valide(data.disponibilite, current["disponibilite"],
                            VALID_DISPONIBILITES, "Disponibilité")
    reaction = _valide(data.reaction, current["reaction"], VALID_REACTIONS, "Réaction")
    lecture = _valide(data.lecture, current["lecture"], VALID_LECTURES, "Mode de lecture")

    connait = current["connait"]
    if data.connait is not None:
        inconnu = [c for c in data.connait if c not in VALID_INDICATEURS]
        if inconnu:
            raise HTTPException(status_code=400, detail=f"Indicateur inconnu : {inconnu[0]}")
        connait = list(dict.fromkeys(data.connait))

    # La date des intentions n'est posée que lorsqu'une intention est
    # réellement répondue : elle sert à savoir s'il faut proposer le
    # questionnaire, et une simple mise à jour de marchés ne doit pas faire
    # croire qu'il a été rempli.
    touche_intentions = any(v is not None for v in (
        data.mise_eur, data.perte_max_pct, data.disponibilite,
        data.reaction, data.lecture, data.connait,
    ))
    intentions_at = now if touche_intentions else current.get("intentions_at")

    # ON CONFLICT DO UPDATE : deux onglets ouverts, ou un double envoi, ne
    # doivent pas remonter une violation de clé primaire en 500.
    await execute_write(
        """INSERT INTO user_profile (user_id, goal, markets, weekly_time, updated_at,
                                     mise_eur, perte_max_pct, disponibilite, reaction,
                                     lecture, connait, intentions_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (user_id) DO UPDATE
           SET goal = EXCLUDED.goal,
               markets = EXCLUDED.markets,
               weekly_time = EXCLUDED.weekly_time,
               updated_at = EXCLUDED.updated_at,
               mise_eur = EXCLUDED.mise_eur,
               perte_max_pct = EXCLUDED.perte_max_pct,
               disponibilite = EXCLUDED.disponibilite,
               reaction = EXCLUDED.reaction,
               lecture = EXCLUDED.lecture,
               connait = EXCLUDED.connait,
               intentions_at = EXCLUDED.intentions_at""",
        (user_id, goal, json.dumps(markets), weekly_time, now,
         mise, perte, disponibilite, reaction, lecture, json.dumps(connait), intentions_at),
    )

    return {
        "goal": goal, "markets": markets, "weekly_time": weekly_time, "updated_at": now,
        "mise_eur": mise, "perte_max_pct": perte, "disponibilite": disponibilite,
        "reaction": reaction, "lecture": lecture, "connait": connait,
        "intentions_at": intentions_at,
    }
