import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory rate limiter: max 30 requests per minute per IP
const _rateMap = new Map<string, { count: number; resetAt: number }>();
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = _rateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    _rateMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  if (entry.count >= 30) return true;
  entry.count++;
  return false;
}

type TrackBody = {
  event?: string;
  location?: string;
  target?: string;
  ts?: string;
  path?: string;
};

/** Validate that a webhook URL is an external HTTPS endpoint (prevents SSRF). */
function isSafeWebhookUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return false;
    const host = url.hostname.toLowerCase();
    // Block loopback, private and link-local ranges
    if (
      host === 'localhost' ||
      /^127\./.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
      /^169\.254\./.test(host) ||
      host === '0.0.0.0' ||
      host.endsWith('.local') ||
      host.endsWith('.internal')
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/** Strip control characters from a string to prevent log injection. */
function sanitize(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(/[\r\n\x00-\x1f\x7f]/g, '').slice(0, 256);
}

export async function POST(request: NextRequest) {
  // Rate limiting: 30 requests/minute per IP
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (isRateLimited(clientIp)) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
  }

  let body: TrackBody = {};

  try {
    body = (await request.json()) as TrackBody;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  if (!body.event || typeof body.event !== 'string' || body.event.length > 100) {
    return NextResponse.json({ ok: false, error: 'missing_or_invalid_event' }, { status: 400 });
  }

  // Take only the first IP from the x-forwarded-for chain (the rest are set by proxies)
  const rawIp = clientIp;

  const payload = {
    event:    sanitize(body.event),
    location: sanitize(body.location),
    target:   sanitize(body.target),
    ts:       sanitize(body.ts),
    path:     sanitize(body.path),
    ip:       sanitize(rawIp),
    ua:       sanitize(request.headers.get('user-agent')),
    receivedAt: new Date().toISOString(),
  };

  console.info('[track]', payload);

  const webhook = process.env.TRACKING_WEBHOOK_URL;
  if (webhook && isSafeWebhookUrl(webhook)) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeout);
    } catch {
      console.warn('[track] webhook_failed');
    }
  } else if (webhook) {
    console.warn('[track] webhook URL rejected (failed SSRF safety check)');
  }

  return NextResponse.json({ ok: true });
}