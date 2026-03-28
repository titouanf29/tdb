import { NextRequest, NextResponse } from 'next/server';
import { isValidAdminToken } from '@/lib/admin-auth';

function isPublicAdminApi(pathname: string): boolean {
  return pathname === '/api/admin/login' || pathname === '/api/admin/logout';
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith('/admin') && !pathname.startsWith('/api/admin/')) {
    return NextResponse.next();
  }

  if (pathname === '/admin/login' || isPublicAdminApi(pathname)) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get('admin_token')?.value;

  if (!cookie || !isValidAdminToken(cookie)) {
    if (pathname.startsWith('/api/admin/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
