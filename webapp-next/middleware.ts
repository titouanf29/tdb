import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';

function isValidToken(token: string): boolean {
  const secret = process.env.ADMIN_SECRET ?? 'fallback-secret';
  const emails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

  return emails.some(email => {
    const expected = createHmac('sha256', secret).update(email).digest('hex');
    return token === expected;
  });
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith('/admin')) return NextResponse.next();
  if (pathname === '/admin/login') return NextResponse.next();
  if (pathname.startsWith('/api/admin/')) return NextResponse.next();

  const cookie = request.cookies.get('admin_token')?.value;

  if (!cookie || !isValidToken(cookie)) {
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
