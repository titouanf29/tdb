"""
TDB Web API - Backend FastAPI
Synchronisé avec le bot Telegram via la même base de données
"""
import os
import sys
import time
import logging
from datetime import datetime, timezone
from pathlib import Path
from contextlib import asynccontextmanager

import traceback
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from slowapi import Limiter
from api.limite import cle_client  # voir limite.py
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

logger = logging.getLogger(__name__)

# Add parent directory to path for shared modules
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
# ...but the backend's own directory must come FIRST. The repo root holds the
# Telegram bot's config.py — which has no POLYGON_API_KEY / TWELVEDATA_API_KEY
# and a smaller MARKETS — plus its own main.py. The container only ever copies
# web/backend, so production already resolves `config` to the backend's own;
# without this line a dev checkout silently loads a DIFFERENT config from
# production, and local testing stops meaning anything.
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent.parent / ".env")

from api.routes import auth, market, wallet, analysis, users, ai_assistant, favorites, admin, tools, premium, community, portfolio, journal, weekly_prep, insights, content_factory, content_factory_visuals, missions, ipo_watch, daily_intent, welcome_back, price_alerts, intel, semaine, macro, nimbo_suivi, push, notifications, aide, editeur, moi, strategies, pont_tiktok, demo
from api.websocket import websocket_router
from api.database import init_web_tables, execute_query, execute_write

# Global rate limiter (IP-based)
limiter = Limiter(key_func=cle_client)

