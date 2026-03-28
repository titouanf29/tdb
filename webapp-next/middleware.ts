import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';

function computeAdminToken(): string {
  const secret = process.env.ADMIN_SECRET ?? '';
  const password = process.env.ADMIN_PASSWORD ?? '';
  return createHmac('sha256', secret).update(password).digest('hex');
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect /admin routes
  if (!pathname.startsWith('/admin')) return NextResponse.next();

  // Allow the login page and its API through
  if (pathname === '/admin/login') return NextResponse.next();
  if (pathname.startsWith('/api/admin/')) return NextResponse.next();

  const cookie = request.cookies.get('admin_token')?.value;
  const expected = computeAdminToken();

  if (!cookie || cookie !== expected) {
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
