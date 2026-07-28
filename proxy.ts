/**
 * Optimistic auth redirects only (docs/auth-plan.md §5): checks whether a
 * session cookie exists, not whether it is valid. Real authorization happens
 * in lib/dal.ts on every page and action.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

export function proxy(request: NextRequest) {
  const hasSessionCookie = !!getSessionCookie(request);
  const { pathname } = request.nextUrl;

  const protectedPath = ['/admin', '/family', '/profiles', '/gate', '/passport', '/treasury'].some((p) => pathname.startsWith(p));
  if (!hasSessionCookie && protectedPath) {
    const url = new URL('/login', request.url);
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  if (hasSessionCookie && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/profiles', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/family/:path*', '/profiles/:path*', '/gate', '/login', '/signup', '/passport', '/treasury'],
};
