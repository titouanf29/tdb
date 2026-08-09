import { NextRequest, NextResponse } from "next/server";

// process.env.BACKEND_URL is a plain (non-NEXT_PUBLIC_) env var.
// In Next.js Edge middleware, plain env vars are resolved at RUNTIME
// (not baked at build time), so this works even if BACKEND_URL is set
// after the Docker image is built (e.g. Railway env var added later).
const BACKEND = (process.env.BACKEND_URL || "http://localhost:8000").replace(
  /\/$/,
  ""
);

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const targetUrl = `${BACKEND}${pathname}${search}`;

  const headers = new Headers();
  for (const h of ["content-type", "authorization", "accept", "x-forwarded-for"]) {
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
  const timeoutMs = pathname.startsWith("/api/analysis/scan/") ? 120_000 : 25_000;

  try {
    const res = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      signal: AbortSignal.timeout(timeoutMs),
    });

    const resBody = await res.arrayBuffer();
    const resHeaders = new Headers();
    const ct = res.headers.get("content-type");
    if (ct) resHeaders.set("content-type", ct);
    const cc = res.headers.get("cache-control");
    if (cc) resHeaders.set("cache-control", cc);

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

export const config = {
  matcher: "/api/:path*",
};
