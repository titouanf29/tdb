import { NextRequest, NextResponse } from "next/server";

// process.env.BACKEND_URL is a plain (non-NEXT_PUBLIC_) env var.
// In Next.js Edge middleware, plain env vars are resolved at RUNTIME
// (not baked at build time), so this works even if BACKEND_URL is set
// after the Docker image is built (e.g. Railway env var added later).
const BACKEND = (process.env.BACKEND_URL || "http://localhost:8000").replace(
  /\/$/,
  ""
);

const SESSION_COOKIE = "tdb_sess";

/* ── Maintenance gate ────────────────────────────────────────────────────────

   Why this lives here and not in React.

   The previous lock was a component: the server still sent the real page and
   the browser swapped in a maintenance screen once the JavaScript had loaded
   and /api/status had answered. So the actual HTML of the site went out to
   everyone, visible with JavaScript off, in "view source", to any scraper,
   and for the second or two before the check returned. On top of that the
   landing page is statically generated and CDN-cached (x-nextjs-cache: HIT),
   so it was served without the app ever running.

   Edge middleware runs before any of that, on every request, for every
   visitor. Nothing a client does can get past it.

   Admin identity has to be visible to the server for this to work, which is
   why /api/auth/login now also sets an httpOnly cookie carrying the token. */

// Reachable while locked. /login is the way back in; the legal pages must stay
// published; /maintenance is the destination itself.
const OPEN_PREFIXES = [
  "/login",
  // La récupération du mot de passe : la seule porte d'un admin qui l'a oublié.
  "/forgot-password",
  "/reset-password",
  "/maintenance",
  "/mentions-legales",
  "/politique-de-confidentialite",
  "/cgu",
  "/cgv",
];

type Status = { on: boolean; isAdmin: boolean };

// One backend call per TTL rather than per request. Keyed by token so an
// admin's verdict is never served to an anonymous visitor, or the reverse.
const statusCache = new Map<string, { value: Status; expires: number }>();
const STATUS_TTL_MS = 15_000;