from api.environnement import EN_PRODUCTION as IS_PRODUCTION  # ENV=production, ou Railway


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    print("🚀 TDB Web API starting...")

    # Every blocking market-data call goes through run_in_executor(None, ...),
    # so the default pool is the app's real concurrency limit. Its default size
    # is min(32, cpu_count + 4) — five threads on a small container, which a
    # single multi-asset scan fills entirely while every other request queues
    # behind it. These threads only ever wait on network I/O, so a wider pool
    # costs almost nothing and keeps the app responsive during a scan.
    import asyncio as _asyncio
    from concurrent.futures import ThreadPoolExecutor
    _asyncio.get_running_loop().set_default_executor(
        ThreadPoolExecutor(max_workers=int(os.getenv("IO_THREADS", "32")),
                           thread_name_prefix="tdb-io")
    )

    await init_web_tables()
    print("✅ Database tables initialized")

    # Les processus du rejeu démarrent tout de suite, sans retarder le
    # démarrage : le premier visiteur n'attend plus leur naissance.
    from api.routes._rejeu import prechauffer as _prechauffer_rejeu
    _prechauffage = _asyncio.create_task(_prechauffer_rejeu())
    # Les analyses de la démo de l'accueil, prêtes avant le premier visiteur.
    from api.routes.demo import prechauffer as _prechauffer_demo
    _demo_tache = _asyncio.create_task(_prechauffer_demo())

    await _bootstrap_admin()
    from api.routes.admin import figer_admins
    await figer_admins()

    # Les actifs acceptés depuis l'administration rejoignent l'univers.
    from api.routes._actifs_ajoutes import charger as _charger_actifs
    print(f"✅ {await _charger_actifs()} actif(s) ajouté(s) depuis l'administration")

    # Le moteur macro : calendrier, lecture des annonces dès leur publication,
    # rappels et notifications. Toutes les cinq minutes ; une erreur n'arrête
    # ni la boucle ni l'application.
    async def _macro_boucle():
        from api.services.macro import suivi
        await _asyncio.sleep(20)
        while True:
            await suivi.tour()
            await _asyncio.sleep(300)
    _macro_tache = _asyncio.create_task(_macro_boucle())

    # La veille des favoris : en semaine, de 9 h à 18 h (Paris), toutes les
    # trois heures — Nimbo prévient quand il propose un achat sur un favori.
    # Ne fait rien tant que les clés VAPID ne sont pas posées.
    async def _veille_boucle():
        from datetime import datetime as _dt
        from zoneinfo import ZoneInfo
        from api.routes import nimbo_suivi as _ns
        await _asyncio.sleep(120)
        while True:
            maintenant = _dt.now(ZoneInfo("Europe/Paris"))
            if maintenant.weekday() < 5 and 9 <= maintenant.hour < 18:
                try:
                    await _ns.veiller_favoris()
                except Exception as e:
                    print(f"[veille] {e}")
            await _asyncio.sleep(3 * 3600)
    _veille_tache = _asyncio.create_task(_veille_boucle())

    # Les stops, objectifs et alertes de prix, vérifiés par le serveur toutes
    # les trois minutes : sans cela, rien ne se déclenchait site fermé, et la
    # notification arrivait quand on rouvrait la page (services/veille_notifs.py).
    async def _notifs_boucle():
        from api.services import veille_notifs
        await _asyncio.sleep(45)
        while True:
            await veille_notifs.tour()
            await _asyncio.sleep(int(os.getenv("VEILLE_NOTIFS_SECONDES", "180")))
    _notifs_tache = _asyncio.create_task(_notifs_boucle())

    # La stratégie active de chacun, relue toutes les deux heures sur ses
    # actifs et ses favoris : on est prévenu quand elle se déclenche
    # (services/veille_strategies.py).
    async def _strategies_boucle():
        from api.services import veille_strategies
        await _asyncio.sleep(300)
        while True:
            await veille_strategies.tour()
            await _asyncio.sleep(int(os.getenv("VEILLE_STRATEGIES_SECONDES", "7200")))
    _strategies_tache = _asyncio.create_task(_strategies_boucle())

    # Le bilan de la semaine, envoyé le vendredi à 22 h 30 (Paris), à
    # l'ouverture de l'espace du week-end (services/bilan.py).
    async def _bilan_boucle():
        from api.services import bilan
        await _asyncio.sleep(90)
        while True:
            try:
                await bilan.envoyer()
            except Exception as e:
                print(f"[bilan] {e}")
            await _asyncio.sleep(600)
    _bilan_tache = _asyncio.create_task(_bilan_boucle())

    # La Communauté : la note du jour de Nimbo (matins de semaine) et les
    # réussites du défi de la semaine, toutes les quinze minutes.
    async def _communaute_boucle():
        from api.services import note_du_jour, defi
        await _asyncio.sleep(60)
        while True:
            for etape in (note_du_jour.publier_si_besoin, defi.prevenir_les_reussites):
                try:
                    await etape()
                except Exception as e:
                    print(f"[communauté] {etape.__name__} : {e}")
            await _asyncio.sleep(900)
    _communaute_tache = _asyncio.create_task(_communaute_boucle())

    yield
    # Les processus du rejeu (_rejeu.py) s'arrêtent avec le serveur.
    from api.routes._rejeu import arreter as _arreter_rejeu
    _arreter_rejeu()
    _macro_tache.cancel()
    _veille_tache.cancel()
    _notifs_tache.cancel()
    _strategies_tache.cancel()
    _bilan_tache.cancel()
    _communaute_tache.cancel()
    _demo_tache.cancel()
    print("👋 TDB Web API shutting down...")


