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

  const protectedPath = ['/admin', '/family', '/profiles', '/gate', '/welcome', '/passport', '/treasury', '/parent-observatory'].some((p) => pathname.startsWith(p));
  if (!hasSessionCookie && protectedPath) {
    const url = new URL('/login', request.url);
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // Signed-out doorways. They are absent from the protected list above by
  // design — recovery has to work for someone who cannot sign in — but a
  // guardian who already has a session has no business on any of them, so they
  // bounce to the profile picker like /login always has.
  const signedOutOnly = ['/login', '/signup', '/forgot-password', '/reset-password'];
  if (hasSessionCookie && signedOutOnly.includes(pathname)) {
    return NextResponse.redirect(new URL('/profiles', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Both the bare path and the wildcard: the observatory index and one child's
  // page are separate routes, and only the second matches ':path*'.
  matcher: ['/admin/:path*', '/family/:path*', '/profiles/:path*', '/gate', '/welcome', '/login', '/signup', '/forgot-password', '/reset-password', '/passport', '/treasury', '/parent-observatory', '/parent-observatory/:path*'],
};
