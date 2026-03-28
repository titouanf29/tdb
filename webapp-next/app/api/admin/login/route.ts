import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';

function computeAdminToken(password: string): string {
  const secret = process.env.ADMIN_SECRET ?? '';
  return createHmac('sha256', secret).update(password).digest('hex');
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  if (!body || typeof body !== 'object' || !('password' in body) || typeof (body as Record<string, unknown>).password !== 'string') {
    return NextResponse.json({ error: 'Missing password' }, { status: 400 });
  }

  const { password } = body as { password: string };
  const expectedPassword = process.env.ADMIN_PASSWORD ?? '';

  // Constant-time comparison to prevent timing attacks
  const pwBuffer = Buffer.from(password.slice(0, 256));
  const expectedBuffer = Buffer.from(expectedPassword);
  const lengthMatch = pwBuffer.length === expectedBuffer.length;
  const paddedInput = Buffer.alloc(expectedBuffer.length);
  pwBuffer.copy(paddedInput);
  const matches = lengthMatch && timingSafeEqual(paddedInput, expectedBuffer);

  if (!matches) {
    return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 401 });
  }

  const token = computeAdminToken(password);
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