async def _bootstrap_admin() -> None:
    """Guarantee one admin account exists, from environment variables.

    Locking the site behind an admin check is only safe if there is a
    guaranteed way in. On a hosted database nobody can reach with a SQL client
    — and after a wipe, a migration, or a forgotten password — that guarantee
    has to come from somewhere the operator controls: the platform's own
    environment variables.

    Set ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD and restart. The
    account is created if missing, promoted if it exists, and its password is
    reset to the value given. Unset the variables once you are in: leaving them
    set means anyone who can read the service's environment can log in as
    admin, and every restart silently resets that password.
    """
    email = (os.getenv("ADMIN_BOOTSTRAP_EMAIL") or "").strip().lower()
    password = os.getenv("ADMIN_BOOTSTRAP_PASSWORD") or ""
    if not email or not password:
        return
    if len(password) < 8:
        logger.error("ADMIN_BOOTSTRAP_PASSWORD too short (min 8) — skipped")
        return

    try:
        from api.routes.auth import hash_password
        now = datetime.now(timezone.utc).isoformat()
        rows = await execute_query("SELECT id FROM web_users WHERE email = ?", (email,))
        if rows:
            await execute_write(
                "UPDATE web_users SET password_hash = ?, is_admin = 1, email_verified = 1 "
                "WHERE email = ?",
                (hash_password(password), email),
            )
            # The password itself is never logged, here or anywhere else.
            print(f"🔑 Admin bootstrap: existing account {email} promoted, password reset")
        else:
            username = email.split("@")[0][:30] or "admin"
            # A collision on username would fail the insert, so make it unique.
            taken = await execute_query(
                "SELECT id FROM web_users WHERE username = ?", (username,)
            )
            if taken:
                username = f"{username[:24]}-adm"
            await execute_write(
                "INSERT INTO web_users (email, username, password_hash, first_name, "
                "created_at, email_verified, is_admin) VALUES (?, ?, ?, ?, ?, 1, 1)",
                (email, username, hash_password(password), "Admin", now),
            )
            print(f"🔑 Admin bootstrap: account {email} created")
    except Exception as exc:
        # A failed bootstrap must never stop the app from starting — that would
        # turn a typo in an env var into a full outage.
        logger.error("admin bootstrap failed: %s", exc)


app = FastAPI(
    title="TDB Trading Bot API",
    description="API pour le site web TDB - synchronisé avec le bot Telegram",
    version="1.0.0",
    lifespan=lifespan,
    # Disable interactive docs in production
    docs_url=None if IS_PRODUCTION else "/docs",
    redoc_url=None if IS_PRODUCTION else "/redoc",
    openapi_url=None if IS_PRODUCTION else "/openapi.json",
)

# Attach rate limiter to app
app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": f"Trop de requêtes. Veuillez patienter avant de réessayer."}
    )

# CORS for frontend
# FRONTEND_URL must be set explicitly (comma-separated list of allowed origins).
# In development, localhost is always allowed. Wildcard "*" is never used.
_frontend_env = os.getenv("FRONTEND_URL", "")
_cors_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
if _frontend_env:
    _cors_origins += [u.strip().rstrip("/") for u in _frontend_env.split(",") if u.strip()]