async function maintenanceStatus(token: string | undefined): Promise<Status | null> {
  const key = token ?? "-";
  const hit = statusCache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;

  try {
    const res = await fetch(`${BACKEND}/api/status`, {
      headers: token ? { authorization: `Bearer ${token}` } : {},
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const d = await res.json();
    const value: Status = { on: !!d.maintenance, isAdmin: !!d.is_admin };
    statusCache.set(key, { value, expires: Date.now() + STATUS_TTL_MS });
    // The map is per-isolate and short-lived, but a burst of distinct tokens
    // should not grow it without bound.
    if (statusCache.size > 500) {
      const now = Date.now();
      statusCache.forEach((v, k) => { if (v.expires <= now) statusCache.delete(k); });
    }
    return value;
  } catch {
    // Backend slow or down: fail OPEN. Locking every visitor out because a
    // health check timed out turns a blip into an outage.
    return null;
  }
}

async function gate(request: NextRequest, entetes: Headers): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const suite = () => NextResponse.next({ request: { headers: entetes } });

  if (OPEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return suite();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const status = await maintenanceStatus(token);
  if (!status || !status.on || status.isAdmin) {
    return suite();
  }

  // A redirect, not a rewrite. Under a rewrite the browser URL stays put, so
  // usePathname() still reports /dashboard and the client shell renders its
  // own authenticated branch instead of the maintenance page. Reading the
  // rewritten path server-side would mean calling headers() in the root
  // layout, which opts every page — including the statically cached landing
  // page — out of static rendering. 307 keeps it temporary and uncached.
  const url = request.nextUrl.clone();
  url.pathname = "/maintenance";
  url.search = "";
  const res = NextResponse.redirect(url, 307);
  res.headers.set("cache-control", "no-store, must-revalidate");
  return res;
}

/* ── Backend proxy ───────────────────────────────────────────────────────── */

async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname, search } = request.nextUrl;
  const targetUrl = `${BACKEND}${pathname}${search}`;

  const headers = new Headers();
  // `cookie` rides along so the backend sees the session on calls the browser
  // makes without an Authorization header.
  for (const h of ["content-type", "authorization", "accept", "x-forwarded-for", "cookie"]) {
    const v = request.headers.get(h);
    if (v) headers.set(h, v);
  }

  let body: ArrayBuffer | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    const buf = await request.arrayBuffer();
    // Only attach a real body: an empty body on DELETE makes the Edge
    // runtime's fetch throw, which surfaced as a 502 on every DELETE
    if (buf.byteLength > 0) body = buf;
  }

  // Without a deadline the proxy waits forever on a slow backend and the
  // browser shows an endless spinner. A market scan legitimately takes tens of
  // seconds (one network fetch per asset); everything else must answer fast or
  // be reported as unavailable.
  // Un scan diffusé au fil de l'eau peut durer plusieurs minutes sur
  // l'univers complet ; l'utilisateur garde la main pour l'interrompre. Les
  // autres appels doivent répondre vite ou être signalés indisponibles.
  const streaming = pathname.startsWith("/api/analysis/scan/")
    && request.nextUrl.searchParams.get("stream") === "true";
  // Le test d'une stratégie rejoue des années de cours sur plusieurs actifs.
  const long = pathname.startsWith("/api/analysis/scan/")
    || pathname === "/api/strategies/backtest" || pathname === "/api/strategies/film";
  const timeoutMs = streaming ? 600_000 : long ? 120_000 : 25_000;

  try {
    const res = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      signal: AbortSignal.timeout(timeoutMs),
    });

    // LE CORPS EST RELAYÉ TEL QUEL POUR UN FLUX.
    //
    // Ce proxy faisait `await res.arrayBuffer()` : il lisait la réponse
    // ENTIÈRE avant de la rendre. Pour du JSON classique c'est sans
    // conséquence, mais cela annulait complètement le scan diffusé — mesuré
    // au navigateur, la progression restait à « 0 / 0 » pendant toute la
    // durée du balayage, puis tous les résultats apparaissaient d'un coup.
    // Le serveur diffusait bien ; c'est ici que le flux mourait.
    const resBody: ArrayBuffer | ReadableStream<Uint8Array> | null =
      streaming ? res.body : await res.arrayBuffer();
    const resHeaders = new Headers();
    const ct = res.headers.get("content-type");
    if (ct) resHeaders.set("content-type", ct);
    const cc = res.headers.get("cache-control");
    if (cc) resHeaders.set("cache-control", cc);
    // Demande explicite de ne pas mettre en tampon, pour les intermédiaires
    // qui la respectent.
    const xab = res.headers.get("x-accel-buffering");
    if (xab) resHeaders.set("x-accel-buffering", xab);
    // Without this the session cookie set by /api/auth/login never reaches the
    // browser, and the server-side maintenance gate can never recognise an admin.
    for (const sc of res.headers.getSetCookie?.() ?? []) {
      resHeaders.append("set-cookie", sc);
    }

    return new NextResponse(resBody, { status: res.status, headers: resHeaders });
  } catch (err) {
    const timedOut = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    return NextResponse.json(
      {
        detail: timedOut
          ? "Le serveur met trop de temps à répondre. Réessayez dans un instant."
          : "Backend service unavailable",
      },
      { status: timedOut ? 504 : 502 }
    );
  }
}

/* ── La politique de contenu (CSP) ─────────────────────────────────────────

   Un jeton (nonce) tiré au hasard à chaque page : seuls les scripts qui le
   portent s'exécutent. Next.js l'applique à ses propres scripts (il le lit
   dans l'en-tête de la requête), la mise en page le donne aux deux scripts
   écrits dans le HTML, et 'strict-dynamic' laisse ces scripts de confiance
   charger les morceaux de l'application. Un script injecté par un attaquant
   n'a pas le jeton : il ne s'exécute pas. */

function politique(nonce: string, request: NextRequest): string {
  const dev = process.env.NODE_ENV !== "production";
  const hote = request.headers.get("host") ?? "";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    // Les connexions en direct passent par l'adresse du site lui-même.
    `connect-src 'self' wss://${hote}${dev ? ` ws://${hote}` : ""}`,
    "frame-src https://s.tradingview.com https://www.tradingview.com",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "media-src 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return proxy(request);
  }
  const nonce = btoa(crypto.randomUUID());
  const csp = politique(nonce, request);
  const entetes = new Headers(request.headers);
  entetes.set("x-nonce", nonce);
  entetes.set("content-security-policy", csp);
  const res = await gate(request, entetes);
  res.headers.set("Content-Security-Policy", csp);
  return res;
}

export const config = {
  // Everything except Next's own assets and static files. The gate is
  // worthless if the page it guards can be reached by another path.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|txt|xml|webmanifest)$).*)"],
};
