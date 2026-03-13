import { NextRequest, NextResponse } from 'next/server';

type TrackBody = {
  event?: string;
  location?: string;
  target?: string;
  ts?: string;
  path?: string;
};

export async function POST(request: NextRequest) {
  let body: TrackBody = {};

  try {
    body = (await request.json()) as TrackBody;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  if (!body.event) {
    return NextResponse.json({ ok: false, error: 'missing_event' }, { status: 400 });
  }

  const payload = {
    ...body,
    ip: request.headers.get('x-forwarded-for') ?? 'unknown',
    ua: request.headers.get('user-agent') ?? 'unknown',
    receivedAt: new Date().toISOString(),
  };

  console.info('[track]', payload);

  const webhook = process.env.TRACKING_WEBHOOK_URL;
  if (webhook) {
    try {
      await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      console.warn('[track] webhook_failed');
    }
  }

  return NextResponse.json({ ok: true });
}