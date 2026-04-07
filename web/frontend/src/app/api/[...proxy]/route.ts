/**
 * Runtime API proxy — forwards /api/* to the backend.
 * Uses BACKEND_URL env var (read at request time, not baked in at build).
 * Set BACKEND_URL in Railway's frontend service environment variables.
 */
import { NextRequest, NextResponse } from "next/server";

const BACKEND = (
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000"
).replace(/\/$/, "");

async function proxy(req: NextRequest, { params }: { params: { proxy: string[] } }) {
  const path = params.proxy.join("/");
  const search = req.nextUrl.search || "";
  const targetUrl = `${BACKEND}/api/${path}${search}`;

  const headers = new Headers();
  // Forward relevant headers
  const forwardHeaders = ["content-type", "authorization", "accept", "x-forwarded-for"];
  for (const h of forwardHeaders) {
    const v = req.headers.get(h);
    if (v) headers.set(h, v);
  }

  let body: BodyInit | undefined;
  const method = req.method;
  if (!["GET", "HEAD"].includes(method)) {
    body = await req.arrayBuffer();
  }

  try {
    const res = await fetch(targetUrl, { method, headers, body });
    const resBody = await res.arrayBuffer();
    const resHeaders = new Headers();
    const passThroughHeaders = ["content-type", "cache-control", "x-request-id"];
    for (const h of passThroughHeaders) {
      const v = res.headers.get(h);
      if (v) resHeaders.set(h, v);
    }
    return new NextResponse(resBody, { status: res.status, headers: resHeaders });
  } catch (err) {
    console.error("[proxy] Backend unreachable:", targetUrl, err);
    return NextResponse.json(
      { detail: "Backend service unavailable" },
      { status: 502 }
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const DELETE = proxy;
export const PATCH = proxy;
export const OPTIONS = proxy;
