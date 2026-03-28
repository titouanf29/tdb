import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';

function tokenForEmail(email: string): string {
  const secret = process.env.ADMIN_SECRET ?? 'fallback-secret';
  return createHmac('sha256', secret).update(email.toLowerCase()).digest('hex');
}

function isAdminEmail(email: string): boolean {
  const list = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const email = (body as Record<string, unknown>)?.email;
  if (typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'Email invalide' }, { status: 400 });
  }

  if (!isAdminEmail(email)) {
    return NextResponse.json({ error: 'Accès non autorisé' }, { status: 401 });
  }

  const token = tokenForEmail(email);
  const isProd = process.env.NODE_ENV === 'production';

  const response = NextResponse.json({ ok: true });
  response.cookies.set('admin_token', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 hours
  });

  return response;
}