# Le site répond sous « captentdb.fr » et « www.captentdb.fr » : l'une
# autorise l'autre, pour qu'un visiteur arrivé par www ne soit pas refusé.
for _o in list(_cors_origins):
    if _o.startswith("https://") and "localhost" not in _o:
        _hote = _o[len("https://"):]
        _autre = _hote[4:] if _hote.startswith("www.") else f"www.{_hote}"
        if f"https://{_autre}" not in _cors_origins:
            _cors_origins.append(f"https://{_autre}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)


# ── Maintenance mode ────────────────────────────────────────────────────────
_maint_cache: dict = {"value": None, "ts": 0.0}
_MAINT_TTL = 3  # seconds

async def _get_maintenance_state() -> tuple[bool, str, str | None, str | None]:
    """Returns (is_on, message, end_time_iso, started_at_iso). Cached for
    _MAINT_TTL seconds. Auto-disables when end_time has passed."""
    now = time.monotonic()
    if now - _maint_cache["ts"] < _MAINT_TTL and _maint_cache["value"] is not None:
        return _maint_cache["value"]
    try:
        rows = await execute_query(
            "SELECT key, value FROM admin_settings WHERE key IN "
            "('maintenance_mode','maintenance_message','maintenance_end_time','maintenance_started_at')"
        )
        settings = {r["key"]: r["value"] for r in (rows or [])}
        is_on      = settings.get("maintenance_mode", "false") == "true"
        msg        = settings.get("maintenance_message") or "Le site est en cours de maintenance. Revenez bientôt."
        end_time   = settings.get("maintenance_end_time") or None
        started_at = settings.get("maintenance_started_at") or None

        if is_on and end_time:
            try:
                end_dt = datetime.fromisoformat(end_time.replace("Z", "+00:00"))
                if end_dt.tzinfo is None:
                    end_dt = end_dt.replace(tzinfo=timezone.utc)
                if datetime.now(timezone.utc) >= end_dt:
                    is_on = False
                    end_time = None
                    started_at = None
                    # The timer keys MUST be wiped alongside the flag. Leaving a
                    # past end_time behind means the next time an admin turns
                    # maintenance on, this same branch fires and silently turns
                    # it straight back off — the toggle looks dead forever.
                    _stamp = datetime.now(timezone.utc).isoformat()
                    await execute_write(
                        "UPDATE admin_settings SET value = 'false', updated_at = ? WHERE key = 'maintenance_mode'",
                        (_stamp,)
                    )
                    await execute_write(
                        "UPDATE admin_settings SET value = '', updated_at = ? "
                        "WHERE key IN ('maintenance_end_time','maintenance_started_at')",
                        (_stamp,)
                    )
            except (ValueError, TypeError):
                pass

        result = (is_on, msg, end_time if is_on else None, started_at if is_on else None)
    except Exception as exc:
        logger.warning("maintenance check failed: %s", exc)
        result = (False, "", None, None)
    _maint_cache["value"] = result
    _maint_cache["ts"] = now
    return result


async def _token_user_id(auth_header: str) -> int | None:
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header[7:]
    try:
        import jwt as _jwt
        from api.secret_jwt import SECRET as secret
        payload = _jwt.decode(token, secret, algorithms=["HS256"])
        sub = payload.get("sub")
        return int(sub) if sub else None
    except Exception:
        return None


async def _is_admin(user_id: int) -> bool:
    # La même règle que l'administration (admin.check_if_admin) : `is_admin`
    # sur un compte actif. L'ancienne règle du « premier inscrit » est figée
    # au démarrage (admin.figer_admins), puis plus jamais recalculée.
    from api.routes.admin import check_if_admin
    return await check_if_admin({"id": user_id})


# Reachable even while the site is locked. Logging in MUST stay open or an
# admin who is signed out during maintenance can never get back in — the lock
# would have no key. /api/status is what tells the frontend to draw the
# maintenance screen at all.
_ALWAYS_ALLOW = {
    "/api/auth/login", "/api/auth/me",
    "/api/auth/refresh", "/api/auth/logout", "/api/auth/verify-email",
    # La récupération du mot de passe : sans elle, un administrateur qui l'a
    # oublié pendant une maintenance ne pourrait pas rentrer.
    "/api/auth/forgot-password", "/api/auth/reset-password", "/api/auth/reset-password/check",
    "/api/status", "/", "/health",
    # Stripe n'attend pas la fin d'une maintenance : un paiement, un
    # renouvellement ou une résiliation reçus pendant ce temps doivent être
    # enregistrés. La route est authentifiée par la signature Stripe.
    "/api/premium/webhook",
    # Les mentions légales restent lisibles site fermé.
    "/api/legal/editeur",
}

# Deliberately NOT in _ALWAYS_ALLOW: a site closed to the public must not keep
# minting new accounts. Left open, /api/auth/register answered 201 with a valid
# token throughout maintenance, so "closed" only ever hid the logged-in app.
# Kept as an explicit set so re-adding these to _ALWAYS_ALLOW cannot silently
# reopen the hole.
_BLOCKED_WHEN_LOCKED = {"/api/auth/register", "/api/auth/resend-verification"}


@app.middleware("http")
async def maintenance_middleware(request: Request, call_next):
    path = request.url.path
    # Admin panel and auth always accessible
    if path.startswith("/api/admin") or (
        path in _ALWAYS_ALLOW and path not in _BLOCKED_WHEN_LOCKED
    ):
        return await call_next(request)
    if request.method == "OPTIONS":
        return await call_next(request)

    is_on, msg, end_time, _started = await _get_maintenance_state()
    if not is_on:
        return await call_next(request)

    # Check if caller is admin
    uid = await _token_user_id(request.headers.get("Authorization", ""))
    if uid and await _is_admin(uid):
        return await call_next(request)

    return JSONResponse(
        status_code=503,
        content={"detail": msg, "maintenance": True, "end_time": end_time},
    )


# La taille des requêtes. Aucune route ne reçoit de fichier : 2 Mo suffisent
# largement, et refuser plus tôt évite qu'un envoi de plusieurs centaines de
# mégaoctets soit lu en entier puis analysé.
TAILLE_MAX_REQUETE = 2 * 1024 * 1024


@app.middleware("http")
async def limite_taille(request: Request, call_next):
    longueur = request.headers.get("content-length")
    if longueur:
        try:
            trop = int(longueur) > TAILLE_MAX_REQUETE
        except ValueError:
            return JSONResponse(status_code=400, content={"detail": "En-tête Content-Length invalide."})
        if trop:
            return JSONResponse(status_code=413, content={"detail": "Requête trop volumineuse."})
    return await call_next(request)


# Security headers middleware
@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
    response.headers["Cross-Origin-Resource-Policy"] = "same-site"
    if "server" in response.headers:
        del response.headers["server"]
    if IS_PRODUCTION:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
    return response


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Le 422 habituel, sans recopier la valeur reçue.

    La réponse par défaut renvoie l'entrée fautive : un `NaN` envoyé dans un
    montant ne pouvait pas s'écrire en JSON, et la réponse au refus devenait
    elle-même une erreur 500. On ne renvoie que le champ et la raison."""
    erreurs = [{"loc": list(e.get("loc", ())), "msg": message_fr(e), "type": e.get("type", "")}
               for e in exc.errors()]
    return JSONResponse(status_code=422, content={"detail": erreurs})


# Les refus d'un formulaire, en français : le message part tel quel à
# l'écran. « String should have at least 3 characters » laissait l'utilisateur
# sans savoir quel champ corriger, et l'inscription paraissait cassée.
_CHAMPS = {
    "email": "L'adresse e-mail", "password": "Le mot de passe", "new_password": "Le nouveau mot de passe",
    "current_password": "Le mot de passe actuel", "username": "Le pseudo", "first_name": "Le prénom",
    "symbol": "Le symbole", "amount": "Le montant", "quantity": "La quantité", "message": "Le message",
}


def message_fr(e: dict) -> str:
    loc = [str(x) for x in e.get("loc", ()) if x not in ("body", "query", "path")]
    champ = _CHAMPS.get(loc[-1] if loc else "", "Ce champ")
    t, ctx = e.get("type", ""), e.get("ctx") or {}
    if t == "missing":
        return f"{champ} est obligatoire."
    if t == "string_too_short":
        return f"{champ} doit contenir au moins {ctx.get('min_length', '?')} caractères."
    if t == "string_too_long":
        return f"{champ} doit contenir au plus {ctx.get('max_length', '?')} caractères."
    if t == "string_pattern_mismatch" and loc and loc[-1] == "username":
        return "Le pseudo ne peut contenir que des lettres, des chiffres, des espaces et les signes . - _"
    if loc and loc[-1] == "email":
        return "L'adresse e-mail n'est pas valide."
    if t in ("greater_than", "greater_than_equal", "less_than", "less_than_equal"):
        return f"{champ} est hors des limites permises."
    return f"{champ} n'est pas valide."


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch all unhandled exceptions and return a generic error (never expose internals)."""
    print(f"[ERROR] Unhandled exception on {request.method} {request.url.path}: {type(exc).__name__}: {exc}", flush=True)
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": "Une erreur interne est survenue. Veuillez réessayer."}
    )


