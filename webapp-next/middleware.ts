import { NextRequest, NextResponse } from 'next/server';
import { isValidAdminToken } from '@/lib/admin-auth';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith('/admin')) return NextResponse.next();
  if (pathname === '/admin/login') return NextResponse.next();
  if (pathname.startsWith('/api/admin/')) return NextResponse.next();

  const cookie = request.cookies.get('admin_token')?.value;

  if (!cookie || !isValidAdminToken(cookie)) {
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