# Make limiter available to routers via app state
# Export it so routes can import it
auth.limiter = limiter

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(market.router, prefix="/api/market", tags=["Market Data"])
app.include_router(wallet.router, prefix="/api/wallet", tags=["Wallet"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["Analysis"])
app.include_router(nimbo_suivi.router, prefix="/api/nimbo/suivi", tags=["Suivi de Nimbo"])
app.include_router(push.router, prefix="/api/push", tags=["Notifications push"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["Notifications"])
app.include_router(aide.router, prefix="/api/aide", tags=["Aide du site"])
app.include_router(demo.router, prefix="/api/demo", tags=["Démo de l'accueil"])
app.include_router(editeur.router, prefix="/api/legal", tags=["Éditeur et ouverture du Premium"])
app.include_router(intel.router, prefix="/api/intel", tags=["Market Intelligence"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(ai_assistant.router, prefix="/api/ai", tags=["AI Assistant"])
app.include_router(daily_intent.router, prefix="/api/ai", tags=["Daily Intent"])
app.include_router(welcome_back.router, prefix="/api/dashboard", tags=["Welcome Back"])
app.include_router(moi.router, prefix="/api/moi", tags=["Profil observé"])
app.include_router(strategies.router, prefix="/api/strategies", tags=["Stratégies"])
app.include_router(price_alerts.router, prefix="/api/alerts", tags=["Price Alerts"])
app.include_router(favorites.router, prefix="/api/favorites", tags=["Favorites"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(insights.router, prefix="/api/admin/insights", tags=["Admin Insights"])
app.include_router(tools.router, prefix="/api/tools", tags=["Trading Tools"])
app.include_router(premium.router, prefix="/api/premium", tags=["Premium"])
app.include_router(community.router, prefix="/api/community", tags=["Community"])
app.include_router(portfolio.router, prefix="/api/portfolio", tags=["Real Portfolio"])
app.include_router(journal.router, prefix="/api/journal", tags=["Trading Journal"])
app.include_router(weekly_prep.router, prefix="/api/weekly-prep", tags=["Weekly Market Prep"])
app.include_router(semaine.router, prefix="/api/semaine", tags=["Préparation du week-end"])
app.include_router(macro.router, prefix="/api/macro", tags=["Moteur macro"])
app.include_router(content_factory.router, prefix="/api/admin/content-factory", tags=["Content Factory"])
app.include_router(content_factory_visuals.router, prefix="/api/admin/content-factory", tags=["Content Factory Visuals"])
app.include_router(missions.router, prefix="/api/learn", tags=["Missions & Progress"])
app.include_router(pont_tiktok.router, prefix="/api/pont", tags=["Pont TikTok"])
app.include_router(ipo_watch.router, prefix="/api", tags=["IPO Watch"])
app.include_router(websocket_router, prefix="/ws", tags=["WebSocket"])


@app.get("/")
async def root():
    return {"status": "ok"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.get("/api/status")
async def site_status(request: Request):
    """Public endpoint — returns maintenance status for frontend overlay.
    If a valid admin token is present, returns is_admin=True so the
    frontend never shows the maintenance overlay to admins."""
    is_on, msg, end_time, started_at = await _get_maintenance_state()

    # Optionally detect admin from Bearer token (no error if missing/invalid)
    is_admin_caller = False
    auth = request.headers.get("Authorization", "")
    if auth:
        uid = await _token_user_id(auth)
        if uid:
            is_admin_caller = await _is_admin(uid)

    return {
        "maintenance": is_on,
        "message":     msg if is_on else None,
        "end_time":    end_time,
        # Lets the client draw a real elapsed/remaining bar instead of a
        # decorative one that conveys nothing.
        "started_at":  started_at,
        "is_admin":    is_admin_caller,
    }


if __name__ == "__main__":
    import uvicorn
    # Use app object directly to avoid path conflicts with root main.py
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000
    )
